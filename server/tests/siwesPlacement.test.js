import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import listingRoutes from '../routes/listings.js';
import companyRoutes from '../routes/companies.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';

const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);
app.use('/api/companies', companyRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';

// Real Ibadan coordinates so the distances mean something.
const AGBOWO = [3.9137, 7.4467];
const BODIJA = [3.9022, 7.4177];   // ~3.5km from Agbowo
const RINGROAD = [3.8605, 7.3682]; // ~9.5km from Agbowo

const listingBase = {
	address: '1 St', state: 'Oyo', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
	description: 'A tidy room.', roomType: 'single', city: 'Ibadan', available: true, flagged: false,
	price: 240000, priceUnit: 'annual',
};

let landlord, student, token, company;

const placeListing = async (title, area, coords) => {
	const l = await Listing.create({ ...listingBase, landlord: landlord._id, title, area });
	await Listing.updateOne({ _id: l._id }, { location: { type: 'Point', coordinates: coords } });
	return l;
};

beforeEach(async () => {
	await Listing.init(); // build the 2dsphere index before any $nearSphere query

	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '0801', verified: true,
	});
	student = await Student.create({
		fullName: 'Ada', email: `s-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10), phone: '0802', institution: 'AATU',
		verified: true, emailVerified: true, department: 'computer science',
	});
	token = jwt.sign({ id: student._id, role: 'student' }, SECRET);

	company = await Company.create({
		name: 'Test Tech Ltd', industry: 'Software', address: '1 Rd',
		area: 'Agbowo', city: 'Ibadan', state: 'Oyo', verified: true,
		acceptedDepartments: ['Computer Science', 'computer science', 'Cyber Security'],
		location: { type: 'Point', coordinates: AGBOWO },
	});

	await placeListing('Near room', 'Bodija', BODIJA);
	await placeListing('Far room', 'Ring Road', RINGROAD);
});

const asStudent = (r) => r.set('Authorization', `Bearer ${token}`);
const setPlacement = (status) =>
	asStudent(request(app).put('/api/companies/placement')).send({ companyId: company._id, status });

describe('company directory', () => {
	it('de-duplicates and lowercases accepted departments', async () => {
		// Students type their department themselves, so "Computer Science" and
		// "computer science" must not become two different departments.
		const saved = await Company.findById(company._id);
		expect(saved.acceptedDepartments).toEqual(['computer science', 'cyber security']);
	});

	it('finds companies that take a given department', async () => {
		const res = await request(app).get('/api/companies?department=Computer%20Science');
		expect(res.status).toBe(200);
		expect(res.body.companies.map((c) => c.name)).toContain('Test Tech Ltd');

		const none = await request(app).get('/api/companies?department=fine%20art');
		expect(none.body.companies).toHaveLength(0);
	});

	it('uses the department on the student profile for mine=1', async () => {
		const res = await asStudent(request(app).get('/api/companies?mine=1'));
		expect(res.body.department).toBe('computer science');
		expect(res.body.companies).toHaveLength(1);
	});

	it('asks for a department rather than silently showing everything', async () => {
		await Student.updateOne({ _id: student._id }, { $unset: { department: '' } });
		const res = await asStudent(request(app).get('/api/companies?mine=1'));
		expect(res.body.needsDepartment).toBe(true);
		expect(res.body.companies).toHaveLength(0);
	});

	it('hides unverified companies from the directory', async () => {
		await Company.create({
			name: 'Unchecked Ltd', industry: 'Software', address: '2 Rd',
			area: 'Bodija', city: 'Ibadan', state: 'Oyo', verified: false,
			acceptedDepartments: ['computer science'],
		});
		const res = await request(app).get('/api/companies');
		expect(res.body.companies.map((c) => c.name)).not.toContain('Unchecked Ltd');
	});
});

describe('housing near my placement', () => {
	const search = (qs = '') => asStudent(request(app).get(`/api/listings/search?nearPlacement=1${qs}`));

	it('orders results by distance from the placement', async () => {
		await setPlacement('confirmed');
		const res = await search();

		expect(res.status).toBe(200);
		expect(res.body.listings.map((l) => l.title)).toEqual(['Near room', 'Far room']);
		expect(res.body.anchor.name).toBe('Test Tech Ltd');
	});

	it('attaches a real distance to each listing', async () => {
		await setPlacement('confirmed');
		const [near, far] = (await search()).body.listings;

		// Agbowo→Bodija is roughly 3–4km; Agbowo→Ring Road roughly 9–10km.
		expect(near.distanceKm).toBeGreaterThan(2);
		expect(near.distanceKm).toBeLessThan(5);
		expect(far.distanceKm).toBeGreaterThan(8);
		expect(far.distanceKm).toBeLessThan(11);
	});

	it('excludes listings beyond the radius', async () => {
		await setPlacement('confirmed');
		const res = await search('&radiusKm=5');
		expect(res.body.listings.map((l) => l.title)).toEqual(['Near room']);
	});

	it('REFUSES to anchor on a placement that is not confirmed', async () => {
		// Pointing someone's entire accommodation search at a company they have
		// merely applied to would be worse than not offering the feature.
		await setPlacement('applied');
		const res = await search();

		expect(res.body.needsPlacement).toBe(true);
		expect(res.body.listings).toHaveLength(0);
		expect(res.body.message).toMatch(/confirm/i);
	});

	it('asks for a placement when there is none', async () => {
		const res = await search();
		expect(res.body.needsPlacement).toBe(true);
		expect(res.body.message).toMatch(/add your siwes placement/i);
	});

	it('leaves an ordinary search untouched', async () => {
		await setPlacement('confirmed');
		const res = await asStudent(request(app).get('/api/listings/search'));
		expect(res.body.anchor).toBeUndefined();
		expect(res.body.listings[0].distanceKm).toBeUndefined();
	});
});

describe('placement on the listing detail page', () => {
	it('returns the distance from a confirmed placement', async () => {
		await setPlacement('confirmed');
		const listing = await Listing.findOne({ title: 'Near room' });

		const res = await asStudent(request(app).get(`/api/listings/${listing._id}`));

		expect(res.body.placement.company).toBe('Test Tech Ltd');
		expect(res.body.placement.distanceKm).toBeGreaterThan(2);
	});

	it('returns no placement when it is unconfirmed', async () => {
		await setPlacement('applied');
		const listing = await Listing.findOne({ title: 'Near room' });

		const res = await asStudent(request(app).get(`/api/listings/${listing._id}`));
		expect(res.body.placement).toBeNull();
	});
});
