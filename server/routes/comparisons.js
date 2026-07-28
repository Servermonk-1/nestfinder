import express from 'express';
import { getComparisons, createComparison, deleteComparison } from '../controllers/comparisonController.js';
import protect from '../middleware/auth.js';
import studentOnly from '../middleware/studentOnly.js';

const router = express.Router();

router.use(protect, studentOnly);

router.get('/', getComparisons);
router.post('/', createComparison);
router.delete('/:id', deleteComparison);

export default router;
