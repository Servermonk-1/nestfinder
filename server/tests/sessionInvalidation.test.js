import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authRoutes from '../routes/auth.js';
import profileRoutes from '../routes/profile.js';
import Student from '../models/Student.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);

const bearer = (t) => ({ Authorization: `Bearer ${t}` });
const tokenFor = (id, issuedAt) =>
	jwt.sign({ id: String(id), role: 'student', ...(issuedAt ? { iat: issuedAt } : {}) }, process.env.JWT_SECRET);

const makeStudent = async () => Student.create({
	fullName: 'Aisha Bello', email: `s-${Math.random()}@x.io`,
	password: await bcrypt.hash('OldPass123', 10),
	phone: '08012345678', institution: 'UI', emailVerified: true,
});

describe('changing a password ends existing sessions', () => {
	it('a token issued before the password change is rejected', async () => {
		const s = await makeStudent();
		// A session opened an hour ago (e.g. an attacker's).
		const oldToken = tokenFor(s._id, Math.floor(Date.now() / 1000) - 3600);

		// It works right now.
		expect((await request(app).get('/api/profile/me').set(bearer(oldToken))).status).toBe(200);

		// The victim changes their password.
		const change = await request(app).post('/api/auth/change-password')
			.set(bearer(oldToken))
			.send({ currentPassword: 'OldPass123', newPassword: 'BrandNew456' });
		expect(change.status).toBe(200);

		// The old session must now be dead.
		const after = await request(app).get('/api/profile/me').set(bearer(oldToken));
		expect(after.status).toBe(401);
		expect(after.body.passwordChanged).toBe(true);
	});

	it('a token issued after the change still works', async () => {
		const s = await makeStudent();
		s.passwordChangedAt = new Date(Date.now() - 60_000);
		await s.save();

		const fresh = tokenFor(s._id); // iat = now, i.e. after the change
		expect((await request(app).get('/api/profile/me').set(bearer(fresh))).status).toBe(200);
	});

	it('a password RESET also kills old sessions', async () => {
		const s = await makeStudent();
		const oldToken = tokenFor(s._id, Math.floor(Date.now() / 1000) - 3600);

		const forgot = await request(app).post('/api/auth/forgot-password').send({ email: s.email });
		const raw = new URL(forgot.body.devResetUrl).searchParams.get('token');
		expect((await request(app).post('/api/auth/reset-password').send({ token: raw, password: 'ResetPass789' })).status).toBe(200);

		expect((await request(app).get('/api/profile/me').set(bearer(oldToken))).status).toBe(401);
	});

	it('accounts that never changed a password are unaffected', async () => {
		const s = await makeStudent();
		const t = tokenFor(s._id, Math.floor(Date.now() / 1000) - 86_400); // a day old
		expect((await request(app).get('/api/profile/me').set(bearer(t))).status).toBe(200);
	});
});
