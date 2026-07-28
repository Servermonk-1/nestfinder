import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import adminRoutes from '../routes/admin.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Report from '../models/Report.js';
import UserReport from '../models/UserReport.js';
import Admin from '../models/Admin.js';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

const asAdmin = (id) => ({ Authorization: `Bearer ${jwt.sign({ id: String(id), role: 'admin' }, process.env.JWT_SECRET)}` });

async function seed() {
	const pw = await bcrypt.hash('Passw0rd', 10);
	const A = await Admin.create({ fullName: 'Admin', email: `a-${Math.random()}@x.io`, password: pw });
	const S = await Student.create({ fullName: 'Aisha Bello', email: `s-${Math.random()}@x.io`, password: pw, phone: '08012345678', institution: 'UI', verified: true });
	const L = await Landlord.create({ fullName: 'Musa Danladi', email: `l-${Math.random()}@x.io`, password: pw, phone: '08012345678', verified: true });
	const LI = await Listing.create({ title: 'Reported Room', description: 'a room being reported here', address: '1 St', city: 'Ibadan', area: 'Agbowo', state: 'Oyo', price: 90000, roomType: 'single', rooms: 1, landlord: L._id, contactPhone: '0800', contactEmail: 'l@x.io' });
	const C = await Conversation.create({ student: S._id, landlord: L._id, listing: LI._id });
	await Message.create({ conversation: C._id, senderId: L._id, senderRole: 'landlord', text: 'Send a deposit first to secure it' });
	const lr = await Report.create({ listing: LI._id, reporter: S._id, reason: 'fake', details: 'photos stolen' });
	const ur = await UserReport.create({ conversation: C._id, reporter: S._id, reporterRole: 'student', reported: L._id, reportedRole: 'landlord', reason: 'scam', details: 'wants money upfront' });
	return { A, S, L, LI, C, lr, ur };
}

describe('admin moderation queue', () => {
	it('requires an admin (a student token is rejected)', async () => {
		const { S } = await seed();
		const res = await request(app).get('/api/admin/reports')
			.set({ Authorization: `Bearer ${jwt.sign({ id: String(S._id), role: 'student' }, process.env.JWT_SECRET)}` });
		expect([401, 403]).toContain(res.status);
	});

	it('lists open LISTING reports with the listing + reporter populated', async () => {
		const { A } = await seed();
		const res = await request(app).get('/api/admin/reports?type=listing&status=open').set(asAdmin(A._id));
		expect(res.status).toBe(200);
		expect(res.body.reports).toHaveLength(1);
		expect(res.body.reports[0].listing.title).toBe('Reported Room');
		expect(res.body.reports[0].reporter.fullName).toBe('Aisha Bello');
		expect(res.body.counts.open).toBe(1);
	});

	it('lists CHAT reports and resolves both people across collections', async () => {
		const { A } = await seed();
		const res = await request(app).get('/api/admin/reports?type=user&status=open').set(asAdmin(A._id));
		expect(res.status).toBe(200);
		const r = res.body.reports[0];
		expect(r.reporterUser.fullName).toBe('Aisha Bello');
		expect(r.reportedUser.fullName).toBe('Musa Danladi');
		expect(r.reportedRole).toBe('landlord');
		expect(r.reason).toBe('scam');
	});

	it('returns conversation context for a chat report', async () => {
		const { A, ur } = await seed();
		const res = await request(app).get(`/api/admin/reports/user/${ur._id}/messages`).set(asAdmin(A._id));
		expect(res.status).toBe(200);
		expect(res.body.messages[0].text).toMatch(/deposit/i);
		expect(res.body.limit).toBe(20);
	});

	it('dismissing a report records who reviewed it and moves it out of the open queue', async () => {
		const { A, lr } = await seed();
		const res = await request(app).patch(`/api/admin/reports/listing/${lr._id}`)
			.set(asAdmin(A._id)).send({ status: 'dismissed', adminNote: 'not a real issue' });
		expect(res.status).toBe(200);

		const saved = await Report.findById(lr._id);
		expect(saved.status).toBe('dismissed');
		expect(saved.adminNote).toBe('not a real issue');
		expect(String(saved.reviewedBy)).toBe(String(A._id));
		expect(saved.reviewedAt).toBeTruthy();

		const open = await request(app).get('/api/admin/reports?type=listing&status=open').set(asAdmin(A._id));
		expect(open.body.reports).toHaveLength(0);
	});

	it('rejects an invalid status', async () => {
		const { A, lr } = await seed();
		const res = await request(app).patch(`/api/admin/reports/listing/${lr._id}`).set(asAdmin(A._id)).send({ status: 'banana' });
		expect(res.status).toBe(400);
	});

	it('acting on a listing report removes the listing and records the action', async () => {
		const { A, lr, LI } = await seed();
		const res = await request(app).post(`/api/admin/reports/listing/${lr._id}/action`).set(asAdmin(A._id)).send({ action: 'remove-listing' });
		expect(res.status).toBe(200);
		expect(await Listing.findById(LI._id)).toBeNull();

		const saved = await Report.findById(lr._id);
		expect(saved.actionTaken).toBe('Listing removed');
		expect(saved.status).toBe('resolved');
	});

	it('suspending from a chat report blocks that landlord', async () => {
		const { A, ur, L } = await seed();
		const res = await request(app).post(`/api/admin/reports/user/${ur._id}/action`).set(asAdmin(A._id)).send({ action: 'suspend' });
		expect(res.status).toBe(200);
		expect((await Landlord.findById(L._id)).suspended).toBe(true);
		const saved = await UserReport.findById(ur._id);
		expect(saved.actionTaken).toMatch(/Landlord suspended/);
		expect(saved.status).toBe('resolved');
	});

	it('suspending works against a STUDENT too (reports go both ways)', async () => {
		const { A, S, L, C } = await seed();
		const ur = await UserReport.create({ conversation: C._id, reporter: L._id, reporterRole: 'landlord', reported: S._id, reportedRole: 'student', reason: 'harassment' });
		const res = await request(app).post(`/api/admin/reports/user/${ur._id}/action`).set(asAdmin(A._id)).send({ action: 'suspend' });
		expect(res.status).toBe(200);
		expect((await Student.findById(S._id)).suspended).toBe(true);
	});

	it('rejects an unsupported action', async () => {
		const { A, lr } = await seed();
		const res = await request(app).post(`/api/admin/reports/listing/${lr._id}/action`).set(asAdmin(A._id)).send({ action: 'launch-rocket' });
		expect(res.status).toBe(400);
	});
});
