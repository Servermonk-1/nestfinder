import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { makeApp } from './helpers/testApp.js';
import Student from '../models/Student.js';

const app = makeApp();
const sha = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const tokenFrom = (url) => new URL(url).searchParams.get('token');

async function makeStudent(overrides = {}) {
	const pw = await bcrypt.hash('OldPass123', 10);
	return Student.create({ fullName: 'Reset Tester', email: `r-${Math.random()}@x.io`, password: pw, phone: '08012345678', institution: 'UI', emailVerified: true, ...overrides });
}

describe('password recovery', () => {
	it('forgot-password stores a reset token and responds generically', async () => {
		const s = await makeStudent();
		const res = await request(app).post('/api/auth/forgot-password').send({ email: s.email });
		expect(res.status).toBe(200);
		const after = await Student.findById(s._id).select('+resetPasswordToken');
		expect(after.resetPasswordToken).toBeTruthy();
	});

	it('reset-password consumes the token (single-use) and changes the password', async () => {
		const s = await makeStudent();
		const forgot = await request(app).post('/api/auth/forgot-password').send({ email: s.email });
		const raw = tokenFrom(forgot.body.devResetUrl);

		const r1 = await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'NewPass456' });
		expect(r1.status).toBe(200);
		const after = await Student.findById(s._id);
		expect(await bcrypt.compare('NewPass456', after.password)).toBe(true);

		// token cannot be reused
		const r2 = await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'Whatever789' });
		expect(r2.status).toBe(400);
	});

	it('rejects an expired reset token (400)', async () => {
		const s = await makeStudent();
		const raw = crypto.randomBytes(16).toString('hex');
		s.resetPasswordToken = sha(raw);
		s.resetPasswordExpires = Date.now() - 1000;
		await s.save();
		const res = await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'NewPass456' });
		expect(res.status).toBe(400);
	});

	it('change-password requires the correct current password', async () => {
		const s = await makeStudent();
		const authTok = jwt.sign({ id: String(s._id), role: 'student' }, process.env.JWT_SECRET);
		const wrong = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${authTok}`).send({ currentPassword: 'WRONG', newPassword: 'Third789' });
		expect(wrong.status).toBe(401);
		const ok = await request(app).post('/api/auth/change-password').set('Authorization', `Bearer ${authTok}`).send({ currentPassword: 'OldPass123', newPassword: 'Third789' });
		expect(ok.status).toBe(200);
	});
});
