import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import companyRoutes from '../routes/companies.js';
import Admin from '../models/Admin.js';
import Company from '../models/Company.js';

vi.mock('../utils/geocode.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, geocodeListing: vi.fn() };
});
const { geocodeListing } = await import('../utils/geocode.js');

const app = express();
app.use(express.json());
app.use('/api/companies', companyRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const PIN = { lat: 7.38412, lng: 3.89765 };
const GUESS = { lat: 7.4, lng: 3.9, precision: 'area', label: 'Oluyole' };

const base = {
	name: 'Test Works Ltd', industry: 'Fabrication', address: '5 Factory Rd',
	area: 'Oluyole', city: 'Ibadan', state: 'Oyo',
};

let token;
beforeEach(async () => {
	geocodeListing.mockReset().mockResolvedValue(GUESS);
	const admin = await Admin.create({
		fullName: 'Root', email: `a-${Math.random()}@x.io`,
		password: await bcrypt.hash('pw', 10),
	});
	token = jwt.sign({ id: admin._id, role: 'admin' }, SECRET);
});

const post = (body) => request(app).post('/api/companies').set('Authorization', `Bearer ${token}`).send(body);
const put = (id, body) => request(app).put(`/api/companies/${id}`).set('Authorization', `Bearer ${token}`).send(body);

describe('an admin adding a placement centre', () => {
	it('keeps a pin placed while adding', async () => {
		// Previously createCompany dropped lat/lng on the floor, so an admin who
		// positioned the pin while adding silently lost it to the geocoder.
		const res = await post({ ...base, lat: PIN.lat, lng: PIN.lng });

		expect(res.status).toBe(201);
		const saved = await Company.findById(res.body.company._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('admin');
	});

	it('falls back to geocoding when no pin is placed', async () => {
		const res = await post(base);
		// Background geocode; give the fire-and-forget a moment.
		await new Promise((r) => setTimeout(r, 60));

		const saved = await Company.findById(res.body.company._id);
		expect(saved.locationSource).toBe('geocoded');
		expect(saved.location.coordinates).toEqual([GUESS.lng, GUESS.lat]);
	});

	it('accepts departments typed as a comma-separated string', async () => {
		const res = await post({ ...base, acceptedDepartments: 'Civil Engineering, Surveying , ' });
		const saved = await Company.findById(res.body.company._id);
		expect(saved.acceptedDepartments).toEqual(['civil engineering', 'surveying']);
	});

	it('refuses coordinates that are off the globe', async () => {
		// A silently-bad pin puts a real workplace in the ocean and every commute
		// measured from it becomes nonsense.
		const res = await post({ ...base, lat: 999, lng: 3.9 });
		await new Promise((r) => setTimeout(r, 60));

		const saved = await Company.findById(res.body.company._id);
		expect(saved.locationSource).not.toBe('admin');
	});
});

describe('an admin editing a placement centre', () => {
	it('records a moved pin as admin-placed', async () => {
		const c = await Company.create(base);
		await put(c._id, { lat: PIN.lat, lng: PIN.lng });

		const saved = await Company.findById(c._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
		expect(saved.locationSource).toBe('admin');
		expect(saved.geocodePrecision).toBe('address');
	});

	it('does NOT claim an admin placed the pin when they only edited text', async () => {
		// The editor shows the current pin so it can be judged. Merely opening the
		// form and renaming the company must not upgrade a machine guess into
		// "a human confirmed this".
		const c = await Company.create({ ...base, locationSource: 'geocoded' });
		await Company.updateOne({ _id: c._id }, { location: { type: 'Point', coordinates: [3.9, 7.4] } });

		await put(c._id, { name: 'Renamed Works Ltd' });

		const saved = await Company.findById(c._id);
		expect(saved.name).toBe('Renamed Works Ltd');
		expect(saved.locationSource).toBe('geocoded');
	});

	it('leaves an admin pin alone when the geocoder runs afterwards', async () => {
		const { geocodeCompany } = await import('../services/geocodeCompany.js');
		const c = await Company.create(base);
		await put(c._id, { lat: PIN.lat, lng: PIN.lng });

		await geocodeCompany(c._id, { force: true });

		const saved = await Company.findById(c._id);
		expect(saved.location.coordinates).toEqual([PIN.lng, PIN.lat]);
	});

	it('is closed to non-admins', async () => {
		const c = await Company.create(base);
		const res = await request(app).put(`/api/companies/${c._id}`).send({ name: 'Hijacked' });
		expect([401, 403]).toContain(res.status);
	});
});
