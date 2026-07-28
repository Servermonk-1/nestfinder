import LoginAttempt from '../models/LoginAttempt.js';

// Blocks a login attempt when the same email has racked up too many
// recent failures. Runs BEFORE the password check so we never even
// reveal whether the password was right during a lockout.
export const WINDOW_MS = 10 * 60 * 1000; // look back 10 minutes
export const MAX_FAILS = 5;              // fails allowed inside the window
export const LOCK_MINS = 30;            // how long the lock is communicated as

// How many failed attempts an email has inside the current window.
export const countRecentFails = async (email) => {
	try {
		return await LoginAttempt.countDocuments({
			email: email?.trim().toLowerCase(),
			success: false,
			timestamp: { $gte: new Date(Date.now() - WINDOW_MS) },
		});
	} catch (err) {
		console.error('countRecentFails error:', err.message);
		return 0;
	}
};

const checkBruteForce = async (req, res, next) => {
	try {
		const email = req.body?.email?.trim().toLowerCase();
		if (!email) return next();

		const recentFails = await LoginAttempt.countDocuments({
			email,
			success: false,
			timestamp: { $gte: new Date(Date.now() - WINDOW_MS) },
		});

		if (recentFails >= MAX_FAILS) {
			return res.status(429).json({
				message: `Too many failed attempts. This account is locked for ${LOCK_MINS} minutes.`,
				locked: true,
				retryAfterMinutes: LOCK_MINS,
			});
		}
		next();
	} catch (err) {
		// If the check itself fails, don't hard-block legitimate logins.
		console.error('checkBruteForce error:', err.message);
		next();
	}
};

// Helper controllers use to record each attempt.
export const recordAttempt = async ({ email, userType, success, req }) => {
	try {
		await LoginAttempt.create({
			email: email?.trim().toLowerCase(),
			userType,
			success,
			ip: req.ip,
			userAgent: req.headers['user-agent'],
		});
	} catch (err) {
		console.error('recordAttempt error:', err.message);
	}
};

// Wipe the failed-attempt history for an email (called on successful login).
export const clearAttempts = async (email) => {
	try {
		await LoginAttempt.deleteMany({ email: email?.trim().toLowerCase(), success: false });
	} catch (err) {
		console.error('clearAttempts error:', err.message);
	}
};

export default checkBruteForce;
