import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import messageRoutes from '../routes/messages.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Conversation from '../models/Conversation.js';
import UserReport from '../models/UserReport.js';

const app = express();
app.use(express.json());
app.set('io', null);
app.use('/api/messages', messageRoutes);

const auth = (id, role) => ({ Authorization: `Bearer ${jwt.sign({ id: String(id), role }, process.env.JWT_SECRET)}` });

async function fixtures() {
	const pw = await bcrypt.hash('Passw0rd', 10);
	const S = await Student.create({ fullName: 'Aisha Bello', email: `s-${Math.random()}@x.io`, password: pw, phone: '08012345678', institution: 'UI', verified: true });
	const L = await Landlord.create({ fullName: 'Musa Danladi', email: `l-${Math.random()}@x.io`, password: pw, phone: '08012345678', verified: true });
	const C = await Conversation.create({ student: S._id, landlord: L._id });
	return { S, L, C };
}

describe('chat safety: block + report', () => {
	it('both parties can message before anyone blocks', async () => {
		const { S, L, C } = await fixtures();
		expect((await request(app).post(`/api/messages/conversations/${C._id}/messages`).set(auth(S._id, 'student')).send({ text: 'hi' })).status).toBe(201);
		expect((await request(app).post(`/api/messages/conversations/${C._id}/messages`).set(auth(L._id, 'landlord')).send({ text: 'hello' })).status).toBe(201);
	});

	it('blocking stops BOTH parties from sending', async () => {
		const { S, L, C } = await fixtures();
		const blk = await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(S._id, 'student')).send({ blocked: true });
		expect(blk.status).toBe(200);
		expect(blk.body.blocked).toBe(true);

		const asStudent = await request(app).post(`/api/messages/conversations/${C._id}/messages`).set(auth(S._id, 'student')).send({ text: 'x' });
		const asLandlord = await request(app).post(`/api/messages/conversations/${C._id}/messages`).set(auth(L._id, 'landlord')).send({ text: 'y' });
		expect(asStudent.status).toBe(403);
		expect(asLandlord.status).toBe(403);
	});

	it("doesn't reveal to the blocked party who blocked them", async () => {
		const { S, L, C } = await fixtures();
		await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(S._id, 'student')).send({ blocked: true });

		const list = await request(app).get('/api/messages/conversations').set(auth(L._id, 'landlord'));
		const convo = list.body.conversations[0];
		expect(convo.blocked).toBe(true);
		expect(convo.blockedByMe).toBe(false); // the landlord isn't told it was the student
	});

	it('the blocker can unblock, and messaging resumes', async () => {
		const { S, L, C } = await fixtures();
		await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(S._id, 'student')).send({ blocked: true });
		const un = await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(S._id, 'student')).send({ blocked: false });
		expect(un.status).toBe(200);
		expect(un.body.blocked).toBe(false);
		expect((await request(app).post(`/api/messages/conversations/${C._id}/messages`).set(auth(L._id, 'landlord')).send({ text: 'back' })).status).toBe(201);
	});

	it('a non-blocker cannot lift the other party\'s block', async () => {
		const { S, L, C } = await fixtures();
		await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(S._id, 'student')).send({ blocked: true });
		const attempt = await request(app).patch(`/api/messages/conversations/${C._id}/block`).set(auth(L._id, 'landlord')).send({ blocked: false });
		expect(attempt.status).toBe(400);
		const still = await Conversation.findById(C._id);
		expect(still.blockedByStudent).toBe(true);
	});

	it('reporting records who reported whom, and can block at the same time', async () => {
		const { S, L, C } = await fixtures();
		const rep = await request(app).post(`/api/messages/conversations/${C._id}/report`)
			.set(auth(S._id, 'student')).send({ reason: 'scam', details: 'asked for a deposit upfront', block: true });
		expect(rep.status).toBe(201);
		expect(rep.body.blocked).toBe(true);

		const saved = await UserReport.findOne({ conversation: C._id });
		expect(String(saved.reporter)).toBe(String(S._id));
		expect(saved.reporterRole).toBe('student');
		expect(String(saved.reported)).toBe(String(L._id));
		expect(saved.reportedRole).toBe('landlord');
		expect(saved.reason).toBe('scam');
	});

	it('a landlord can report a student too (works both ways)', async () => {
		const { S, L, C } = await fixtures();
		const rep = await request(app).post(`/api/messages/conversations/${C._id}/report`)
			.set(auth(L._id, 'landlord')).send({ reason: 'harassment' });
		expect(rep.status).toBe(201);
		const saved = await UserReport.findOne({ conversation: C._id });
		expect(saved.reportedRole).toBe('student');
		expect(String(saved.reported)).toBe(String(S._id));
	});

	it('rejects an invalid reason and duplicate reports', async () => {
		const { S, C } = await fixtures();
		expect((await request(app).post(`/api/messages/conversations/${C._id}/report`).set(auth(S._id, 'student')).send({ reason: 'nonsense' })).status).toBe(400);
		await request(app).post(`/api/messages/conversations/${C._id}/report`).set(auth(S._id, 'student')).send({ reason: 'spam' });
		const dup = await request(app).post(`/api/messages/conversations/${C._id}/report`).set(auth(S._id, 'student')).send({ reason: 'spam' });
		expect(dup.status).toBe(400);
	});

	it('exposes each party\'s verified badge to the other', async () => {
		const { S, L, C } = await fixtures();
		const asStudent = await request(app).get('/api/messages/conversations').set(auth(S._id, 'student'));
		expect(asStudent.body.conversations[0].landlord.verified).toBe(true);
		const asLandlord = await request(app).get('/api/messages/conversations').set(auth(L._id, 'landlord'));
		expect(asLandlord.body.conversations[0].student.verified).toBe(true);
	});
});
