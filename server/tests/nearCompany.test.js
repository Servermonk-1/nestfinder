import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import listingRoutes from '../routes/listings.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const AGBOWO = [3.9137, 7.4467];
const BODIJA = [3.9022, 7.4177];   // ~3.5km away
const RINGROAD = [3.8605, 7.3682]; // ~9.5km away

const base = {
	address: '1 St', state: 'Oyo', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
	description: 'A tidy room.', roomType: 'single', city: 'Ibadan', available: true, flagged: false,
	price: 240000, priceUnit: 'annual',
};

let landlord, student, other, token, otherToken, company;

beforeEach(async () => {
	await Listing.init();
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '0801', verified: true,
	});
	student = await Student.create({
		fullName: 'Ada', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true,
	});
	other = await Student.create({
		fullName: 'Bola', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0803', institution: 'AATU', verified: true,
	});
	token = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	otherToken = jwt.sign({ id: other._id, role: 'student' }, SECRET);

	company = await Company.create({
		name: 'IBEDC', industry: 'Power', address: '1 Rd', area: 'Agbowo',
		city: 'Ibadan', state: 'Oyo', verified: true, acceptedDepartments: [],
		location: { type: 'Point', coordinates: AGBOWO },
	});

	for (const [title, area, coords] of [['Near room', 'Bodija', BODIJA], ['Far room', 'Ring Road', RINGROAD]]) {
		const l = await Listing.create({ ...base, landlord: landlord._id, title, area });
		await Listing.updateOne({ _id: l._id }, { location: { type: 'Point', coordinates: coords } });
	}
});

const near = (qs = '') => request(app).get(`/api/listings/search?nearCompany=${company._id}${qs}`);

describe('housing near a named company', () => {
	it('works without logging in, nearest first', async () => {
		// A student weighing two placement offers needs to see the housing around
		// each one BEFORE accepting either, so this can't require a placement.
		const res = await near();

		expect(res.status).toBe(200);
		expect(res.body.listings.map((l) => l.title)).toEqual(['Near room', 'Far room']);
		expect(res.body.anchor.name).toBe('IBEDC');
	});

	it('returns the anchor coordinates so the map can pin the workplace', async () => {
		const { body } = await near();
		expect(body.anchor.lat).toBeCloseTo(AGBOWO[1], 3);
		expect(body.anchor.lng).toBeCloseTo(AGBOWO[0], 3);
	});

	it('honours the radius', async () => {
		const res = await near('&radiusKm=5');
		expect(res.body.listings.map((l) => l.title)).toEqual(['Near room']);
		expect(res.body.anchor.radiusKm).toBe(5);
	});

	it('attaches a distance to every listing', async () => {
		const [a, b] = (await near()).body.listings;
		expect(a.distanceKm).toBeGreaterThan(2);
		expect(a.distanceKm).toBeLessThan(5);
		expect(b.distanceKm).toBeGreaterThan(8);
	});

	it('will not expose another student\'s unverified centre', async () => {
		// Unverified centres are private to whoever added them; otherwise their
		// address could be probed by anyone who guesses the id.
		const priv = await Company.create({
			name: 'Private Centre', industry: 'X', address: '2', area: 'Bodija',
			city: 'Ibadan', state: 'Oyo', verified: false, suggestedBy: student._id,
			location: { type: 'Point', coordinates: BODIJA },
		});

		const stranger = await request(app)
			.get(`/api/listings/search?nearCompany=${priv._id}`)
			.set('Authorization', `Bearer ${otherToken}`);
		expect(stranger.body.listings).toHaveLength(0);

		const owner = await request(app)
			.get(`/api/listings/search?nearCompany=${priv._id}`)
			.set('Authorization', `Bearer ${token}`);
		expect(owner.body.listings.length).toBeGreaterThan(0);
	});

	it('copes with a company that has no coordinates', async () => {
		const unplaced = await Company.create({
			name: 'Unplaced', industry: 'X', address: '3', area: 'Nowhere',
			city: 'Ibadan', state: 'Oyo', verified: true,
		});
		const res = await request(app).get(`/api/listings/search?nearCompany=${unplaced._id}`);
		expect(res.status).toBe(200);
		expect(res.body.listings).toHaveLength(0);
	});

	it('does not fall over on a rubbish id', async () => {
		const res = await request(app).get('/api/listings/search?nearCompany=not-an-id');
		expect(res.status).toBe(200);
		expect(res.body.listings).toHaveLength(0);
	});
});

describe('placement dates on the listing detail', () => {
	it('returns the SIWES period so the lease length can be checked', async () => {
		await Student.updateOne({ _id: student._id }, {
			placement: {
				company: company._id, status: 'confirmed',
				startDate: new Date('2026-06-01'), endDate: new Date('2026-11-30'),
			},
		});
		const listing = await Listing.findOne({ title: 'Near room' });

		const res = await request(app)
			.get(`/api/listings/${listing._id}`)
			.set('Authorization', `Bearer ${token}`);

		expect(new Date(res.body.placement.startDate).getUTCMonth()).toBe(5); // June
		expect(new Date(res.body.placement.endDate).getUTCMonth()).toBe(10);  // November
	});
});
