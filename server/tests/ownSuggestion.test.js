import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import companyRoutes from '../routes/companies.js';
import Student from '../models/Student.js';
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

let owner, stranger, ownerToken, strangerToken, mine;
beforeEach(async () => {
	geocodeListing.mockReset().mockResolvedValue({ lat: 7.4, lng: 3.9, precision: 'area', label: 'Bodija' });

	owner = await Student.create({
		fullName: 'Ada', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0801', institution: 'AATU', verified: true,
	});
	stranger = await Student.create({
		fullName: 'Bola', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true,
	});
	ownerToken = jwt.sign({ id: owner._id, role: 'student' }, SECRET);
	strangerToken = jwt.sign({ id: stranger._id, role: 'student' }, SECRET);

	mine = await Company.create({
		name: 'My Workshop', industry: 'Fabrication', address: '1 Rd', area: 'Bodija',
		city: 'Ibadan', state: 'Oyo', verified: false, suggestedBy: owner._id,
	});
	await Student.updateOne({ _id: owner._id }, {
		placement: { company: mine._id, status: 'confirmed' },
	});
});

const asOwner = (r) => r.set('Authorization', `Bearer ${ownerToken}`);
const asStranger = (r) => r.set('Authorization', `Bearer ${strangerToken}`);

describe('viewing a centre you added yourself', () => {
	it('lets the owner open it', async () => {
		// They can already anchor their entire housing search to it, so 404-ing
		// the page was simply inconsistent.
		const res = await asOwner(request(app).get(`/api/companies/${mine._id}`));

		expect(res.status).toBe(200);
		expect(res.body.isOwner).toBe(true);
		expect(res.body.awaitingReview).toBe(true);
	});

	it('still hides it from everyone else', async () => {
		expect((await asStranger(request(app).get(`/api/companies/${mine._id}`))).status).toBe(404);
		expect((await request(app).get(`/api/companies/${mine._id}`)).status).toBe(404);
	});

	it('does not fall over on a rubbish id', async () => {
		const res = await request(app).get('/api/companies/not-an-id');
		expect(res.status).toBe(404);
	});
});

describe('correcting a centre you added', () => {
	const put = (id, body, as = asOwner) => as(request(app).put(`/api/companies/mine/${id}`)).send(body);

	it('re-locates it when the area is fixed', async () => {
		// The usual reason to edit is that the pin landed in the wrong place.
		geocodeListing.mockResolvedValue({ lat: 7.4467, lng: 3.9137, precision: 'area', label: 'Agbowo' });

		const res = await put(mine._id, { area: 'Agbowo' });

		expect(res.status).toBe(200);
		const saved = await Company.findById(mine._id);
		expect(saved.area).toBe('Agbowo');
		expect(saved.location.coordinates).toEqual([3.9137, 7.4467]);
	});

	it('refuses an empty name or a location we cannot use', async () => {
		expect((await put(mine._id, { name: '   ' })).status).toBe(400);
		expect((await put(mine._id, { area: '', address: '' })).status).toBe(400);
	});

	it('will not let another student edit it', async () => {
		const res = await put(mine._id, { name: 'Hijacked' }, asStranger);
		expect(res.status).toBe(403);
		expect((await Company.findById(mine._id)).name).toBe('My Workshop');
	});

	it('stops being editable once an admin publishes it', async () => {
		// At that point other students rely on it; one person must not be able to
		// rewrite a shared directory entry.
		await Company.updateOne({ _id: mine._id }, { verified: true });

		const res = await put(mine._id, { name: 'Renamed' });
		expect(res.status).toBe(403);
	});
});

describe('withdrawing a centre you added', () => {
	const del = (id, as = asOwner) => as(request(app).delete(`/api/companies/mine/${id}`));

	it('removes it and clears the placement pointing at it', async () => {
		const res = await del(mine._id);

		expect(res.status).toBe(200);
		expect(await Company.findById(mine._id)).toBeNull();
		const me = await Student.findById(owner._id).lean();
		expect(me.placement?.company).toBeUndefined();
	});

	it('will not let another student remove it', async () => {
		expect((await del(mine._id, asStranger)).status).toBe(403);
		expect(await Company.findById(mine._id)).not.toBeNull();
	});

	it('stops being removable once published', async () => {
		await Company.updateOne({ _id: mine._id }, { verified: true });
		expect((await del(mine._id)).status).toBe(403);
	});
});
