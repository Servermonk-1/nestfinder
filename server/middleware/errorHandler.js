import { reportError } from '../utils/errorReporter.js';

/**
 * Last line of defence for anything a route didn't catch.
 *
 * Two things matter here: the error must be RECORDED (an error nobody sees is
 * an error nobody fixes), and in production the response must not leak internal
 * detail to whoever triggered it.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
	// Prefer a status the error itself carries. Reading only res.statusCode
	// meant every thrown Error became a 500, because Express leaves the status
	// at 200 until something sets it — which is how a rejected CORS origin was
	// reported as a server crash.
	const explicit = Number(err.statusCode || err.status);
	const fromResponse = res.statusCode && res.statusCode !== 200 ? res.statusCode : null;
	const statusCode = (explicit >= 400 && explicit <= 599) ? explicit : (fromResponse || 500);
	const isServerFault = statusCode >= 500;

	if (isServerFault) {
		reportError(err, {
			route: req.originalUrl,
			method: req.method,
			userId: req.user?.id,
			role: req.user?.role,
			ip: req.ip,
		});
	}

	// If the response has already started streaming, headers are gone and the
	// only honest thing left is to end it.
	if (res.headersSent) return res.end();

	res.status(statusCode).json({
		// A stack trace or a raw driver message tells an attacker about the
		// database; the person who hit it just needs to know it wasn't their fault.
		message: process.env.NODE_ENV === 'production' && isServerFault
			? 'Something went wrong on our side. Please try again.'
			: err.message,
		stack: process.env.NODE_ENV === 'production' ? null : err.stack,
	});
};

export default errorHandler;
