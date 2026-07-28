import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema({
	email:     { type: String, required: true, index: true },
	userType:  { type: String, enum: ['student', 'landlord', 'admin'] },
	ip:        { type: String },
	userAgent: { type: String },
	success:   { type: Boolean, default: false },
	timestamp: { type: Date, default: Date.now },
});

// Auto-delete attempt records after 24h so the collection stays small.
loginAttemptSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

export default mongoose.model('LoginAttempt', loginAttemptSchema);
