import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
	fullName: { type: String, required: true, trim: true },
	email: { type: String, required: true, unique: true, lowercase: true },
	password: { type: String, required: true },
	phone: { type: String, required: true },
	institution: { type: String, required: true },
	role: { type: String, default: 'student' },
	// Set by an admin acting on a report — blocks login, same as for landlords.
	suspended: { type: Boolean, default: false },
	profilePicture: { type: String },
	savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
	tourCompleted: { type: Boolean, default: false },

	// ── SIWES ──
	// Course of study. Drives "which companies take my department?", so it's
	// stored lowercase — students type it and casing must not split the data.
	department: { type: String, trim: true, lowercase: true },
	// Where this student is actually doing their industrial training. Only a
	// CONFIRMED placement anchors the housing search: routing someone's whole
	// accommodation hunt to a company they merely applied to would be worse
	// than not offering the feature.
	placement: {
		company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
		role: { type: String, trim: true },
		startDate: { type: Date },
		endDate: { type: Date },
		status: { type: String, enum: ['applied', 'confirmed'], default: 'applied' },
		confirmedAt: { type: Date },
	},
	// Set when something happened to their placement that they didn't do —
	// currently only an admin withdrawing the centre. Shown once on the account
	// page and dismissible, so the search doesn't just silently un-anchor.
	placementNotice: {
		companyName: { type: String },
		reason: { type: String, enum: ['removed'] },
		at: { type: Date },
	},

	// ── Auth security ──
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

	// ── Identity verification (KYC) → earns the verified tick ──
	verified: { type: Boolean, default: false },
	idDocument: {
		documentType: {
			type: String,
			enum: ['NIN', 'Student ID', 'Voters Card', 'Drivers Licence', 'Passport'],
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

export default mongoose.model('Student', studentSchema);