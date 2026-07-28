import mongoose from 'mongoose';

/**
 * What a placement was actually like, from a student who did it.
 *
 * This is the information no directory entry can carry: whether the training
 * was real, whether they were paid, whether the supervisor engaged. It is
 * gated on having genuinely had the placement — see the controller — because
 * unverifiable praise or complaint about a named employer is worse than none.
 */
const companyFeedbackSchema = new mongoose.Schema({
	company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },

	rating: { type: Number, required: true, min: 1, max: 5 },
	comment: { type: String, trim: true, maxlength: 1000, default: '' },

	// The three things SIWES students actually ask each other about.
	stipendPaid: { type: Boolean, default: null },
	wouldRecommend: { type: Boolean, default: null },
	department: { type: String, trim: true, lowercase: true },
}, { timestamps: true });

// One account, one verdict per company.
companyFeedbackSchema.index({ company: 1, student: 1 }, { unique: true });

export default mongoose.model('CompanyFeedback', companyFeedbackSchema);
