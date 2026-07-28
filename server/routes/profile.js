import express from 'express';
import { uploadAvatar, getMe, updateProfile, deleteAccount } from '../controllers/profileController.js';
import protect from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/me', getMe);
router.patch('/', updateProfile);
router.delete('/', deleteAccount);
router.post('/avatar', upload.single('avatar'), uploadAvatar);

export default router;
