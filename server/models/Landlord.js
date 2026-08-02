import mongoose from 'mongoose';

const landlordSchema = new mongoose.Schema({
	fullName: { type: String, required: true, trim: true },
	email: { type: String, required: true, unique: true, lowercase: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	verified: { type: Boolean, default: false },
	flagCount: { type: Number, default: 0 },

	// ── Fraud Shield: rolled-up trust signal (0-100) ──
	trustScore: { type: Number, default: 40, index: true },
	trustFactors: { type: mongoose.Schema.Types.Mixed, default: {} },
	trustUpdatedAt: { type: Date },
	suspended: { type: Boolean, default: false },
	role: { type: String, default: 'landlord' },
	profilePicture: { type: String },
	tourCompleted: { type: Boolean, default: false },

	// ── Auth security (emailVerified is separate from KYC `verified`) ──
	emailVerified: { type: Boolean, default: false },
	emailVerifyToken: { type: String, select: false },
	emailVerifyExpires: { type: Date, select: false },
	otp: { type: String, select: false },
	otpExpires: { type: Date, select: false },
	passwordChangedAt: { type: Date },
	resetPasswordToken: { type: String, select: false },
	resetPasswordExpires: { type: Date, select: false },

	// ── Trusted devices — skip login OTP on a device that verified recently ──
	trustedDevices: [{
		tokenHash: { type: String },
		expiresAt: { type: Date },
		userAgent: { type: String },
		createdAt: { type: Date, default: Date.now },
	}],

	// ── Identity verification (KYC) → `verified` becomes true on approval ──
	idDocument: {
		documentType: {
			type: String,
			enum: ['NIN', 'Voters Card', 'Drivers Licence', 'Passport'],
		},
		frontImage: { type: String },
		backImage: { type: String },
		submittedAt: { type: Date },
		reviewedAt: { type: Date },
		status: {
			type: String,
			enum: ['none', 'pending', 'approved', 'rejected'],
			default: 'none',
		},
		rejectionReason: { type: String },
	},

	// ── Where the money actually goes ──
	// Escrow could be "released" while there was nowhere on record to send the
	// money — the release was settling a debt to an account that did not exist.
	// Optional, because a landlord can list and be paid later, but a payout
	// cannot be recorded as made until these are filled in.
	payout: {
		bankName: { type: String, trim: true },
		// Nigerian NUBAN account numbers are exactly 10 digits.
		accountNumber: { type: String, trim: true, match: [/^\d{10}$/, 'Enter the 10-digit account number'] },
		accountName: { type: String, trim: true },
		updatedAt: { type: Date },
	},
}, { timestamps: true });

/** Can this landlord actually be paid? */
landlordSchema.methods.canReceivePayout = function canReceivePayout() {
	return Boolean(this.payout?.bankName && this.payout?.accountNumber && this.payout?.accountName);
};

export default mongoose.model('Landlord', landlordSchema);