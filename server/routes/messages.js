import express from 'express';
import {
	getConversations,
	startConversation,
	getMessages,
	sendMessage,
	getUnreadCount,
	setBlocked,
	reportParticipant,
} from '../controllers/messageController.js';
import protect from '../middleware/auth.js';
import requireIdentityVerified from '../middleware/requireIdentityVerified.js';

const router = express.Router();

router.use(protect);

router.get('/unread-count', getUnreadCount);
router.get('/conversations', getConversations);
// A student must be identity-verified to START a conversation (consistent with
// viewing listings). Replies are open to either participant — a landlord must
// always be able to answer a student who has already reached out.
router.post('/conversations', requireIdentityVerified, startConversation);
router.get('/conversations/:conversationId/messages', getMessages);
router.post('/conversations/:conversationId/messages', sendMessage);

// Safety: either party can block or report the other.
router.patch('/conversations/:conversationId/block', setBlocked);
router.post('/conversations/:conversationId/report', reportParticipant);

export default router;
