import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import listingRoutes from '../routes/listings.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);
const asLandlord = (id) => ({ Authorization: `Bearer ${jwt.sign({ id: String(id), role: 'landlord' }, process.env.JWT_SECRET)}` });

const base = {
	address: '1 Test St', city: 'Ibadan', area: 'Agbowo', state: 'Oyo',
	roomType: 'single', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
};
const CLEAN = 'A tidy self-contained room a short walk from the university gate, with steady power and water throughout the week.';
const SCAM = 'URGENT! Pay the deposit first to secure it. WhatsApp me on 08031234567. I am abroad so no viewing is possible.';

const makeLandlord = async (over = {}) => Landlord.create({
	fullName: 'Musa Danladi', email: `l-${Math.random()}@x.io`,
	password: await bcrypt.hash('pw', 10), phone: '08012345678', verified: true, ...over,
});

// The screening runs fire-and-forget, so give it a moment to land.
const settle = () => new Promise((r) => setTimeout(r, 600));

describe('Fraud Shield runs on EDIT (bypass regression)', () => {
	it('re-screens a clean listing that is edited into a scam', async () => {
		// A real market, set by other landlords.
		await Promise.all([180000, 200000, 220000].map(async (p, i) => {
			const owner = await makeLandlord();
			return Listing.create({ ...base, title: `Comparable ${i}`, description: `${CLEAN} number ${i}`, price: p, landlord: owner._id });
		}));

		const L = await makeLandlord({ verified: false });
		const listing = await Listing.create({ ...base, title: 'Nice Room', description: CLEAN, price: 190000, landlord: L._id });

		// Baseline: clean listing is low risk and unflagged.
		const before = await Listing.findById(listing._id);
		expect(before.flagged).toBe(false);

		// The attack: edit it into a scam after it has been published.
		const res = await request(app)
			.put(`/api/listings/${listing._id}`)
			.set(asLandlord(L._id))
			.send({ description: SCAM, price: 18000 });
		expect(res.status).toBe(200);

		await settle();

		const after = await Listing.findById(listing._id);
		expect(after.fraudScore).toBeGreaterThanOrEqual(40);
		expect(after.flagged).toBe(true);                       // caught, not silently live
		expect(after.fraudCheckedAt).toBeTruthy();
		const rules = after.fraudFlags.map((f) => f.rule);
		expect(rules).toEqual(expect.arrayContaining(['scam-language', 'offsite-contact']));
	});

	it('leaves an innocent edit alone', async () => {
		await Promise.all([180000, 200000, 220000].map(async (p, i) => {
			const owner = await makeLandlord();
			return Listing.create({ ...base, title: `Comp ${i}`, description: `${CLEAN} number ${i}`, price: p, landlord: owner._id });
		}));

		const L = await makeLandlord({ verified: true });
		const listing = await Listing.create({ ...base, title: 'Nice Room', description: CLEAN, price: 190000, landlord: L._id });

		await request(app).put(`/api/listings/${listing._id}`).set(asLandlord(L._id)).send({ price: 195000 });
		await settle();

		const after = await Listing.findById(listing._id);
		expect(after.flagged).toBe(false);
		expect(after.fraudLevel).toBe('clear');
	});

	it('still refuses an edit from someone else\'s account', async () => {
		const owner = await makeLandlord();
		const stranger = await makeLandlord();
		const listing = await Listing.create({ ...base, title: 'Theirs', description: CLEAN, price: 190000, landlord: owner._id });

		const res = await request(app).put(`/api/listings/${listing._id}`).set(asLandlord(stranger._id)).send({ description: SCAM });
		expect(res.status).toBe(403);
	});
});
