/**
 * The one place that turns search criteria into a MongoDB filter.
 *
 * Extracted so a saved search and the live search cannot drift apart. If an
 * alert used slightly different matching from the search that produced it, a
 * student would be emailed about homes their own search never showed them —
 * which is worse than no alert at all.
 */

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @param c  criteria: { q, city, area, roomType, minPrice, maxPrice, amenities }
 *           `amenities` may be an array or a comma-separated string.
 * @returns  a filter for available, unflagged listings
 */
export function buildListingFilter(c = {}) {
	const filter = { available: true, flagged: false };

	// Free text: every whitespace-separated word must appear somewhere, so
	// "self contained bodija" narrows rather than widens.
	if (c.q?.trim()) {
		const words = c.q.trim().split(/\s+/).slice(0, 6);
		filter.$and = words.map((word) => {
			const rx = new RegExp(escape(word), 'i');
			return { $or: [{ title: rx }, { description: rx }, { area: rx }, { city: rx }, { roomType: rx }] };
		});
	}

	if (c.city) filter.city = { $regex: escape(c.city), $options: 'i' };
	if (c.area) filter.area = { $regex: escape(c.area), $options: 'i' };
	if (c.roomType) filter.roomType = c.roomType;

	// Price bounds are per MONTH, so they compare against the normalised figure
	// — never the raw price, which may be annual.
	if (c.minPrice || c.maxPrice) {
		filter.monthlyPrice = {};
		if (c.minPrice) filter.monthlyPrice.$gte = parseInt(c.minPrice, 10);
		if (c.maxPrice) filter.monthlyPrice.$lte = parseInt(c.maxPrice, 10);
	}

	const amenities = Array.isArray(c.amenities)
		? c.amenities
		: String(c.amenities || '').split(',').map((a) => a.trim()).filter(Boolean);
	if (amenities.length) {
		filter.amenities = { $all: amenities.map((a) => new RegExp(`^${escape(a)}$`, 'i')) };
	}

	return filter;
}

/** A human sentence describing what a saved search actually looks for. */
export function describeCriteria(c = {}) {
	const bits = [];
	if (c.q?.trim()) bits.push(`“${c.q.trim()}”`);
	if (c.roomType) bits.push(c.roomType.replace('-', ' '));
	if (c.area) bits.push(`in ${c.area}`);
	else if (c.city) bits.push(`in ${c.city}`);

	const min = c.minPrice ? `₦${Number(c.minPrice).toLocaleString()}` : null;
	const max = c.maxPrice ? `₦${Number(c.maxPrice).toLocaleString()}` : null;
	if (min && max) bits.push(`${min}–${max}/mo`);
	else if (max) bits.push(`under ${max}/mo`);
	else if (min) bits.push(`over ${min}/mo`);

	const amenities = Array.isArray(c.amenities)
		? c.amenities
		: String(c.amenities || '').split(',').map((a) => a.trim()).filter(Boolean);
	if (amenities.length) bits.push(`with ${amenities.join(', ')}`);

	if (c.nearPlacement) bits.push(`within ${c.radiusKm || 15}km of your placement`);

	return bits.length ? bits.join(' · ') : 'Any available home';
}
