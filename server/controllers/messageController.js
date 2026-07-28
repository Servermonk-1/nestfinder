import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import UserReport from '../models/UserReport.js';
import { sendNewMessageEmail } from '../config/email.js';

const otherRole = (role) => (role === 'student' ? 'landlord' : 'student');

// A conversation is closed to BOTH parties as soon as either one blocks.
const isBlocked = (c) => Boolean(c.blockedByStudent || c.blockedByLandlord);

// Don't email the same person about the same chat more than once per window.
const EMAIL_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes
const CLIENT_URL = () => process.env.CLIENT_URL || 'http://localhost:5173';

// Email the recipient about a new message — but only if they're currently
// OFFLINE (no live socket) and we haven't already emailed them recently.
// Fire-and-forget: never blocks or fails the send.
const notifyRecipientByEmail = async (conversation, senderRole, senderId, recipientId, message, io) => {
	const recipientRole = otherRole(senderRole);

	// Online? They'll see the socket event live — no email needed.
	const online = (io?.sockets?.adapter?.rooms?.get(`user:${recipientId}`)?.size || 0) > 0;
	if (online) return;

	// Throttle per recipient.
	const stampField = recipientRole === 'student' ? 'studentNotifiedAt' : 'landlordNotifiedAt';
	const last = conversation[stampField];
	if (last && Date.now() - new Date(last).getTime() < EMAIL_THROTTLE_MS) return;

	const RecipientModel = recipientRole === 'student' ? Student : Landlord;
	const SenderModel = senderRole === 'student' ? Student : Landlord;
	const [recipient, sender] = await Promise.all([
		RecipientModel.findById(recipientId).select('email fullName'),
		SenderModel.findById(senderId).select('fullName'),
	]);
	if (!recipient?.email) return;

	const path = recipientRole === 'student' ? '/messages' : '/landlord/messages';
	const url = `${CLIENT_URL()}${path}?conversation=${conversation._id}`;
	const snippet = message.text.length > 140 ? `${message.text.slice(0, 140)}…` : message.text;

	await sendNewMessageEmail(recipient.email, recipient.fullName, sender?.fullName || 'Someone', snippet, url);

	conversation[stampField] = new Date();
	await conversation.save();
};

const isParticipant = (conversation, userId, role) => {
	const field = role === 'student' ? conversation.student : conversation.landlord;
	return field.toString() === userId;
};

// ── LIST CONVERSATIONS FOR CURRENT USER ──────────────────────
export const getConversations = async (req, res) => {
	try {
		const { id, role } = req.user;
		const filter = role === 'student' ? { student: id } : { landlord: id };

		const conversations = await Conversation.find(filter)
			.populate('student', 'fullName verified')
			.populate('landlord', 'fullName verified')
			.populate('listing', 'title images')
			.sort({ lastMessageAt: -1 });

		res.status(200).json({
			conversations: conversations.map((c) => ({
				_id: c._id,
				student: c.student,
				landlord: c.landlord,
				listing: c.listing,
				lastMessage: c.lastMessage,
				lastMessageAt: c.lastMessageAt,
				lastSenderRole: c.lastSenderRole,
				unreadCount: role === 'student' ? c.studentUnreadCount : c.landlordUnreadCount,
				blocked: isBlocked(c),
				// Only the blocker learns that THEY were the one who blocked.
				blockedByMe: role === 'student' ? c.blockedByStudent : c.blockedByLandlord,
			})),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── START OR FETCH A CONVERSATION (student-initiated) ────────
export const startConversation = async (req, res) => {
	try {
		const { id, role } = req.user;
		if (role !== 'student') {
			return res.status(403).json({ message: 'Only students can start a conversation' });
		}

		const { landlordId, listingId } = req.body;
		if (!landlordId) {
			return res.status(400).json({ message: 'landlordId is required' });
		}

		let conversation = await Conversation.findOne({ student: id, landlord: landlordId });
		if (!conversation) {
			conversation = await Conversation.create({
				student: id,
				landlord: landlordId,
				listing: listingId || undefined,
			});
		} else if (listingId) {
			conversation.listing = listingId;
			await conversation.save();
		}

		conversation = await conversation.populate([
			{ path: 'student', select: 'fullName' },
			{ path: 'landlord', select: 'fullName verified' },
			{ path: 'listing', select: 'title images' },
		]);

		res.status(200).json({ conversation });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET MESSAGES IN A CONVERSATION ───────────────────────────
export const getMessages = async (req, res) => {
	try {
		const { id, role } = req.user;
		const conversation = await Conversation.findById(req.params.conversationId);

		if (!conversation) {
			return res.status(404).json({ message: 'Conversation not found' });
		}
		if (!isParticipant(conversation, id, role)) {
			return res.status(403).json({ message: 'Not authorized to view this conversation' });
		}

		const messages = await Message.find({ conversation: conversation._id }).sort({ createdAt: 1 });

		// Mark messages from the other party as read, reset this user's unread counter
		await Message.updateMany(
			{ conversation: conversation._id, senderRole: otherRole(role), read: false },
			{ $set: { read: true } }
		);
		if (role === 'student') conversation.studentUnreadCount = 0;
		else conversation.landlordUnreadCount = 0;
		await conversation.save();

		res.status(200).json({ messages });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SEND A MESSAGE ────────────────────────────────────────────
export const sendMessage = async (req, res) => {
	try {
		const { id, role } = req.user;
		const { text } = req.body;

		if (!text || !text.trim()) {
			return res.status(400).json({ message: 'Message text is required' });
		}

		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) {
			return res.status(404).json({ message: 'Conversation not found' });
		}
		if (!isParticipant(conversation, id, role)) {
			return res.status(403).json({ message: 'Not authorized to message in this conversation' });
		}
		if (isBlocked(conversation)) {
			const mine = role === 'student' ? conversation.blockedByStudent : conversation.blockedByLandlord;
			return res.status(403).json({
				message: mine
					? 'You blocked this conversation. Unblock it to send messages again.'
					: 'You can no longer send messages in this conversation.',
				blocked: true,
			});
		}

		const message = await Message.create({
			conversation: conversation._id,
			senderId: id,
			senderRole: role,
			text: text.trim(),
		});

		conversation.lastMessage = message.text;
		conversation.lastMessageAt = message.createdAt;
		conversation.lastSenderRole = role;
		if (role === 'student') conversation.landlordUnreadCount += 1;
		else conversation.studentUnreadCount += 1;
		await conversation.save();

		const recipientId = role === 'student' ? conversation.landlord.toString() : conversation.student.toString();
		const io = req.app.get('io');
		if (io) {
			io.to(`user:${recipientId}`).emit('message:new', {
				conversationId: conversation._id,
				message,
			});
		}

		// Email the recipient if they're offline (throttled). Fire-and-forget —
		// a slow or failed email must never delay/break sending the message.
		notifyRecipientByEmail(conversation, role, id, recipientId, message, io)
			.catch((err) => console.error('new-message email failed:', err.message));

		res.status(201).json({ message });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── BLOCK / UNBLOCK THE OTHER PARTY ──────────────────────────
// PATCH /api/messages/conversations/:conversationId/block  { blocked: true|false }
export const setBlocked = async (req, res) => {
	try {
		const { id, role } = req.user;
		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
		if (!isParticipant(conversation, id, role)) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		const blocked = Boolean(req.body.blocked);
		const field = role === 'student' ? 'blockedByStudent' : 'blockedByLandlord';

		// You can only lift your OWN block — not the other party's.
		if (!blocked && !conversation[field]) {
			return res.status(400).json({ message: 'You have not blocked this conversation.' });
		}

		conversation[field] = blocked;
		await conversation.save();

		res.status(200).json({
			message: blocked ? 'Conversation blocked.' : 'Conversation unblocked.',
			blocked: isBlocked(conversation),
			blockedByMe: conversation[field],
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── REPORT THE OTHER PARTY IN A CONVERSATION ─────────────────
// POST /api/messages/conversations/:conversationId/report  { reason, details, block }
export const reportParticipant = async (req, res) => {
	try {
		const { id, role } = req.user;
		const { reason, details, block } = req.body;

		const VALID = ['scam', 'harassment', 'spam', 'impersonation', 'other'];
		if (!VALID.includes(reason)) {
			return res.status(400).json({ message: 'Please choose a valid reason.' });
		}

		const conversation = await Conversation.findById(req.params.conversationId);
		if (!conversation) return res.status(404).json({ message: 'Conversation not found' });
		if (!isParticipant(conversation, id, role)) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		const reportedRole = otherRole(role);
		const reported = reportedRole === 'student' ? conversation.student : conversation.landlord;

		try {
			await UserReport.create({
				conversation: conversation._id,
				reporter: id,
				reporterRole: role,
				reported,
				reportedRole,
				reason,
				details: details?.trim(),
			});
		} catch (err) {
			// Unique index → they've already reported this conversation.
			if (err.code === 11000) {
				return res.status(400).json({ message: "You've already reported this conversation. Our team is reviewing it." });
			}
			throw err;
		}

		// Reporting usually means "and stop them contacting me".
		if (block) {
			conversation[role === 'student' ? 'blockedByStudent' : 'blockedByLandlord'] = true;
			await conversation.save();
		}

		res.status(201).json({
			message: 'Report submitted. Our team reviews reports within 24 hours.',
			blocked: isBlocked(conversation),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── TOTAL UNREAD MESSAGE COUNT FOR CURRENT USER ──────────────
export const getUnreadCount = async (req, res) => {
	try {
		const { id, role } = req.user;
		const filter = role === 'student' ? { student: id } : { landlord: id };
		const conversations = await Conversation.find(filter).select('studentUnreadCount landlordUnreadCount');
		const unread = conversations.reduce(
			(sum, c) => sum + (role === 'student' ? c.studentUnreadCount : c.landlordUnreadCount),
			0
		);
		res.status(200).json({ unread });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
