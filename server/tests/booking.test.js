import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import bookingRoutes from '../routes/bookings.js';
import paymentRoutes from '../routes/payments.js';
import paymentSettingsRoutes from '../routes/paymentSettings.js';
import reviewRoutes from '../routes/reviews.js';
import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import PaymentSettings from '../models/PaymentSettings.js';
import { calculateBookingCost, SPLIT } from '../utils/bookingCost.js';

vi.mock('axios', () => ({ get: vi.fn() }));

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments-settings', paymentSettingsRoutes);
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


/** Walk a booking to a given point in its life. */
const advance = async (to) => {
	const { body } = await apply();
	const id = body.booking._id;
	if (to === 'pending') return id;
	await as(request(app).patch(`/api/bookings/${id}/respond`), lToken).send({ accept: true });
	if (to === 'pendingPayment') return id;
	if (to === 'confirmed') {
		const payment = await Payment.create({
			booking: id,
			student: student._id,
			amount: body.booking.cost.total,
			paymentMethod: 'bank_transfer',
			senderName: 'Test User',
			transactionReference: 'REF123',
			status: 'pending',
		});
		await as(request(app).patch(`/api/payments/${payment._id}/approve`), aToken);
		return id;
	}
	if (to === 'movedIn') {
		const payment = await Payment.create({
			booking: id,
			student: student._id,
			amount: body.booking.cost.total,
			paymentMethod: 'bank_transfer',
			senderName: 'Test User',
			transactionReference: 'REF123',
			status: 'pending',
		});
		await as(request(app).patch(`/api/payments/${payment._id}/approve`), aToken);
		await as(request(app).patch(`/api/bookings/${id}/moved-in`), sToken);
		return id;
	}
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
		expect(res.body.booking.status).toBe('pendingPayment');
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

describe('manual payments', () => {
	it('will not accept a payment before the landlord accepts', async () => {
		const id = await advance('pending');
		const res = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
		}), sToken);
		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/awaiting payment/i);
	});

	it('accepts a student bank transfer submission', async () => {
		const id = await advance('pendingPayment');
		const res = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
			senderName: 'Test Student',
			transactionReference: 'REF123',
			paymentDate: iso(1),
		}), sToken);

		expect(res.status).toBe(201);
		expect(res.body.payment.status).toBe('pending');
		expect(res.body.payment.paymentMethod).toBe('bank_transfer');
		expect(res.body.payment.senderName).toBe('Test Student');
	});

	it('requires sender name and reference for bank transfer', async () => {
		const id = await advance('pendingPayment');
		const res = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
		}), sToken);

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/sender name/i);
	});

	it('accepts a student USDT submission and calculates expected amount', async () => {
		await PaymentSettings.create({
			accountName: 'NestFinder', bankName: 'GTB', accountNumber: '123', manualOverrideRate: 500,
		});
		const id = await advance('pendingPayment');
		const res = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'usdt',
			amount: 200000,
			transactionHash: '0xdeadbeef',
			network: 'TRC20',
			walletAddress: 'TXaddr',
			paymentDate: iso(1),
		}), sToken);

		expect(res.status).toBe(201);
		expect(res.body.payment.paymentMethod).toBe('usdt');
		expect(res.body.payment.expectedUsdtAmount).toBeCloseTo(400, 3);
	});

	it('requires transaction hash for USDT payments', async () => {
		const id = await advance('pendingPayment');
		const res = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'usdt',
			amount: 200000,
			network: 'TRC20',
			walletAddress: 'TXaddr',
		}), sToken);

		expect(res.status).toBe(400);
		expect(res.body.message).toMatch(/transactionHash is required/i);
	});

	it('allows admin approval and confirms booking + hides listing', async () => {
		const id = await advance('pendingPayment');
		const paymentResponse = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
			senderName: 'Test Student',
			transactionReference: 'REF123',
		}), sToken);
		const paymentId = paymentResponse.body.payment._id;

		const res = await as(request(app).patch(`/api/payments/${paymentId}/approve`), aToken);
		expect(res.status).toBe(200);
		expect(res.body.payment.status).toBe('approved');

		const booking = await Booking.findById(id).lean();
		expect(booking.status).toBe('confirmed');

		const listingRow = await Listing.findById(listing._id).lean();
		expect(listingRow.available).toBe(false);
	});

	it('allows admin rejection and keeps booking awaiting payment', async () => {
		const id = await advance('pendingPayment');
		const paymentResponse = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
			senderName: 'Test Student',
			transactionReference: 'REF123',
		}), sToken);
		const paymentId = paymentResponse.body.payment._id;

		const res = await as(request(app).patch(`/api/payments/${paymentId}/reject`), aToken)
			.send({ reason: 'Invalid receipt' });
		expect(res.status).toBe(200);
		expect(res.body.payment.status).toBe('rejected');

		const booking = await Booking.findById(id).lean();
		expect(booking.status).toBe('pendingPayment');
	});

	it('allows a student to re-submit after rejection', async () => {
		const id = await advance('pendingPayment');
		const first = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
			senderName: 'Test Student',
			transactionReference: 'REF123',
		}), sToken);
		const paymentId = first.body.payment._id;
		await as(request(app).patch(`/api/payments/${paymentId}/reject`), aToken).send({ reason: 'Please retake photo' });

		const second = await as(request(app).post('/api/payments').send({
			bookingId: id,
			paymentMethod: 'bank_transfer',
			amount: 200000,
			senderName: 'Test Student',
			transactionReference: 'REF456',
		}), sToken);

		expect(second.status).toBe(201);
		expect(second.body.payment.transactionReference).toBe('REF456');
	});
});

const quoteSettings = async (override = {}) => {
	return await PaymentSettings.create({
		accountName: 'NestFinder', bankName: 'GTB', accountNumber: '123', ...override,
	});
};

describe('payment settings and exchange rates', () => {
	it('creates and reads payment settings via admin routes', async () => {
		const res = await as(request(app).post('/api/payments-settings/admin'), aToken).send({
			accountName: 'NestFinder', bankName: 'GTB', accountNumber: '123456', instructions: 'Pay to this account',
		});
		expect(res.status).toBe(201);
		expect(res.body.settings.accountName).toBe('NestFinder');

		const list = await as(request(app).get('/api/payments-settings/admin/all'), aToken);
		expect(list.status).toBe(200);
		expect(list.body.settings).toHaveLength(1);
	});

	it('retrieves a live quote from Coingecko', async () => {
		await quoteSettings({ exchangeRateSource: 'coingecko' });
		axios.get.mockResolvedValueOnce({ data: { tether: { ngn: 250 } } });
		const bookingId = (await apply()).body.booking._id;
		await as(request(app).patch(`/api/bookings/${bookingId}/respond`), lToken).send({ accept: true });

		const res = await request(app).get('/api/payments-settings/quote').query({ bookingId });
		expect(res.status).toBe(200);
		expect(res.body.rate).toBe(250);
		expect(res.body.usdtAmount).toBeCloseTo(800, 3);
	});

	it('falls back to manual override when API fails', async () => {
		await quoteSettings({ exchangeRateSource: 'https://api.example.com/rate', manualOverrideRate: 500 });
		axios.get.mockRejectedValueOnce(new Error('network fail'));
		const bookingId = (await apply()).body.booking._id;
		await as(request(app).patch(`/api/bookings/${bookingId}/respond`), lToken).send({ accept: true });

		const res = await request(app).get('/api/payments-settings/quote').query({ bookingId });
		expect(res.status).toBe(200);
		expect(res.body.rate).toBe(500);
		expect(res.body.usdtAmount).toBeCloseTo(400, 3);
	});

	it('returns 503 when exchange rate is unavailable', async () => {
		await quoteSettings({ exchangeRateSource: 'https://api.example.com/rate' });
		axios.get.mockRejectedValueOnce(new Error('network fail'));
		const bookingId = (await apply()).body.booking._id;
		await as(request(app).patch(`/api/bookings/${bookingId}/respond`), lToken).send({ accept: true });

		const res = await request(app).get('/api/payments-settings/quote').query({ bookingId });
		expect(res.status).toBe(503);
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
		await advance('confirmed');
		const res = await review(sToken);
		expect(res.status).toBe(403);
	});

	it('accepts a student who confirmed move-in', async () => {
		await advance('movedIn');
		const res = await review(sToken);
		expect(res.status).toBe(201);
	});
});

// ── Does a confirmed room actually leave the market? ──
describe('a room that has been paid for', () => {
	it('is taken off the market so students stop seeing it', async () => {
		const id = await advance('confirmed');
		const b = await Booking.findById(id).lean();
		const row = await Listing.findById(b.listing).lean();
		expect(row.available).toBe(false);
	});

	// The unique index is on { listing, student } — it stops ONE student
	// double-applying, and does nothing about a DIFFERENT student.
	it('cannot be applied for by a second student', async () => {
		await advance('pendingPayment');
		const second = await apply({}, oToken);
		expect(second.status).toBe(400);
	});
});
