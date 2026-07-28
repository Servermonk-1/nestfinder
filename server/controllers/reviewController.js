import Review from '../models/Review.js';
import Listing from '../models/Listing.js';
import Booking from '../models/Booking.js';

const recomputeListingRating = async (listingId) => {
	const [agg] = await Review.aggregate([
		{ $match: { listing: listingId } },
		{ $group: { _id: '$listing', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
	]);

	await Listing.findByIdAndUpdate(listingId, {
		rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
		totalReviews: agg ? agg.count : 0,
	});
};

/**
 * The real gate, now that bookings exist.
 *
 * "Contacted the landlord" was always a weak proxy — chosen only because there
 * was no record of anyone actually living anywhere. A completed stay is proof:
 * the student applied, paid, and confirmed they moved in.
 *
 * This deliberately narrows who may review. Reviews of a real person's property
 * carry weight, and a message thread is not evidence of a tenancy.
 */
const hasStayedAtListing = async (studentId, listingId) =>
	Boolean(await Booking.hasStayedAt(studentId, listingId));

// "Aisha Bello" -> "Aisha B."  (first name + last initial, keeps some privacy)
const displayName = (full) => {
	const parts = (full || '').trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return 'Student';
	return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];
};

const formatReview = (r, meId) => ({
	_id: r._id,
	rating: r.rating,
	comment: r.comment,
	createdAt: r.createdAt,
	edited: r.updatedAt && new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime() > 1000,
	reviewer: displayName(r.student?.fullName),
	reviewerVerified: Boolean(r.student?.verified),
	mine: meId ? String(r.student?._id || r.student) === String(meId) : false,
});

// ── SUBMIT A REVIEW ───────────────────────────────────────
export const createReview = async (req, res) => {
	try {
		const { listingId, rating, comment } = req.body;

		if (!listingId || !rating) {
			return res.status(400).json({ message: 'listingId and rating are required' });
		}
		if (rating < 1 || rating > 5) {
			return res.status(400).json({ message: 'Rating must be between 1 and 5' });
		}

		const listing = await Listing.findById(listingId);
		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		if (!(await hasStayedAtListing(req.user.id, listingId))) {
			return res.status(403).json({
				message: 'You can review a home once you have booked it here and confirmed you moved in.',
				needsStay: true,
			});
		}

		const alreadyReviewed = await Review.findOne({ listing: listingId, student: req.user.id });
		if (alreadyReviewed) {
			return res.status(400).json({ message: 'You have already reviewed this listing' });
		}

		const review = await Review.create({
			listing: listingId,
			landlord: listing.landlord,
			student: req.user.id,
			rating,
			comment,
		});

		await recomputeListingRating(listing._id);

		res.status(201).json({ message: 'Review submitted. Thank you!', review });
	} catch (error) {
		// Unique (listing, student) index → treat a race as "already reviewed".
		if (error.code === 11000) {
			return res.status(400).json({ message: 'You have already reviewed this listing' });
		}
		res.status(500).json({ message: error.message });
	}
};

// ── EDIT YOUR OWN REVIEW ──────────────────────────────────
export const updateReview = async (req, res) => {
	try {
		const { rating, comment } = req.body;
		const review = await Review.findById(req.params.id);
		if (!review) return res.status(404).json({ message: 'Review not found' });
		if (String(review.student) !== req.user.id) {
			return res.status(403).json({ message: 'You can only edit your own review' });
		}
		if (rating !== undefined) {
			if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be between 1 and 5' });
			review.rating = rating;
		}
		if (comment !== undefined) review.comment = comment;
		await review.save();
		await recomputeListingRating(review.listing);
		res.status(200).json({ message: 'Review updated' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── DELETE YOUR OWN REVIEW ────────────────────────────────
export const deleteReview = async (req, res) => {
	try {
		const review = await Review.findById(req.params.id);
		if (!review) return res.status(404).json({ message: 'Review not found' });
		if (String(review.student) !== req.user.id) {
			return res.status(403).json({ message: 'You can only delete your own review' });
		}
		const listingId = review.listing;
		await review.deleteOne();
		await recomputeListingRating(listingId);
		res.status(200).json({ message: 'Review removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET REVIEWS FOR A LISTING (paginated) ─────────────────
export const getListingReviews = async (req, res) => {
	try {
		const listingId = req.params.listingId;
		const meId = req.user?.role === 'student' ? req.user.id : null;
		const page = Math.max(1, parseInt(req.query.page, 10) || 1);
		const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 5));

		// Average + count over ALL reviews (Mongoose casts the string id for us).
		const allRatings = await Review.find({ listing: listingId }).select('rating');
		const totalReviews = allRatings.length;
		const averageRating = totalReviews
			? Math.round((allRatings.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10) / 10
			: 0;

		// The current student's own review (shown separately with edit/delete).
		let myReview = null;
		if (meId) {
			const mine = await Review.findOne({ listing: listingId, student: meId }).populate('student', 'fullName verified');
			if (mine) myReview = formatReview(mine, meId);
		}

		// Everyone else's reviews, paginated.
		const othersFilter = { listing: listingId, ...(meId ? { student: { $ne: meId } } : {}) };
		const othersTotal = await Review.countDocuments(othersFilter);
		const reviews = await Review.find(othersFilter)
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(limit)
			.populate('student', 'fullName verified');

		// Can this student write a NEW review? (stayed here + hasn't reviewed yet)
		let canReview = false;
		if (meId && !myReview) canReview = await hasStayedAtListing(meId, listingId);

		res.status(200).json({
			reviews: reviews.map((r) => formatReview(r, meId)),
			myReview,
			totalReviews,
			averageRating,
			page,
			pages: Math.max(1, Math.ceil(othersTotal / limit)),
			canReview,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
