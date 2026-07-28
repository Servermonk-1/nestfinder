const has = (listing, key) => listing.amenities?.some((a) => a.toLowerCase() === key);

/**
 * Rough, clearly-labeled monthly cost estimate.
 * Presence of an amenity usually means the landlord already covers or
 * subsidizes it, so the student's out-of-pocket estimate is lower.
 */
export const estimateMonthlyCost = (listing) => {
	const rent = listing.price || 0;
	const electricity = has(listing, 'electricity') ? 2000 : 4000;
	const water = has(listing, 'water') ? 1000 : 2000;
	const internet = has(listing, 'wifi') ? 3000 : 6000;
	const transport = 5000;

	return {
		rent,
		electricity,
		water,
		internet,
		transport,
		total: rent + electricity + water + internet + transport,
	};
};
