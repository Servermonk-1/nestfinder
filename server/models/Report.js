import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
	listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
	reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
	reason: { type: String, required: true, enum: ['fake', 'overpriced', 'misleading', 'other'] },
	details: { type: String },

	// ── Moderation envelope (shared shape with UserReport) ──
	status: { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open', index: true },
	reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
	reviewedAt: { type: Date },
	adminNote: { type: String, maxlength: 500 },
	actionTaken: { type: String },

	// Legacy flag kept in sync with `status` so older code/queries don't break.
	resolved: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);