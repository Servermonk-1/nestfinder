import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { makeApp } from './helpers/testApp.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Booking from '../models/Booking.js';

const app = makeApp();
const tok = (id) => jwt.sign({ id: String(id), role: 'student' }, process.env.JWT_SECRET);
const auth = (id) => ({ Authorization: `Bearer ${tok(id)}` });

async function fixtures() {
	const pw = await bcrypt.hash('Passw0rd', 10);
	const L = await Landlord.create({ fullName: 'LL', email: `ll-${Math.random()}@x.io`, password: pw, phone: '08012345678', verified: true });
	const LI = await Listing.create({ title: 'Test Room Listing', description: 'a nice test room right here', address: '1 St', city: 'Ibadan', area: 'Agbowo', state: 'Oyo', price: 90000, roomType: 'single', rooms: 1, landlord: L._id, contactPhone: '08012345678', contactEmail: 'l@x.io' });
	const contacter = await Student.create({ fullName: 'Aisha Bello', email: `a-${Math.random()}@x.io`, password: pw, phone: '08012345678', institution: 'UI', verified: true });
	const stranger = await Student.create({ fullName: 'No Contact', email: `n-${Math.random()}@x.io`, password: pw, phone: '08012345678', institution: 'UI', verified: true });
	// Phase 4 re-gated reviews: contacting a landlord proves nothing, a finished
	// stay does. 'contacter' is now a student who actually booked and moved in.
	const months = 6;
	await Booking.create({
		listing: LI._id, student: contacter._id, landlord: L._id,
		moveInDate: new Date(Date.now() - 30 * 864e5),
		moveOutDate: new Date(Date.now() + 150 * 864e5),
		months, status: 'movedIn',
		escrow: { state: 'released', heldAt: new Date(), releasedAt: new Date() },
		cost: { months, monthlyRent: 7500, rent: 45000, cautionDeposit: 0, agentFee: 0, legalFee: 0,
			total: 45000, divisible: 45000, landlordShare: 31500, serviceFee: 2250, platformShare: 11250,
			refundableAtEnd: 0, landlordReceives: 31500 },
	});
	return { L, LI, contacter, stranger };
}

describe('reviews: verified-STAY gate + edit/delete', () => {
	it('a student who never stayed there CANNOT review (403)', async () => {
		const { LI, stranger } = await fixtures();
		const res = await request(app).post('/api/reviews').set(auth(stranger._id)).send({ listingId: String(LI._id), rating: 5 });
		expect(res.status).toBe(403);
		expect(res.body.needsStay).toBe(true);
	});

	it('a student who moved in CAN review (201) and canReview is true', async () => {
		const { LI, contacter } = await fixtures();
		const g = await request(app).get(`/api/reviews/${LI._id}`).set(auth(contacter._id));
		expect(g.body.canReview).toBe(true);
		const res = await request(app).post('/api/reviews').set(auth(contacter._id)).send({ listingId: String(LI._id), rating: 5, comment: 'great' });
		expect(res.status).toBe(201);
	});

	it('blocks a duplicate review from the same student (400)', async () => {
		const { LI, contacter } = await fixtures();
		await request(app).post('/api/reviews').set(auth(contacter._id)).send({ listingId: String(LI._id), rating: 5 });
		const dup = await request(app).post('/api/reviews').set(auth(contacter._id)).send({ listingId: String(LI._id), rating: 4 });
		expect(dup.status).toBe(400);
	});

	it('only the author can edit or delete their review', async () => {
		const { LI, contacter, stranger } = await fixtures();
		const created = await request(app).post('/api/reviews').set(auth(contacter._id)).send({ listingId: String(LI._id), rating: 5 });
		const id = created.body.review._id;
		expect((await request(app).patch(`/api/reviews/${id}`).set(auth(stranger._id)).send({ rating: 1 })).status).toBe(403);
		expect((await request(app).patch(`/api/reviews/${id}`).set(auth(contacter._id)).send({ rating: 3 })).status).toBe(200);
		expect((await request(app).delete(`/api/reviews/${id}`).set(auth(contacter._id))).status).toBe(200);
	});

	it('shows reviewers by name (not "Anonymous") with a verified badge', async () => {
		const { LI, contacter } = await fixtures();
		await request(app).post('/api/reviews').set(auth(contacter._id)).send({ listingId: String(LI._id), rating: 5 });
		const g = await request(app).get(`/api/reviews/${LI._id}`); // anonymous viewer
		expect(g.body.reviews[0].reviewer).toBe('Aisha B.');
		expect(g.body.reviews[0].reviewerVerified).toBe(true);
	});
});
