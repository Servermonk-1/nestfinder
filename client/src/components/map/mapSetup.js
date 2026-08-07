import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// OpenStreetMap tiles: free, no API key, no billing account. Attribution is
// required by their licence — never remove it from the TileLayer.
export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
	'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Leaflet's default marker is a PNG resolved relative to the CSS, which bundlers
// rewrite and break. Building markers out of HTML sidesteps that entirely and
// lets them carry real information — the price — instead of a generic pin.
export const priceMarker = (label, { active = false } = {}) =>
	L.divIcon({
		className: 'nf-price-marker',
		html: `<span class="nf-price-pill${active ? ' nf-price-pill--active' : ''}">${label}</span>`,
		iconSize: null,
		iconAnchor: [0, 0],
	});

export const pinMarker = () =>
	L.divIcon({
		className: 'nf-pin-marker',
		html: '<span class="nf-pin"></span>',
		iconSize: [26, 26],
		iconAnchor: [13, 26],
	});

// How much to trust a pin. An area or city match is a neighbourhood centroid,
// not a doorstep — the map must say so rather than implying false precision.
export const PRECISION_COPY = {
	// Set by the landlord themselves — the strongest signal we have, since they
	// are the one person who actually knows where the building is.
	landlord: {
		label: 'Location confirmed by the landlord',
		note: 'The landlord placed this pin on the property themselves.',
		radiusM: 0,
	},
	address: {
		label: 'Exact address located',
		note: 'This pin matches the street address the landlord provided.',
		radiusM: 0,
	},
	area: {
		label: 'Approximate — area centre',
		note: 'The exact street could not be matched, so this pin shows the centre of the area. Confirm the address with the landlord before travelling.',
		radiusM: 700,
	},
	city: {
		label: 'Approximate — city centre',
		note: 'Only the city could be matched. This pin is not the property location — ask the landlord for directions.',
		radiusM: 2500,
	},
};

/** Pull [lat, lng] out of a listing's GeoJSON, which stores [lng, lat]. */
export const coordsOf = (listing) => {
	const c = listing?.location?.coordinates;
	if (!Array.isArray(c) || c.length !== 2) return null;
	const [lng, lat] = c;
	if (typeof lat !== 'number' || typeof lng !== 'number') return null;
	return [lat, lng];
};

/**
 * Turn a map's pixel height into one that survives a phone.
 *
 * Callers pass a desktop height (620 for the browse map, 320 for a single
 * property). Left as a flat pixel value it eats an entire mobile screen and
 * then some — 620px on a 568px-tall handset means the map IS the page. The
 * ceiling is what does the work; the requested height wins on any screen tall
 * enough to afford it, so desktop is untouched.
 */
export const mapFrameHeight = (height) =>
	typeof height === 'number' ? `clamp(240px, ${height}px, 72vh)` : height;

