import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import adminRoutes from '../routes/admin.js';
import Admin from '../models/Admin.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);
const asAdmin = (id) => ({ Authorization: `Bearer ${jwt.sign({ id: String(id), role: 'admin' }, process.env.JWT_SECRET)}` });

async function seed() {
	const pw = await bcrypt.hash('Passw0rd', 10);
	const A = await Admin.create({ fullName: 'Admin', email: `a-${Math.random()}@x.io`, password: pw });
	const verified = await Landlord.create({ fullName: 'Musa Danladi', email: `v-${Math.random()}@x.io`, password: pw, phone: '08011112222', verified: true });
	const unverified = await Landlord.create({ fullName: 'Ngozi Okeke', email: `u-${Math.random()}@x.io`, password: pw, phone: '08033334444', verified: false });
	const base = { description: 'a listing used in admin tests', address: '1 St', city: 'Ibadan', area: 'Agbowo', state: 'Oyo', roomType: 'single', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io' };
	const clean = await Listing.create({ ...base, title: 'Clean Room', price: 90000, landlord: verified._id });
	const flagged = await Listing.create({ ...base, title: 'Dodgy Room', price: 15000, landlord: unverified._id, flagged: true, reportCount: 3 });
	return { A, verified, unverified, clean, flagged };
}

describe('admin: landlords management', () => {
	it('lists landlords with listing counts and status counts', async () => {
		const { A } = await seed();
		const res = await request(app).get('/api/admin/landlords').set(asAdmin(A._id));
		expect(res.status).toBe(200);
		expect(res.body.landlords).toHaveLength(2);
		const musa = res.body.landlords.find((l) => l.fullName === 'Musa Danladi');
		expect(musa.listingCount).toBe(1);
		expect(res.body.counts).toMatchObject({ all: 2, verified: 1, unverified: 1 });
		expect(musa.password).toBeUndefined(); // never leak hashes
	});

	it('filters by status and searches by name/email', async () => {
		const { A } = await seed();
		const unver = await request(app).get('/api/admin/landlords?status=unverified').set(asAdmin(A._id));
		expect(unver.body.landlords.every((l) => l.verified === false)).toBe(true);

		const search = await request(app).get('/api/admin/landlords?q=ngozi').set(asAdmin(A._id));
		expect(search.body.landlords).toHaveLength(1);
		expect(search.body.landlords[0].fullName).toBe('Ngozi Okeke');
	});

	it('reports the landlord\'s flagged-listing count', async () => {
		const { A } = await seed();
		const res = await request(app).get('/api/admin/landlords?q=ngozi').set(asAdmin(A._id));
		expect(res.body.landlords[0].flaggedCount).toBe(1);
	});

	it('verifies and toggles suspension', async () => {
		const { A, unverified } = await seed();
		expect((await request(app).patch(`/api/admin/landlords/${unverified._id}/verify`).set(asAdmin(A._id))).status).toBe(200);
		expect((await Landlord.findById(unverified._id)).verified).toBe(true);

		await request(app).patch(`/api/admin/landlords/${unverified._id}/suspend`).set(asAdmin(A._id));
		expect((await Landlord.findById(unverified._id)).suspended).toBe(true);
		await request(app).patch(`/api/admin/landlords/${unverified._id}/suspend`).set(asAdmin(A._id));
		expect((await Landlord.findById(unverified._id)).suspended).toBe(false);
	});
});

describe('admin: listings management', () => {
	it('lists all listings with landlord populated and counts', async () => {
		const { A } = await seed();
		const res = await request(app).get('/api/admin/listings').set(asAdmin(A._id));
		expect(res.status).toBe(200);
		expect(res.body.listings).toHaveLength(2);
		expect(res.body.listings[0].landlord.fullName).toBeTruthy();
		expect(res.body.counts).toMatchObject({ all: 2, flagged: 1, reported: 1 });
	});

	it('filters flagged and reported, and searches', async () => {
		const { A } = await seed();
		const flagged = await request(app).get('/api/admin/listings?filter=flagged').set(asAdmin(A._id));
		expect(flagged.body.listings).toHaveLength(1);
		expect(flagged.body.listings[0].title).toBe('Dodgy Room');

		const search = await request(app).get('/api/admin/listings?q=clean').set(asAdmin(A._id));
		expect(search.body.listings).toHaveLength(1);
		expect(search.body.listings[0].title).toBe('Clean Room');
	});

	it('flags and unflags a listing', async () => {
		const { A, clean } = await seed();
		await request(app).patch(`/api/admin/listings/${clean._id}/flag`).set(asAdmin(A._id)).send({ flagged: true });
		expect((await Listing.findById(clean._id)).flagged).toBe(true);
		await request(app).patch(`/api/admin/listings/${clean._id}/flag`).set(asAdmin(A._id)).send({ flagged: false });
		expect((await Listing.findById(clean._id)).flagged).toBe(false);
	});

	it('removes a listing', async () => {
		const { A, flagged } = await seed();
		expect((await request(app).delete(`/api/admin/listings/${flagged._id}`).set(asAdmin(A._id))).status).toBe(200);
		expect(await Listing.findById(flagged._id)).toBeNull();
	});

	it('rejects a non-admin', async () => {
		const { verified } = await seed();
		const res = await request(app).get('/api/admin/listings')
			.set({ Authorization: `Bearer ${jwt.sign({ id: String(verified._id), role: 'landlord' }, process.env.JWT_SECRET)}` });
		expect([401, 403]).toContain(res.status);
	});
});
