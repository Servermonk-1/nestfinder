import express from 'express';
import { getPaymentSettingsPublic, getPaymentSettingsAdmin, upsertPaymentSettings, getUSDTQuote } from '../controllers/paymentSettingsController.js';
import protect from '../middleware/auth.js';
import adminOnly from '../middleware/adminOnly.js';

const router = express.Router();

// TEMP DEBUG: indicate that the paymentSettings router module was loaded
try { console.log('PaymentSettings router module loaded'); } catch (e) { /* ignore */ }

router.get('/settings', getPaymentSettingsPublic);
router.get('/quote', getUSDTQuote);
router.get('/admin/all', protect, adminOnly, getPaymentSettingsAdmin);
router.post('/admin', protect, adminOnly, upsertPaymentSettings);

export default router;
