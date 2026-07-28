import express from 'express';
import {
	submitStudentId,
	getMyVerification,
	submitLandlordId,
	getLandlordVerification,
} from '../controllers/kycController.js';
import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

const idUpload = upload.fields([
	{ name: 'idFront', maxCount: 1 },
	{ name: 'idBack', maxCount: 1 },
]);

// Student
router.get('/student/verification', getMyVerification);
router.post('/student/submit-id', idUpload, submitStudentId);

// Landlord
router.get('/landlord/verification', getLandlordVerification);
router.post('/landlord/submit-id', idUpload, submitLandlordId);

export default router;
