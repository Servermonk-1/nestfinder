import express from 'express';
import { createReview, getListingReviews, updateReview, deleteReview } from '../controllers/reviewController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import studentOnly from '../middleware/studentOnly.js';

const router = express.Router();

// Public, but knows the caller when signed in (so it can return canReview/myReview).
router.get('/:listingId', optionalAuth, getListingReviews);
router.post('/', protect, studentOnly, createReview);
router.patch('/:id', protect, studentOnly, updateReview);
router.delete('/:id', protect, studentOnly, deleteReview);

export default router;
