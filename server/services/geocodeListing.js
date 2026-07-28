import Listing from '../models/Listing.js';
import { geocodeListing as lookup } from '../utils/geocode.js';

const addressOf = (l) => [l.address, l.area, l.city, l.state].filter(Boolean).join('|');

/**
 * Give a listing coordinates. Safe to call repeatedly — it skips work when the
 * address hasn't changed since the last successful lookup, so re-saving a
 * listing doesn't hammer a free, rate-limited service.
 */
export async function geocodeOne(listingId, { force = false } = {}) {
	const listing = await Listing.findById(listingId);
	if (!listing) return null;

	const alreadyPlaced = listing.location?.coordinates?.length === 2;
	const addressUnchanged = listing.geocodeQuery === addressOf(listing);

	// A pin the landlord dragged themselves is better than anything we can
	// derive, so we leave it alone — even on a forced re-scan. It only gives way
	// when the landlord edits the address itself, because at that point the old
	// pin describes a different property and is worse than a fresh guess.
	if (alreadyPlaced && listing.locationSource === 'landlord' && addressUnchanged) {
		return { skipped: true, landlordPinned: true };
	}

	if (alreadyPlaced && !force && listing.geocodedAt && addressUnchanged) {
		return { skipped: true };
	}

	const hit = await lookup(listing);
	if (!hit) {
		// Record the attempt so we don't retry a hopeless address on every save.
		listing.geocodedAt = new Date();
		listing.geocodeQuery = addressOf(listing);
		await listing.save({ timestamps: false });
		return null;
	}

	listing.location = { type: 'Point', coordinates: [hit.lng, hit.lat] };
	listing.geocodePrecision = hit.precision;
	listing.geocodedAt = new Date();
	listing.geocodeQuery = addressOf(listing);
	// Reaching here means the address changed, so any previous confirmation no
	// longer applies — the landlord is asked to place the pin again.
	listing.locationSource = 'geocoded';
	listing.locationConfirmedAt = undefined;
	// `timestamps: false` — students read "last updated" as a freshness signal,
	// and placing a pin is our bookkeeping, not a landlord editing the listing.
	await listing.save({ timestamps: false });

	return { lat: hit.lat, lng: hit.lng, precision: hit.precision, label: hit.label };
}

/** Geocode everything missing coordinates. Sequential — the API is rate-limited. */
export async function geocodeAll({ force = false } = {}) {
	const filter = force ? {} : { 'location.coordinates': { $exists: false } };
	const listings = await Listing.find(filter).select('_id').lean();

	let placed = 0, failed = 0;
	for (const l of listings) {
		const result = await geocodeOne(l._id, { force });
		if (result?.lat) placed++;
		else if (!result?.skipped) failed++;
	}
	return { total: listings.length, placed, failed };
}
