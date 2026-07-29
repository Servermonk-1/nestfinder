import express from 'express';
import {
	listSavedSearches,
	createSavedSearch,
	updateSavedSearch,
	markSavedSearchSeen,
	deleteSavedSearch,
} from '../controllers/savedSearchController.js';
import protect from '../middleware/auth.js';
import studentOnly from '../middleware/studentOnly.js';

const router = express.Router();

// Saved searches belong to students — a landlord has nothing to search for.
router.use(protect, studentOnly);

router.get('/', listSavedSearches);
router.post('/', createSavedSearch);
router.patch('/:id/seen', markSavedSearchSeen);
router.patch('/:id', updateSavedSearch);
router.delete('/:id', deleteSavedSearch);

export default router;
