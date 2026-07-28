import jwt from 'jsonwebtoken';
import { getTokenFromRequest } from './auth.js';

// Decodes a JWT if one is present, but does NOT reject the request when it's
// missing/invalid. Lets a route serve the public while still knowing who the
// caller is when they're logged in.
const optionalAuth = (req, res, next) => {
	const token = getTokenFromRequest(req);
	if (token) {
		try {
			req.user = jwt.verify(token, process.env.JWT_SECRET);
		} catch {
			// ignore bad/expired tokens — treat as anonymous
		}
	}
	next();
};

export default optionalAuth;
