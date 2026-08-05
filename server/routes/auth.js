import express from 'express';
import {
	registerStudent,
	loginStudent,
	verifyStudentOtp,
	registerLandlord,
	loginLandlord,
	verifyLandlordOtp,
	loginAdmin,
	verifyEmail,
	resendVerification,
	resendVerificationPublic,
	completeTour,
	logout,
	forgotPassword,
	resetPassword,
	changePassword,
} from '../controllers/authController.js';
import validate from '../middleware/validate.js';
import {
	studentRegisterRules,
	landlordRegisterRules,
	loginRules,
	verifyOtpRules,
	forgotPasswordRules,
	resetPasswordRules,
	changePasswordRules,
} from '../middleware/validationRules.js';
import protect from '../middleware/auth.js';
import checkBruteForce from '../middleware/checkBruteForce.js';
import verifyCaptcha from '../middleware/verifyCaptcha.js';

const router = express.Router();

// ── Registration (CAPTCHA-gated; no-op until TURNSTILE_SECRET_KEY is set) ──
router.post('/student/register', verifyCaptcha, studentRegisterRules, validate, registerStudent);
router.post('/landlord/register', verifyCaptcha, landlordRegisterRules, validate, registerLandlord);

// ── Login (brute-force protected) ──
// Step 2 is guarded too: it is the endpoint that accepts a 6-digit secret, so
// leaving it unmetered made it the cheapest way into an account.
router.post('/student/login', loginRules, validate, checkBruteForce, loginStudent);
router.post('/student/verify-otp', verifyOtpRules, validate, checkBruteForce, verifyStudentOtp); // step 2 of student login
router.post('/landlord/login', loginRules, validate, checkBruteForce, loginLandlord);
router.post('/landlord/verify-otp', verifyOtpRules, validate, checkBruteForce, verifyLandlordOtp); // step 2 of landlord login
router.post('/admin/login', loginRules, validate, checkBruteForce, loginAdmin);

// ── Email verification ──
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.post('/verify-email/resend', resendVerificationPublic);

// ── Password recovery ──
router.post('/forgot-password', verifyCaptcha, forgotPasswordRules, validate, forgotPassword);
router.post('/reset-password', resetPasswordRules, validate, resetPassword);
router.post('/change-password', protect, changePasswordRules, validate, changePassword);

// ── Misc ──
router.patch('/tour-complete', protect, completeTour);
router.post('/logout', logout);

export default router;
