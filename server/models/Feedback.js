import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, required: true },
	role: { type: String, required: true },
	type: { type: String, enum: ['problem', 'feedback'], default: 'feedback' },
	message: { type: String, required: true, trim: true, maxlength: 2000 },
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);
