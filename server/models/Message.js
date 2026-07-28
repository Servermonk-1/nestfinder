import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
	conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
	senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
	senderRole: { type: String, enum: ['student', 'landlord'], required: true },
	text: { type: String, required: true, trim: true, maxlength: 2000 },
	read: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
