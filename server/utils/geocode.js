/**
 * Address → coordinates, via OpenStreetMap's Nominatim.
 *
 * Chosen because it needs no API key and no billing account, which matters for
 * a student project. The trade-off is a strict usage policy: max one request per
 * second and a real User-Agent. Both are honoured below.
 *
 * Geocoding Nigerian street addresses is unreliable — many aren't in OSM at all.
 * So we try progressively broader queries and record HOW precise the answer was,
 * rather than pretending a city-centre pin is the actual house.
 */

const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'NestFinder/1.0 (SIWES student housing project)';
const MIN_GAP_MS = 1100; // Nominatim asks for <= 1 request per second

let lastCallAt = 0;
const throttle = async () => {
	const wait = lastCallAt + MIN_GAP_MS - Date.now();
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	lastCallAt = Date.now();
};

// Identical queries are common — a directory of 115 Ibadan organisations shares
// barely 30 distinct areas — and re-asking a free service for an answer we
// already have is both slow and impolite. Process-lifetime cache; misses are
// cached too, so a hopeless address isn't retried all afternoon.
const cache = new Map();

async function query(text) {
	if (cache.has(text)) return cache.get(text);
	await throttle();
	const url = `${ENDPOINT}?q=${encodeURIComponent(text)}&format=json&limit=1&countrycodes=ng`;
	const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
	// A transport error is NOT cached — the address may be fine and the service
	// merely down, so a later attempt should be allowed to try again.
	if (!res.ok) return null;

	const [hit] = await res.json();
	const result = hit?.lat && hit?.lon
		? { lat: Number(hit.lat), lng: Number(hit.lon), label: hit.display_name, osmType: hit.type }
		: null;
	cache.set(text, result);
	return result;
}

/**
 * Resolve a listing's address, broadening the query until something matches.
 * Returns null when even the city can't be found — the caller must cope with a
 * listing that has no coordinates rather than getting a fabricated one.
 */
export async function geocodeListing({ address, area, city, state }) {
	const attempts = [
		{ precision: 'address', parts: [address, area, city, state, 'Nigeria'] },
		{ precision: 'area', parts: [area, city, state, 'Nigeria'] },
		{ precision: 'city', parts: [city, state, 'Nigeria'] },
	];

	for (const { precision, parts } of attempts) {
		const text = parts.filter(Boolean).join(', ');
		if (!text || text === 'Nigeria') continue;
		try {
			const hit = await query(text);
			if (hit) return { ...hit, precision, query: text };
		} catch {
			// Network trouble shouldn't abort the remaining, broader attempts.
		}
	}
	return null;
}

/** Kilometres between two points (haversine) — used for "near my placement". */
export function distanceKm(a, b) {
	if (!a || !b) return null;
	const R = 6371;
	const toRad = (d) => (d * Math.PI) / 180;
	const dLat = toRad(b.lat - a.lat);
	const dLng = toRad(b.lng - a.lng);
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
	return Math.round(R * 2 * Math.asin(Math.sqrt(s)) * 10) / 10;
}
