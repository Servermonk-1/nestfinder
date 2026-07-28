import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import listingRoutes from '../routes/listings.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);

const base = {
	address: '1 St', state: 'Oyo', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
	available: true, flagged: false,
};

const search = (qs = '') => request(app).get(`/api/listings/search${qs}`);
const titles = (res) => res.body.listings.map((l) => l.title);

beforeEach(async () => {
	const L = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '08012345678', verified: true,
	});
	await Listing.create([
		{ ...base, landlord: L._id, title: 'Self Contained Room in Bodija', description: 'Quiet and tidy with steady power.', city: 'Ibadan', area: 'Bodija', roomType: 'self-contained', price: 240000, priceUnit: 'annual' },
		{ ...base, landlord: L._id, title: 'Shared Room Agbowo', description: 'Close to the university gate, very affordable.', city: 'Ibadan', area: 'Agbowo', roomType: 'shared', price: 8000, priceUnit: 'monthly' },
		{ ...base, landlord: L._id, title: 'Single Room Sango', description: 'A calm self contained space near the market.', city: 'Ibadan', area: 'Sango', roomType: 'single', price: 120000, priceUnit: 'annual' },
	]);
});

describe('keyword search', () => {
	it('matches on the title', async () => {
		expect(titles(await search('?q=bodija'))).toEqual(['Self Contained Room in Bodija']);
	});

	it('matches on the description', async () => {
		expect(titles(await search('?q=market'))).toEqual(['Single Room Sango']);
	});

	it('matches on the area', async () => {
		expect(titles(await search('?q=agbowo'))).toEqual(['Shared Room Agbowo']);
	});

	it('is case-insensitive and matches partial words', async () => {
		expect(titles(await search('?q=BODI'))).toEqual(['Self Contained Room in Bodija']);
	});

	it('requires ALL words, so more words narrow the results', async () => {
		// "self contained" appears in one title and one description…
		expect((await search('?q=self contained')).body.listings.length).toBe(2);
		// …but only one of those is in Bodija.
		expect(titles(await search('?q=self contained bodija'))).toEqual(['Self Contained Room in Bodija']);
	});

	it('returns nothing for a term that appears nowhere', async () => {
		expect((await search('?q=zanzibar')).body.listings).toHaveLength(0);
	});

	it('combines with the structured filters', async () => {
		expect(titles(await search('?q=room&roomType=shared'))).toEqual(['Shared Room Agbowo']);
	});

	it('is safe against regex injection', async () => {
		const res = await search('?q=' + encodeURIComponent('.*'));
		expect(res.status).toBe(200);
		expect(res.body.listings).toHaveLength(0); // treated literally, not as "match everything"
	});
});

describe('price filtering respects the unit', () => {
	it('derives a monthly figure for every listing', async () => {
		const all = await Listing.find().select('title monthlyPrice').lean();
		const byTitle = Object.fromEntries(all.map((l) => [l.title, l.monthlyPrice]));
		expect(byTitle['Self Contained Room in Bodija']).toBe(20000); // 240,000/yr
		expect(byTitle['Shared Room Agbowo']).toBe(8000);             // already monthly
		expect(byTitle['Single Room Sango']).toBe(10000);             // 120,000/yr
	});

	it('a "under ₦10,000/month" filter compares like with like', async () => {
		const res = await search('?maxPrice=10000');
		// Both the monthly ₦8,000 and the annual ₦120,000 (= ₦10,000/mo) qualify;
		// the annual ₦240,000 (= ₦20,000/mo) must not.
		expect(titles(res).sort()).toEqual(['Shared Room Agbowo', 'Single Room Sango']);
	});

	it('does not mistake a large annual price for an expensive room', async () => {
		const res = await search('?minPrice=15000');
		expect(titles(res)).toEqual(['Self Contained Room in Bodija']);
	});

	it('sorts by true monthly cost, not the raw figure', async () => {
		const res = await search('?sort=price_asc');
		expect(titles(res)).toEqual(['Shared Room Agbowo', 'Single Room Sango', 'Self Contained Room in Bodija']);
	});

	it('keeps monthlyPrice in step when a listing is edited', async () => {
		const l = await Listing.findOne({ title: 'Single Room Sango' });
		await Listing.findByIdAndUpdate(l._id, { price: 60000 }); // still annual
		expect((await Listing.findById(l._id)).monthlyPrice).toBe(5000);

		await Listing.findByIdAndUpdate(l._id, { priceUnit: 'monthly' }); // same number, new unit
		expect((await Listing.findById(l._id)).monthlyPrice).toBe(60000);
	});
});
