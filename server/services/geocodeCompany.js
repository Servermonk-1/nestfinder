import Company from '../models/Company.js';
import { geocodeListing as lookup } from '../utils/geocode.js';

const addressOf = (c) => [c.address, c.area, c.city, c.state].filter(Boolean).join('|');

/**
 * Give a company coordinates. Mirrors the listing geocoder, including the two
 * rules that matter: never overwrite a pin a human placed, and never touch
 * `updatedAt` for what is our own bookkeeping.
 */
export async function geocodeCompany(companyId, { force = false } = {}) {
	const company = await Company.findById(companyId);
	if (!company) return null;

	const placed = company.location?.coordinates?.length === 2;
	const addressUnchanged = company.geocodeQuery === addressOf(company);

	if (placed && company.locationSource === 'admin' && addressUnchanged) {
		return { skipped: true, adminPinned: true };
	}
	if (placed && !force && company.geocodedAt && addressUnchanged) {
		return { skipped: true };
	}

	const hit = await lookup(company);
	if (!hit) {
		company.geocodedAt = new Date();
		company.geocodeQuery = addressOf(company);
		await company.save({ timestamps: false });
		return null;
	}

	company.location = { type: 'Point', coordinates: [hit.lng, hit.lat] };
	company.geocodePrecision = hit.precision;
	company.geocodedAt = new Date();
	company.geocodeQuery = addressOf(company);
	company.locationSource = 'geocoded';
	await company.save({ timestamps: false });

	return { lat: hit.lat, lng: hit.lng, precision: hit.precision };
}

/** Geocode every company missing coordinates. Sequential — the API is rate-limited. */
export async function geocodeAllCompanies({ force = false } = {}) {
	const filter = force ? {} : { 'location.coordinates': { $exists: false } };
	const companies = await Company.find(filter).select('_id name').lean();

	let placed = 0;
	for (const c of companies) {
		const r = await geocodeCompany(c._id, { force });
		if (r?.lat) placed++;
	}
	return { total: companies.length, placed };
}
