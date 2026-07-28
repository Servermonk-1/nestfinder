import express from 'express';
import { submitReport } from '../controllers/reportController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { reportRules } from '../middleware/validationRules.js';

const router = express.Router();

router.post('/', protect, reportRules, validate, submitReport);

export default router;