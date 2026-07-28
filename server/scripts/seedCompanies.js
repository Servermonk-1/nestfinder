/**
 * Seed the SIWES company directory with Ibadan placement centres.
 *
 *   node scripts/seedCompanies.js            # add missing, leave existing alone
 *   node scripts/seedCompanies.js --update   # also refresh fields on existing rows
 *   node scripts/seedCompanies.js --reset    # wipe and re-seed (drops student suggestions too)
 *
 * Geocoding is rate-limited to ~1 request/second by OpenStreetMap's usage
 * policy, so a full run takes a few minutes. Repeated areas are cached.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Company from '../models/Company.js';
import { geocodeCompany } from '../services/geocodeCompany.js';
import { IBADAN_COMPANIES } from './data/ibadanCompanies.js';

const RESET = process.argv.includes('--reset');
const UPDATE = process.argv.includes('--update');

const run = async () => {
	await mongoose.connect(process.env.MONGO_URI);

	if (RESET) {
		// Only clears the curated directory — a centre a student added for
		// themselves is their data, not ours to delete.
		const { deletedCount } = await Company.deleteMany({ suggestedBy: { $exists: false } });
		console.log(`reset: removed ${deletedCount} curated compan(ies)\n`);
	}

	let added = 0, updated = 0, skipped = 0, failed = 0;

	for (const row of IBADAN_COMPANIES) {
		const existing = await Company.findOne({ name: row.name });

		if (existing && !UPDATE) { skipped++; continue; }

		let company;
		if (existing) {
			Object.assign(existing, row, { verified: true });
			await existing.save();
			company = existing;
			updated++;
		} else {
			company = await Company.create({ ...row, verified: true });
			added++;
		}

		const hit = await geocodeCompany(company._id);
		if (!hit?.lat && !hit?.skipped) {
			failed++;
			console.log(`  MISS  ${row.name} — "${row.area}, Ibadan" not found`);
		}
	}

	// Remove curated rows that are no longer in the dataset — renamed entries and
	// anything withdrawn on review. Student-added centres are never touched.
	if (process.argv.includes('--prune')) {
		const keep = IBADAN_COMPANIES.map((r) => r.name);
		const stale = await Company.find({
			suggestedBy: { $exists: false },
			name: { $nin: keep },
		}).select('name').lean();

		if (stale.length) {
			await Company.deleteMany({ _id: { $in: stale.map((s) => s._id) } });
			console.log(`pruned ${stale.length} row(s) no longer in the dataset:`);
			stale.forEach((s) => console.log(`   - ${s.name}`));
			console.log('');
		}
	}

	const [total, placed, depts] = await Promise.all([
		Company.countDocuments(),
		Company.countDocuments({ 'location.coordinates': { $exists: true } }),
		Company.distinct('acceptedDepartments'),
	]);

	const byFaculty = await Company.aggregate([
		{ $unwind: '$faculties' },
		{ $group: { _id: '$faculties', n: { $sum: 1 } } },
		{ $sort: { n: -1 } },
	]);

	console.log(`\nadded ${added}, updated ${updated}, skipped ${skipped}, geocode misses ${failed}`);
	console.log(`${total} compan(ies) · ${placed} placed on the map · ${depts.length} departments`);
	byFaculty.forEach((f) => console.log(`   ${String(f.n).padStart(3)}  ${f._id}`));

	await mongoose.disconnect();
};

run().catch((err) => { console.error(err); process.exit(1); });
