import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import { distanceKm } from '../utils/geocode.js';

// Stub the network layer. These tests are about our logic — the skip rule, the
// stored shape, the geo index — not about whether OpenStreetMap is up.
vi.mock('../utils/geocode.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, geocodeListing: vi.fn() };
});

const { geocodeListing } = await import('../utils/geocode.js');
const { geocodeOne } = await import('../services/geocodeListing.js');

const base = {
	address: '12 Awolowo Road', state: 'Oyo', rooms: 1, contactPhone: '0800',
	contactEmail: 'x@x.io', description: 'A tidy room.', roomType: 'single',
	price: 240000, priceUnit: 'annual',
};

let landlord;
beforeEach(async () => {
	geocodeListing.mockReset();
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '08012345678',
	});
});

const makeListing = (over = {}) =>
	Listing.create({ ...base, landlord: landlord._id, title: 'Room', city: 'Ibadan', area: 'Bodija', ...over });

describe('listing geo schema', () => {
	it('leaves ungeocoded listings with no location at all', async () => {
		// Regression: declaring the GeoJSON fields inline gave every listing a
		// `{ type: "Point" }` with no coordinates, and the 2dsphere index then
		// rejected the insert outright — "Point must be an array or object".
		const listing = await makeListing();
		expect(listing.location).toBeUndefined();

		const raw = await Listing.collection.findOne({ _id: listing._id });
		expect(raw.location).toBeUndefined();
	});

	it('finds listings near a point, nearest first', async () => {
		// Build the schema's own index rather than declaring a second one here —
		// a hand-rolled non-sparse copy collides with it by name.
		await Listing.init();
		// Roughly Bodija, Agbowo and Ring Road.
		const near = await makeListing({ title: 'Bodija', area: 'Bodija' });
		const far = await makeListing({ title: 'Ring Road', area: 'Ring Road' });
		await Listing.updateOne({ _id: near._id }, { location: { type: 'Point', coordinates: [3.9022, 7.4177] } });
		await Listing.updateOne({ _id: far._id }, { location: { type: 'Point', coordinates: [3.8605, 7.3682] } });

		const results = await Listing.find({
			location: {
				$near: { $geometry: { type: 'Point', coordinates: [3.9137, 7.4467] }, $maxDistance: 20000 },
			},
		}).select('title');

		expect(results.map((r) => r.title)).toEqual(['Bodija', 'Ring Road']);
	});
});

describe('geocodeOne', () => {
	it('stores coordinates as GeoJSON [lng, lat], not [lat, lng]', async () => {
		geocodeListing.mockResolvedValue({ lat: 7.4177, lng: 3.9022, precision: 'address', label: 'Bodija' });
		const listing = await makeListing();

		await geocodeOne(listing._id);

		const saved = await Listing.findById(listing._id);
		// Getting this backwards silently puts every Nigerian listing in the
		// Indian Ocean, so it's worth asserting the order explicitly.
		expect(saved.location.coordinates).toEqual([3.9022, 7.4177]);
		expect(saved.geocodePrecision).toBe('address');
		expect(saved.geocodedAt).toBeInstanceOf(Date);
	});

	it('does not make the listing look freshly edited', async () => {
		// The detail page shows "last updated" as a freshness signal. Placing a
		// pin is our own bookkeeping — a listing dormant for a month must not
		// suddenly read "updated less than a minute ago" because of it.
		geocodeListing.mockResolvedValue({ lat: 7.4177, lng: 3.9022, precision: 'address', label: 'Bodija' });
		const listing = await makeListing();
		const before = (await Listing.findById(listing._id)).updatedAt;

		await new Promise((r) => setTimeout(r, 20));
		await geocodeOne(listing._id);

		const after = await Listing.findById(listing._id);
		expect(after.updatedAt.getTime()).toBe(before.getTime());
		expect(after.location.coordinates).toHaveLength(2); // it did still save
	});

	it('does not call the API again when the address has not changed', async () => {
		geocodeListing.mockResolvedValue({ lat: 7.4177, lng: 3.9022, precision: 'address', label: 'Bodija' });
		const listing = await makeListing();

		await geocodeOne(listing._id);
		const result = await geocodeOne(listing._id);

		expect(result).toEqual({ skipped: true });
		expect(geocodeListing).toHaveBeenCalledTimes(1);
	});

	it('re-geocodes when the landlord edits the address', async () => {
		geocodeListing.mockResolvedValue({ lat: 7.4177, lng: 3.9022, precision: 'address', label: 'Bodija' });
		const listing = await makeListing();
		await geocodeOne(listing._id);

		await Listing.findByIdAndUpdate(listing._id, { area: 'Agbowo' });
		geocodeListing.mockResolvedValue({ lat: 7.4467, lng: 3.9137, precision: 'area', label: 'Agbowo' });
		await geocodeOne(listing._id);

		const saved = await Listing.findById(listing._id);
		expect(geocodeListing).toHaveBeenCalledTimes(2);
		expect(saved.location.coordinates).toEqual([3.9137, 7.4467]);
		expect(saved.geocodePrecision).toBe('area');
	});

	it('leaves the listing usable when the address cannot be found', async () => {
		geocodeListing.mockResolvedValue(null);
		const listing = await makeListing({ area: 'Nowhere At All' });

		const result = await geocodeOne(listing._id);

		expect(result).toBeNull();
		const saved = await Listing.findById(listing._id);
		expect(saved.location).toBeUndefined();
		// The attempt is still stamped, so a failing address isn't retried on
		// every single save.
		expect(saved.geocodedAt).toBeInstanceOf(Date);
	});
});

describe('distanceKm', () => {
	it('measures a known distance', () => {
		// Ibadan to Lagos: ~114 km straight-line. (The widely quoted 128 km is the
		// road distance — not what a haversine should return.)
		const d = distanceKm({ lat: 7.3775, lng: 3.947 }, { lat: 6.5244, lng: 3.3792 });
		expect(d).toBeGreaterThan(110);
		expect(d).toBeLessThan(118);
	});

	it('is zero for the same point and null when a point is missing', () => {
		expect(distanceKm({ lat: 7.4, lng: 3.9 }, { lat: 7.4, lng: 3.9 })).toBe(0);
		expect(distanceKm(null, { lat: 7.4, lng: 3.9 })).toBeNull();
	});
});
