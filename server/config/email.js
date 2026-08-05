import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Provider priority:
//   1. Gmail (Nodemailer + App Password) → real emails to ANY inbox, no domain needed.
//   2. Resend (API key)                  → real emails (free tier = your own address).
//   3. DEMO MODE (neither configured)    → logged to console + code returned to caller.
// Adding credentials to .env flips it live with no code change.
//
// NOTE: providers are initialised LAZILY (on first use), not at import time.
// Reading process.env at import time is unreliable because dotenv may not have
// run yet depending on import order — lazy init guarantees the env is loaded.
let _providers;
const getProviders = () => {
	if (_providers) return _providers;
	const gmailUser = process.env.GMAIL_USER;
	const gmailPass = process.env.GMAIL_APP_PASSWORD;
	const resendKey = process.env.RESEND_API_KEY;

	const gmailTransport = (gmailUser && gmailPass)
		? nodemailer.createTransport({
			service: 'gmail',
			auth: { user: gmailUser, pass: gmailPass },
			// Render's outbound IPv6 routing cannot reach Gmail reliably; force
			// IPv4. Without this the socket connects to an IPv6 literal and hangs
			// indefinitely when the platform's egress path has no IPv6 route.
			family: 4,
			// Kill the attempt after 8 seconds — authentication can take 3-4s on
			// a slow link, but anything longer means the connection is stuck.
			connectionTimeout: 8000,
			greetingTimeout: 5000,
			socketTimeout: 10000,
		})
		: null;

	// Resend is built whenever a key exists, NOT only when Gmail is missing.
	// The old `!gmailTransport && resendKey` meant configuring Gmail silently
	// disabled Resend — so on a host that blocks SMTP there was no way to send
	// at all, even with a perfectly good API key sitting in the environment.
	const resend = resendKey ? new Resend(resendKey) : null;

	// Which provider goes first. Gmail is the better default locally (real mail
	// to any inbox, no domain to verify), but PaaS hosts including Render block
	// outbound SMTP on 25/465/587 — the connection simply times out. Set
	// EMAIL_PROVIDER=resend there to skip straight to HTTPS and avoid burning
	// the send deadline on a socket that will never open.
	const preferred = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
	const order = preferred === 'resend'
		? ['resend', 'gmail']
		: preferred === 'gmail'
			? ['gmail', 'resend']
			: ['gmail', 'resend'];

	const envFrom = process.env.EMAIL_FROM?.trim();
	let from;
	if (order[0] === 'gmail' && gmailTransport) {
		const addressIn = envFrom?.match(/<([^>]+)>/)?.[1] || envFrom;
		if (envFrom && addressIn?.toLowerCase() !== gmailUser.toLowerCase()) {
			console.warn(
				`⚠️  EMAIL_FROM (${addressIn}) is not GMAIL_USER (${gmailUser}). Gmail will rewrite the sender unless it is a verified alias.`,
			);
		}
		from = envFrom || `NestFinder <${gmailUser}>`;
	} else {
		from = envFrom || 'NestFinder <onboarding@resend.dev>';
	}

	const primary = order[0] === 'gmail' && gmailTransport ? `Gmail (${gmailUser})` : order[0] === 'resend' && resend ? 'Resend' : null;
	const fallback = order[1] === 'gmail' && gmailTransport ? `Gmail (${gmailUser})` : order[1] === 'resend' && resend ? 'Resend' : null;
	const label = primary
		? fallback ? `${primary} → ${fallback} fallback` : primary
		: 'DEMO MODE — nothing will be sent';
	console.log(`✉️  Email provider: ${label}`);

	_providers = { gmailTransport, resend, from, order };
	return _providers;
};

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

// Hard ceiling on any provider call. The transport timeouts above cover the
// phases Nodemailer knows about (connect, greeting, socket), but a stall
// between them — or inside the Resend HTTP client — is still unbounded. This
// guarantees the caller gets an answer, because a login request waiting on an
// SMTP socket is a login request the student has already given up on.
const SEND_DEADLINE_MS = 9000;

const withDeadline = (promise, ms, label) => {
	let timer;
	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		}),
	]).finally(() => clearTimeout(timer));
};

export const isEmailLive = () => {
	const { gmailTransport, resend } = getProviders();
	return Boolean(gmailTransport || resend);
};

// ── SHARED HTML SHELL ─────────────────────────────────────
//
// Matches the application's palette — warm paper, deep ink navy, square corners.
// It previously carried the pre-redesign purple-and-gold scheme, so a NestFinder
// email looked like it came from a different product than the one it links to.
//
// The mark is a hosted PNG, not the SVG used in the app: Gmail and Outlook strip
// inline SVG. Most clients also block remote images by default, so the wordmark
// stays live text beside it and the <img> carries alt text — the header still
// reads as NestFinder with every image blocked.
const shell = (inner) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#F4F2EF;padding:32px 16px;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E7E3DE;">
      <div style="background:#1B2A41;padding:22px 32px;">
        <img src="${clientUrl()}/icon-192.png" width="30" height="30" alt=""
             style="vertical-align:middle;border:0;display:inline-block;" />
        <span style="font-size:19px;font-weight:800;color:#FAF9F7;letter-spacing:-0.2px;vertical-align:middle;padding-left:10px;">NestFinder</span>
      </div>
      <div style="padding:32px;color:#1A1D24;font-size:15px;">
        ${inner}
      </div>
      <div style="padding:16px 32px;border-top:1px solid #E7E3DE;color:#5E636C;font-size:12px;background:#FAF9F7;">
        NestFinder · SIWES Off-Campus Housing · This is an automated message.
      </div>
    </div>
  </div>`;

// ── CORE SENDER (with demo fallback) ──────────────────────
const send = async ({ to, subject, html, kind, demoData = {} }) => {
	const { gmailTransport, resend, from, order } = getProviders();

	// DEMO MODE — no provider configured
	if (!gmailTransport && !resend) {
		console.log(`\n──────── ✉️  EMAIL [DEMO MODE — not actually sent] ────────`);
		console.log(`  kind:    ${kind}`);
		console.log(`  to:      ${to}`);
		console.log(`  subject: ${subject}`);
		Object.entries(demoData).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
		console.log(`  → Add GMAIL_USER + GMAIL_APP_PASSWORD to server/.env for real emails.`);
		console.log(`────────────────────────────────────────────────────────────\n`);
		return { demo: true, ...demoData };
	}

	// Try each configured provider in turn. A single provider is not a fallback
	// chain: Render blocks outbound SMTP (25/465/587), so Gmail times out there
	// no matter how it is configured, and without a second attempt the OTP is
	// simply lost. Resend goes over HTTPS, which the platform does not block.
	const errors = [];
	for (const name of order) {
		const transport = name === 'gmail' ? gmailTransport : resend;
		if (!transport) continue;
		try {
			if (name === 'gmail') {
				await withDeadline(gmailTransport.sendMail({ from, to, subject, html }), SEND_DEADLINE_MS, 'Gmail send');
			} else {
				// Gmail's From is the authenticated account; Resend's must be a
				// verified domain or its shared onboarding sender, so the two
				// cannot share one value when falling through.
				const resendFrom = /@gmail\.com/i.test(from) ? 'NestFinder <onboarding@resend.dev>' : from;
				await withDeadline(resend.emails.send({ from: resendFrom, to, subject, html }), SEND_DEADLINE_MS, 'Resend send');
			}
			if (errors.length) console.log(`✉️  Sent via ${name} after ${errors.length} failed attempt(s).`);
			return { demo: false, ...demoData };
		} catch (err) {
			// "Connection timeout" on 465 means the host drops outbound SMTP
			// altogether — not a credential problem, and not something a longer
			// timeout would rescue. Say which provider failed so the log points
			// at the right one.
			console.error(`⚠️  Email send failed (${kind}) via ${name}:`, err.message);
			errors.push(`${name}: ${err.message}`);
		}
	}

	// Every provider failed — degrade to demo rather than break the auth flow.
	return { demo: true, error: errors.join(' | '), ...demoData };
};

// ── 1. EMAIL VERIFICATION ─────────────────────────────────
export const sendVerificationEmail = async (email, name, rawToken) => {
	const verifyUrl = `${clientUrl()}/verify-email?token=${rawToken}`;
	return send({
		to: email,
		kind: 'verify-email',
		subject: 'Verify your NestFinder account',
		demoData: { verifyUrl },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;">Welcome to NestFinder! Confirm your email address to unlock messaging landlords, saving listings, and reporting fraud.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;background:#1B2A41;color:#FFFFFF;padding:14px 28px;text-decoration:none;font-weight:700;">Verify My Email</a>
      <p style="color:#5E636C;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
    `),
	});
};

// ── 2. LOGIN OTP ──────────────────────────────────────────
export const sendOTPEmail = async (email, name, otp) => {
	return send({
		to: email,
		kind: 'login-otp',
		subject: `${otp} is your NestFinder login code`,
		demoData: { otp },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;">Your one-time login code is:</p>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#1B2A41;text-align:center;padding:24px;background:#F4F2EF;margin:20px 0;">${otp}</div>
      <p style="color:#5E636C;">This code expires in <strong style="color:#1A1D24;">10 minutes</strong>.</p>
      <p style="color:#B23B2E;font-weight:600;font-size:13px;">Never share this code — NestFinder will never ask you for it.</p>
    `),
	});
};

// ── 3. SUSPICIOUS LOGIN / LOCKOUT ALERT ───────────────────
export const sendLoginAlertEmail = async (email, name, ip) => {
	return send({
		to: email,
		kind: 'security-alert',
		subject: 'Security alert: unusual login activity',
		demoData: { ip: ip || 'unknown' },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#B23B2E;">Security Alert</h2>
      <p style="color:#5E636C;line-height:1.6;">Hi ${name || 'there'}, we detected repeated failed login attempts on your account${ip ? ` from IP <strong style="color:#1A1D24;">${ip}</strong>` : ''}. Your account has been temporarily locked for 30 minutes.</p>
      <p style="color:#5E636C;">If this was you, just wait and try again. If not, change your password as soon as you can.</p>
    `),
	});
};

// ── 4. PASSWORD RESET ─────────────────────────────────────
export const sendPasswordResetEmail = async (email, name, rawToken) => {
	const resetUrl = `${clientUrl()}/reset-password?token=${rawToken}`;
	return send({
		to: email,
		kind: 'password-reset',
		subject: 'Reset your NestFinder password',
		demoData: { resetUrl },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;">We received a request to reset your NestFinder password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;background:#1B2A41;color:#FFFFFF;padding:14px 28px;text-decoration:none;font-weight:700;">Reset My Password</a>
      <p style="color:#5E636C;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
    `),
	});
};

// ── 5. NEW CHAT MESSAGE (only when the recipient is offline) ──
export const sendNewMessageEmail = async (email, name, senderName, snippet, conversationUrl) => {
	return send({
		to: email,
		kind: 'new-message',
		subject: `New message from ${senderName} on NestFinder`,
		demoData: { conversationUrl },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;"><strong style="color:#1A1D24;">${senderName}</strong> sent you a message:</p>
      <div style="color:#1A1D24;line-height:1.6;padding:16px 18px;background:#F4F2EF;border-left:3px solid #A87C3E;margin:16px 0;">${snippet}</div>
      <a href="${conversationUrl}" style="display:inline-block;margin:8px 0 4px;background:#1B2A41;color:#FFFFFF;padding:14px 28px;text-decoration:none;font-weight:700;">Open Conversation</a>
      <p style="color:#5E636C;font-size:12px;margin-top:16px;">You're getting this because you weren't online. We won't email you again about this chat for a little while.</p>
    `),
	});
};

// ── PLACEMENT CENTRE REMOVED ──────────────────────────────
// A student's whole housing search is measured from their placement, so if the
// centre is withdrawn from the directory they must be told — otherwise their
// search silently reverts to unanchored and they never learn why.
export const sendPlacementRemovedEmail = async (email, name, companyName, accountUrl) => {
	return send({
		to: email,
		kind: 'placement-removed',
		subject: 'Your SIWES placement centre was removed from NestFinder',
		demoData: { companyName, accountUrl },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;">We've removed <strong style="color:#1A1D24;">${companyName}</strong> from our SIWES directory, so it is no longer set as your placement.</p>
      <p style="color:#5E636C;line-height:1.6;">This does not affect your actual industrial training — it only means we can no longer measure your commute from that address. Pick another centre (or add your own) to get distance and transport estimates again.</p>
      <a href="${accountUrl}" style="display:inline-block;margin:8px 0 4px;background:#1B2A41;color:#FFFFFF;padding:14px 28px;text-decoration:none;font-weight:700;">Update my placement</a>
    `),
	});
};

// ── SAVED-SEARCH ALERT ────────────────────────────────────
// Rooms near the big placement centres go within days of the SIWES intake, so
// a student who searched on Monday has no way of knowing what appeared on
// Tuesday. Throttled hard in the caller — this is a nudge, not a newsletter.
export const sendSavedSearchAlertEmail = async (email, name, m) => {
	return send({
		to: email,
		kind: 'saved-search-alert',
		subject: `New home matching “${m.searchName}” on NestFinder`,
		demoData: { searchName: m.searchName, listing: m.title, url: m.url },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#1A1D24;">Hi ${name || 'there'},</h2>
      <p style="color:#5E636C;line-height:1.6;">A new home matches your saved search <strong style="color:#1A1D24;">${m.searchName}</strong>.</p>
      <div style="color:#1A1D24;line-height:1.6;padding:16px 18px;background:#F4F2EF;border-left:3px solid #A87C3E;margin:16px 0;">
        <strong>${m.title}</strong><br/>
        <span style="color:#5E636C;">${m.area}</span>
      </div>
      <p style="color:#5E636C;font-size:13px;">You saved: ${m.criteria}</p>
      <a href="${m.url}" style="display:inline-block;margin:8px 0 4px;background:#1B2A41;color:#FFFFFF;padding:14px 28px;text-decoration:none;font-weight:700;">View this home</a>
      <p style="color:#5E636C;font-size:12px;margin-top:16px;">We'll only email you about this search once every few hours, however many homes appear. You can turn alerts off on your saved searches page.</p>
    `),
	});
};

// ── 6. FRAUD ALERT TO ADMIN (used by a later slice) ───────
export const sendFraudAlertToAdmin = async (listingId, flags) => {
	const to = process.env.ADMIN_EMAIL || 'admin@nestfinder.com';
	return send({
		to,
		kind: 'fraud-alert',
		subject: `Fraud alert: listing ${listingId} flagged`,
		demoData: { listingId, rules: flags.map((f) => f.rule).join(', ') },
		html: shell(`
      <h2 style="margin:0 0 8px;color:#B23B2E;">Listing Fraud Alert</h2>
      <p style="color:#5E636C;">Listing <strong style="color:#1A1D24;">${listingId}</strong> triggered these checks:</p>
      <ul style="color:#5E636C;line-height:1.7;">
        ${flags.map((f) => `<li><strong style="color:#1A1D24;">${f.rule}</strong>: ${f.detail}</li>`).join('')}
      </ul>
    `),
	});
};
