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
		? nodemailer.createTransport({ service: 'gmail', auth: { user: gmailUser, pass: gmailPass } })
		: null;

	const resend = (!gmailTransport && resendKey) ? new Resend(resendKey) : null;

	const from = gmailTransport
		? `NestFinder <${gmailUser}>`
		: (process.env.EMAIL_FROM || 'NestFinder <onboarding@resend.dev>');

	_providers = { gmailTransport, resend, from };
	return _providers;
};

const clientUrl = () => process.env.CLIENT_URL || 'http://localhost:5173';

export const isEmailLive = () => {
	const { gmailTransport, resend } = getProviders();
	return Boolean(gmailTransport || resend);
};

// ── SHARED HTML SHELL ─────────────────────────────────────
const shell = (inner) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#181B3D;padding:32px;">
    <div style="max-width:480px;margin:0 auto;background:#232755;border-radius:20px;overflow:hidden;border:1px solid rgba(192,144,63,0.25);">
      <div style="background:linear-gradient(135deg,#C0903F,#D9A54C);padding:24px 32px;">
        <span style="font-size:20px;font-weight:800;color:#181B3D;">🏠 NestFinder</span>
      </div>
      <div style="padding:32px;color:#F4F3FC;">
        ${inner}
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.08);color:#9C9FC7;font-size:12px;">
        NestFinder · SIWES Off-Campus Housing · This is an automated message.
      </div>
    </div>
  </div>`;

// ── CORE SENDER (with demo fallback) ──────────────────────
const send = async ({ to, subject, html, kind, demoData = {} }) => {
	const { gmailTransport, resend, from } = getProviders();

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
	try {
		if (gmailTransport) {
			await gmailTransport.sendMail({ from, to, subject, html });
		} else {
			await resend.emails.send({ from, to, subject, html });
		}
		return { demo: false, ...demoData };
	} catch (err) {
		// Never let an email failure break the auth flow — degrade to demo.
		console.error(`⚠️  Email send failed (${kind}):`, err.message);
		return { demo: true, error: err.message, ...demoData };
	}
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;">Welcome to NestFinder! Confirm your email address to unlock messaging landlords, saving listings, and reporting fraud.</p>
      <a href="${verifyUrl}" style="display:inline-block;margin:20px 0;background:#C0903F;color:#181B3D;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Verify My Email</a>
      <p style="color:#9C9FC7;font-size:13px;">This link expires in 24 hours. If you didn't create this account, you can ignore this email.</p>
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;">Your one-time login code is:</p>
      <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#D9A54C;text-align:center;padding:24px;background:#2E3269;border-radius:14px;margin:20px 0;">${otp}</div>
      <p style="color:#9C9FC7;">This code expires in <strong style="color:#F4F3FC;">10 minutes</strong>.</p>
      <p style="color:#C1503A;font-weight:600;font-size:13px;">Never share this code — NestFinder will never ask you for it.</p>
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
      <h2 style="margin:0 0 8px;color:#C1503A;">Security Alert</h2>
      <p style="color:#9C9FC7;line-height:1.6;">Hi ${name || 'there'}, we detected repeated failed login attempts on your account${ip ? ` from IP <strong style="color:#F4F3FC;">${ip}</strong>` : ''}. Your account has been temporarily locked for 30 minutes.</p>
      <p style="color:#9C9FC7;">If this was you, just wait and try again. If not, change your password as soon as you can.</p>
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;">We received a request to reset your NestFinder password. Click the button below to choose a new one.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:20px 0;background:#C0903F;color:#181B3D;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Reset My Password</a>
      <p style="color:#9C9FC7;font-size:13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email — your password won't change.</p>
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;"><strong style="color:#F4F3FC;">${senderName}</strong> sent you a message:</p>
      <div style="color:#F4F3FC;line-height:1.6;padding:16px 18px;background:#2E3269;border-left:3px solid #C0903F;border-radius:8px;margin:16px 0;">${snippet}</div>
      <a href="${conversationUrl}" style="display:inline-block;margin:8px 0 4px;background:#C0903F;color:#181B3D;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Open Conversation</a>
      <p style="color:#9C9FC7;font-size:12px;margin-top:16px;">You're getting this because you weren't online. We won't email you again about this chat for a little while.</p>
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;">We've removed <strong style="color:#F4F3FC;">${companyName}</strong> from our SIWES directory, so it is no longer set as your placement.</p>
      <p style="color:#9C9FC7;line-height:1.6;">This does not affect your actual industrial training — it only means we can no longer measure your commute from that address. Pick another centre (or add your own) to get distance and transport estimates again.</p>
      <a href="${accountUrl}" style="display:inline-block;margin:8px 0 4px;background:#C0903F;color:#181B3D;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">Update my placement</a>
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
      <h2 style="margin:0 0 8px;color:#F4F3FC;">Hi ${name || 'there'},</h2>
      <p style="color:#9C9FC7;line-height:1.6;">A new home matches your saved search <strong style="color:#F4F3FC;">${m.searchName}</strong>.</p>
      <div style="color:#F4F3FC;line-height:1.6;padding:16px 18px;background:#2E3269;border-left:3px solid #C0903F;border-radius:8px;margin:16px 0;">
        <strong>${m.title}</strong><br/>
        <span style="color:#9C9FC7;">${m.area}</span>
      </div>
      <p style="color:#9C9FC7;font-size:13px;">You saved: ${m.criteria}</p>
      <a href="${m.url}" style="display:inline-block;margin:8px 0 4px;background:#C0903F;color:#181B3D;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;">View this home</a>
      <p style="color:#9C9FC7;font-size:12px;margin-top:16px;">We'll only email you about this search once every few hours, however many homes appear. You can turn alerts off on your saved searches page.</p>
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
      <h2 style="margin:0 0 8px;color:#C1503A;">Listing Fraud Alert</h2>
      <p style="color:#9C9FC7;">Listing <strong style="color:#F4F3FC;">${listingId}</strong> triggered these checks:</p>
      <ul style="color:#9C9FC7;line-height:1.7;">
        ${flags.map((f) => `<li><strong style="color:#F4F3FC;">${f.rule}</strong>: ${f.detail}</li>`).join('')}
      </ul>
    `),
	});
};
