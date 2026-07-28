import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import companyRoutes from '../routes/companies.js';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Company from '../models/Company.js';
import CompanyFeedback from '../models/CompanyFeedback.js';

vi.mock('../utils/geocode.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, geocodeListing: vi.fn() };
});
const { geocodeListing } = await import('../utils/geocode.js');

const app = express();
app.use(express.json());
app.use('/api/companies', companyRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const AGBOWO = [3.9137, 7.4467];
const BODIJA = [3.9022, 7.4177];   // ~3.5km from Agbowo
const RINGROAD = [3.8605, 7.3682]; // ~9.5km from Agbowo

let admin, adminToken, student, studentToken, other, otherToken, landlord, landlordToken, company;

beforeEach(async () => {
	geocodeListing.mockReset().mockResolvedValue({ lat: 7.4, lng: 3.9, precision: 'area', label: 'Ibadan' });

	admin = await Admin.create({ fullName: 'Root', email: `a-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10) });
	adminToken = jwt.sign({ id: admin._id, role: 'admin' }, SECRET);

	company = await Company.create({
		name: 'IBEDC', industry: 'Power', address: '1 Rd', area: 'Agbowo', city: 'Ibadan', state: 'Oyo',
		verified: true, acceptedDepartments: ['electrical engineering'],
		location: { type: 'Point', coordinates: AGBOWO },
	});

	student = await Student.create({
		fullName: 'Ada Bello', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0801', institution: 'AATU', verified: true, department: 'electrical engineering',
		placement: { company: company._id, status: 'confirmed' },
	});
	other = await Student.create({
		fullName: 'Bola Cole', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true,
	});
	studentToken = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	otherToken = jwt.sign({ id: other._id, role: 'student' }, SECRET);

	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0803', verified: true,
	});
	landlordToken = jwt.sign({ id: landlord._id, role: 'landlord' }, SECRET);
});

const asAdmin = (r) => r.set('Authorization', `Bearer ${adminToken}`);
const asStudent = (r) => r.set('Authorization', `Bearer ${studentToken}`);
const asOther = (r) => r.set('Authorization', `Bearer ${otherToken}`);
const asLandlord = (r) => r.set('Authorization', `Bearer ${landlordToken}`);

describe('telling students their placement centre was removed', () => {
	it('clears the placement AND leaves a notice explaining why', async () => {
		// Without this the search silently stops being anchored and the student
		// never learns why their commute figures vanished.
		const res = await asAdmin(request(app).delete(`/api/companies/${company._id}`));

		expect(res.status).toBe(200);
		expect(res.body.studentsNotified).toBe(1);

		const me = await Student.findById(student._id).lean();
		expect(me.placement?.company).toBeUndefined();
		expect(me.placementNotice.companyName).toBe('IBEDC');
		expect(me.placementNotice.reason).toBe('removed');
	});

	it('surfaces the notice on the placement endpoint, and lets it be dismissed', async () => {
		await asAdmin(request(app).delete(`/api/companies/${company._id}`));

		const before = await asStudent(request(app).get('/api/companies/placement/me'));
		expect(before.body.notice.companyName).toBe('IBEDC');

		await asStudent(request(app).delete('/api/companies/placement/notice'));

		const after = await asStudent(request(app).get('/api/companies/placement/me'));
		expect(after.body.notice).toBeNull();
	});
});

describe('feedback from students who actually trained there', () => {
	const post = (body, as = asStudent) => as(request(app).post(`/api/companies/${company._id}/feedback`)).send(body);

	it('accepts a review from the student whose confirmed placement it is', async () => {
		const res = await post({ rating: 4, comment: 'Real work, good supervisor.', stipendPaid: true, wouldRecommend: true });
		expect(res.status).toBe(201);

		const list = await request(app).get(`/api/companies/${company._id}/feedback`);
		expect(list.body.count).toBe(1);
		expect(list.body.average).toBe(4);
		expect(list.body.stipendPaidCount).toBe(1);
	});

	it('REFUSES a review from someone who never trained there', async () => {
		// Unverifiable praise or complaint attached to a named real employer
		// invites both astroturfing and defamation.
		const res = await post({ rating: 5 }, asOther);
		expect(res.status).toBe(403);
		expect(res.body.needsPlacement).toBe(true);
	});

	it('refuses a review when the placement is only "applied"', async () => {
		await Student.updateOne({ _id: student._id }, { 'placement.status': 'applied' });
		expect((await post({ rating: 5 })).status).toBe(403);
	});

	it('allows only one review per student per company', async () => {
		await post({ rating: 4 });
		const dup = await post({ rating: 1 });
		expect(dup.status).toBe(400);
		expect(await CompanyFeedback.countDocuments({ company: company._id })).toBe(1);
	});

	it('rejects an out-of-range rating', async () => {
		expect((await post({ rating: 9 })).status).toBe(400);
		expect((await post({ rating: 0 })).status).toBe(400);
		expect((await post({})).status).toBe(400);
	});

	it('shows the reviewer as a first name and initial, not in full', async () => {
		await post({ rating: 5 });
		// Read as somebody else, so it lands in the public list rather than "mine".
		const list = await asOther(request(app).get(`/api/companies/${company._id}/feedback`));
		expect(list.body.feedback[0].reviewer).toBe('Ada B.');
		expect(JSON.stringify(list.body)).not.toContain('Ada Bello');
	});

	it('lets the author edit and delete, but nobody else', async () => {
		const { body } = await post({ rating: 3 });
		const id = body.feedback._id;

		expect((await asOther(request(app).patch(`/api/companies/feedback/${id}`)).send({ rating: 1 })).status).toBe(403);
		expect((await asStudent(request(app).patch(`/api/companies/feedback/${id}`)).send({ rating: 5 })).status).toBe(200);
		expect((await asOther(request(app).delete(`/api/companies/feedback/${id}`))).status).toBe(403);
		expect((await asStudent(request(app).delete(`/api/companies/feedback/${id}`))).status).toBe(200);
	});

	it('lets an admin remove feedback for moderation', async () => {
		const { body } = await post({ rating: 1, comment: 'abusive' });
		const res = await asAdmin(request(app).delete(`/api/companies/feedback/${body.feedback._id}`));
		expect(res.status).toBe(200);
	});
});

describe('placement centres near a landlord\'s listing', () => {
	let listing;
	beforeEach(async () => {
		await Company.init();
		listing = await Listing.create({
			title: 'Room', description: 'A tidy room.', address: '1 St', area: 'Bodija', city: 'Ibadan',
			state: 'Oyo', price: 240000, roomType: 'single', rooms: 1, contactPhone: '0800',
			contactEmail: 'x@x.io', landlord: landlord._id,
		});
		await Listing.updateOne({ _id: listing._id }, { location: { type: 'Point', coordinates: BODIJA } });
	});

	const near = (id, qs = '', as = asLandlord) => as(request(app).get(`/api/companies/near-listing/${id}${qs}`));

	it('lists centres within reach, nearest first, with distances', async () => {
		await Company.create({
			name: 'Far Co', industry: 'X', address: '2', area: 'Ring Road', city: 'Ibadan', state: 'Oyo',
			verified: true, location: { type: 'Point', coordinates: RINGROAD },
		});

		const res = await near(listing._id, '?radiusKm=15');

		expect(res.status).toBe(200);
		expect(res.body.companies.map((c) => c.name)).toEqual(['IBEDC', 'Far Co']);
		expect(res.body.companies[0].distanceKm).toBeLessThan(res.body.companies[1].distanceKm);
	});

	it('honours the radius', async () => {
		const res = await near(listing._id, '?radiusKm=2');
		expect(res.body.companies).toHaveLength(0);
	});

	it('asks for a map pin when the listing has none', async () => {
		const unplaced = await Listing.create({
			title: 'Unplaced', description: 'A room.', address: '9 St', area: 'Nowhere', city: 'Ibadan',
			state: 'Oyo', price: 100000, roomType: 'single', rooms: 1, contactPhone: '0', contactEmail: 'x@x.io',
			landlord: landlord._id,
		});
		const res = await near(unplaced._id);
		expect(res.body.needsLocation).toBe(true);
	});

	it('will not show another landlord\'s listing', async () => {
		// This is commercial information about someone else's property.
		const res = await near(listing._id, '', asStudent);
		expect(res.status).toBe(403);
	});
});

describe('bulk import', () => {
	const bulk = (companies, as = asAdmin) => as(request(app).post('/api/companies/bulk')).send({ companies });

	it('imports many at once and reports each outcome', async () => {
		const res = await bulk([
			{ name: 'Alpha Ltd', area: 'Oluyole', industry: 'Manufacturing', acceptedDepartments: 'mechanical engineering' },
			{ name: 'Beta Ltd', area: 'Bodija', faculties: ['Engineering'] },
			{ name: 'IBEDC', area: 'Agbowo' },   // already exists
			{ name: '', area: 'Oluyole' },       // no name
			{ name: 'Gamma Ltd' },               // no area
		]);

		expect(res.status).toBe(200);
		expect(res.body.added.map((a) => a.name)).toEqual(['Alpha Ltd', 'Beta Ltd']);
		expect(res.body.skipped[0].name).toBe('IBEDC');
		expect(res.body.failed).toHaveLength(2);

		const alpha = await Company.findOne({ name: 'Alpha Ltd' }).lean();
		expect(alpha.acceptedDepartments).toEqual(['mechanical engineering']);
		expect(alpha.verified).toBe(true);
		expect(alpha.city).toBe('Ibadan'); // defaults, since this platform is Ibadan-only
	});

	it('does not abandon the whole batch because one row is bad', async () => {
		const res = await bulk([{ name: 'Good Ltd', area: 'Apata' }, { area: 'no name here' }]);
		expect(res.body.added).toHaveLength(1);
		expect(res.body.failed).toHaveLength(1);
	});

	it('rejects an empty payload and an oversized one', async () => {
		expect((await bulk([])).status).toBe(400);
		const huge = Array.from({ length: 201 }, (_, i) => ({ name: `C${i}`, area: 'Oluyole' }));
		expect((await bulk(huge)).status).toBe(400);
	});

	it('is closed to non-admins', async () => {
		const res = await bulk([{ name: 'Sneaky Ltd', area: 'Oluyole' }], asStudent);
		expect([401, 403]).toContain(res.status);
		expect(await Company.findOne({ name: 'Sneaky Ltd' })).toBeNull();
	});
});
