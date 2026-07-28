import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Admin from '../models/Admin.js';

// The session cookie name. httpOnly, so browser JS (and therefore XSS) can't read it.
export const AUTH_COOKIE = 'nf_token';

const MODELS = { student: Student, landlord: Landlord, admin: Admin };

// Prefer the httpOnly cookie; fall back to a Bearer header for non-browser
// callers (API tools, tests).
export const getTokenFromRequest = (req) =>
	req.cookies?.[AUTH_COOKIE] || req.headers.authorization?.split(' ')[1] || null;

/**
 * True if the token was issued BEFORE the account's password last changed.
 *
 * Without this check, changing your password does not end sessions that are
 * already open — so a victim who changes their password to lock out an intruder
 * would not actually lock them out. The JWT's `iat` is in seconds.
 */
export const tokenPredatesPasswordChange = (decoded, account) => {
	if (!account?.passwordChangedAt || !decoded?.iat) return false;
	const changedAtSec = Math.floor(new Date(account.passwordChangedAt).getTime() / 1000);
	return decoded.iat < changedAtSec;
};

const protect = async (req, res, next) => {
	try {
		const token = getTokenFromRequest(req);

		if (!token) {
			return res.status(401).json({ message: 'Not authorized. No token.' });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// A valid signature isn't enough — the password may have changed since,
		// which must invalidate every token issued before it.
		const Model = MODELS[decoded.role];
		if (Model) {
			const account = await Model.findById(decoded.id).select('passwordChangedAt');
			if (account && tokenPredatesPasswordChange(decoded, account)) {
				return res.status(401).json({
					message: 'Your password was changed. Please sign in again.',
					passwordChanged: true,
				});
			}
		}

		req.user = decoded;
		next();

	} catch (error) {
		return res.status(401).json({ message: 'Not authorized. Token invalid.' });
	}
};

export default protect;
