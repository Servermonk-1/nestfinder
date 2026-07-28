import mongoose from 'mongoose';

/**
 * A student's application to live somewhere, and the money attached to it.
 *
 * ── Why escrow ──
 * The single most damaging thing that happens to Nigerian students looking for
 * accommodation is paying for a room that turns out not to exist, or whose
 * "landlord" disappears. So money paid here is held by the platform and only
 * released once the student confirms they actually moved in. The landlord is
 * paid for a real let; the student is not exposed to a stranger's bank account.
 *
 * ── Lifecycle ──
 *   pending    student applied, landlord hasn't answered
 *   accepted   landlord said yes; student may now pay
 *   paid       money received and HELD IN ESCROW (not the landlord's yet)
 *   movedIn    student confirmed arrival → escrow released to the landlord
 *   completed  tenancy ended (caution deposit settled)
 *   declined   landlord said no
 *   cancelled  withdrawn before payment
 *   refunded   admin returned the money
 */
const STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'paid', 'movedIn', 'completed', 'refunded'];

// The frozen cost breakdown. Stored rather than recomputed so a landlord can
// never change the numbers after a student has agreed to them.
const costSchema = new mongoose.Schema({
	months: Number,
	monthlyRent: Number,
	rent: Number,
	cautionDeposit: Number,
	agentFee: Number,
	legalFee: Number,
	total: Number,

	// How the non-refundable money divides: landlord 70 / service 5 / platform 25.
	// Frozen at application time so a later change to the rates never rewrites
	// what someone already agreed to.
	divisible: Number,
	landlordShare: Number,
	serviceFee: Number,
	platformShare: Number,
	splitRates: {
		landlord: Number,
		service: Number,
		platform: Number,
	},

	refundableAtEnd: Number,
	landlordReceives: Number,
}, { _id: false });

const bookingSchema = new mongoose.Schema({
	listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
	landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true, index: true },

	// The stay itself.
	moveInDate: { type: Date, required: true },
	moveOutDate: { type: Date, required: true },
	months: { type: Number, required: true, min: 1 },
	message: { type: String, trim: true, maxlength: 500, default: '' },

	status: { type: String, enum: STATUSES, default: 'pending', index: true },
	cost: { type: costSchema, required: true },

	// ── Escrow ──
	// `held` means we have the student's money and the landlord does not.
	escrow: {
		state: { type: String, enum: ['none', 'held', 'released', 'refunded'], default: 'none' },
		heldAt: { type: Date },
		releasedAt: { type: Date },
		refundedAt: { type: Date },
		refundReason: { type: String, trim: true },
	},

	payment: {
		provider: { type: String },      // 'sandbox' today; 'paystack' when keys exist
		reference: { type: String, index: true },
		amount: { type: Number },
		paidAt: { type: Date },
		// Kept for the audit trail an admin needs when settling a dispute.
		raw: { type: mongoose.Schema.Types.Mixed },
	},

	// Timeline, so both sides (and an admin) can see what happened when.
	respondedAt: { type: Date },
	declineReason: { type: String, trim: true },
	cancelledAt: { type: Date },
	movedInConfirmedAt: { type: Date },
	completedAt: { type: Date },
}, { timestamps: true });

// A student shouldn't have two live applications for the same room. Partial, so
// a rejected or cancelled application doesn't block them from trying again.
bookingSchema.index(
	{ listing: 1, student: 1 },
	{ unique: true, partialFilterExpression: { status: { $in: ['pending', 'accepted', 'paid', 'movedIn'] } } }
);

/** Has this student genuinely stayed here? The review gate depends on it. */
bookingSchema.statics.hasStayedAt = function hasStayedAt(studentId, listingId) {
	return this.exists({
		student: studentId,
		listing: listingId,
		status: { $in: ['movedIn', 'completed'] },
	});
};

export const BOOKING_STATUSES = STATUSES;
export default mongoose.model('Booking', bookingSchema);
