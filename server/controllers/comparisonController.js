import Comparison from '../models/Comparison.js';

const HISTORY_LIMIT = 10;

const populateOpts = {
	path: 'listings',
	populate: { path: 'landlord', select: 'fullName verified phone' },
};

// ── GET COMPARISONS (recent history + explicitly saved) ──
export const getComparisons = async (req, res) => {
	try {
		const [history, saved] = await Promise.all([
			Comparison.find({ student: req.user.id, saved: false })
				.sort({ createdAt: -1 })
				.limit(HISTORY_LIMIT)
				.populate(populateOpts),
			Comparison.find({ student: req.user.id, saved: true })
				.sort({ createdAt: -1 })
				.populate(populateOpts),
		]);

		res.status(200).json({ history, saved });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── CREATE A COMPARISON (auto history entry or explicit save) ──
export const createComparison = async (req, res) => {
	try {
		const { listings = [], preferences = {}, budget, school, name, saved = false } = req.body;

		if (!Array.isArray(listings) || listings.length < 2) {
			return res.status(400).json({ message: 'A comparison needs at least 2 listings' });
		}

		if (saved && !name) {
			return res.status(400).json({ message: 'Name is required to save a comparison' });
		}

		const comparison = await Comparison.create({
			student: req.user.id,
			listings,
			preferences,
			budget,
			school,
			name: name || undefined,
			saved: Boolean(saved),
		});

		// Keep auto-tracked history capped so it never grows unbounded
		if (!saved) {
			const excess = await Comparison.find({ student: req.user.id, saved: false })
				.sort({ createdAt: -1 })
				.skip(HISTORY_LIMIT)
				.select('_id');

			if (excess.length) {
				await Comparison.deleteMany({ _id: { $in: excess.map((e) => e._id) } });
			}
		}

		await comparison.populate(populateOpts);

		res.status(201).json({ message: 'Comparison recorded', comparison });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── DELETE A SAVED COMPARISON ─────────────────────────────
export const deleteComparison = async (req, res) => {
	try {
		const comparison = await Comparison.findOne({ _id: req.params.id, student: req.user.id });

		if (!comparison) {
			return res.status(404).json({ message: 'Comparison not found' });
		}

		await comparison.deleteOne();
		res.status(200).json({ message: 'Comparison deleted' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
