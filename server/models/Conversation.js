import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
	landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },
	listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' },
	lastMessage: { type: String, default: '' },
	lastMessageAt: { type: Date, default: Date.now },
	lastSenderRole: { type: String, enum: ['student', 'landlord'] },
	studentUnreadCount: { type: Number, default: 0 },
	landlordUnreadCount: { type: Number, default: 0 },
	// When we last emailed each party about a new message — used to throttle
	// "you have a new message" emails so a burst never floods their inbox.
	studentNotifiedAt: { type: Date },
	landlordNotifiedAt: { type: Date },

	// Either party can block the other. While blocked, NEITHER side can send —
	// the blocker is protected, and the blocked party isn't told who blocked them.
	blockedByStudent: { type: Boolean, default: false },
	blockedByLandlord: { type: Boolean, default: false },
}, { timestamps: true });

conversationSchema.index({ student: 1, landlord: 1 }, { unique: true });

export default mongoose.model('Conversation', conversationSchema);
