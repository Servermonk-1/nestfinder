import mongoose from 'mongoose';

/**
 * A search a student wants to keep, and be told about.
 *
 * Housing in Ibadan moves fast around the SIWES intake — the good rooms near
 * the big placement centres are taken within days. A student who searched on
 * Monday has no way of knowing what appeared on Tuesday, so this closes that
 * gap without asking them to keep checking.
 */
const savedSearchSchema = new mongoose.Schema({
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
	name: { type: String, required: true, trim: true, maxlength: 60 },

	// Exactly the fields the live search accepts, so the two can't drift.
	criteria: {
		q: { type: String, trim: true },
		city: { type: String, trim: true },
		area: { type: String, trim: true },
		roomType: { type: String },
		minPrice: { type: Number },
		maxPrice: { type: Number },
		amenities: [{ type: String }],
		// Anchored searches are stored too, so "near my placement" alerts work.
		nearPlacement: { type: Boolean, default: false },
		radiusKm: { type: Number },
	},

	alertsEnabled: { type: Boolean, default: true },

	// Everything created after this has not been shown to them yet. Using a
	// timestamp rather than a list of seen ids keeps this O(1) forever.
	lastCheckedAt: { type: Date, default: Date.now },
	lastNotifiedAt: { type: Date },
	// Purely informational, so the UI can say "3 new since you saved this".
	newMatchCount: { type: Number, default: 0 },
}, { timestamps: true });

// A student shouldn't be able to save the same name twice — it makes the list
// meaningless and duplicates every alert.
savedSearchSchema.index({ student: 1, name: 1 }, { unique: true });

export default mongoose.model('SavedSearch', savedSearchSchema);
