import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import bookingRoutes from '../routes/bookings.js';
import reviewRoutes from '../routes/reviews.js';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Booking from '../models/Booking.js';
import { calculateBookingCost, SPLIT } from '../utils/bookingCost.js';

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const day = 864e5;
const iso = (offsetDays) => new Date(Date.now() + offsetDays * day).toISOString().slice(0, 10);

let student, other, landlord, admin, listing;
let sToken, oToken, lToken, aToken;

beforeEach(async () => {
	landlord = await Landlord.create({
		fullName: 'Musa', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0801', verified: true,
	});
	student = await Student.create({
		fullName: 'Ada Bello', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0802', institution: 'AATU', verified: true,
	});
	other = await Student.create({
		fullName: 'Bola Cole', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10),
		phone: '0803', institution: 'AATU', verified: true,
	});
	admin = await Admin.create({ fullName: 'Root', email: `a-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10) });

	sToken = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	oToken = jwt.sign({ id: other._id, role: 'student' }, SECRET);
	lToken = jwt.sign({ id: landlord._id, role: 'landlord' }, SECRET);
	aToken = jwt.sign({ id: admin._id, role: 'admin' }, SECRET);

	listing = await Listing.create({
		title: 'Room', description: 'A tidy room.', address: '1 St', area: 'Bodija', city: 'Ibadan',
		state: 'Oyo', price: 240000, priceUnit: 'annual', roomType: 'single', rooms: 1,
		contactPhone: '0800', contactEmail: 'x@x.io', landlord: landlord._id,
		cautionDeposit: 50000, agentFee: 20000, legalFee: 10000,
	});
});

const as = (r, t) => r.set('Authorization', `Bearer ${t}`);
const apply = (over = {}, token = sToken) =>
	as(request(app).post('/api/bookings'), token).send({
		listingId: listing._id, moveIn: iso(7), moveOut: iso(7 + 182), ...over,
	});

// Paystack's own published test cards — the sandbox matches on these, so a
// test pays with exactly what a person would type into the checkout.
const CARD_OK = '4084084084084081';
const CARD_DECLINED = '4084080000005408';
const CARD_INSUFFICIENT = '4084080000670037';
const CARD_PIN = '507850785078507812';
const CARD_PIN_OTP = '5060666666666666666';

/** Walk a booking to a given point in its life. */
const advance = async (to) => {
	const { body } = await apply();
	const id = body.booking._id;
	if (to === 'pending') return id;
	await as(request(app).patch(`/api/bookings/${id}/respond`), lToken).send({ accept: true });
	if (to === 'accepted') return id;
	await as(request(app).post(`/api/bookings/${id}/pay`), sToken);
	await as(request(app).post(`/api/bookings/${id}/verify`), sToken).send({ card: CARD_OK });
	if (to === 'paid') return id;
	await as(request(app).patch(`/api/bookings/${id}/moved-in`), sToken);
	return id;
};

describe('the cost breakdown', () => {
	it('prices from the normalised MONTHLY rent, not the stored annual figure', () => {
		// A ₦240,000/yr room is ₦20,000/month. Multiplying the annual price by a
		// month count would overcharge by twelvefold.
		const cost = calculateBookingCost(listing, 6);
		expect(cost.monthlyRent).toBe(20000);
		expect(cost.rent).toBe(120000);
	});

	it('adds every move-in fee into the total', () => {
		const cost = calculateBookingCost(listing, 6);
		expect(cost.total).toBe(120000 + 50000 + 20000 + 10000);
	});

	it('splits only the NON-refundable money', () => {
		// The caution deposit belongs to the student. Splitting it would mean
		// paying out money we are obliged to give back.
		const cost = calculateBookingCost(listing, 6);
		expect(cost.divisible).toBe(120000 + 20000 + 10000); // caution excluded
		expect(cost.landlordShare + cost.serviceFee + cost.platformShare).toBe(cost.divisible);
		expect(cost.refundableAtEnd).toBe(50000);
	});

	it('divides 70 / 5 / 25 and never invents a naira', () => {
		const cost = calculateBookingCost(listing, 6);
		expect(cost.landlordShare).toBe(Math.round(cost.divisible * SPLIT.landlord));
		expect(cost.serviceFee).toBe(Math.round(cost.divisible * SPLIT.service));
		// Rounding remainder goes to the platform so the shares sum exactly.
		expect(cost.landlordShare + cost.serviceFee + cost.platformShare).toBe(cost.divisible);
	});

	it('quotes the same figures over the API', async () => {
		const res = await request(app).get('/api/bookings/quote')
			.query({ listingId: String(listing._id), moveIn: iso(7), moveOut: iso(7 + 182) });
		expect(res.status).toBe(200);
		expect(res.body.cost.total).toBe(200000);
	});
});

describe('applying', () => {
	it('creates a pending application with the cost frozen onto it', async () => {
		const res = await apply();
		expect(res.status).toBe(201);
		expect(res.body.booking.status).toBe('pending');
		expect(res.body.booking.cost.total).toBe(200000);
	});

	it('freezes the price against a later change by the landlord', async () => {
		// The stored breakdown is the contract. A landlord must not be able to
		// raise the rent after a student has agreed to it.
		const { body } = await apply();
		await Listing.findByIdAndUpdate(listing._id, { price: 999999 });

		const saved = await Booking.findById(body.booking._id).lean();
		expect(saved.cost.total).toBe(200000);
	});

	it('rejects a move-in date in the past and a backwards range', async () => {
		expect((await apply({ moveIn: iso(-5) })).status).toBe(400);
		expect((await apply({ moveIn: iso(30), moveOut: iso(10) })).status).toBe(400);
	});

	it('stops a student applying twice for the same room', async () => {
		await apply();
		const dup = await apply();
		expect(dup.status).toBe(400);
	});

	it('lets them apply again after withdrawing', async () => {
		// The unique index is PARTIAL for exactly this reason — a withdrawn
		// application must not lock someone out of a room forever.
		const id = await advance('pending');
		await as(request(app).patch(`/api/bookings/${id}/cancel`), sToken);
		expect((await apply()).status).toBe(201);
	});

	it('refuses an unavailable or flagged listing', async () => {
		await Listing.findByIdAndUpdate(listing._id, { available: false });
		expect((await apply()).status).toBe(400);
		await Listing.findByIdAndUpdate(listing._id, { available: true, flagged: true });
		expect((await apply()).status).toBe(400);
	});
});

describe('the landlord responding', () => {
	it('accepts, which opens payment', async () => {
		const id = await advance('pending');
		const res = await as(request(app).patch(`/api/bookings/${id}/respond`), lToken).send({ accept: true });
		expect(res.body.booking.status).toBe('accepted');
	});

	it('declines with a reason', async () => {
		const id = await advance('pending');
		const res = await as(request(app).patch(`/api/bookings/${id}/respond`), lToken).send({ accept: false, reason: 'Already let' });
		expect(res.body.booking.status).toBe('declined');
		expect(res.body.booking.declineReason).toBe('Already let');
	});

	it('will not let a different landlord answer', async () => {
		const id = await advance('pending');
		const stranger = await Landlord.create({
			fullName: 'X', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10), phone: '0', verified: true,
		});
		const t = jwt.sign({ id: stranger._id, role: 'landlord' }, SECRET);
		expect((await as(request(app).patch(`/api/bookings/${id}/respond`), t).send({ accept: true })).status).toBe(403);
	});
});

describe('payment and escrow', () => {
	it('will not take payment before the landlord accepts', async () => {
		const id = await advance('pending');
		expect((await as(request(app).post(`/api/bookings/${id}/pay`), sToken)).status).toBe(400);
	});

	it('holds the money in escrow rather than paying the landlord', async () => {
		// This is the whole point: a student who pays for a room that turns out
		// not to exist must not be chasing a stranger's bank account.
		const id = await advance('paid');
		const b = await Booking.findById(id).lean();

		expect(b.status).toBe('paid');
		expect(b.escrow.state).toBe('held');
		expect(b.escrow.heldAt).toBeTruthy();
		expect(b.escrow.releasedAt).toBeUndefined();
		expect(b.payment.reference).toMatch(/^NF-/);
	});

	it('records a failed payment WITHOUT holding anything', async () => {
		const id = await advance('accepted');
		await as(request(app).post(`/api/bookings/${id}/pay`), sToken);
		const res = await as(request(app).post(`/api/bookings/${id}/verify`), sToken).send({ card: CARD_DECLINED });

		expect(res.status).toBe(400);
		const b = await Booking.findById(id).lean();
		expect(b.status).toBe('accepted');
		expect(b.escrow.state).toBe('none');
	});

	it('is idempotent — verifying twice does not double-record', async () => {
		const id = await advance('paid');
		const again = await as(request(app).post(`/api/bookings/${id}/verify`), sToken).send({ card: CARD_OK });
		expect(again.body.alreadyPaid).toBe(true);
	});

	it('declines a card it does not recognise instead of quietly accepting it', async () => {
		const id = await advance('accepted');
		await as(request(app).post(`/api/bookings/${id}/pay`), sToken);
		const res = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: '1234123412341234' });

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/declined/i);
		const b = await Booking.findById(id).lean();
		expect(b.status).toBe('accepted');
		expect(b.escrow.state).toBe('none');
	});

	it('reports insufficient funds distinctly from a decline', async () => {
		const id = await advance('accepted');
		await as(request(app).post(`/api/bookings/${id}/pay`), sToken);
		const res = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_INSUFFICIENT });

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/insufficient/i);
	});

	// A challenge is the provider asking for another factor, NOT a refusal — it
	// must not be reported as a failure or the checkout would show an error and
	// strand a payment that is still perfectly good.
	it('asks for a PIN rather than failing, and completes once it is given', async () => {
		const id = await advance('accepted');
		await as(request(app).post(`/api/bookings/${id}/pay`), sToken);

		const challenge = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN });
		expect(challenge.status).toBe(200);
		expect(challenge.body.challenge).toBe('pin');
		expect((await Booking.findById(id).lean()).status).toBe('accepted');

		const wrong = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN, pin: '9999' });
		expect(wrong.status).toBe(400);

		const done = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN, pin: '1111' });
		expect(done.status).toBe(200);
		expect((await Booking.findById(id).lean()).escrow.state).toBe('held');
	});

	it('walks PIN then OTP for a card that requires both', async () => {
		const id = await advance('accepted');
		await as(request(app).post(`/api/bookings/${id}/pay`), sToken);

		const c1 = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN_OTP });
		expect(c1.body.challenge).toBe('pin');

		const c2 = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN_OTP, pin: '1234' });
		expect(c2.body.challenge).toBe('otp');
		expect((await Booking.findById(id).lean()).escrow.state).toBe('none');

		const done = await as(request(app).post(`/api/bookings/${id}/verify`), sToken)
			.send({ card: CARD_PIN_OTP, pin: '1234', otp: '123456' });
		expect(done.status).toBe(200);
		expect((await Booking.findById(id).lean()).escrow.state).toBe('held');
	});

	it('will not let another student pay for someone else\'s booking', async () => {
		const id = await advance('accepted');
		expect((await as(request(app).post(`/api/bookings/${id}/pay`), oToken)).status).toBe(403);
	});
});

describe('releasing the escrow', () => {
	it('pays the landlord only when the STUDENT confirms move-in', async () => {
		const id = await advance('paid');
		const res = await as(request(app).patch(`/api/bookings/${id}/moved-in`), sToken);

		expect(res.status).toBe(200);
		const b = await Booking.findById(id).lean();
		expect(b.status).toBe('movedIn');
		expect(b.escrow.state).toBe('released');
		expect(b.escrow.releasedAt).toBeTruthy();
	});

	it('REFUSES to let the landlord confirm on the student\'s behalf', async () => {
		// If a landlord could release their own escrow, escrow would protect
		// nobody at all.
		const id = await advance('paid');
		const res = await as(request(app).patch(`/api/bookings/${id}/moved-in`), lToken);

		expect(res.status).toBe(403);
		expect((await Booking.findById(id).lean()).escrow.state).toBe('held');
	});

	it('cannot release money that was never held', async () => {
		const id = await advance('accepted');
		expect((await as(request(app).patch(`/api/bookings/${id}/moved-in`), sToken)).status).toBe(400);
	});
});

describe('refunds', () => {
	it('lets an admin return a held payment', async () => {
		const id = await advance('paid');
		const res = await as(request(app).patch(`/api/bookings/${id}/refund`), aToken).send({ reason: 'Room did not exist' });

		expect(res.status).toBe(200);
		const b = await Booking.findById(id).lean();
		expect(b.status).toBe('refunded');
		expect(b.escrow.state).toBe('refunded');
		expect(b.escrow.refundReason).toBe('Room did not exist');
	});

	it('will NOT refund money already released to the landlord', async () => {
		const id = await advance('movedIn');
		const res = await as(request(app).patch(`/api/bookings/${id}/refund`), aToken).send({ reason: 'too late' });
		expect(res.status).toBe(400);
	});

	it('is closed to students and landlords', async () => {
		const id = await advance('paid');
		expect([401, 403]).toContain((await as(request(app).patch(`/api/bookings/${id}/refund`), sToken)).status);
		expect([401, 403]).toContain((await as(request(app).patch(`/api/bookings/${id}/refund`), lToken)).status);
	});

	it('stops a student cancelling once they have paid', async () => {
		const id = await advance('paid');
		const res = await as(request(app).patch(`/api/bookings/${id}/cancel`), sToken);
		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/refund/i);
	});
});

describe('reviews are re-gated on a real stay', () => {
	const review = (token) =>
		as(request(app).post('/api/reviews'), token).send({ listingId: listing._id, rating: 5, comment: 'Great place to stay.' });

	it('refuses a student who never booked', async () => {
		const res = await review(oToken);
		expect(res.status).toBe(403);
		expect(res.body.needsStay).toBe(true);
	});

	it('refuses a student who booked but has not moved in', async () => {
		await advance('paid');
		const res = await review(sToken);
		expect(res.status).toBe(403);
	});

	it('accepts a student who confirmed move-in', async () => {
		await advance('movedIn');
		const res = await review(sToken);
		expect(res.status).toBe(201);
	});
});

// ── Does a paid room actually leave the market? ──
describe('a room that has been paid for', () => {
	it('is taken off the market so students stop seeing it', async () => {
		const id = await advance('paid');
		const b = await Booking.findById(id).lean();
		const row = await Listing.findById(b.listing).lean();
		expect(row.available).toBe(false);
	});

	// The unique index is on { listing, student } — it stops ONE student
	// double-applying, and does nothing about a DIFFERENT student.
	it('cannot be applied for by a second student', async () => {
		await advance('paid');
		const second = await apply({}, oToken);
		expect(second.status).toBe(400);
	});

	it('goes back on the market if the booking is refunded', async () => {
		const id = await advance('paid');
		await as(request(app).patch(`/api/bookings/${id}/refund`), aToken).send({ reason: 'Room not as advertised' });
		const b = await Booking.findById(id).lean();
		const row = await Listing.findById(b.listing).lean();
		expect(row.available).toBe(true);
	});
});
