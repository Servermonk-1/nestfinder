import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import savedSearchRoutes from '../routes/savedSearches.js';
import listingRoutes from '../routes/listings.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Company from '../models/Company.js';
import SavedSearch from '../models/SavedSearch.js';
import { buildListingFilter } from '../utils/listingFilter.js';

// Watch the mail path without ever sending. Email is LIVE in this project.
vi.mock('../config/email.js', async (importOriginal) => {
	const actual = await importOriginal();
	return { ...actual, sendSavedSearchAlertEmail: vi.fn().mockResolvedValue({ demo: true }) };
});
const { sendSavedSearchAlertEmail } = await import('../config/email.js');
const { notifyMatchingSearches } = await import('../services/savedSearchAlerts.js');

const app = express();
app.use(express.json());
app.use('/api/saved-searches', savedSearchRoutes);
app.use('/api/listings', listingRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const AGBOWO = [3.9137, 7.4467];
const BODIJA = [3.9022, 7.4177];   // ~3.5km from Agbowo
const RINGROAD = [3.8605, 7.3682]; // ~9.5km from Agbowo

const base = {
	address: '1 St', state: 'Oyo', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
	description: 'A tidy room with steady power.', available: true, flagged: false,
	priceUnit: 'annual',
};

let student, other, landlord, sToken, oToken;

beforeEach(async () => {
	sendSavedSearchAlertEmail.mockClear();
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0801', verified: true,
	});
	student = await Student.create({
		fullName: 'Ada', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true,
	});
	other = await Student.create({
		fullName: 'Bola', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0803', institution: 'AATU', verified: true,
	});
	sToken = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	oToken = jwt.sign({ id: other._id, role: 'student' }, SECRET);
});

const as = (r, t = sToken) => r.set('Authorization', `Bearer ${t}`);
const save = (body, t = sToken) => as(request(app).post('/api/saved-searches'), t).send(body);

const makeListing = (over = {}) => Listing.create({
	...base, landlord: landlord._id, title: 'Room', city: 'Ibadan', area: 'Bodija',
	roomType: 'single', price: 240000, ...over,
});

describe('saved searches', () => {
	it('saves a search and describes it in words', async () => {
		const res = await save({
			name: 'Cheap self-contained',
			criteria: { roomType: 'self-contained', city: 'Ibadan', maxPrice: 25000 },
		});
		expect(res.status).toBe(201);
		expect(res.body.search.description).toContain('self contained');
		expect(res.body.search.description).toContain('Ibadan');
	});

	it('reports how many homes currently match', async () => {
		await makeListing({ title: 'A', roomType: 'single' });
		await makeListing({ title: 'B', roomType: 'shared' });
		await save({ name: 'Singles', criteria: { roomType: 'single' } });

		const res = await as(request(app).get('/api/saved-searches'));
		expect(res.body.searches[0].total).toBe(1);
	});

	it('refuses a blank name and a duplicate name', async () => {
		expect((await save({ name: '  ', criteria: {} })).status).toBe(400);
		await save({ name: 'Mine', criteria: {} });
		expect((await save({ name: 'Mine', criteria: {} })).status).toBe(400);
	});

	it('ignores criteria fields the live search does not understand', async () => {
		// Otherwise a client could smuggle arbitrary query into the filter.
		const res = await save({
			name: 'Odd', criteria: { roomType: 'penthouse', nonsense: 'x', maxPrice: 'abc' },
		});
		const saved = await SavedSearch.findById(res.body.search._id).lean();
		expect(saved.criteria.roomType).toBeUndefined();
		expect(saved.criteria.nonsense).toBeUndefined();
		expect(saved.criteria.maxPrice).toBeUndefined();
	});

	it('lets the owner rename, mute and delete — and nobody else', async () => {
		const { body } = await save({ name: 'Mine', criteria: {} });
		const id = body.search._id;

		expect((await as(request(app).patch(`/api/saved-searches/${id}`), oToken).send({ name: 'Theirs' })).status).toBe(403);
		expect((await as(request(app).delete(`/api/saved-searches/${id}`), oToken)).status).toBe(403);

		expect((await as(request(app).patch(`/api/saved-searches/${id}`)).send({ alertsEnabled: false })).status).toBe(200);
		expect((await SavedSearch.findById(id)).alertsEnabled).toBe(false);
		expect((await as(request(app).delete(`/api/saved-searches/${id}`))).status).toBe(200);
	});

	it('only shows a student their own searches', async () => {
		await save({ name: 'Mine', criteria: {} });
		const theirs = await as(request(app).get('/api/saved-searches'), oToken);
		expect(theirs.body.searches).toHaveLength(0);
	});
});

describe('alerts when a new listing appears', () => {
	it('emails the student whose search it matches', async () => {
		await save({ name: 'Bodija singles', criteria: { area: 'Bodija', roomType: 'single' } });
		const listing = await makeListing({ title: 'New Bodija Room', area: 'Bodija', roomType: 'single' });

		const res = await notifyMatchingSearches(listing._id);

		expect(res.notified).toBe(1);
		expect(sendSavedSearchAlertEmail).toHaveBeenCalledTimes(1);
		expect(sendSavedSearchAlertEmail.mock.calls[0][2].title).toBe('New Bodija Room');
	});

	it('stays quiet when the listing does not match', async () => {
		await save({ name: 'Shared only', criteria: { roomType: 'shared' } });
		const listing = await makeListing({ roomType: 'single' });

		expect((await notifyMatchingSearches(listing._id)).notified).toBe(0);
		expect(sendSavedSearchAlertEmail).not.toHaveBeenCalled();
	});

	it('THROTTLES — five listings in a row send one email, not five', async () => {
		// A landlord uploading their whole portfolio must not empty itself into
		// a student's inbox.
		await save({ name: 'Anything', criteria: {} });

		for (let i = 0; i < 5; i++) {
			const l = await makeListing({ title: `Room ${i}` });
			await notifyMatchingSearches(l._id);
		}

		expect(sendSavedSearchAlertEmail).toHaveBeenCalledTimes(1);
		// The badge still counts every one of them.
		const s = await SavedSearch.findOne({ student: student._id }).lean();
		expect(s.newMatchCount).toBe(5);
	});

	it('respects alerts being turned off', async () => {
		const { body } = await save({ name: 'Muted', criteria: {}, alertsEnabled: false });
		expect(body.search.alertsEnabled).toBe(false);

		const l = await makeListing();
		expect((await notifyMatchingSearches(l._id)).notified).toBe(0);
	});

	it('never alerts about an unavailable or flagged listing', async () => {
		await save({ name: 'Anything', criteria: {} });
		const hidden = await makeListing({ available: false });
		const flagged = await makeListing({ title: 'Flagged', flagged: true });

		expect((await notifyMatchingSearches(hidden._id)).notified).toBe(0);
		expect((await notifyMatchingSearches(flagged._id)).notified).toBe(0);
	});

	it('honours an anchored search, and refuses to widen it without a placement', async () => {
		await Listing.init();
		const company = await Company.create({
			name: 'IBEDC', industry: 'Power', address: '1', area: 'Agbowo', city: 'Ibadan',
			state: 'Oyo', verified: true, location: { type: 'Point', coordinates: AGBOWO },
		});
		await save({ name: 'Near work', criteria: { nearPlacement: true, radiusKm: 5 } });

		const near = await makeListing({ title: 'Near', area: 'Bodija' });
		await Listing.updateOne({ _id: near._id }, { location: { type: 'Point', coordinates: BODIJA } });

		// No confirmed placement yet: the anchor is meaningless, so it must NOT
		// fall back to matching the whole city.
		expect((await notifyMatchingSearches(near._id)).notified).toBe(0);

		await Student.updateOne({ _id: student._id }, {
			placement: { company: company._id, status: 'confirmed' },
		});
		expect((await notifyMatchingSearches(near._id)).notified).toBe(1);

		// And something outside the radius still doesn't qualify.
		sendSavedSearchAlertEmail.mockClear();
		await SavedSearch.updateMany({}, { $unset: { lastNotifiedAt: '' } });
		const far = await makeListing({ title: 'Far', area: 'Ring Road' });
		await Listing.updateOne({ _id: far._id }, { location: { type: 'Point', coordinates: RINGROAD } });
		expect((await notifyMatchingSearches(far._id)).notified).toBe(0);
	});
});

describe('the shared filter builder', () => {
	it('is what the live search uses, so alerts cannot describe unreachable homes', async () => {
		// Build the filter the same way the search route does, and confirm the
		// alert path agrees about what matches.
		const criteria = { roomType: 'single', area: 'Bodija', maxPrice: 25000 };
		await makeListing({ title: 'Match', roomType: 'single', area: 'Bodija', price: 240000 });
		await makeListing({ title: 'Too dear', roomType: 'single', area: 'Bodija', price: 900000 });

		const viaBuilder = await Listing.find(buildListingFilter(criteria)).select('title').lean();
		const viaApi = await request(app).get('/api/listings/search')
			.query({ roomType: 'single', area: 'Bodija', maxPrice: 25000 });

		expect(viaBuilder.map((l) => l.title)).toEqual(['Match']);
		expect(viaApi.body.listings.map((l) => l.title)).toEqual(['Match']);
	});
});
