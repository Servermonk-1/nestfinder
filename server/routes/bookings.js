import express from 'express';
import {
	quoteBooking,
	createBooking,
	getMyBookings,
	getBooking,
	respondToBooking,
	cancelBooking,
	confirmMoveIn,
	adminListBookings,
} from '../controllers/bookingController.js';
import protect from '../middleware/auth.js';
import adminOnly from '../middleware/adminOnly.js';
import studentOnly from '../middleware/studentOnly.js';
import requireIdentityVerified from '../middleware/requireIdentityVerified.js';

const router = express.Router();

// Literal paths first, so 'quote'/'mine'/'admin' aren't parsed as an :id.
router.get('/quote', quoteBooking);
router.get('/mine', protect, getMyBookings);
router.get('/admin/all', protect, adminOnly, adminListBookings);
// Payout endpoints removed — payouts are handled outside the system.

// Applying commits a student to real money, so identity verification applies
// here exactly as it does to viewing listing details.
router.post('/', protect, studentOnly, requireIdentityVerified, createBooking);

router.get('/:id', protect, getBooking);
router.patch('/:id/respond', protect, respondToBooking);   // landlord accepts/declines
router.patch('/:id/cancel', protect, cancelBooking);       // student withdraws
router.patch('/:id/moved-in', protect, confirmMoveIn);

export default router;
