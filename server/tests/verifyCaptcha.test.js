import { describe, it, expect, vi, afterEach } from 'vitest';
import verifyCaptcha from '../middleware/verifyCaptcha.js';

const mockRes = () => ({
	statusCode: 200, body: null,
	status(c) { this.statusCode = c; return this; },
	json(b) { this.body = b; return this; },
});
const call = async (req) => {
	const res = mockRes();
	let nextCalled = false;
	await verifyCaptcha(req, res, () => { nextCalled = true; });
	return { res, nextCalled };
};

describe('verifyCaptcha middleware', () => {
	afterEach(() => { delete process.env.TURNSTILE_SECRET_KEY; vi.restoreAllMocks(); });

	it('is a no-op when no secret is configured (feature off)', async () => {
		const { nextCalled, res } = await call({ body: {} });
		expect(nextCalled).toBe(true);
		expect(res.statusCode).toBe(200);
	});

	it('returns 400 when a secret is set but no token is sent', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		const { nextCalled, res } = await call({ body: {} });
		expect(nextCalled).toBe(false);
		expect(res.statusCode).toBe(400);
	});

	it('passes the request through when Cloudflare returns success', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: true }) }));
		const { nextCalled } = await call({ body: { captchaToken: 'tok' }, ip: '1.1.1.1' });
		expect(nextCalled).toBe(true);
	});

	it('returns 403 when Cloudflare returns failure', async () => {
		process.env.TURNSTILE_SECRET_KEY = 'secret';
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ success: false }) }));
		const { nextCalled, res } = await call({ body: { captchaToken: 'tok' }, ip: '1.1.1.1' });
		expect(nextCalled).toBe(false);
		expect(res.statusCode).toBe(403);
	});
});
