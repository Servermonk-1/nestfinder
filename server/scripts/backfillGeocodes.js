/**
 * Give existing listings map coordinates.
 *
 * Listings created before geocoding existed have no `location`, so they'd be
 * invisible on the map. Run once after deploying:
 *
 *   node scripts/backfillGeocodes.js          # only listings missing coordinates
 *   node scripts/backfillGeocodes.js --force  # re-geocode everything
 *
 * Takes ~1.1s per listing — Nominatim's rate limit, not slowness on our side.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import { geocodeOne } from '../services/geocodeListing.js';

const force = process.argv.includes('--force');

const run = async () => {
	await mongoose.connect(process.env.MONGO_URI);

	const filter = force ? {} : { 'location.coordinates': { $exists: false } };
	const listings = await Listing.find(filter).select('_id title area city').lean();
	console.log(`${listings.length} listing(s) to process${force ? ' (forced)' : ''}\n`);

	let placed = 0;
	for (const l of listings) {
		const where = [l.area, l.city].filter(Boolean).join(', ');
		try {
			const result = await geocodeOne(l._id, { force });
			if (result?.lat) {
				placed++;
				console.log(`  OK    ${l.title} — ${where}`);
				console.log(`        ${result.lat}, ${result.lng}  (${result.precision})`);
			} else if (result?.skipped) {
				console.log(`  SKIP  ${l.title} — already placed, address unchanged`);
			} else {
				console.log(`  MISS  ${l.title} — "${where}" not found in OpenStreetMap`);
			}
		} catch (err) {
			console.log(`  FAIL  ${l.title} — ${err.message}`);
		}
	}

	console.log(`\nDone: ${placed}/${listings.length} placed.`);
	await mongoose.disconnect();
};

run().catch((err) => {
	console.error(err);
	process.exit(1);
});
