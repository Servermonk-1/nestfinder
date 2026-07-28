import bcrypt from 'bcryptjs';
import { clearAuthCookie } from './authController.js';
import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import Admin from '../models/Admin.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import Comparison from '../models/Comparison.js';
import Listing from '../models/Listing.js';

const MODELS = { student: Student, landlord: Landlord, admin: Admin };

// Refresh a listing's cached rating after its reviews change.
const recomputeRating = async (listingId) => {
	const reviews = await Review.find({ listing: listingId }).select('rating');
	const count = reviews.length;
	const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
	await Listing.findByIdAndUpdate(listingId, { rating: avg, totalReviews: count });
};

// Shape the public user object returned to the client.
const publicUser = (account) => ({
	id: account._id,
	fullName: account.fullName,
	email: account.email,
	role: account.role,
	phone: account.phone,
	institution: account.institution,
	department: account.department,
	profilePicture: account.profilePicture,
	verified: account.verified,
	emailVerified: account.emailVerified,
	tourCompleted: account.tourCompleted,
});

// ── UPLOAD / CHANGE PROFILE PICTURE ───────────────────────
// POST /api/profile/avatar  (protected, multipart field: avatar)
export const uploadAvatar = async (req, res) => {
	try {
		const Model = MODELS[req.user.role];
		if (!Model) return res.status(400).json({ message: 'Unsupported account type' });

		const file = req.file;
		if (!file) return res.status(400).json({ message: 'Please choose an image.' });

		const account = await Model.findById(req.user.id);
		if (!account) return res.status(404).json({ message: 'Account not found' });

		account.profilePicture = `uploads/${file.filename}`;
		await account.save();

		res.status(200).json({ message: 'Profile photo updated', profilePicture: account.profilePicture });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET MY PROFILE (fresh from DB) ────────────────────────
// GET /api/profile/me  (protected) — used to refresh avatar + verified status
export const getMe = async (req, res) => {
	try {
		const Model = MODELS[req.user.role];
		if (!Model) return res.status(400).json({ message: 'Unsupported account type' });

		const account = await Model.findById(req.user.id).select('-password');
		if (!account) return res.status(404).json({ message: 'Account not found' });

		res.status(200).json({ user: publicUser(account) });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── UPDATE MY PROFILE (name / phone / institution) ────────
// PATCH /api/profile  (protected)  — email is intentionally NOT editable here
export const updateProfile = async (req, res) => {
	try {
		const Model = MODELS[req.user.role];
		if (!Model) return res.status(400).json({ message: 'Unsupported account type' });

		const account = await Model.findById(req.user.id);
		if (!account) return res.status(404).json({ message: 'Account not found' });

		const { fullName, phone, institution, department } = req.body;

		if (fullName !== undefined) {
			const name = String(fullName).trim();
			if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters' });
			account.fullName = name;
		}
		if (phone !== undefined) {
			const p = String(phone).trim();
			if (!p) return res.status(400).json({ message: 'Phone number cannot be empty' });
			account.phone = p;
		}
		// Institution only applies to students.
		if (institution !== undefined && req.user.role === 'student') {
			const inst = String(institution).trim();
			if (!inst) return res.status(400).json({ message: 'Institution cannot be empty' });
			account.institution = inst;
		}
		// Course of study, also student-only. Blank is allowed — it just means
		// "I haven't said", which is different from an empty institution.
		if (department !== undefined && req.user.role === 'student') {
			account.department = String(department).trim().toLowerCase();
		}

		await account.save();
		res.status(200).json({ message: 'Profile updated', user: publicUser(account) });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── DELETE MY ACCOUNT ─────────────────────────────────────
// DELETE /api/profile  { password }  (protected) — password-confirmed, cascades
export const deleteAccount = async (req, res) => {
	try {
		const Model = MODELS[req.user.role];
		if (!Model || req.user.role === 'admin') {
			return res.status(400).json({ message: 'This account type cannot be self-deleted' });
		}

		const account = await Model.findById(req.user.id).select('+password');
		if (!account) return res.status(404).json({ message: 'Account not found' });

		const { password } = req.body;
		if (!password) return res.status(400).json({ message: 'Please enter your password to confirm' });
		const match = await bcrypt.compare(password, account.password);
		if (!match) return res.status(401).json({ message: 'Password is incorrect' });

		const userId = account._id;

		if (req.user.role === 'student') {
			// Reviews (recompute the listings they touched), conversations + messages, comparisons.
			const reviews = await Review.find({ student: userId }).select('listing');
			const listingIds = [...new Set(reviews.map((r) => String(r.listing)))];
			await Review.deleteMany({ student: userId });
			for (const lid of listingIds) await recomputeRating(lid);

			const convos = await Conversation.find({ student: userId }).select('_id');
			await Message.deleteMany({ conversation: { $in: convos.map((c) => c._id) } });
			await Conversation.deleteMany({ student: userId });
			await Comparison.deleteMany({ student: userId });
		} else if (req.user.role === 'landlord') {
			// Remove their listings + everything hanging off them.
			const listings = await Listing.find({ landlord: userId }).select('_id');
			const listingIds = listings.map((l) => l._id);
			await Review.deleteMany({ landlord: userId });
			await Listing.deleteMany({ landlord: userId });
			const convos = await Conversation.find({ landlord: userId }).select('_id');
			await Message.deleteMany({ conversation: { $in: convos.map((c) => c._id) } });
			await Conversation.deleteMany({ landlord: userId });
			// Drop these listings from any student's saved comparisons.
			await Comparison.updateMany({ listings: { $in: listingIds } }, { $pull: { listings: { $in: listingIds } } });
		}

		await Model.findByIdAndDelete(userId);
		clearAuthCookie(res);
		res.status(200).json({ message: 'Your account has been deleted.' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
