import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

import bookingRoutes from '../routes/bookings.js';
import paymentRoutes from '../routes/payments.js';
import paymentSettingsRoutes from '../routes/paymentSettings.js';

import Admin from '../models/Admin.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import PaymentSettings from '../models/PaymentSettings.js';

const app = express();
app.use(express.json());
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments-settings', paymentSettingsRoutes);

const SECRET = process.env.JWT_SECRET || 'testsecret';
const iso = (offsetDays) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);

let student, landlord, sToken, lToken, admin, aToken, listing;

beforeEach(async () => {
	// Ensure uploads folder exists for multer
	fs.mkdirSync(path.resolve('uploads'), { recursive: true });

	landlord = await Landlord.create({ fullName: 'LL', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10), phone: '0801', verified: true });
	student = await Student.create({ fullName: 'Stu', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10), phone: '0802', institution: 'Uni', verified: true });
	admin = await Admin.create({ fullName: 'Root', email: `a-${Math.random()}@x.io`, password: await bcrypt.hash('pw', 10) });

	sToken = jwt.sign({ id: student._id, role: 'student' }, SECRET);
	lToken = jwt.sign({ id: landlord._id, role: 'landlord' }, SECRET);
	aToken = jwt.sign({ id: admin._id, role: 'admin' }, SECRET);

	listing = await Listing.create({ title: 'Room', description: 'A tidy room.', address: '1 St', area: 'X', city: 'Y', state: 'Z', price: 240000, priceUnit: 'annual', roomType: 'single', rooms:1, contactPhone:'0800', contactEmail:'x@x.io', landlord: landlord._id, cautionDeposit:50000, agentFee:20000, legalFee:10000 });
});

const as = (r, token) => r.set('Authorization', `Bearer ${token}`);

async function applyAndAccept() {
	const res = await as(request(app).post('/api/bookings'), sToken).send({ listingId: listing._id, moveIn: iso(7), moveOut: iso(7 + 182) });
	const id = res.body.booking._id;
	await as(request(app).patch(`/api/bookings/${id}/respond`), lToken).send({ accept: true });
	return id;
}

describe('receipt uploads', () => {
	it('accepts a valid image receipt and associates with payment', async () => {
		const bookingId = await applyAndAccept();
		const res = await as(request(app).post('/api/payments'), sToken)
			.field('bookingId', bookingId)
			.field('paymentMethod', 'bank_transfer')
			.field('amount', 200000)
			.field('senderName', 'Uploader')
			.field('transactionReference', 'IMG-REF')
			.attach('receipt', path.resolve('tests/fixtures/receipt.png'));

		expect(res.status).toBe(201);
		expect(res.body.payment.receipt).toBeTruthy();
		// file exists
		expect(fs.existsSync(path.resolve('uploads', res.body.payment.receipt))).toBe(true);
	});

	it('accepts a valid PDF receipt', async () => {
		const bookingId = await applyAndAccept();
		const res = await as(request(app).post('/api/payments'), sToken)
			.field('bookingId', bookingId)
			.field('paymentMethod', 'bank_transfer')
			.field('amount', 200000)
			.field('senderName', 'Uploader')
			.field('transactionReference', 'PDF-REF')
			.attach('receipt', path.resolve('tests/fixtures/receipt.pdf'));

		expect(res.status).toBe(201);
		expect(res.body.payment.receipt).toBeTruthy();
		expect(fs.existsSync(path.resolve('uploads', res.body.payment.receipt))).toBe(true);
	});

	it('rejects unsupported file types', async () => {
		const bookingId = await applyAndAccept();
		const res = await as(request(app).post('/api/payments'), sToken)
			.field('bookingId', bookingId)
			.field('paymentMethod', 'bank_transfer')
			.field('amount', 200000)
			.field('senderName', 'Uploader')
			.field('transactionReference', 'TXT-REF')
			.attach('receipt', path.resolve('tests/fixtures/receipt.txt'));

		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.message || '').toMatch(/Only image or PDF files are allowed/i);
	});

	it('rejects files that exceed size limit', async () => {
		const bookingId = await applyAndAccept();
		const bigBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB > 5MB limit
		const res = await as(request(app).post('/api/payments'), sToken)
			.field('bookingId', bookingId)
			.field('paymentMethod', 'bank_transfer')
			.field('amount', 200000)
			.field('senderName', 'Uploader')
			.field('transactionReference', 'BIG-REF')
			.attach('receipt', bigBuffer, 'big.pdf');

		expect(res.status).toBeGreaterThanOrEqual(400);
		expect(res.body.message || '').toMatch(/file size/i);
	});

	it('accepts blockchain screenshot for USDT payments', async () => {
		await PaymentSettings.create({ accountName: 'X', bankName: 'Y', accountNumber: '123', manualOverrideRate: 500 });
		const bookingId = await applyAndAccept();
		const res = await as(request(app).post('/api/payments'), sToken)
			.field('bookingId', bookingId)
			.field('paymentMethod', 'usdt')
			.field('amount', 200000)
			.field('transactionHash', '0xdead')
			.field('network', 'TRC20')
			.field('walletAddress', 'TX')
			.attach('receipt', path.resolve('tests/fixtures/receipt.png'));

		expect(res.status).toBe(201);
		expect(res.body.payment.blockchainScreenshot || res.body.payment.receipt).toBeTruthy();
	});
});
