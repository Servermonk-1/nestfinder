import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { makeApp } from './helpers/testApp.js';
import Student from '../models/Student.js';

const app = makeApp();
const reg = { fullName: 'Test Student', email: 'test@student.io', password: 'Passw0rd', phone: '08012345678', institution: 'UI' };
const tokenFrom = (url) => new URL(url).searchParams.get('token');

describe('auth: registration + email-verification hard block', () => {
	it('registration creates an UNVERIFIED account and returns NO session token', async () => {
		const res = await request(app).post('/api/auth/student/register').send(reg);
		expect(res.status).toBe(201);
		expect(res.body.emailVerificationRequired).toBe(true);
		expect(res.body.token).toBeUndefined();
		const s = await Student.findOne({ email: reg.email });
		expect(s).toBeTruthy();
		expect(s.emailVerified).toBe(false);
	});

	it('login is blocked with 403 until the email is verified', async () => {
		await request(app).post('/api/auth/student/register').send(reg);
		const res = await request(app).post('/api/auth/student/login').send({ email: reg.email, password: reg.password });
		expect(res.status).toBe(403);
		expect(res.body.emailVerificationRequired).toBe(true);
	});

	it('after verifying, login proceeds to OTP and issues a token', async () => {
		const r1 = await request(app).post('/api/auth/student/register').send(reg);
		const v = await request(app).get(`/api/auth/verify-email?token=${tokenFrom(r1.body.devVerifyUrl)}`);
		expect(v.status).toBe(200);

		const login = await request(app).post('/api/auth/student/login').send({ email: reg.email, password: reg.password });
		expect(login.status).toBe(200);
		expect(login.body.otpRequired).toBe(true);
		expect(login.body.devOtp).toBeTruthy();

		const otp = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: login.body.devOtp });
		expect(otp.status).toBe(200);
		expect(otp.body.token).toBeTruthy();
		expect(otp.body.user.role).toBe('student');
	});

	it('rejects a wrong password with 401', async () => {
		const r1 = await request(app).post('/api/auth/student/register').send(reg);
		await request(app).get(`/api/auth/verify-email?token=${tokenFrom(r1.body.devVerifyUrl)}`);
		const res = await request(app).post('/api/auth/student/login').send({ email: reg.email, password: 'wrongpass' });
		expect(res.status).toBe(401);
	});
});
