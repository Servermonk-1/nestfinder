import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import companyRoutes from '../routes/companies.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import { IBADAN_COMPANIES } from '../scripts/data/ibadanCompanies.js';

// The suggest endpoint geocodes inline; stub the network so these tests are
// about our logic, not OpenStreetMap's availability.
vi.mock('../utils/geocode.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, geocodeListing: vi.fn() };
});
const { geocodeListing } = await import('../utils/geocode.js');

const app = express();
app.use(express.json());
app.use('/api/companies', companyRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';

let student, other, token, otherToken;
beforeEach(async () => {
	geocodeListing.mockReset().mockResolvedValue({ lat: 7.4, lng: 3.9, precision: 'area', label: 'Oluyole' });

	student = await Student.create({
		fullName: 'Ada', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true, department: 'civil engineering',
	});
	other = await Student.create({
		fullName: 'Bola', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0803', institution: 'AATU', verified: true,
	});
	token = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	otherToken = jwt.sign({ id: other._id, role: 'student' }, SECRET);
});

const asStudent = (r) => r.set('Authorization', `Bearer ${token}`);

describe('the Ibadan dataset itself', () => {
	it('is strictly inside Ibadan', () => {
		// A student cannot commute to Lagos. Anything outside the city makes the
		// whole "housing near my placement" promise false.
		const outside = IBADAN_COMPANIES.filter((c) => c.city !== 'Ibadan' || c.state !== 'Oyo');
		expect(outside).toEqual([]);
	});

	it('has no duplicate names', () => {
		const names = IBADAN_COMPANIES.map((c) => c.name);
		expect(names.length).toBe(new Set(names).size);
	});

	it('tags every entry with a faculty and at least one department', () => {
		const untagged = IBADAN_COMPANIES.filter((c) => !c.faculties?.length || !c.acceptedDepartments?.length);
		expect(untagged.map((c) => c.name)).toEqual([]);
	});

	it('covers all four AATU faculties', () => {
		const covered = new Set(IBADAN_COMPANIES.flatMap((c) => c.faculties));
		expect([...covered].sort()).toEqual([
			'Biological Sciences', 'Engineering', 'Environmental Sciences', 'Natural & Applied Sciences',
		]);
	});

	it('gives every entry a locatable area', () => {
		const noArea = IBADAN_COMPANIES.filter((c) => !c.area?.trim());
		expect(noArea.map((c) => c.name)).toEqual([]);
	});
});

describe('faculty filtering', () => {
	beforeEach(async () => {
		await Company.create([
			{ name: 'Eng Co', industry: 'Construction', address: '1', area: 'Oluyole', city: 'Ibadan', state: 'Oyo',
				verified: true, faculties: ['Engineering'], acceptedDepartments: ['civil engineering'] },
			{ name: 'Bio Co', industry: 'Diagnostics', address: '2', area: 'Bodija', city: 'Ibadan', state: 'Oyo',
				verified: true, faculties: ['Biological Sciences'], acceptedDepartments: ['microbiology'] },
		]);
	});

	it('filters companies by faculty', async () => {
		const res = await request(app).get('/api/companies?faculty=Engineering');
		expect(res.body.companies.map((c) => c.name)).toEqual(['Eng Co']);
	});

	it('lists faculties with counts', async () => {
		const res = await request(app).get('/api/companies/faculties');
		const map = Object.fromEntries(res.body.faculties.map((f) => [f.faculty, f.count]));
		expect(map.Engineering).toBe(1);
		expect(map['Biological Sciences']).toBe(1);
	});
});

describe('a centre that is not in the directory', () => {
	const suggest = (body) =>
		asStudent(request(app).post('/api/companies/suggest')).send(body);

	it('lets a student add their own and anchor to it straight away', async () => {
		// A student whose centre we don't list must not lose the whole feature
		// while waiting on our moderation queue.
		const res = await suggest({ name: 'Adebayo Engineering Services', area: 'Oluyole' });

		expect(res.status).toBe(201);
		expect(res.body.located).toBe(true);
		expect(res.body.company.verified).toBe(false);
		expect(res.body.company.location.coordinates).toEqual([3.9, 7.4]);

		const set = await asStudent(request(app).put('/api/companies/placement'))
			.send({ companyId: res.body.company._id, status: 'confirmed' });
		expect(set.status).toBe(200);
	});

	it('keeps it out of the public directory until an admin checks it', async () => {
		await suggest({ name: 'Adebayo Engineering Services', area: 'Oluyole' });
		const list = await request(app).get('/api/companies');
		expect(list.body.companies.map((c) => c.name)).not.toContain('Adebayo Engineering Services');
	});

	it('stops one student anchoring to another student\'s unchecked entry', async () => {
		// Otherwise an unvetted, possibly bogus address becomes reachable by
		// anyone who can guess its id.
		const { body } = await suggest({ name: 'Private Centre', area: 'Bodija' });

		const res = await request(app).put('/api/companies/placement')
			.set('Authorization', `Bearer ${otherToken}`)
			.send({ companyId: body.company._id, status: 'confirmed' });

		expect(res.status).toBe(400);
	});

	it('reuses an existing entry instead of creating a near-duplicate', async () => {
		await Company.create({
			name: 'Sumal Foods Limited', industry: 'Food', address: '1', area: 'Ojoo',
			city: 'Ibadan', state: 'Oyo', verified: true, acceptedDepartments: [],
		});

		const res = await suggest({ name: 'sumal foods limited', area: 'Ojoo' });

		expect(res.body.existing).toBe(true);
		expect(await Company.countDocuments({ name: /sumal/i })).toBe(1);
	});

	it('insists on a name and a locatable area', async () => {
		expect((await suggest({ area: 'Oluyole' })).status).toBe(400);
		expect((await suggest({ name: 'Nowhere Ltd' })).status).toBe(400);
	});

	it('still saves the centre when it cannot be geocoded', async () => {
		// Losing the record entirely would be worse than an unplaced pin — the
		// student can correct the area afterwards.
		geocodeListing.mockResolvedValue(null);

		const res = await suggest({ name: 'Obscure Workshop', area: 'Somewhere Unmapped' });

		expect(res.status).toBe(201);
		expect(res.body.located).toBe(false);
		expect(await Company.countDocuments({ name: 'Obscure Workshop' })).toBe(1);
	});
});
