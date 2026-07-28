import { body } from 'express-validator';

// ── STUDENT REGISTER ──────────────────────────────────────
export const studentRegisterRules = [
	body('fullName')
		.trim()
		.notEmpty().withMessage('Full name is required')
		.isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

	body('email')
		.trim()
		.notEmpty().withMessage('Email is required')
		.isEmail().withMessage('Please provide a valid email')
		.normalizeEmail(),

	body('password')
		.notEmpty().withMessage('Password is required')
		.isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

	body('phone')
		.trim()
		.notEmpty().withMessage('Phone number is required')
		.isMobilePhone().withMessage('Please provide a valid phone number'),

	body('institution')
		.trim()
		.notEmpty().withMessage('Institution name is required'),
];

// ── STUDENT LOGIN ─────────────────────────────────────────
export const loginRules = [
	body('email')
		.trim()
		.notEmpty().withMessage('Email is required')
		.isEmail().withMessage('Please provide a valid email')
		.normalizeEmail(),

	body('password')
		.notEmpty().withMessage('Password is required'),
];

// ── PASSWORD RESET / CHANGE ───────────────────────────────
export const forgotPasswordRules = [
	body('email')
		.trim()
		.notEmpty().withMessage('Email is required')
		.isEmail().withMessage('Please provide a valid email')
		.normalizeEmail(),
];

export const resetPasswordRules = [
	body('token')
		.notEmpty().withMessage('Reset token is required'),

	body('password')
		.notEmpty().withMessage('Password is required')
		.isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

export const changePasswordRules = [
	body('currentPassword')
		.notEmpty().withMessage('Current password is required'),

	body('newPassword')
		.notEmpty().withMessage('New password is required')
		.isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

// ── LANDLORD REGISTER ─────────────────────────────────────
export const landlordRegisterRules = [
	body('fullName')
		.trim()
		.notEmpty().withMessage('Full name is required')
		.isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),

	body('email')
		.trim()
		.notEmpty().withMessage('Email is required')
		.isEmail().withMessage('Please provide a valid email')
		.normalizeEmail(),

	body('password')
		.notEmpty().withMessage('Password is required')
		.isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),

	body('phone')
		.trim()
		.notEmpty().withMessage('Phone number is required'),
];

// ── CREATE LISTING ────────────────────────────────────────
export const listingRules = [
	body('title')
		.trim()
		.notEmpty().withMessage('Title is required')
		.isLength({ min: 5, max: 100 }).withMessage('Title must be between 5 and 100 characters'),

	body('description')
		.trim()
		.notEmpty().withMessage('Description is required')
		.isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),

	body('address')
		.trim()
		.notEmpty().withMessage('Address is required'),

	body('city')
		.trim()
		.notEmpty().withMessage('City is required'),

	body('area')
		.trim()
		.notEmpty().withMessage('Area/neighbourhood is required'),

	body('state')
		.trim()
		.notEmpty().withMessage('State is required'),

	body('price')
		.notEmpty().withMessage('Price is required')
		.isNumeric().withMessage('Price must be a number')
		.isFloat({ min: 0 }).withMessage('Price cannot be negative'),

	body('roomType')
		.notEmpty().withMessage('Room type is required')
		.isIn(['single', 'shared', 'self-contained'])
		.withMessage('Room type must be single, shared, or self-contained'),

	body('rooms')
		.notEmpty().withMessage('Number of rooms is required')
		.isInt({ min: 1 }).withMessage('Must have at least 1 room'),

	body('contactPhone')
		.trim()
		.notEmpty().withMessage('Contact phone is required'),

	body('contactEmail')
		.trim()
		.notEmpty().withMessage('Contact email is required')
		.isEmail().withMessage('Please provide a valid contact email'),
];

// ── REPORT ────────────────────────────────────────────────
export const reportRules = [
	body('listingId')
		.notEmpty().withMessage('Listing ID is required'),

	body('reason')
		.notEmpty().withMessage('Reason is required')
		.isIn(['fake', 'overpriced', 'misleading', 'other'])
		.withMessage('Reason must be fake, overpriced, misleading, or other'),

	body('details')
		.optional()
		.trim()
		.isLength({ max: 500 }).withMessage('Details cannot exceed 500 characters'),
];