import mongoose from 'mongoose';

// A GeoJSON point, as its own schema so it can be absent entirely. Declaring the
// fields inline instead leaves every ungeocoded listing with a half-built
// `{ type: 'Point' }` and no coordinates, which the 2dsphere index rejects on
// insert — it refuses to extract geo keys from a Point with no position.
const pointSchema = new mongoose.Schema({
	type: { type: String, enum: ['Point'], required: true },
	coordinates: { type: [Number], required: true },
}, { _id: false });

const listingSchema = new mongoose.Schema({
	title: { type: String, required: true, trim: true },
	description: { type: String, required: true },
	address: { type: String, required: true },
	city: { type: String, required: true, index: true },
	area: { type: String, required: true },
	state: { type: String, required: true },
	price: { type: Number, required: true, min: 0, index: true },
	// What `price` actually means. Without this the same number was being shown
	// as "/yr" on cards and "/month" on the detail page — a 12x discrepancy.
	priceUnit: { type: String, enum: ['monthly', 'annual'], default: 'annual', required: true },
	// Rent normalised to a monthly figure. Derived, never set by hand — filtering
	// and sorting must not compare an annual price against a monthly one.
	monthlyPrice: { type: Number, default: 0, index: true },
	roomType: { type: String, enum: ['single', 'shared', 'self-contained'], required: true },
	rooms: { type: Number, required: true, min: 1 },
	amenities: [{ type: String }],
	images: [{ type: String }],
	available: { type: Boolean, default: true },
	flagged: { type: Boolean, default: false },

	// ── Fraud Shield ──
	fraudScore: { type: Number, default: 0, index: true },
	fraudLevel: { type: String, enum: ['clear', 'low', 'medium', 'high'], default: 'clear' },
	fraudFlags: [{ rule: String, severity: Number, detail: String }],
	fraudCheckedAt: { type: Date },
	imageHashes: [{ type: String, index: true }],
	reportCount: { type: Number, default: 0 },
	landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
	contactPhone: { type: String, required: true },
	contactEmail: { type: String, required: true },

	// Quick facts
	minimumStay: { type: String, default: '6 months' },

	// ── Move-in costs beyond the rent ──
	// Nigerian lettings almost never cost just the rent, and hiding that until
	// the student is standing in the room is the complaint students make most.
	// Declared per listing so the platform can quote an honest total up front.
	// Caution is REFUNDABLE at the end of the tenancy; the others are not.
	cautionDeposit: { type: Number, default: 0, min: 0 },
	agentFee: { type: Number, default: 0, min: 0 },
	legalFee: { type: Number, default: 0, min: 0 },
	furnished: { type: Boolean, default: false },

	// Utilities
	utilities: {
		internetType: { type: String, default: 'None' },
		electricityHours: { type: Number, default: 18 },
		waterSource: { type: String, default: 'Public' },
		generator: { type: Boolean, default: false },
		wasteDisposal: { type: String, default: 'Weekly' },
	},

	// Environment
	environment: {
		noiseLevel: { type: String, enum: ['quiet', 'moderate', 'noisy'], default: 'moderate' },
		privacyLevel: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
		ventilation: { type: String, enum: ['excellent', 'good', 'fair'], default: 'good' },
		naturalLighting: { type: String, enum: ['excellent', 'good', 'fair'], default: 'good' },
		surroundings: { type: String, enum: ['residential', 'commercial', 'mixed'], default: 'mixed' },
	},

	// Availability
	viewingHours: { type: String, default: '9AM - 6PM' },
	leaseDuration: { type: String, default: '6-12 months' },

	// ── Where it actually is ──
	// GeoJSON so MongoDB can answer "within N km of my placement" natively.
	// Order is [longitude, latitude] — the opposite of how people say it.
	// `default: undefined` keeps the field off ungeocoded listings entirely.
	location: { type: pointSchema, default: undefined },
	// How trustworthy that pin is: an exact street match, or just the area/city
	// centre. Never present a city-centre guess as the doorstep.
	geocodePrecision: { type: String, enum: ['address', 'area', 'city'] },
	geocodedAt: { type: Date },
	geocodeQuery: { type: String },
	// Who put the pin there. OpenStreetMap's coverage of Nigerian streets is
	// patchy, so our own guess is often only area- or city-accurate — but the
	// landlord knows exactly where the house is. A pin they placed themselves
	// outranks anything we derived, and is never silently overwritten.
	locationSource: { type: String, enum: ['geocoded', 'landlord'], default: 'geocoded' },
	locationConfirmedAt: { type: Date },

	// Analytics
	views: { type: Number, default: 0 },

	// Reviews (cached aggregate — source of truth is the Review collection)
	rating: { type: Number, default: 0 },
	totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

// Enables $near / $geoWithin. Sparse, because a listing may not be geocoded yet.
listingSchema.index({ location: '2dsphere' }, { sparse: true });

// Keep `monthlyPrice` in step with price/priceUnit however the document is
// written — `save()` and `findOneAndUpdate()` take different paths in Mongoose.
const toMonthly = (price, unit) =>
	unit === 'monthly' ? Math.round(Number(price) || 0) : Math.round((Number(price) || 0) / 12);

listingSchema.pre('save', async function computeMonthlyPrice() {
	if (this.isNew || this.isModified('price') || this.isModified('priceUnit') || !this.monthlyPrice) {
		this.monthlyPrice = toMonthly(this.price, this.priceUnit);
	}
});

listingSchema.pre('findOneAndUpdate', async function computeMonthlyPriceOnUpdate() {
	const update = this.getUpdate() || {};

	// An update can carry a field at the top level OR inside `$set`, and the two
	// mix freely — `timestamps` injects its own `$set` alongside bare fields — so
	// both have to be checked.
	const incoming = (field) => update[field] ?? update.$set?.[field];
	const newPrice = incoming('price');
	const newUnit = incoming('priceUnit');
	if (newPrice === undefined && newUnit === undefined) return;

	// Whichever field wasn't part of this update comes from the stored document.
	const current = await this.model.findOne(this.getQuery()).select('price priceUnit').lean();
	const monthlyPrice = toMonthly(newPrice ?? current?.price, newUnit ?? current?.priceUnit);

	// Write it back the same way the caller wrote theirs.
	if (update.$set) update.$set.monthlyPrice = monthlyPrice;
	else update.monthlyPrice = monthlyPrice;
	this.setUpdate(update);
});

export default mongoose.model('Listing', listingSchema);