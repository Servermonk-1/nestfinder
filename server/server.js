import 'dotenv/config'; // MUST be first — loads .env before any other import reads it
import express from 'express';
import mongoose from 'mongoose';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import reportRoutes from './routes/reports.js';
import adminRoutes from './routes/admin.js';
import kycRoutes from './routes/kyc.js';
import profileRoutes from './routes/profile.js';
import messageRoutes from './routes/messages.js';
import savedRoutes from './routes/saved.js';
import comparisonRoutes from './routes/comparisons.js';
import feedbackRoutes from './routes/feedback.js';
import reviewRoutes from './routes/reviews.js';
import companyRoutes from './routes/companies.js';
import bookingRoutes from './routes/bookings.js';
import paymentRoutes from './routes/payments.js';
import paymentSettingsRoutes from './routes/paymentSettings.js';
import savedSearchRoutes from './routes/savedSearches.js';
import errorHandler from './middleware/errorHandler.js';
import { reportError } from './utils/errorReporter.js';

dotenv.config();
connectDB();

const app = express();
const httpServer = http.createServer(app);

// Render (and any PaaS) terminates TLS at a proxy and forwards the real client
// address in X-Forwarded-For. Without this, req.ip is the proxy for every
// request — so the rate limiters would bucket the entire internet together, and
// express-rate-limit v8 emits a validation error when it detects the mismatch.
app.set('trust proxy', 1);

// ── ALLOWED ORIGINS ───────────────────────────────────────
// An origin is scheme + host + port with NO path and NO trailing slash. A
// CLIENT_URL of "https://site.vercel.app/" therefore never equals the Origin
// header the browser actually sends, and the comparison fails for a reason that
// is invisible in the logs. Normalise instead of trusting the dashboard value.
const normaliseOrigin = (value) => {
	if (!value) return null;
	const trimmed = String(value).trim().replace(/\/+$/, '');
	if (!trimmed) return null;
	try {
		return new URL(trimmed).origin.toLowerCase();
	} catch {
		return trimmed.toLowerCase();
	}
};

const allowedOrigins = [
	...new Set(
		[
			process.env.CLIENT_URL,
			// A second name for the same frontend (custom domain, apex vs www)
			// without needing a code change to add it.
			process.env.CLIENT_URL_ALT,
			'http://localhost:5173',
			'http://127.0.0.1:5173',
		]
			.map(normaliseOrigin)
			.filter(Boolean),
	),
];

// Vercel gives every branch and every commit its own hostname. Those are the
// same application, so allow them in addition to the production alias — matched
// on the exact suffix, not a substring, so "evil-vercel.app.attacker.com" is
// still rejected.
const isVercelPreview = (origin) => /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin);

const isAllowedOrigin = (origin) => {
	const candidate = normaliseOrigin(origin);
	if (!candidate) return false;
	return allowedOrigins.includes(candidate) || isVercelPreview(candidate);
};

// Rejection must NOT be an Error. Passing one to the callback sends it to the
// error handler, which answers 500 with no CORS headers — indistinguishable
// from a crash, and the exact failure this deployment hit. `cb(null, false)`
// instead omits Access-Control-Allow-Origin, which is precisely how CORS is
// meant to deny: the request still completes, and the browser blocks it.
const corsOrigin = (origin, cb) => {
	// No Origin header at all: curl, server-to-server, health checks, and
	// same-origin navigations. Not a browser cross-origin request, so there is
	// nothing to authorise.
	if (!origin) return cb(null, true);
	if (isAllowedOrigin(origin)) return cb(null, true);
	console.warn(`[CORS] blocked origin: ${origin}`);
	return cb(null, false);
};

const corsOptions = {
	origin: corsOrigin,
	credentials: true,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
	allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
	exposedHeaders: ['Content-Disposition'],
	// Cache the preflight so the browser stops re-asking on every request.
	maxAge: 86400,
	optionsSuccessStatus: 204,
};

console.log('[CORS] allowed origins:', allowedOrigins.join(', ') || '(none configured)');
if (!process.env.CLIENT_URL) {
	console.warn('[CORS] CLIENT_URL is not set — only localhost origins will be accepted.');
}

// ── SOCKET.IO — real-time message delivery ──────────────────
// Given the same predicate as the REST API, so a browser that can call the API
// can also open a socket.
const io = new Server(httpServer, {
	cors: {
		origin: (origin, cb) => (!origin || isAllowedOrigin(origin) ? cb(null, true) : cb(null, false)),
		credentials: true,
	},
});

// Pull the session JWT out of the handshake cookie (the browser sends it
// automatically with withCredentials); fall back to auth.token for non-browser
// clients.
const tokenFromHandshake = (socket) => {
	const raw = socket.handshake.headers?.cookie;
	if (raw) {
		const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith('nf_token='));
		if (match) return decodeURIComponent(match.slice('nf_token='.length));
	}
	return socket.handshake.auth?.token || null;
};

io.use((socket, next) => {
	try {
		const token = tokenFromHandshake(socket);
		if (!token) return next(new Error('Not authorized. No token.'));
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		socket.user = decoded;
		next();
	} catch (error) {
		next(new Error('Not authorized. Token invalid.'));
	}
});

io.on('connection', (socket) => {
	socket.join(`user:${socket.user.id}`);
});

app.set('io', io);

// ── SECURITY MIDDLEWARE ───────────────────────────────────
// 1. CORS FIRST. A preflight must be answered before anything else can reject
//    it: OPTIONS carries no cookie, no body and no auth header, so every
//    middleware below would either waste work on it or — in the case of the
//    rate limiter — count it against the client's budget.
app.use(cors(corsOptions));

// Express 5 removed the string-pattern route ('*' no longer parses), so the
// explicit preflight short-circuit is a plain middleware. cors() has already
// attached the headers above; this ends the request at 204 instead of letting
// an OPTIONS fall through to the rate limiter, the body parser and the 404.
app.use((req, res, next) => {
	if (req.method === 'OPTIONS') return res.sendStatus(204);
	next();
});

// 2. Helmet — secure HTTP headers.
//    crossOriginResourcePolicy is relaxed because the frontend is on a
//    different origin (Vercel) than the API (Render); the default
//    "same-origin" makes the browser refuse to render <img> served from
//    /uploads. This weakens nothing that CORS is protecting.
app.use(helmet({
	crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Request logging, outside production only — on Render this fires for every
// asset and health poll and buys nothing that the platform's own log does not
// already show.
if (process.env.NODE_ENV !== 'production') {
	app.use((req, res, next) => {
		console.log('[REQ]', req.method, req.originalUrl);
		next();
	});
}

// 2b. Parse cookies so the auth middleware can read the httpOnly session cookie.
app.use(cookieParser());

// 3. Body parsers
app.use(express.json({ limit: '10kb' }));  // limit body size to 10kb
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// 4. HPP — prevent parameter pollution
app.use(hpp());

// 5. Rate limiter — protect all routes
const globalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,  // 15 minutes
	max: 100,                   // max 100 requests per window
	message: { message: 'Too many requests. Please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
	// A preflight is the browser asking permission, not the user making a
	// request. Counting it halves every client's real budget.
	skip: (req) => req.method === 'OPTIONS',
});
app.use(globalLimiter);

// 6. Stricter rate limiter for auth routes only.
//    max:10 with preflights counted meant ~5 real login attempts before a
//    15-minute lockout, since every cross-origin POST is preceded by an
//    OPTIONS. Successful logins are not counted either — the limit exists to
//    slow credential guessing, and locking out someone who just typed their
//    password correctly is not that.
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 20,
	message: { message: 'Too many login attempts. Please try again later.' },
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.method === 'OPTIONS',
	skipSuccessfulRequests: true,
});

// ── STATIC FILES ──────────────────────────────────────────
// Helmet's default Cross-Origin-Resource-Policy is "same-origin", which makes
// the browser refuse to render <img> served from this origin on the frontend's
// different origin (:5173 vs :5000). Allow cross-origin loading for uploads so
// profile photos, ID documents and listing images display.
app.use('/uploads', (req, res, next) => {
	res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
	next();
}, express.static('uploads'));

// ── ROUTES ────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/comparisons', comparisonRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payments-settings', paymentSettingsRoutes);
app.use('/api/saved-searches', savedSearchRoutes);

// ── HEALTH CHECK ──────────────────────────────────────────
app.get('/', (req, res) => {
	res.json({ message: '🏠 NestFinder API is running!' });
});

// Deployment platforms poll this to decide whether the instance is alive, so it
// must stay cheap and must not touch the database.
app.get('/healthz', (req, res) => {
	res.json({
		ok: true,
		uptimeSeconds: Math.round(process.uptime()),
		env: process.env.NODE_ENV || 'development',
		db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
	});
});

// Answers the one question the logs cannot: what this instance actually parsed
// CLIENT_URL into, and whether the caller's own Origin passes. A trailing
// slash or stray whitespace in the dashboard is invisible everywhere else.
app.get('/healthz/cors', (req, res) => {
	const origin = req.headers.origin || null;
	res.json({
		allowedOrigins,
		clientUrlRaw: process.env.CLIENT_URL ?? null,
		clientUrlNormalised: normaliseOrigin(process.env.CLIENT_URL),
		yourOrigin: origin,
		yourOriginAllowed: origin ? isAllowedOrigin(origin) : null,
	});
});

// ── ERROR HANDLER ─────────────────────────────────────────
app.use(errorHandler);

// A crash that leaves no trace is the worst kind. Record it, then let the
// process die so the platform can restart it clean — swallowing these would
// leave the server running in an unknown state.
process.on('uncaughtException', (err) => {
	reportError(err, { fatal: true, kind: 'uncaughtException' });
	setTimeout(() => process.exit(1), 200);
});
process.on('unhandledRejection', (reason) => {
	reportError(reason instanceof Error ? reason : new Error(String(reason)), {
		kind: 'unhandledRejection',
	});
});

// ── START SERVER ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
	console.log(`🚀 Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});