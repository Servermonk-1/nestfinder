/**
 * Turning a distance into a commute a Nigerian student would recognise.
 *
 * Every figure here is an ESTIMATE and the UI must say so. Two honest limits:
 *
 *  1. We have straight-line distance, not road distance. Real routes are longer,
 *     so we apply a detour factor rather than quoting the crow-flies number as
 *     though someone could walk through buildings.
 *  2. Fares vary by route, time of day and fuel price. These are typical Ibadan
 *     figures for 2026, not quotes.
 *
 * Getting this wrong in the optimistic direction would push a student toward a
 * room they cannot actually afford to commute from, so every rounding below
 * leans conservative.
 */

// Straight-line km → road km. Ibadan's road network is dense but not a grid;
// 1.35 is a common urban detour factor and errs on the cautious side.
const DETOUR = 1.35;

const WORKING_DAYS_PER_MONTH = 22;
const TRIPS_PER_DAY = 2; // there and back

/** What a student would realistically take for a given road distance. */
const MODES = [
	{ maxKm: 1.2, mode: 'walk', label: 'Walking distance', kmh: 4.5, farePerTrip: 0 },
	{ maxKm: 4, mode: 'keke', label: 'Keke / okada', kmh: 16, farePerTrip: 300 },
	{ maxKm: 12, mode: 'bus', label: 'Danfo / bus', kmh: 18, farePerTrip: 500 },
	{ maxKm: Infinity, mode: 'long', label: 'Long bus trip', kmh: 22, farePerTrip: 900 },
];

/**
 * @param {number|null} straightLineKm — haversine distance, as stored/computed server-side
 * @returns {null|{roadKm, minutes, mode, label, farePerTrip, monthlyCost, band}}
 */
export function estimateCommute(straightLineKm) {
	if (straightLineKm === null || straightLineKm === undefined || !Number.isFinite(straightLineKm)) return null;

	const roadKm = Math.round(straightLineKm * DETOUR * 10) / 10;
	const tier = MODES.find((m) => roadKm <= m.maxKm);

	// Round travel time UP to the nearest 5 minutes: a student planning to reach
	// work by 8am is better served by a pessimistic number.
	const rawMinutes = (roadKm / tier.kmh) * 60;
	const minutes = Math.max(5, Math.ceil(rawMinutes / 5) * 5);

	const monthlyCost = tier.farePerTrip * TRIPS_PER_DAY * WORKING_DAYS_PER_MONTH;

	return {
		roadKm,
		minutes,
		mode: tier.mode,
		label: tier.label,
		farePerTrip: tier.farePerTrip,
		monthlyCost,
		band: roadKm <= 2 ? 'excellent' : roadKm <= 6 ? 'good' : roadKm <= 15 ? 'fair' : 'far',
	};
}

/** "25 mins · Danfo / bus" — a one-line summary for cards. */
export function commuteSummary(straightLineKm) {
	const c = estimateCommute(straightLineKm);
	if (!c) return null;
	return c.mode === 'walk' ? `${c.minutes} min walk` : `~${c.minutes} min · ${c.label}`;
}

/** Fallback when we don't know where the student works. Clearly labelled as such. */
export const GENERIC_TRANSPORT = 12000;

/**
 * Kilometres between two points — the same haversine the server uses.
 *
 * Duplicated deliberately: the compare page holds listings in local state that
 * never went through an anchored search, so it has no server-supplied distance
 * and would otherwise need a round trip per listing.
 */
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

/** Pull {lat,lng} out of a GeoJSON-bearing document, which stores [lng, lat]. */
export function pointOf(doc) {
	const c = doc?.location?.coordinates;
	return Array.isArray(c) && c.length === 2 ? { lat: c[1], lng: c[0] } : null;
}

/** Straight-line km from a listing to the student's placement, or null. */
export function distanceToPlacement(listing, placementCompany) {
	return distanceKm(pointOf(listing), pointOf(placementCompany));
}

/** Read "6 months", "1 year", "12" etc. out of a free-text stay requirement. */
export function monthsFromStay(text) {
	if (!text) return null;
	const s = String(text).toLowerCase();
	const yr = s.match(/(\d+(?:\.\d+)?)\s*(?:year|yr)/);
	if (yr) return Math.round(Number(yr[1]) * 12);
	const mo = s.match(/(\d+)\s*(?:month|mo)/);
	if (mo) return Number(mo[1]);
	const bare = s.match(/^\s*(\d+)\s*$/);
	return bare ? Number(bare[1]) : null;
}

/**
 * Does this room's minimum stay outlast the student's industrial training?
 *
 * This is the specific trap SIWES students fall into: the attachment runs about
 * six months, but Nigerian landlords routinely demand a full year's rent up
 * front. A student who doesn't spot that pays for months they won't be in town.
 * We warn; we never hide the listing, because plenty of people negotiate it.
 */
export function leaseFitsPlacement(listing, placement) {
	const requiredMonths = monthsFromStay(listing?.minimumStay);
	if (!requiredMonths || !placement?.startDate || !placement?.endDate) return null;

	const start = new Date(placement.startDate);
	const end = new Date(placement.endDate);
	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return null;

	const placementMonths = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44)));
	const extraMonths = requiredMonths - placementMonths;

	return {
		requiredMonths,
		placementMonths,
		extraMonths: Math.max(0, extraMonths),
		fits: extraMonths <= 0,
	};
}
