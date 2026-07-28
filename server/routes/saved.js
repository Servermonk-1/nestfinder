import express from 'express';
import { getSavedListings, saveListing, unsaveListing } from '../controllers/savedController.js';
import protect from '../middleware/auth.js';
import studentOnly from '../middleware/studentOnly.js';

const router = express.Router();

router.use(protect, studentOnly);

router.get('/', getSavedListings);
router.post('/:listingId', saveListing);
router.delete('/:listingId', unsaveListing);

export default router;
