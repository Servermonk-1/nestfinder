import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import { calculateBookingCost, monthsBetween } from '../utils/bookingCost.js';

const POPULATE = [
	{ path: 'listing', select: 'title area city images price priceUnit monthlyPrice landlord' },
	{ path: 'student', select: 'fullName email phone verified' },
	{ path: 'landlord', select: 'fullName email phone verified' },
];

// ── QUOTE ─────────────────────────────────────────────────
// GET /api/bookings/quote?listingId=&moveIn=&moveOut=
// Lets the student see the true total BEFORE committing to anything. Computed
// server-side so the figures they agree to are the figures we hold them to.
export const quoteBooking = async (req, res) => {
	try {
		const { listingId, moveIn, moveOut } = req.query;
		const listing = await Listing.findById(listingId).lean().catch(() => null);
		if (!listing) return res.status(404).json({ message: 'Listing not found' });

		const months = monthsBetween(moveIn, moveOut);
		if (!months) return res.status(400).json({ message: 'Give a move-in date and a later move-out date.' });

		res.status(200).json({ cost: calculateBookingCost(listing, months), months });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── APPLY ─────────────────────────────────────────────────
export const createBooking = async (req, res) => {
	try {
		const { listingId, moveIn, moveOut, message } = req.body;

		const listing = await Listing.findById(listingId).catch(() => null);
		if (!listing) return res.status(404).json({ message: 'Listing not found' });
		if (!listing.available) return res.status(400).json({ message: 'This home is no longer available.' });
		if (listing.flagged) return res.status(400).json({ message: 'This listing is under review and cannot be booked.' });

		const months = monthsBetween(moveIn, moveOut);
		if (!months) return res.status(400).json({ message: 'Give a move-in date and a later move-out date.' });

		// Applying to move in yesterday is always a mistake.
		const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
		if (new Date(moveIn) < startOfToday) {
			return res.status(400).json({ message: 'Move-in date cannot be in the past.' });
		}

		const cost = calculateBookingCost(listing, months);

		try {
			const booking = await Booking.create({
				listing: listing._id,
				student: req.user.id,
				landlord: listing.landlord,
				moveInDate: new Date(moveIn),
				moveOutDate: new Date(moveOut),
				months,
				message: String(message || '').trim().slice(0, 500),
				cost,
			});
			return res.status(201).json({
				message: 'Application sent. The landlord will respond shortly.',
				booking: await booking.populate(POPULATE),
			});
		} catch (err) {
			// The partial unique index is the real guard against double-applying.
			if (err.code === 11000) {
				return res.status(400).json({ message: 'You already have a live application for this home.' });
			}
			throw err;
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LISTS ─────────────────────────────────────────────────
export const getMyBookings = async (req, res) => {
	try {
		const key = req.user.role === 'landlord' ? 'landlord' : 'student';
		const filter = { [key]: req.user.id };
		if (req.query.status) filter.status = req.query.status;

		const bookings = await Booking.find(filter).populate(POPULATE).sort({ createdAt: -1 }).lean();
		res.status(200).json({ bookings, total: bookings.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export const getBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).populate(POPULATE).lean().catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });

		const mine = String(booking.student?._id) === String(req.user.id)
			|| String(booking.landlord?._id) === String(req.user.id)
			|| req.user.role === 'admin';
		if (!mine) return res.status(403).json({ message: 'Not your booking.' });

		res.status(200).json({ booking, paymentsAreLive: false });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LANDLORD RESPONDS ─────────────────────────────────────
export const respondToBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (String(booking.landlord) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your booking.' });
		}
		if (booking.status !== 'pending') {
			return res.status(400).json({ message: `This application is already ${booking.status}.` });
		}

		const accept = req.body.accept === true;
		booking.status = accept ? 'pendingPayment' : 'declined';
		booking.respondedAt = new Date();
		if (!accept) booking.declineReason = String(req.body.reason || '').trim().slice(0, 300);
		await booking.save();

		res.status(200).json({
			message: accept ? 'Application accepted — the student can now make a bank transfer.' : 'Application declined.',
			booking: await booking.populate(POPULATE),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── STUDENT CANCELS (before paying) ───────────────────────
export const cancelBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (String(booking.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your booking.' });
		}
		// Once the landlord has accepted, cancellation is no longer allowed
		// because payment is expected to be made via bank transfer.
		if (!['pending', 'pendingPayment'].includes(booking.status)) {
			return res.status(400).json({ message: `This booking is ${booking.status} and cannot be cancelled.` });
		}

		booking.status = 'cancelled';
		booking.cancelledAt = new Date();
		await booking.save();
		res.status(200).json({ message: 'Application withdrawn', booking });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── PAY (money goes into escrow, NOT to the landlord) ─────
// Payment initialisation via external providers removed. The app now uses
// manual bank transfer submission handled by `server/controllers/paymentController.js`.

// POST /api/bookings/:id/verify  { reference, simulate? }
// Payment verification via external providers removed.

// ── MOVE-IN CONFIRMED → ESCROW RELEASED ───────────────────
// Only the STUDENT can trigger this. If a landlord could confirm on their own
// behalf, escrow would protect nobody.
export const confirmMoveIn = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (String(booking.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Only the student can confirm they moved in.' });
		}
		if (booking.status !== 'confirmed') {
			return res.status(400).json({ message: 'There is no confirmed payment for this booking.' });
		}

		booking.status = 'movedIn';
		booking.movedInConfirmedAt = new Date();
		await booking.save();

		res.status(200).json({
			message: 'Move-in confirmed.',
			booking: await booking.populate(POPULATE),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN: REFUND A HELD PAYMENT ──────────────────────────
// The counterpart to escrow: when a student pays and the room turns out not to
// exist, somebody has to be able to give the money back.
// Refund handling removed — refunds are processed manually outside this system.

// ── ADMIN: OVERSIGHT ──────────────────────────────────────
export const adminListBookings = async (req, res) => {
	try {
		const filter = {};
		if (req.query.status) filter.status = req.query.status;
		// escrow state no longer used with manual bank transfers

		const [bookings, counts] = await Promise.all([
			Booking.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(200).lean(),
			Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
		]);

		res.status(200).json({
			bookings,
			counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
			paymentsAreLive: false,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN: PAYOUTS ────────────────────────────────────────
/**
 * What the platform owes, and to whom.
 *
 * This exists because releasing escrow never moved any money. Before it, a
 * released booking simply said the landlord had been paid and there was no
 * record anywhere of an actual transfer — the obligation was invisible.
 */
// Payout handling removed — payouts are performed and recorded manually.
