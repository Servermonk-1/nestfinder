import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Admin from '../models/Admin.js';
import { sendVerificationEmail, sendOTPEmail, sendLoginAlertEmail, sendPasswordResetEmail } from '../config/email.js';
import { recordAttempt, clearAttempts, countRecentFails, MAX_FAILS } from '../middleware/checkBruteForce.js';
import { AUTH_COOKIE } from '../middleware/auth.js';

// After a failed login, if the account just hit the lockout threshold,
// send it a one-time security alert.
const maybeSendLockoutAlert = async (email, name, req) => {
	const fails = await countRecentFails(email);
	if (fails === MAX_FAILS) {
		await sendLoginAlertEmail(email, name, req.ip);
	}
};

const isDev = process.env.NODE_ENV !== 'production';

// Helper — generate JWT token
const generateToken = (id, role) => {
	return jwt.sign({ id, role }, process.env.JWT_SECRET, {
		expiresIn: process.env.JWT_EXPIRE || '7d',
	});
};

// Put the session JWT in an httpOnly cookie so browser JS — and therefore any
// XSS — can't read it. The token is still returned in the JSON body for
// non-browser clients (API tools, tests).
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
export const sendAuthCookie = (res, token) => {
	res.cookie(AUTH_COOKIE, token, {
		httpOnly: true,
		secure: !isDev,          // HTTPS-only in production
		sameSite: isDev ? 'lax' : 'none',
		maxAge: SESSION_MS,
		path: '/',
	});
};

export const clearAuthCookie = (res) => {
	res.clearCookie(AUTH_COOKIE, {
		httpOnly: true,
		secure: !isDev,
		sameSite: isDev ? 'lax' : 'none',
		path: '/',
	});
};

// Helper — hash a raw token/OTP for storage (never store the raw value)
const hash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

// Helper — build a fresh email-verification token pair
const buildVerifyToken = () => {
	const raw = crypto.randomBytes(32).toString('hex');
	return {
		raw,
		hashed: hash(raw),
		expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
	};
};

// Helper — generate a 6-digit OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// Helper — build a fresh password-reset token pair (1-hour lifetime)
const buildResetToken = () => {
	const raw = crypto.randomBytes(32).toString('hex');
	return {
		raw,
		hashed: hash(raw),
		expires: Date.now() + 60 * 60 * 1000, // 1 hour
	};
};

// ── Trusted-device helpers — skip login OTP on a recently-verified device ──
const TRUSTED_DEVICE_MS = 7 * 24 * 60 * 60 * 1000; // remember this device for 7 days

const isTrustedDevice = (account, rawToken) => {
	if (!rawToken || !account?.trustedDevices?.length) return false;
	const h = hash(rawToken);
	return account.trustedDevices.some((d) => d.tokenHash === h && new Date(d.expiresAt).getTime() > Date.now());
};

// Record a fresh trusted device (pruning expired ones); returns the raw token for the client.
const rememberDevice = (account, req) => {
	const raw = crypto.randomBytes(32).toString('hex');
	const live = (account.trustedDevices || []).filter((d) => new Date(d.expiresAt).getTime() > Date.now());
	account.trustedDevices = [...live, {
		tokenHash: hash(raw),
		expiresAt: new Date(Date.now() + TRUSTED_DEVICE_MS),
		userAgent: req.headers['user-agent'],
		createdAt: new Date(),
	}].slice(-10);
	return raw;
};

// ── STUDENT REGISTER ──────────────────────────────────────
export const registerStudent = async (req, res) => {
	try {
		const { fullName, email, password, phone, institution } = req.body;

		const exists = await Student.findOne({ email });
		if (exists) {
			return res.status(400).json({ message: 'Email already registered' });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const verify = buildVerifyToken();

		const student = await Student.create({
			fullName, email,
			password: hashedPassword,
			phone, institution,
			emailVerified: false,
			emailVerifyToken: verify.hashed,
			emailVerifyExpires: verify.expires,
		});

		const emailResult = await sendVerificationEmail(student.email, student.fullName, verify.raw);

		// Hard block: we do NOT issue a token here. A student gets no session until
		// they've verified their email and signed in — verification is the gate.
		res.status(201).json({
			message: 'Registration successful. Please verify your email to continue.',
			emailVerificationRequired: true,
			email: student.email,
			emailSent: !emailResult.demo,
			// In demo mode (no email provider) hand the link back so the flow is demoable.
			...(emailResult.demo && isDev ? { devVerifyUrl: emailResult.verifyUrl } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LANDLORD REGISTER ─────────────────────────────────────
export const registerLandlord = async (req, res) => {
	try {
		const { fullName, email, password, phone } = req.body;

		const exists = await Landlord.findOne({ email });
		if (exists) {
			return res.status(400).json({ message: 'Email already registered' });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const verify = buildVerifyToken();

		const landlord = await Landlord.create({
			fullName, email,
			password: hashedPassword,
			phone,
			emailVerified: false,
			emailVerifyToken: verify.hashed,
			emailVerifyExpires: verify.expires,
		});

		const emailResult = await sendVerificationEmail(landlord.email, landlord.fullName, verify.raw);

		const authToken = generateToken(landlord._id, landlord.role);
		sendAuthCookie(res, authToken);
		res.status(201).json({
			message: 'Registration successful. Please verify your email.',
			token: authToken,
			user: {
				id: landlord._id,
				fullName: landlord.fullName,
				email: landlord.email,
				role: landlord.role,
				verified: landlord.verified,
				emailVerified: landlord.emailVerified,
				tourCompleted: landlord.tourCompleted,
			},
			emailSent: !emailResult.demo,
			...(emailResult.demo && isDev ? { devVerifyUrl: emailResult.verifyUrl } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── VERIFY EMAIL ──────────────────────────────────────────
// GET /api/auth/verify-email?token=xxxxx  (works for student OR landlord)
export const verifyEmail = async (req, res) => {
	try {
		const raw = req.query.token;
		if (!raw) return res.status(400).json({ message: 'Verification token missing' });

		const hashedToken = hash(raw);
		const query = {
			emailVerifyToken: hashedToken,
			emailVerifyExpires: { $gt: Date.now() },
		};

		let account = await Student.findOne(query).select('+emailVerifyToken +emailVerifyExpires');
		let role = 'student';
		if (!account) {
			account = await Landlord.findOne(query).select('+emailVerifyToken +emailVerifyExpires');
			role = 'landlord';
		}

		if (!account) {
			return res.status(400).json({ message: 'This verification link is invalid or has expired.' });
		}

		account.emailVerified = true;
		account.emailVerifyToken = undefined;
		account.emailVerifyExpires = undefined;
		await account.save();

		res.status(200).json({
			message: 'Email verified successfully. You now have full access.',
			role,
			email: account.email,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── RESEND VERIFICATION EMAIL ─────────────────────────────
// POST /api/auth/resend-verification  (protected)
export const resendVerification = async (req, res) => {
	try {
		const Model = req.user.role === 'landlord' ? Landlord : Student;
		const account = await Model.findById(req.user.id);
		if (!account) return res.status(404).json({ message: 'Account not found' });

		if (account.emailVerified) {
			return res.status(400).json({ message: 'Your email is already verified.' });
		}

		const verify = buildVerifyToken();
		account.emailVerifyToken = verify.hashed;
		account.emailVerifyExpires = verify.expires;
		await account.save();

		const emailResult = await sendVerificationEmail(account.email, account.fullName, verify.raw);

		res.status(200).json({
			message: 'Verification email sent.',
			emailSent: !emailResult.demo,
			...(emailResult.demo && isDev ? { devVerifyUrl: emailResult.verifyUrl } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── RESEND VERIFICATION (PUBLIC) ──────────────────────────
// POST /api/auth/verify-email/resend  { email }
// For users who have no session yet (blocked at login / just registered).
export const resendVerificationPublic = async (req, res) => {
	try {
		const email = req.body.email?.trim().toLowerCase();
		if (!email) return res.status(400).json({ message: 'Email is required' });

		let account = await Student.findOne({ email });
		if (!account) account = await Landlord.findOne({ email });

		// No-leak: same response whether or not the account exists / is already verified.
		const generic = 'If that account exists and still needs verifying, a new link is on its way.';
		if (!account || account.emailVerified) return res.status(200).json({ message: generic });

		const verify = buildVerifyToken();
		account.emailVerifyToken = verify.hashed;
		account.emailVerifyExpires = verify.expires;
		await account.save();

		const emailResult = await sendVerificationEmail(account.email, account.fullName, verify.raw);
		res.status(200).json({
			message: generic,
			emailSent: !emailResult.demo,
			...(emailResult.demo && isDev ? { devVerifyUrl: emailResult.verifyUrl } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LOGOUT — clear the session cookie ─────────────────────
// POST /api/auth/logout
export const logout = async (req, res) => {
	clearAuthCookie(res);
	res.status(200).json({ message: 'Signed out' });
};

// ── FORGOT PASSWORD — email a reset link ──────────────────
// POST /api/auth/forgot-password   (works for student OR landlord)
export const forgotPassword = async (req, res) => {
	try {
		const email = req.body.email?.trim().toLowerCase();
		if (!email) return res.status(400).json({ message: 'Email is required' });

		// Look up in students first, then landlords.
		let account = await Student.findOne({ email });
		if (!account) account = await Landlord.findOne({ email });

		// Always respond the same way so we never reveal which emails are registered.
		const genericMsg = 'If an account exists for that email, a reset link is on its way.';
		if (!account) return res.status(200).json({ message: genericMsg });

		const reset = buildResetToken();
		account.resetPasswordToken = reset.hashed;
		account.resetPasswordExpires = reset.expires;
		await account.save();

		const emailResult = await sendPasswordResetEmail(account.email, account.fullName, reset.raw);

		res.status(200).json({
			message: genericMsg,
			emailSent: !emailResult.demo,
			// In demo mode (no email provider) hand the link back so the flow is demoable.
			...(emailResult.demo && isDev ? { devResetUrl: emailResult.resetUrl } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── RESET PASSWORD — consume the token, set a new password ─
// POST /api/auth/reset-password   { token, password }
export const resetPassword = async (req, res) => {
	try {
		const { token, password } = req.body;
		if (!token || !password) {
			return res.status(400).json({ message: 'Token and new password are required' });
		}
		if (password.length < 6) {
			return res.status(400).json({ message: 'Password must be at least 6 characters' });
		}

		const hashedToken = hash(token);
		const query = { resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } };

		let account = await Student.findOne(query).select('+resetPasswordToken +resetPasswordExpires');
		if (!account) account = await Landlord.findOne(query).select('+resetPasswordToken +resetPasswordExpires');

		if (!account) {
			return res.status(400).json({ message: 'This reset link is invalid or has expired.' });
		}

		const salt = await bcrypt.genSalt(10);
		account.password = await bcrypt.hash(password, salt);
		account.resetPasswordToken = undefined;
		account.resetPasswordExpires = undefined;
		account.passwordChangedAt = new Date();
		// A password reset invalidates "remember this device" everywhere and any
		// pending login OTP — force fresh, deliberate logins afterwards.
		account.trustedDevices = [];
		account.otp = undefined;
		account.otpExpires = undefined;
		await account.save();

		res.status(200).json({ message: 'Password reset successful. You can now sign in with your new password.' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── CHANGE PASSWORD — for a signed-in user ────────────────
// POST /api/auth/change-password   { currentPassword, newPassword }   (protected)
export const changePassword = async (req, res) => {
	try {
		const { currentPassword, newPassword } = req.body;
		if (!currentPassword || !newPassword) {
			return res.status(400).json({ message: 'Current and new password are required' });
		}
		if (newPassword.length < 6) {
			return res.status(400).json({ message: 'New password must be at least 6 characters' });
		}
		if (currentPassword === newPassword) {
			return res.status(400).json({ message: 'New password must be different from your current one' });
		}

		const Model = req.user.role === 'landlord' ? Landlord : Student;
		const account = await Model.findById(req.user.id);
		if (!account) return res.status(404).json({ message: 'Account not found' });

		const isMatch = await bcrypt.compare(currentPassword, account.password);
		if (!isMatch) {
			return res.status(401).json({ message: 'Your current password is incorrect' });
		}

		const salt = await bcrypt.genSalt(10);
		account.password = await bcrypt.hash(newPassword, salt);
		account.passwordChangedAt = new Date();
		await account.save();

		res.status(200).json({ message: 'Password changed successfully.' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── STUDENT LOGIN — STEP 1: verify password, send OTP ─────
export const loginStudent = async (req, res) => {
	try {
		const { email, password } = req.body;

		const student = await Student.findOne({ email });
		if (!student) {
			await recordAttempt({ email, userType: 'student', success: false, req });
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		if (student.suspended) {
			return res.status(403).json({ message: 'Your account has been suspended. Contact support.' });
		}

		const isMatch = await bcrypt.compare(password, student.password);
		if (!isMatch) {
			await recordAttempt({ email, userType: 'student', success: false, req });
			await maybeSendLockoutAlert(email, student.fullName, req);
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		// Password correct — clear the failed-attempt streak.
		await clearAttempts(email);

		// Hard email-verification gate: no OTP, no trusted-device shortcut, no token
		// until the email is confirmed. They've proven the password, so it's safe to
		// tell them exactly what's needed.
		if (!student.emailVerified) {
			return res.status(403).json({
				message: 'Please verify your email address before signing in.',
				emailVerificationRequired: true,
				email: student.email,
			});
		}

		// Skip OTP on a device that verified recently ("remember this device").
		if (isTrustedDevice(student, req.body.deviceToken)) {
			const authToken = generateToken(student._id, student.role);
			sendAuthCookie(res, authToken);
			return res.status(200).json({
				message: 'Login successful',
				token: authToken,
				user: {
					id: student._id,
					fullName: student.fullName,
					email: student.email,
					role: student.role,
					emailVerified: student.emailVerified,
					tourCompleted: student.tourCompleted,
				},
			});
		}

		// Generate + store OTP (hashed), then send it.
		const otp = generateOtp();
		student.otp = hash(otp);
		student.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
		await student.save();

		const emailResult = await sendOTPEmail(student.email, student.fullName, otp);

		// No token here — the session is only issued after the OTP is verified.
		res.status(200).json({
			message: 'We sent a 6-digit code to your email.',
			otpRequired: true,
			email: student.email,
			emailSent: !emailResult.demo,
			// In demo mode surface the OTP so login is demoable without email.
			...(emailResult.demo && isDev ? { devOtp: otp } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── STUDENT LOGIN — STEP 2: verify OTP, issue JWT ─────────
export const verifyStudentOtp = async (req, res) => {
	try {
		const email = req.body.email?.trim().toLowerCase();
		const { otp } = req.body;
		if (!email || !otp) {
			return res.status(400).json({ message: 'Email and code are required' });
		}

		const student = await Student.findOne({ email }).select('+otp +otpExpires');
		if (!student || !student.otp) {
			return res.status(400).json({ message: 'No pending login. Please sign in again.' });
		}

		if (student.otp !== hash(otp) || student.otpExpires < Date.now()) {
			return res.status(400).json({ message: 'Invalid or expired code.' });
		}

		student.otp = undefined;
		student.otpExpires = undefined;
		const deviceToken = rememberDevice(student, req);
		await student.save();

		const authToken = generateToken(student._id, student.role);
		sendAuthCookie(res, authToken);
		res.status(200).json({
			message: 'Login successful',
			token: authToken,
			deviceToken,
			user: {
				id: student._id,
				fullName: student.fullName,
				email: student.email,
				role: student.role,
				emailVerified: student.emailVerified,
				tourCompleted: student.tourCompleted,
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LANDLORD LOGIN ────────────────────────────────────────
export const loginLandlord = async (req, res) => {
	try {
		const { email, password } = req.body;

		const landlord = await Landlord.findOne({ email });
		if (!landlord) {
			await recordAttempt({ email, userType: 'landlord', success: false, req });
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		if (landlord.suspended) {
			return res.status(403).json({ message: 'Your account has been suspended. Contact admin.' });
		}

		const isMatch = await bcrypt.compare(password, landlord.password);
		if (!isMatch) {
			await recordAttempt({ email, userType: 'landlord', success: false, req });
			await maybeSendLockoutAlert(email, landlord.fullName, req);
			return res.status(401).json({ message: 'Invalid email or password' });
		}

		// Password correct — clear the failed-attempt streak.
		await clearAttempts(email);

		// Skip OTP on a device that verified recently ("remember this device").
		if (isTrustedDevice(landlord, req.body.deviceToken)) {
			const authToken = generateToken(landlord._id, landlord.role);
			sendAuthCookie(res, authToken);
			return res.status(200).json({
				message: 'Login successful',
				token: authToken,
				user: {
					id: landlord._id,
					fullName: landlord.fullName,
					email: landlord.email,
					role: landlord.role,
					verified: landlord.verified,
					emailVerified: landlord.emailVerified,
					tourCompleted: landlord.tourCompleted,
				},
			});
		}

		const otp = generateOtp();
		landlord.otp = hash(otp);
		landlord.otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
		await landlord.save();

		const emailResult = await sendOTPEmail(landlord.email, landlord.fullName, otp);

		// No token here — the session is only issued after the OTP is verified.
		res.status(200).json({
			message: 'We sent a 6-digit code to your email.',
			otpRequired: true,
			email: landlord.email,
			emailSent: !emailResult.demo,
			...(emailResult.demo && isDev ? { devOtp: otp } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LANDLORD LOGIN — STEP 2: verify OTP, issue JWT ────────
export const verifyLandlordOtp = async (req, res) => {
	try {
		const email = req.body.email?.trim().toLowerCase();
		const { otp } = req.body;
		if (!email || !otp) {
			return res.status(400).json({ message: 'Email and code are required' });
		}

		const landlord = await Landlord.findOne({ email }).select('+otp +otpExpires');
		if (!landlord || !landlord.otp) {
			return res.status(400).json({ message: 'No pending login. Please sign in again.' });
		}

		if (landlord.otp !== hash(otp) || landlord.otpExpires < Date.now()) {
			return res.status(400).json({ message: 'Invalid or expired code.' });
		}

		landlord.otp = undefined;
		landlord.otpExpires = undefined;
		const deviceToken = rememberDevice(landlord, req);
		await landlord.save();

		const authToken = generateToken(landlord._id, landlord.role);
		sendAuthCookie(res, authToken);
		res.status(200).json({
			message: 'Login successful',
			token: authToken,
			deviceToken,
			user: {
				id: landlord._id,
				fullName: landlord.fullName,
				email: landlord.email,
				role: landlord.role,
				verified: landlord.verified,
				emailVerified: landlord.emailVerified,
				tourCompleted: landlord.tourCompleted,
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN LOGIN ───────────────────────────────────────────
export const loginAdmin = async (req, res) => {
	try {
		const { email, password } = req.body;

		const admin = await Admin.findOne({ email });
		if (!admin) {
			await recordAttempt({ email, userType: 'admin', success: false, req });
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		const isMatch = await bcrypt.compare(password, admin.password);
		if (!isMatch) {
			await recordAttempt({ email, userType: 'admin', success: false, req });
			return res.status(401).json({ message: 'Invalid credentials' });
		}

		await clearAttempts(email);

		const authToken = generateToken(admin._id, admin.role);
		sendAuthCookie(res, authToken);
		res.status(200).json({
			message: 'Login successful',
			token: authToken,
			user: {
				id: admin._id,
				fullName: admin.fullName,
				email: admin.email,
				role: admin.role,
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── MARK ONBOARDING TOUR COMPLETE ─────────────────────────
export const completeTour = async (req, res) => {
	try {
		const Model = req.user.role === 'landlord' ? Landlord
			: req.user.role === 'student' ? Student
			: null;

		if (!Model) {
			return res.status(400).json({ message: 'Tour tracking is not available for this account type' });
		}

		await Model.findByIdAndUpdate(req.user.id, { tourCompleted: true });
		res.status(200).json({ message: 'Tour marked complete' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
