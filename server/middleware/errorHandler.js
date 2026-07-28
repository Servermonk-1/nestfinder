import { reportError } from '../utils/errorReporter.js';

/**
 * Last line of defence for anything a route didn't catch.
 *
 * Two things matter here: the error must be RECORDED (an error nobody sees is
 * an error nobody fixes), and in production the response must not leak internal
 * detail to whoever triggered it.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
	const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
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
