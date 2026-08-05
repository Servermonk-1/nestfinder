import express from 'express';
import {
    submitPayment,
    adminListPayments,
    getPayment,
    approvePayment,
    rejectPayment,
} from '../controllers/paymentController.js';
import protect from '../middleware/auth.js';
import adminOnly from '../middleware/adminOnly.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Student submits a bank transfer payment (with optional receipt upload)
router.post('/', protect, upload.single('receipt'), submitPayment);

// Admin endpoints
router.get('/admin/all', protect, adminOnly, adminListPayments);
router.get('/:id', protect, adminOnly, getPayment);
router.patch('/:id/approve', protect, adminOnly, approvePayment);
router.patch('/:id/reject', protect, adminOnly, rejectPayment);

export default router;
