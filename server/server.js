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

// Only the known frontend origin(s) may call the API or open a socket. Non-browser
// callers (curl, server-to-server) send no Origin header and are allowed through.
const allowedOrigins = [process.env.CLIENT_URL, 'http://localhost:5173'].filter(Boolean);
const corsOrigin = (origin, cb) =>
	(!origin || allowedOrigins.includes(origin)) ? cb(null, true) : cb(new Error('Not allowed by CORS'));

// ── SOCKET.IO — real-time message delivery ──────────────────
const io = new Server(httpServer, {
	cors: { origin: allowedOrigins, credentials: true },
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
// 1. Helmet — sets secure HTTP headers
app.use(helmet());

// 2. CORS — restrict to the known frontend origin(s).
//    `credentials` lets the browser send/receive the httpOnly session cookie.
app.use(cors({ origin: corsOrigin, credentials: true }));

// TEMP DEBUG: log every incoming request to help diagnose 404s and routing issues.
app.use((req, res, next) => {
	try {
		console.log('[REQ]', req.method, req.originalUrl);
	} catch (e) { /* ignore logging failures */ }
	next();
});

// TEMP DEBUG: utility to print all registered routes at startup
function printRegisteredRoutes(router, prefix = '') {
    if (router.stack) {
        router.stack.forEach((middleware) => {
            if (middleware.route) {
                // This middleware is a route
                const methods = Object.keys(middleware.route.methods);
                methods.forEach((m) => {
                    console.log(`[ROUTE] ${m.toUpperCase().padEnd(6)} ${prefix}${middleware.route.path}`);
                });
            } else if (middleware.name === 'router' && middleware.handle.stack) {
                // This middleware is a nested router (e.g., app.use('/api/payments', router))
                const routerPrefix = middleware.regexp.source
                    .replace(/^\^/, '').replace(/\$.*/, '').replace(/\\\//g, '/');
                printRegisteredRoutes(middleware.handle, routerPrefix);
            }
        });
    }
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
});
app.use(globalLimiter);

// 6. Stricter rate limiter for auth routes only
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,                    // max 10 login attempts
	message: { message: 'Too many login attempts. Please try again later.' },
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
console.log('✓ Mounted paymentSettingsRoutes at /api/payments-settings');

// TEMP DEBUG: print all registered routes before starting the server
console.log('\n=== REGISTERED EXPRESS ROUTES ===');
printRegisteredRoutes(app);
console.log('=== END ROUTE LIST ===\n');
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