import mongoose from 'mongoose';

// A report about a PERSON in a conversation (distinct from `Report`, which is
// about a listing). Either party can report the other.
const userReportSchema = new mongoose.Schema({
	conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
	reporter: { type: mongoose.Schema.Types.ObjectId, required: true },
	reporterRole: { type: String, enum: ['student', 'landlord'], required: true },
	reported: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
	reportedRole: { type: String, enum: ['student', 'landlord'], required: true },
	reason: {
		type: String,
		required: true,
		enum: ['scam', 'harassment', 'spam', 'impersonation', 'other'],
	},
	details: { type: String, maxlength: 500 },

	// ── Moderation envelope (shared shape with Report) ──
	status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
	reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
	reviewedAt: { type: Date },
	adminNote: { type: String, maxlength: 500 },
	actionTaken: { type: String },

	resolved: { type: Boolean, default: false, index: true },
}, { timestamps: true });

// One open report per reporter per conversation keeps the queue clean.
userReportSchema.index({ conversation: 1, reporter: 1 }, { unique: true });

export default mongoose.model('UserReport', userReportSchema);
