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
}, { timestamps: true });

export default mongoose.model('Landlord', landlordSchema);