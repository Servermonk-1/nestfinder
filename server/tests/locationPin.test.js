import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import listingRoutes from '../routes/listings.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';

vi.mock('../utils/geocode.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, geocodeListing: vi.fn() };
});

const { geocodeListing } = await import('../utils/geocode.js');
const { geocodeOne } = await import('../services/geocodeListing.js');

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);

// Somewhere in Bodija the geocoder would never find on its own.
const PIN = { lat: 7.41234, lng: 3.90567 };
const GUESS = { lat: 7.4177, lng: 3.9022, precision: 'area', label: 'Bodija' };

const base = {
	address: '12 Awolowo Road', state: 'Oyo', rooms: 1, contactPhone: '0800',
	contactEmail: 'x@x.io', description: 'A tidy room.', roomType: 'single',
	price: 240000, priceUnit: 'annual', city: 'Ibadan', area: 'Bodija', title: 'Room',
};

let landlord, token;
beforeEach(async () => {
	geocodeListing.mockReset().mockResolvedValue(GUESS);
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '08012345678', verified: true,
	});
	token = jwt.sign({ id: landlord._id, role: 'landlord' }, process.env.JWT_SECRET || 'testsecret');
});

const makeListing = (over = {}) => Listing.create({ ...base, landlord: landlord._id, ...over });

describe('landlord-placed pin', () => {
	it('survives a background geocode instead of being overwritten', async () => {
		// The whole point of letting a landlord drag the pin: our automatic guess
		// must never quietly move it back to the neighbourhood centre.
		const listing = await makeListing();
		await Listing.updateOne({ _id: listing._id }, {
			location: { type: 'Point', coordinates: [PIN.lng, PIN.lat] },
			locationSource: 'landlord',
			geocodeQuery: [base.address, base.area, base.city, base.state].join('|'),
			geocodedAt: new Date(),
		});

		const result = await geocodeOne(listing._id);

		expect(result).toEqual({ skipped: true, landlordPinned: true });
		expect(geocodeListing).not.toHaveBeenCalled();
		const saved = await Listing.findById(listing._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
	});

	it('survives even a forced re-scan', async () => {
		const listing = await makeListing();
		await Listing.updateOne({ _id: listing._id }, {
			location: { type: 'Point', coordinates: [PIN.lng, PIN.lat] },
			locationSource: 'landlord',
			geocodeQuery: [base.address, base.area, base.city, base.state].join('|'),
			geocodedAt: new Date(),
		});

		// Admin "Run Fraud Shield"-style rescans force geocoding; they still must
		// not undo a human's work.
		await geocodeOne(listing._id, { force: true });

		const saved = await Listing.findById(listing._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('landlord');
	});

	it('gives way when the landlord changes the address itself', async () => {
		// A pin confirmed for one address says nothing about a different one, so
		// here the fresh guess should win and confirmation should be revoked.
		const listing = await makeListing();
		await Listing.updateOne({ _id: listing._id }, {
			location: { type: 'Point', coordinates: [PIN.lng, PIN.lat] },
			locationSource: 'landlord',
			locationConfirmedAt: new Date(),
			geocodeQuery: 'OLD ADDRESS|Bodija|Ibadan|Oyo',
			geocodedAt: new Date(),
		});

		await geocodeOne(listing._id);

		const saved = await Listing.findById(listing._id);
		expect(geocodeListing).toHaveBeenCalledTimes(1);
		expect(saved.location.coordinates).toEqual([GUESS.lng, GUESS.lat]);
		expect(saved.locationSource).toBe('geocoded');
		expect(saved.locationConfirmedAt).toBeUndefined();
	});
});

describe('PUT /api/listings/:id with a pin', () => {
	const put = (id, body) =>
		request(app).put(`/api/listings/${id}`).set('Authorization', `Bearer ${token}`).send(body);

	it('stores a dragged pin and marks it landlord-confirmed', async () => {
		const listing = await makeListing();

		const res = await put(listing._id, { title: 'Room', lat: PIN.lat, lng: PIN.lng });

		expect(res.status).toBe(200);
		const saved = await Listing.findById(listing._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('landlord');
		expect(saved.locationConfirmedAt).toBeInstanceOf(Date);
	});

	it('does not write lat/lng as stray listing fields', async () => {
		const listing = await makeListing();
		await put(listing._id, { lat: PIN.lat, lng: PIN.lng });

		const raw = await Listing.collection.findOne({ _id: listing._id });
		expect(raw.lat).toBeUndefined();
		expect(raw.lng).toBeUndefined();
	});

	it('ignores coordinates that are off the globe', async () => {
		// A silently-bad pin is worse than no pin: it puts a real house in the
		// ocean and nobody notices. Rubbish must be rejected, leaving the listing
		// to normal geocoding — so the check is "never accepted as a landlord
		// pin", not "no location at all" (the background geocoder may fill one in).
		for (const bad of [{ lat: 999, lng: 3.9 }, { lat: 7.4, lng: -900 }, { lat: 'somewhere', lng: 'nice' }]) {
			const listing = await makeListing();
			await put(listing._id, bad);

			const saved = await Listing.findById(listing._id);
			expect(saved.locationSource).not.toBe('landlord');
			expect(saved.locationConfirmedAt).toBeUndefined();
			if (saved.location) {
				expect(saved.location.coordinates).toEqual([GUESS.lng, GUESS.lat]);
			}
		}
	});

	it('accepts coordinates sent as strings', async () => {
		// The create form posts multipart/form-data, where every field arrives as
		// a string. If this were number-only, new listings would silently lose
		// their pin while edits kept theirs.
		const listing = await makeListing();

		await put(listing._id, { lat: String(PIN.lat), lng: String(PIN.lng) });

		const saved = await Listing.findById(listing._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('landlord');
	});

	it('leaves the location alone when no pin is sent', async () => {
		const listing = await makeListing();
		await Listing.updateOne({ _id: listing._id }, {
			location: { type: 'Point', coordinates: [PIN.lng, PIN.lat] },
			locationSource: 'landlord',
		});

		await put(listing._id, { title: 'Renamed' });

		const saved = await Listing.findById(listing._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('landlord');
	});
});
