// Verifies a Cloudflare Turnstile token before letting the request through.
// No-op until TURNSTILE_SECRET_KEY is configured, so auth works unchanged until
// CAPTCHA is switched on. Read lazily so dotenv is guaranteed to have loaded.
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const verifyCaptcha = async (req, res, next) => {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) return next(); // CAPTCHA off

	const token = req.body?.captchaToken;
	if (!token) {
		return res.status(400).json({ message: 'Please complete the verification challenge.' });
	}

	try {
		const params = new URLSearchParams();
		params.append('secret', secret);
		params.append('response', token);
		if (req.ip) params.append('remoteip', req.ip);

		const resp = await fetch(VERIFY_URL, { method: 'POST', body: params });
		const data = await resp.json();
		if (!data.success) {
			return res.status(403).json({ message: 'Verification failed. Please try again.' });
		}
		next();
	} catch (err) {
		// If Cloudflare is unreachable, don't lock people out of auth entirely —
		// the brute-force lockout + rate limiter are still in force.
		console.error('Turnstile verify unreachable:', err.message);
		next();
	}
};

export default verifyCaptcha;
