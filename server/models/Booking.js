import mongoose from 'mongoose';

/**
 * A student's application to live somewhere.
 *
 * New payment flow: manual bank transfer verification by an administrator.
 *
 * ── Lifecycle ──
 *   pending        student applied, landlord hasn't answered
 *   pendingPayment landlord accepted — waiting for student bank transfer
 *   confirmed      payment approved by admin
 *   movedIn        student confirmed arrival
 *   completed      tenancy ended
 *   declined       landlord said no
 *   cancelled      withdrawn before payment
 */
const STATUSES = ['pending', 'pendingPayment', 'confirmed', 'movedIn', 'completed', 'declined', 'cancelled'];

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

	// Timeline, so both sides (and an admin) can see what happened when.

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
	{ unique: true, partialFilterExpression: { status: { $in: ['pending', 'pendingPayment', 'confirmed', 'movedIn'] } } }
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
