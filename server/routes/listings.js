import express from 'express';
import {
	createListing,
	getAllListings,
	getSingleListing,
	searchListings,
	getListingCities,
	updateListing,
	deleteListing,
	toggleAvailability,
	getMyListings,
	incrementViews,
	getLandlordPublicListings,
	previewGeocode,
} from '../controllers/listingController.js';
import protect from '../middleware/auth.js';
import optionalAuth from '../middleware/optionalAuth.js';
import requireIdentityVerified from '../middleware/requireIdentityVerified.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { listingRules } from '../middleware/validationRules.js';

const router = express.Router();

// Public routes
router.get('/', getAllListings);
router.get('/search', optionalAuth, searchListings);
router.get('/cities', getListingCities);
router.get('/landlord/:landlordId/public', getLandlordPublicListings);
// Detail is open to the public, landlords and admins — but a logged-in student
// must be identity-verified (optionalAuth lets the controller see who's asking).
router.get('/:id', optionalAuth, getSingleListing);

// Protected routes
router.get('/landlord/mine', protect, getMyListings);
// Suggest a pin for a typed address, before the listing exists.
router.post('/geocode-preview', protect, requireIdentityVerified, previewGeocode);
// Landlords must be identity-verified before they can publish a listing.
router.post('/', protect, requireIdentityVerified, upload.array('images', 6), listingRules, validate, createListing);
router.put('/:id', protect, updateListing);
router.delete('/:id', protect, deleteListing);
router.patch('/:id/availability', protect, toggleAvailability);
router.patch('/:id/view', incrementViews);

export default router;