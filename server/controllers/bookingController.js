import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import { calculateBookingCost, monthsBetween } from '../utils/bookingCost.js';
import { initialisePayment, verifyPayment, activeProvider, paymentsAreLive } from '../services/payments.js';

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

		res.status(200).json({ booking, paymentsAreLive: paymentsAreLive() });
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
		booking.status = accept ? 'accepted' : 'declined';
		booking.respondedAt = new Date();
		if (!accept) booking.declineReason = String(req.body.reason || '').trim().slice(0, 300);
		await booking.save();

		res.status(200).json({
			message: accept ? 'Application accepted — the student can now pay.' : 'Application declined.',
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
		// Once money is involved, withdrawal is a refund decision, not a click.
		if (!['pending', 'accepted'].includes(booking.status)) {
			return res.status(400).json({
				message: booking.escrow.state === 'held'
					? 'You have already paid — ask for a refund instead.'
					: `This booking is ${booking.status} and cannot be cancelled.`,
			});
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
export const startPayment = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (String(booking.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your booking.' });
		}
		if (booking.status !== 'accepted') {
			return res.status(400).json({ message: 'The landlord must accept your application before you can pay.' });
		}

		const student = await Student.findById(req.user.id).select('email').lean();
		const init = await initialisePayment({
			amount: booking.cost.total,
			email: student.email,
			bookingId: String(booking._id),
			callbackUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/bookings/${booking._id}`,
		});

		booking.payment = {
			provider: init.provider,
			reference: init.reference,
			amount: booking.cost.total,
		};
		await booking.save();

		res.status(200).json({
			reference: init.reference,
			authorizationUrl: init.authorizationUrl,
			amount: booking.cost.total,
			provider: init.provider,
			sandbox: !paymentsAreLive(),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// POST /api/bookings/:id/verify  { reference, simulate? }
export const confirmPayment = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (String(booking.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your booking.' });
		}
		// Idempotent: refreshing the callback page must not double-charge or
		// double-record a payment.
		if (booking.status === 'paid' || booking.escrow.state === 'held') {
			return res.status(200).json({ message: 'Payment already recorded.', booking, alreadyPaid: true });
		}
		if (booking.status !== 'accepted') {
			return res.status(400).json({ message: 'This booking is not awaiting payment.' });
		}

		const reference = req.body.reference || booking.payment?.reference;
		if (!reference) return res.status(400).json({ message: 'No payment reference to verify.' });

		// `simulate` only reaches the sandbox provider; the live one ignores it.
		const result = await verifyPayment(reference, { simulate: req.body.simulate });
		if (!result.success) {
			return res.status(400).json({ message: result.reason || 'Payment was not successful.', failed: true });
		}

		// Never trust a client-supplied amount — if the provider tells us what
		// actually landed and it is short, the booking stays unpaid.
		if (result.amount !== undefined && Math.round(result.amount) < Math.round(booking.cost.total)) {
			return res.status(400).json({ message: 'The amount paid does not cover this booking.', failed: true });
		}

		booking.status = 'paid';
		booking.payment = {
			...booking.payment,
			provider: activeProvider(),
			reference,
			amount: booking.cost.total,
			paidAt: result.paidAt || new Date(),
			raw: result,
		};
		// THE POINT OF ALL THIS: the landlord does not have the money yet.
		booking.escrow = { state: 'held', heldAt: new Date() };
		await booking.save();

		res.status(200).json({
			message: 'Payment received and held safely until you confirm you have moved in.',
			booking: await booking.populate(POPULATE),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

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
		if (booking.status !== 'paid' || booking.escrow.state !== 'held') {
			return res.status(400).json({ message: 'There is no held payment to release for this booking.' });
		}

		booking.status = 'movedIn';
		booking.movedInConfirmedAt = new Date();
		booking.escrow.state = 'released';
		booking.escrow.releasedAt = new Date();
		await booking.save();

		res.status(200).json({
			message: `Move-in confirmed. ₦${booking.cost.landlordReceives.toLocaleString()} has been released to your landlord.`,
			booking: await booking.populate(POPULATE),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN: REFUND A HELD PAYMENT ──────────────────────────
// The counterpart to escrow: when a student pays and the room turns out not to
// exist, somebody has to be able to give the money back.
export const refundBooking = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });
		if (booking.escrow.state !== 'held') {
			return res.status(400).json({
				message: booking.escrow.state === 'released'
					? 'This money has already been released to the landlord.'
					: 'There is no held payment to refund.',
			});
		}

		booking.status = 'refunded';
		booking.escrow.state = 'refunded';
		booking.escrow.refundedAt = new Date();
		booking.escrow.refundReason = String(req.body.reason || '').trim().slice(0, 300) || 'Refunded by an administrator';
		await booking.save();

		res.status(200).json({ message: 'Payment refunded to the student', booking });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN: OVERSIGHT ──────────────────────────────────────
export const adminListBookings = async (req, res) => {
	try {
		const filter = {};
		if (req.query.status) filter.status = req.query.status;
		if (req.query.escrow) filter['escrow.state'] = req.query.escrow;

		const [bookings, counts] = await Promise.all([
			Booking.find(filter).populate(POPULATE).sort({ createdAt: -1 }).limit(200).lean(),
			Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
		]);

		const held = await Booking.aggregate([
			{ $match: { 'escrow.state': 'held' } },
			{ $group: { _id: null, total: { $sum: '$cost.total' } } },
		]);

		res.status(200).json({
			bookings,
			counts: Object.fromEntries(counts.map((c) => [c._id, c.n])),
			// What the platform is currently holding on students' behalf.
			escrowHeldTotal: held[0]?.total || 0,
			provider: activeProvider(),
			paymentsAreLive: paymentsAreLive(),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
