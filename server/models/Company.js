import mongoose from 'mongoose';

/**
 * A firm that takes SIWES students.
 *
 * This is what makes NestFinder a SIWES platform rather than a general housing
 * site: a student's search is anchored to where they will actually be working
 * every day, not to a city centre.
 */

// Same shape and reasoning as Listing.location — a separate schema so the field
// is absent (rather than half-built) until the company has been geocoded.
const pointSchema = new mongoose.Schema({
	type: { type: String, enum: ['Point'], required: true },
	coordinates: { type: [Number], required: true }, // [longitude, latitude]
}, { _id: false });

const companySchema = new mongoose.Schema({
	name: { type: String, required: true, trim: true },
	description: { type: String, default: '' },
	industry: { type: String, required: true, trim: true },

	// Where the student reports each morning.
	address: { type: String, required: true },
	area: { type: String, required: true },
	city: { type: String, required: true, index: true },
	state: { type: String, required: true },
	location: { type: pointSchema, default: undefined },
	geocodePrecision: { type: String, enum: ['address', 'area', 'city'] },
	geocodedAt: { type: Date },
	geocodeQuery: { type: String },
	// As with listings, a coordinate confirmed by a human beats a derived one.
	locationSource: { type: String, enum: ['geocoded', 'admin'], default: 'geocoded' },

	// Which courses of study this firm actually takes. Stored lowercase and
	// matched case-insensitively so "Computer Science" and "computer science"
	// are the same department — students type this themselves.
	acceptedDepartments: [{ type: String, index: true }],

	// AATU groups its programmes into four faculties, and that's how students
	// think about placement ("where can an Engineering student go?"), so the
	// directory can be browsed either way.
	faculties: [{
		type: String,
		enum: ['Engineering', 'Natural & Applied Sciences', 'Biological Sciences', 'Environmental Sciences'],
		index: true,
	}],

	// Roughly how many SIWES places they offer per cycle. Informational only —
	// we don't run the placement process, so we must not imply a guarantee.
	siwesSlots: { type: Number, min: 0 },

	website: { type: String, default: '' },
	contactEmail: { type: String, default: '' },
	contactPhone: { type: String, default: '' },

	// Admin-curated directory: a company only appears to students once an admin
	// has checked it. Students can suggest, but cannot publish.
	verified: { type: Boolean, default: false },
	addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
	suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
}, { timestamps: true });

// Powers "housing near my placement" and "companies near me".
companySchema.index({ location: '2dsphere' }, { sparse: true });
// Free-text lookup by name/industry in the directory.
companySchema.index({ name: 'text', industry: 'text' });

/** Normalise a department string so matching is predictable. */
export const normaliseDepartment = (d) => String(d || '').trim().toLowerCase().replace(/\s+/g, ' ');

companySchema.pre('save', function normaliseDepartments() {
	if (this.isModified('acceptedDepartments')) {
		this.acceptedDepartments = [...new Set(
			(this.acceptedDepartments || []).map(normaliseDepartment).filter(Boolean)
		)];
	}
});

export default mongoose.model('Company', companySchema);
