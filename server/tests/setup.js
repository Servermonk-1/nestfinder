import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

// A clean, side-effect-free test environment. Set BEFORE any controller/email
// code runs so nothing reaches the real world:
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';
process.env.NODE_ENV = 'test';
delete process.env.GMAIL_USER;          // → email service falls back to demo mode (no real sends)
delete process.env.GMAIL_APP_PASSWORD;
delete process.env.RESEND_API_KEY;
delete process.env.TURNSTILE_SECRET_KEY; // → captcha middleware is a no-op
// Give mongod room to boot on a busy machine (default is 10s).
process.env.MONGOMS_STARTUP_TIMEOUT = process.env.MONGOMS_STARTUP_TIMEOUT || '60000';

let mem;

beforeAll(async () => {
	mem = await MongoMemoryServer.create();
	await mongoose.connect(mem.getUri());
});

// Fresh, isolated data for every test.
afterEach(async () => {
	const { collections } = mongoose.connection;
	for (const key of Object.keys(collections)) {
		await collections[key].deleteMany({});
	}
});

afterAll(async () => {
	await mongoose.disconnect();
	if (mem) await mem.stop();
});
