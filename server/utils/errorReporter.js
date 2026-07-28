import fs from 'fs';
import path from 'path';

/**
 * Where errors go when nobody is watching the terminal.
 *
 * Deliberately works with NO third-party signup: every error is written to a
 * rotating JSONL file and kept in memory for an admin screen, so the project
 * has real error monitoring on day one. If a Sentry DSN is ever added, the same
 * errors are forwarded there too — same pattern as Turnstile, email and
 * payments in this codebase: a no-op until keys exist.
 */

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'errors.jsonl');
const MAX_BYTES = 5 * 1024 * 1024;   // rotate at 5MB so a loop can't fill the disk
const MAX_IN_MEMORY = 200;

export const sentryEnabled = () => Boolean(process.env.SENTRY_DSN);

// Most recent first — what the admin error screen reads.
const recent = [];

/** Strip anything that must never be written to a log file. */
const SECRET_KEYS = /pass|token|secret|key|otp|authorization|cookie|bvn/i;
const scrub = (obj, depth = 0) => {
	if (!obj || typeof obj !== 'object' || depth > 3) return obj;
	const out = Array.isArray(obj) ? [] : {};
	for (const [k, v] of Object.entries(obj)) {
		if (SECRET_KEYS.test(k)) out[k] = '[redacted]';
		else if (v && typeof v === 'object') out[k] = scrub(v, depth + 1);
		else out[k] = v;
	}
	return out;
};

const writeLine = (entry) => {
	try {
		if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
		if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > MAX_BYTES) {
			fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
		}
		fs.appendFileSync(LOG_FILE, `${JSON.stringify(entry)}\n`);
	} catch {
		// Logging must never be the thing that brings the server down.
	}
};

const forwardToSentry = (entry) => {
	if (!sentryEnabled()) return;
	// Sentry's minimal store endpoint — avoids adding a dependency for something
	// that may never be switched on.
	const m = String(process.env.SENTRY_DSN).match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
	if (!m) return;
	const [, key, host, projectId] = m;
	fetch(`https://${host}/api/${projectId}/store/`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${key}, sentry_client=nestfinder/1.0`,
		},
		body: JSON.stringify({
			message: entry.message,
			level: 'error',
			platform: 'node',
			environment: process.env.NODE_ENV || 'development',
			extra: entry,
		}),
	}).catch(() => { /* a monitoring outage must not surface to users */ });
};

/**
 * @param err   the Error
 * @param ctx   { route, method, userId, role, ...anything useful }
 */
export function reportError(err, ctx = {}) {
	const entry = {
		at: new Date().toISOString(),
		message: err?.message || String(err),
		name: err?.name,
		stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
		...scrub(ctx),
	};

	recent.unshift(entry);
	if (recent.length > MAX_IN_MEMORY) recent.pop();

	writeLine(entry);
	forwardToSentry(entry);

	// Still print it — in development the terminal is the fastest signal.
	if (process.env.NODE_ENV !== 'test') {
		console.error(`[error] ${entry.message}`, ctx.route ? `(${ctx.method} ${ctx.route})` : '');
	}

	return entry;
}

/** The last N errors, for the admin health screen. */
export const recentErrors = (limit = 50) => recent.slice(0, limit);

export const errorStats = () => {
	const now = Date.now();
	const since = (ms) => recent.filter((e) => now - new Date(e.at).getTime() < ms).length;
	return {
		total: recent.length,
		lastHour: since(60 * 60 * 1000),
		last24h: since(24 * 60 * 60 * 1000),
		sentry: sentryEnabled(),
	};
};
