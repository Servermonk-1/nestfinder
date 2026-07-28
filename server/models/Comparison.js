import mongoose from 'mongoose';

const comparisonSchema = new mongoose.Schema({
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
	name: { type: String, trim: true },
	listings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }],
	preferences: { type: mongoose.Schema.Types.Mixed, default: {} },
	budget: { type: Number },
	school: { type: String },
	saved: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model('Comparison', comparisonSchema);
