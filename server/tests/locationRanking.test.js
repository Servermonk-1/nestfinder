import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import listingRoutes from '../routes/listings.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import { locationMismatch } from '../utils/fraudRules.js';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);

const base = {
	address: '1 St', state: 'Oyo', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
	description: 'A tidy room in a calm street.', available: true, flagged: false,
	roomType: 'single', city: 'Ibadan', area: 'Bodija',
};

const titles = (res) => res.body.listings.map((l) => l.title);

let landlord;
beforeEach(async () => {
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '08012345678', verified: true,
	});

	// Oldest first, so "newest" and "recommended" would disagree if confirmation
	// is actually doing something.
	const day = 24 * 60 * 60 * 1000;
	const rows = await Listing.create([
		{ ...base, landlord: landlord._id, title: 'Old but confirmed', price: 240000, priceUnit: 'annual', createdAt: new Date(Date.now() - 5 * day) },
		{ ...base, landlord: landlord._id, title: 'New and unconfirmed', price: 120000, priceUnit: 'annual', createdAt: new Date() },
	]);
	await Listing.updateOne({ _id: rows[0]._id }, {
		locationSource: 'landlord', locationConfirmedAt: new Date(),
		location: { type: 'Point', coordinates: [3.90, 7.41] },
	});
});

describe('recommended sort', () => {
	it('puts landlord-confirmed locations first by default', async () => {
		const res = await request(app).get('/api/listings/search');
		expect(res.status).toBe(200);
		expect(titles(res)[0]).toBe('Old but confirmed');
	});

	it('leaves explicit sorts alone', async () => {
		// A student who asks for cheapest-first must get cheapest-first. Quietly
		// promoting a pricier listing because its pin is confirmed would be a
		// worse betrayal than never ranking at all.
		const asc = await request(app).get('/api/listings/search?sort=price_asc');
		expect(titles(asc)[0]).toBe('New and unconfirmed');

		const newest = await request(app).get('/api/listings/search?sort=newest');
		expect(titles(newest)[0]).toBe('New and unconfirmed');
	});
});

describe('locationMismatch rule', () => {
	const ctx = (over = {}) => ({
		geocodePrecision: 'address', distanceFromCityKm: 80, cityListingCount: 5, ...over,
	});

	it('flags an address that resolves far from its stated city', () => {
		const flag = locationMismatch(ctx());
		expect(flag?.rule).toBe('location-mismatch');
		expect(flag.severity).toBe(30);
		expect(flag.detail).toContain('80km');
	});

	it('scores a nearer contradiction lower', () => {
		expect(locationMismatch(ctx({ distanceFromCityKm: 40 })).severity).toBe(20);
	});

	it('ignores ordinary spread inside a city', () => {
		expect(locationMismatch(ctx({ distanceFromCityKm: 12 }))).toBeNull();
	});

	it('stays silent on an area or city fallback', () => {
		// A city-level pin sits ON the city centre by construction, so measuring
		// its distance from that centre proves nothing. Judging it would flag
		// every listing whose street simply isn't in OpenStreetMap.
		expect(locationMismatch(ctx({ geocodePrecision: 'city' }))).toBeNull();
		expect(locationMismatch(ctx({ geocodePrecision: 'area' }))).toBeNull();
	});

	it('stays silent without enough neighbours to establish where the city is', () => {
		expect(locationMismatch(ctx({ cityListingCount: 2 }))).toBeNull();
		expect(locationMismatch(ctx({ distanceFromCityKm: null }))).toBeNull();
	});
});
