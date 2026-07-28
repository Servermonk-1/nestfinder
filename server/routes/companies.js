import express from 'express';
import {
	getCompanies,
	getDepartments,
	getFaculties,
	suggestCompany,
	updateMySuggestion,
	deleteMySuggestion,
	getCompany,
	getMyPlacement,
	setMyPlacement,
	clearMyPlacement,
	dismissPlacementNotice,
	adminListCompanies,
	createCompany,
	updateCompany,
	deleteCompany,
	bulkImportCompanies,
	getCompaniesNearListing,
} from '../controllers/companyController.js';
import {
	getCompanyFeedback,
	createCompanyFeedback,
	updateCompanyFeedback,
	deleteCompanyFeedback,
} from '../controllers/companyFeedbackController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

// Specific paths first — otherwise "/departments" and "/placement" get parsed
// as an :id and hit the single-company handler.
router.get('/departments', getDepartments);
router.get('/faculties', getFaculties);
// A student adding a centre we don't list.
router.post('/suggest', protect, suggestCompany);
// A student correcting or withdrawing a centre they added. Registered BEFORE
// '/:id' so 'mine' isn't parsed as an id.
router.put('/mine/:id', protect, updateMySuggestion);
router.delete('/mine/:id', protect, deleteMySuggestion);

// A student's own placement.
router.get('/placement/me', protect, getMyPlacement);
router.put('/placement', protect, setMyPlacement);
router.delete('/placement/notice', protect, dismissPlacementNotice);
router.delete('/placement', protect, clearMyPlacement);

// Admin directory management.
router.get('/admin/all', protect, adminOnly, adminListCompanies);
router.post('/bulk', protect, adminOnly, bulkImportCompanies);
// Landlord-facing: which SIWES employers is my room within reach of?
router.get('/near-listing/:listingId', protect, getCompaniesNearListing);
router.post('/', protect, adminOnly, createCompany);
router.put('/:id', protect, adminOnly, updateCompany);
router.delete('/:id', protect, adminOnly, deleteCompany);

// Public/student browsing. optionalAuth so `?mine=1` can read the caller's
// department without forcing a login on the directory itself.
// Feedback on a placement centre. The two literal '/feedback/:feedbackId'
// routes come first so 'feedback' isn't parsed as a company id.
router.patch('/feedback/:feedbackId', protect, updateCompanyFeedback);
router.delete('/feedback/:feedbackId', protect, deleteCompanyFeedback);
router.get('/:id/feedback', optionalAuth, getCompanyFeedback);
router.post('/:id/feedback', protect, createCompanyFeedback);

router.get('/', optionalAuth, getCompanies);
router.get('/:id', optionalAuth, getCompany);

export default router;
