import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import { calculateBookingCost, monthsBetween } from '../utils/bookingCost.js';
import { initialisePayment, verifyPayment, activeProvider, paymentsAreLive, sandboxTestCards } from '../services/payments.js';

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
			// The checkout screen lists these so nobody has to leave the app to
			// find a working card. Empty once real keys are configured, because
			// then the card is entered on Paystack's page, not ours.
			testCards: paymentsAreLive() ? [] : sandboxTestCards(),
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

		// Card details only ever reach the SANDBOX provider, which compares the
		// number against Paystack's published test cards. The live provider
		// ignores them entirely — real cards are entered on Paystack's own hosted
		// page and never touch this server.
		const result = await verifyPayment(reference, {
			card: req.body.card,
			pin: req.body.pin,
			otp: req.body.otp,
		});

		// A challenge is the provider asking for more, not a refusal. 200, so the
		// checkout can prompt for it without rendering an error state.
		if (!result.success && result.challenge) {
			return res.status(200).json({
				challenge: result.challenge,
				message: result.reason,
				reference,
			});
		}
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

		// Take the room off the market. Nothing else did this: the unique index is
		// on { listing, student }, which only stops the SAME student applying
		// twice — a different student could apply for, and pay for, a room that
		// was already sold. Search filters on `available`, so clearing it here is
		// what makes the listing disappear for everyone else.
		await Listing.findByIdAndUpdate(booking.listing, { available: false });

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

		// Releasing escrow settles WHO the money belongs to. It does not move it —
		// nothing here can make a bank transfer. So the release opens a debt that
		// stays open until a human pays it and records the reference.
		booking.payout = {
			state: 'due',
			amount: booking.cost.landlordReceives,
			dueAt: new Date(),
		};
		await booking.save();

		res.status(200).json({
			// Carefully not "has been released to your landlord" — that claimed a
			// transfer that never happened.
			message: 'Move-in confirmed. Your payment is no longer refundable and is now owed to the landlord.',
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

		// The sale fell through, so the room goes back on the market. Without this
		// a refunded listing would stay invisible forever and the landlord would
		// have to notice and re-list it by hand.
		await Listing.findByIdAndUpdate(booking.listing, { available: true });

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

// ── ADMIN: PAYOUTS ────────────────────────────────────────
/**
 * What the platform owes, and to whom.
 *
 * This exists because releasing escrow never moved any money. Before it, a
 * released booking simply said the landlord had been paid and there was no
 * record anywhere of an actual transfer — the obligation was invisible.
 */
export const listPayouts = async (req, res) => {
	try {
		const state = ['due', 'paid'].includes(req.query.state) ? req.query.state : 'due';

		const bookings = await Booking.find({ 'payout.state': state })
			.populate('listing', 'title area city')
			.populate('student', 'fullName email')
			.populate('landlord', 'fullName email phone payout')
			.sort({ 'payout.dueAt': 1 })
			.limit(200)
			.lean();

		const [dueAgg, paidAgg] = await Promise.all([
			Booking.aggregate([{ $match: { 'payout.state': 'due' } }, { $group: { _id: null, t: { $sum: '$payout.amount' } } }]),
			Booking.aggregate([{ $match: { 'payout.state': 'paid' } }, { $group: { _id: null, t: { $sum: '$payout.amount' } } }]),
		]);

		res.status(200).json({
			bookings,
			totalDue: dueAgg[0]?.t || 0,
			totalPaid: paidAgg[0]?.t || 0,
			// Nothing here can make a transfer. Say so, rather than letting the
			// screen imply the list settles itself.
			manualTransfersRequired: true,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

/**
 * Record that a landlord was actually paid, by hand, outside this system.
 *
 * Deliberately requires a bank reference: without one this would be a button
 * that marks a debt settled on nothing but an admin's word, which is the same
 * dishonesty as the message it replaced.
 */
export const markPayoutPaid = async (req, res) => {
	try {
		const booking = await Booking.findById(req.params.id).catch(() => null);
		if (!booking) return res.status(404).json({ message: 'Booking not found' });

		if (booking.payout?.state !== 'due') {
			return res.status(400).json({
				message: booking.payout?.state === 'paid'
					? 'This payout has already been recorded as paid.'
					: 'Nothing is owed on this booking.',
			});
		}

		const reference = String(req.body.reference || '').trim();
		if (!reference) {
			return res.status(400).json({ message: 'Enter the bank transfer reference so this can be checked against a statement.' });
		}

		booking.payout.state = 'paid';
		booking.payout.paidAt = new Date();
		booking.payout.reference = reference.slice(0, 120);
		booking.payout.paidBy = req.user.id;
		booking.payout.note = String(req.body.note || '').trim().slice(0, 300);
		booking.status = 'completed';
		await booking.save();

		res.status(200).json({ message: 'Payout recorded', booking });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
