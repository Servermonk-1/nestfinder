import Student from '../models/Student.js';

// ── GET SAVED LISTINGS ────────────────────────────────────
export const getSavedListings = async (req, res) => {
	try {
		const student = await Student.findById(req.user.id).populate({
			path: 'savedListings',
			populate: { path: 'landlord', select: 'fullName verified phone' },
		});

		if (!student) {
			return res.status(404).json({ message: 'Student not found' });
		}

		res.status(200).json({ savedListings: student.savedListings });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SAVE A LISTING ─────────────────────────────────────────
export const saveListing = async (req, res) => {
	try {
		const student = await Student.findByIdAndUpdate(
			req.user.id,
			{ $addToSet: { savedListings: req.params.listingId } },
			{ new: true }
		).populate({
			path: 'savedListings',
			populate: { path: 'landlord', select: 'fullName verified phone' },
		});

		if (!student) {
			return res.status(404).json({ message: 'Student not found' });
		}

		res.status(200).json({ message: 'Listing saved', savedListings: student.savedListings });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── REMOVE A SAVED LISTING ────────────────────────────────
export const unsaveListing = async (req, res) => {
	try {
		const student = await Student.findByIdAndUpdate(
			req.user.id,
			{ $pull: { savedListings: req.params.listingId } },
			{ new: true }
		).populate({
			path: 'savedListings',
			populate: { path: 'landlord', select: 'fullName verified phone' },
		});

		if (!student) {
			return res.status(404).json({ message: 'Student not found' });
		}

		res.status(200).json({ message: 'Listing removed', savedListings: student.savedListings });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
