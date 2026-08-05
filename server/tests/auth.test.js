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

describe('auth: login OTP hardening', () => {
	// Get a verified account to the point where a live code is waiting.
	const reachOtpStage = async () => {
		const r1 = await request(app).post('/api/auth/student/register').send(reg);
		await request(app).get(`/api/auth/verify-email?token=${tokenFrom(r1.body.devVerifyUrl)}`);
		const login = await request(app).post('/api/auth/student/login').send({ email: reg.email, password: reg.password });
		expect(login.body.devOtp).toBeTruthy();
		return login.body.devOtp;
	};

	it('burns the code after five wrong guesses, so the real one no longer works', async () => {
		const real = await reachOtpStage();
		const wrong = real === '000000' ? '111111' : '000000';

		for (let i = 0; i < 5; i++) {
			const res = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: wrong });
			expect(res.status).toBe(400);
		}

		// Without a cap, a 6-digit code with a 10-minute life is ~1M guesses
		// against an endpoint that answers every one of them.
		const after = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: real });
		expect(after.status).not.toBe(200);
		expect(after.body.token).toBeUndefined();
	});

	it('refuses to mint a second code inside the resend cooldown, leaving the first valid', async () => {
		const first = await reachOtpStage();

		const second = await request(app).post('/api/auth/student/login').send({ email: reg.email, password: reg.password });
		expect(second.status).toBe(429);
		expect(second.body.retryAfter).toBeGreaterThan(0);

		// A refused resend must not invalidate the code already in the inbox.
		const done = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: first });
		expect(done.status).toBe(200);
		expect(done.body.token).toBeTruthy();
	});

	it('rejects a malformed code without spending one of the five attempts', async () => {
		const real = await reachOtpStage();

		const bad = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: '12' });
		expect(bad.status).toBe(400);

		const ok = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: real });
		expect(ok.status).toBe(200);
		expect(ok.body.token).toBeTruthy();
	});

	it('issues a device token on success so the next login can skip the code', async () => {
		const real = await reachOtpStage();
		const res = await request(app).post('/api/auth/student/verify-otp').send({ email: reg.email, otp: real });
		expect(res.status).toBe(200);
		expect(res.body.deviceToken).toBeTruthy();

		const again = await request(app).post('/api/auth/student/login')
			.send({ email: reg.email, password: reg.password, deviceToken: res.body.deviceToken });
		expect(again.status).toBe(200);
		expect(again.body.otpRequired).toBeUndefined();
		expect(again.body.token).toBeTruthy();
	});
});
