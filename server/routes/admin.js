import express from 'express';
import {
	getDashboardStats,
	getAllReports,
	reviewReport,
	actOnReport,
	getReportContext,
	getAllLandlords,
	verifyLandlord,
	suspendLandlord,
	getFlaggedListings,
	getAdminListings,
	setListingFlag,
	rescanListings,
	removeListing,
	getPendingStudentVerifications,
	approveStudentId,
	rejectStudentId,
	getPendingLandlordVerifications,
	approveLandlordId,
	rejectLandlordId,
	getSystemHealth,
} from '../controllers/adminController.js';
import protect from '../middleware/auth.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

router.get('/health', protect, adminOnly, getSystemHealth);

// All admin routes require login + admin role
router.use(protect, adminOnly);

router.get('/dashboard', getDashboardStats);
// Moderation queue — `type` is 'listing' (about a property) or 'user' (about a
// person in chat); both share the same review/action shape.
router.get('/reports', getAllReports);
router.get('/reports/user/:id/messages', getReportContext);
router.patch('/reports/:type/:id', reviewReport);
router.post('/reports/:type/:id/action', actOnReport);
router.get('/landlords', getAllLandlords);
router.patch('/landlords/:id/verify', verifyLandlord);
router.patch('/landlords/:id/suspend', suspendLandlord);
router.get('/listings/flagged', getFlaggedListings);
router.get('/listings', getAdminListings);
router.post('/listings/rescan', rescanListings);
router.post('/listings/:id/rescan', rescanListings);
router.patch('/listings/:id/flag', setListingFlag);
router.delete('/listings/:id', removeListing);

// Student identity verifications
router.get('/verifications/students/pending', getPendingStudentVerifications);
router.patch('/students/:id/approve', approveStudentId);
router.patch('/students/:id/reject', rejectStudentId);

// Landlord identity verifications
router.get('/verifications/landlords/pending', getPendingLandlordVerifications);
router.patch('/landlords/:id/approve-id', approveLandlordId);
router.patch('/landlords/:id/reject-id', rejectLandlordId);

export default router;