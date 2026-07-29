import mongoose from 'mongoose';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import Report from '../models/Report.js';
import Review from '../models/Review.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { runFraudShield, computeTrustScore } from '../services/fraudShield.js';
import { geocodeOne } from '../services/geocodeListing.js';
import { optimiseUploaded } from '../services/optimiseImages.js';
import { notifyMatchingSearches } from '../services/savedSearchAlerts.js';
import { buildListingFilter } from '../utils/listingFilter.js';
import { geocodeListing as lookupAddress, distanceKm } from '../utils/geocode.js';

// Read a landlord-placed pin off a request body. Returns undefined when there
// isn't one, so callers can tell "no pin sent" from "a pin at 0,0".
const pinFromBody = (body) => {
	if (body?.lat === undefined || body?.lng === undefined) return undefined;
	const lat = Number(body.lat);
	const lng = Number(body.lng);
	// Reject anything off the globe. A silently-bad pin is worse than none: it
	// would place a real house in the ocean and no one would notice.
	if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
	if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined;
	return { lat, lng };
};

const applyPin = (doc, pin, addressParts) => {
	doc.location = { type: 'Point', coordinates: [pin.lng, pin.lat] };
	doc.geocodePrecision = 'address'; // a human confirmed it — that's as exact as it gets
	doc.locationSource = 'landlord';
	doc.locationConfirmedAt = new Date();
	doc.geocodedAt = new Date();
	// Stamp the address this pin belongs to, so the background geocoder knows the
	// pin is current and leaves it alone.
	doc.geocodeQuery = [addressParts.address, addressParts.area, addressParts.city, addressParts.state]
		.filter(Boolean).join('|');
};

// Screen a listing in the background. Image hashing takes a moment, and a slow
// fraud check must never delay or fail the landlord's upload.
const screenInBackground = (listingId, landlordId) => {
	runFraudShield(listingId)
		.then(() => computeTrustScore(landlordId))
		.catch((err) => console.error('Fraud Shield failed:', err.message));

	// Same reasoning for geocoding: it calls a free, rate-limited external
	// service that can be slow or down, and a listing without a map pin is far
	// better than a failed upload. geocodeOne() skips work when the address is
	// unchanged, so edits that don't touch the address cost nothing.
	geocodeOne(listingId).catch((err) => console.error('Geocoding failed:', err.message));
};

// ── CREATE LISTING ────────────────────────────────────────
export const createListing = async (req, res) => {
	try {
		const {
			title, description, address, city, area,
			state, price, priceUnit, roomType, rooms, amenities,
			contactPhone, contactEmail, cautionDeposit, agentFee, legalFee
		} = req.body;

		// Get uploaded image paths from Multer
		const images = req.files ? req.files.map(f => f.path) : [];

		const listing = await Listing.create({
			title, description, address, city, area,
			state, price, roomType, rooms,
			// Falls back to the model default rather than silently guessing here.
			...(priceUnit ? { priceUnit } : {}),
			// Move-in costs. Blank means "I don't charge it", not "unknown".
			cautionDeposit: Number(cautionDeposit) || 0,
			agentFee: Number(agentFee) || 0,
			legalFee: Number(legalFee) || 0,
			amenities: amenities ? JSON.parse(amenities) : [],
			images,
			contactPhone, contactEmail,
			landlord: req.user.id,
		});

		// If the landlord dragged the pin while filling the form, that placement is
		// authoritative — save it before the background geocoder runs, so it sees
		// a landlord-set pin and skips.
		const pin = pinFromBody(req.body);
		if (pin) {
			applyPin(listing, pin, { address, area, city, state });
			await listing.save({ timestamps: false });
		}

		// Shrink the photos in the background. A landlord's 4MB phone photo is
		// unusable over Nigerian mobile data, but a slow conversion must never
		// delay their upload — so this runs after the response goes out.
		optimiseUploaded(req.files || []).catch((err) => console.error('Image optimisation failed:', err.message));

		screenInBackground(listing._id, req.user.id);

		// Tell anyone whose saved search this matches. Fire-and-forget and heavily
		// throttled inside — a landlord posting five rooms must not send five
		// emails, and a slow mail server must never delay their upload.
		notifyMatchingSearches(listing._id).catch((err) => console.error('Saved-search alerts failed:', err.message));

		res.status(201).json({
			message: 'Listing created successfully',
			listing,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET ALL LISTINGS ──────────────────────────────────────
export const getAllListings = async (req, res) => {
	try {
		const { page = 1, limit = 12, sort = 'recommended' } = req.query;

		// Sort options
		const sortOptions = {
			// Default. Listings whose owner placed the map pin themselves rank
			// first — their location can be trusted, and it gives landlords a
			// reason to confirm. Listings with no confirmation date sort last.
			recommended: { locationConfirmedAt: -1, createdAt: -1 },
			// Explicit sorts stay pure: a student who asks for cheapest-first must
			// get exactly that, never a quality signal quietly reordering results.
			newest: { createdAt: -1 },
			price_asc: { monthlyPrice: 1 },
			price_desc: { monthlyPrice: -1 },
		};

		const listings = await Listing.find({ available: true, flagged: false })
			.populate('landlord', 'fullName verified phone')
			.sort(sortOptions[sort] || sortOptions.recommended)
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.select('-__v');

		const total = await Listing.countDocuments({ available: true, flagged: false });

		res.status(200).json({
			listings,
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET SINGLE LISTING ────────────────────────────────────
export const getSingleListing = async (req, res) => {
	try {
		// A logged-in student must be identity-verified to see full details.
		// (optionalAuth populates req.user when a token is present.)
		if (req.user?.role === 'student') {
			const student = await Student.findById(req.user.id).select('verified');
			if (!student?.verified) {
				return res.status(403).json({
					message: 'Verify your identity to view listing details.',
					needsIdentityVerification: true,
				});
			}
		}

		const listing = await Listing.findById(req.params.id)
			.populate('landlord', 'fullName verified emailVerified phone email createdAt trustScore');

		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		// How far this room is from where the student actually works — the number
		// that turns a generic transport guess into a real commute. Only for a
		// confirmed placement, and only when both ends have been geocoded.
		let placement = null;
		if (req.user?.role === 'student') {
			const me = await Student.findById(req.user.id)
				.select('placement')
				.populate('placement.company', 'name area city location')
				.lean();
			const from = listing.location?.coordinates;
			const to = me?.placement?.company?.location?.coordinates;
			if (me?.placement?.status === 'confirmed' && (from && to || me.placement.startDate)) {
				placement = {
					company: me.placement.company?.name,
					area: me.placement.company?.area,
					// Dates drive the lease-length check: SIWES usually runs about
					// six months while landlords often insist on a full year.
					startDate: me.placement.startDate || null,
					endDate: me.placement.endDate || null,
					distanceKm: from && to
						? distanceKm({ lat: from[1], lng: from[0] }, { lat: to[1], lng: to[0] })
						: null,
				};
			}
		}

		res.status(200).json({ listing, placement });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── CITIES THAT ACTUALLY HAVE LISTINGS ────────────────────
// GET /api/listings/cities — powers the location filter, so a student can only
// pick somewhere that will actually return results.
export const getListingCities = async (req, res) => {
	try {
		const cities = await Listing.aggregate([
			{ $match: { available: true, flagged: false } },
			{ $group: { _id: '$city', count: { $sum: 1 } } },
			{ $sort: { count: -1, _id: 1 } },
		]);
		res.status(200).json({
			cities: cities
				.filter((c) => c._id)
				.map((c) => ({ city: c._id, count: c.count })),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SUGGEST A PIN FOR A TYPED ADDRESS ─────────────────────
// POST /api/listings/geocode-preview — lets the listing form show a starting
// pin before the listing exists. Landlord-only: it spends our quota on a free,
// rate-limited service, so it isn't left open to the world.
export const previewGeocode = async (req, res) => {
	try {
		const { address, area, city, state } = req.body;
		if (!city?.trim() && !area?.trim()) {
			return res.status(400).json({ message: 'Enter at least an area or a city first.' });
		}

		const hit = await lookupAddress({ address, area, city, state });
		if (!hit) {
			// Not an error the landlord can fix — they'll drop the pin by hand.
			return res.status(200).json({ found: false });
		}

		res.status(200).json({
			found: true,
			lat: hit.lat,
			lng: hit.lng,
			precision: hit.precision,
			label: hit.label,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SEARCH & FILTER LISTINGS ──────────────────────────────
export const searchListings = async (req, res) => {
	try {
		const {
			q, city, area, minPrice, maxPrice,
			roomType, amenities, sort = 'recommended',
			page = 1, limit = 12,
		} = req.query;

		// Built by the SHARED helper, so a saved search and the live search can
		// never drift apart — an alert must only ever describe homes this very
		// search would have returned.
		const filter = buildListingFilter({ q, city, area, roomType, minPrice, maxPrice, amenities });

		// ── "Near my placement" ──
		// Anchor the whole search to where this student actually reports for
		// work. Only a CONFIRMED placement counts: re-routing someone's housing
		// hunt to a company they merely applied to would be worse than not
		// offering it at all.
		let anchor = null;

		// Anchor on a NAMED company — "show me housing near IITA" — which works
		// for anyone, logged in or not. A student weighing up two placement
		// offers needs to compare the housing around each before they accept.
		if (req.query.nearCompany) {
			const company = await Company.findById(req.query.nearCompany)
				.select('name location verified suggestedBy').lean().catch(() => null);
			const c = company?.location?.coordinates;
			// Unverified centres are private to the student who added them, so
			// they can't be probed through this endpoint.
			const mayUse = company && (company.verified || String(company.suggestedBy || '') === String(req.user?.id || ''));
			if (!mayUse || !c) {
				return res.status(200).json({
					listings: [], total: 0, page: 1, pages: 1,
					message: 'That placement centre has no map location yet.',
				});
			}
			anchor = { lat: c[1], lng: c[0], name: company.name };
		}

		if (!anchor && req.query.nearPlacement === '1' && req.user?.role === 'student') {
			const me = await Student.findById(req.user.id)
				.select('placement')
				.populate('placement.company', 'name location')
				.lean();
			const c = me?.placement?.company?.location?.coordinates;
			if (me?.placement?.status !== 'confirmed' || !c) {
				return res.status(200).json({
					listings: [], total: 0, page: 1, pages: 1,
					needsPlacement: true,
					// Test for the COMPANY, not for `placement` — Mongoose materialises
					// an empty placement subdocument (with its default status) on every
					// student, so `placement` is truthy even when none was ever set.
					message: me?.placement?.company
						? 'Confirm your placement to search around it.'
						: 'Add your SIWES placement to search around it.',
				});
			}
			anchor = { lat: c[1], lng: c[0], name: me.placement.company.name };
		}

		const sortOptions = {
			// Default. Listings whose owner placed the map pin themselves rank
			// first — their location can be trusted, and it gives landlords a
			// reason to confirm. Listings with no confirmation date sort last.
			recommended: { locationConfirmedAt: -1, createdAt: -1 },
			// Explicit sorts stay pure: a student who asks for cheapest-first must
			// get exactly that, never a quality signal quietly reordering results.
			newest: { createdAt: -1 },
			price_asc: { monthlyPrice: 1 },
			price_desc: { monthlyPrice: -1 },
		};

		// Anchored search restricts to listings within reach of the placement and
		// orders by how far away they are — a "nearest" sort is the only ordering
		// that makes sense once the question is "how do I get to work?".
		//
		// Two operators for one radius, because MongoDB rejects $nearSphere in any
		// context that can't sort — including countDocuments(). $geoWithin selects
		// exactly the same set without ordering, so each is used where it's legal.
		let countFilter = filter;
		let radiusKm = 0;
		if (anchor) {
			radiusKm = Math.min(50, Math.max(1, Number(req.query.radiusKm) || 15));
			const EARTH_RADIUS_KM = 6378.1;
			countFilter = {
				...filter,
				location: { $geoWithin: { $centerSphere: [[anchor.lng, anchor.lat], radiusKm / EARTH_RADIUS_KM] } },
			};
			filter.location = {
				$nearSphere: {
					$geometry: { type: 'Point', coordinates: [anchor.lng, anchor.lat] },
					$maxDistance: radiusKm * 1000,
				},
			};
		}

		const query = Listing.find(filter)
			.populate('landlord', 'fullName verified')
			.skip((page - 1) * limit)
			.limit(parseInt(limit))
			.select('-__v');

		// $nearSphere already returns nearest-first, and Mongo rejects any other
		// sort alongside it.
		if (!anchor) query.sort(sortOptions[sort] || sortOptions.recommended);

		const listings = await query;
		// countFilter is the same set expressed with $geoWithin, which is legal here.
		const total = await Listing.countDocuments(countFilter);

		res.status(200).json({
			// Attach the distance so the client can show a real commute instead of
			// a flat guess. Computed here because the anchor is server-side only.
			listings: anchor
				? listings.map((l) => {
					const c = l.location?.coordinates;
					const doc = l.toObject();
					doc.distanceKm = c ? distanceKm({ lat: anchor.lat, lng: anchor.lng }, { lat: c[1], lng: c[0] }) : null;
					return doc;
				})
				: listings,
			total,
			page: parseInt(page),
			pages: Math.ceil(total / limit),
			...(anchor ? { anchor: { name: anchor.name, radiusKm, lat: anchor.lat, lng: anchor.lng } } : {}),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── UPDATE LISTING ────────────────────────────────────────
export const updateListing = async (req, res) => {
	try {
		const listing = await Listing.findById(req.params.id);

		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		// Check ownership
		if (listing.landlord.toString() !== req.user.id) {
			return res.status(403).json({ message: 'Not authorized to edit this listing' });
		}

		// `lat`/`lng` are pin coordinates, not listing columns — strip them so they
		// can't be written as stray top-level fields.
		const { lat, lng, ...body } = req.body;
		const updated = await Listing.findByIdAndUpdate(
			req.params.id,
			{ ...body, updatedAt: Date.now() },
			{ new: true, runValidators: true }
		);

		const pin = pinFromBody(req.body);
		if (pin) {
			applyPin(updated, pin, updated);
			await updated.save({ timestamps: false });
		}

		// Re-screen on every edit. Without this, a landlord could publish a clean
		// listing, pass Fraud Shield, then edit it into a scam and never be
		// checked again — which would defeat the whole pipeline.
		// Photos may have changed, so drop the cached fingerprints first.
		if (req.body.images !== undefined) {
			await Listing.findByIdAndUpdate(req.params.id, { imageHashes: [] });
		}
		screenInBackground(req.params.id, req.user.id);

		res.status(200).json({ message: 'Listing updated', listing: updated });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── DELETE LISTING ────────────────────────────────────────
export const deleteListing = async (req, res) => {
	try {
		const listing = await Listing.findById(req.params.id);

		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		// Check ownership
		if (listing.landlord.toString() !== req.user.id) {
			return res.status(403).json({ message: 'Not authorized to delete this listing' });
		}

		await listing.deleteOne();
		res.status(200).json({ message: 'Listing deleted successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── TOGGLE AVAILABILITY ───────────────────────────────────
export const toggleAvailability = async (req, res) => {
	try {
		const listing = await Listing.findById(req.params.id);

		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		// Check ownership
		if (listing.landlord.toString() !== req.user.id) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		listing.available = !listing.available;
		await listing.save();

		res.status(200).json({
			message: `Listing marked as ${listing.available ? 'available' : 'unavailable'}`,
			available: listing.available,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET LANDLORD'S OWN LISTINGS ───────────────────────────
export const getMyListings = async (req, res) => {
	try {
		const listings = await Listing.find({ landlord: req.user.id })
			.sort({ createdAt: -1 })
			.select('-__v');

		res.status(200).json({ listings, total: listings.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── INCREMENT VIEW COUNT ──────────────────────────────────
export const incrementViews = async (req, res) => {
	try {
		const listing = await Listing.findByIdAndUpdate(
			req.params.id,
			{ $inc: { views: 1 } },
			{ new: true }
		).select('views');

		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		res.status(200).json({ views: listing.views });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Average time (in ms) between a student message and the landlord's next
// reply in the same conversation, across all of a landlord's conversations.
const getLandlordResponseLabel = async (landlordId) => {
	const conversations = await Conversation.find({ landlord: landlordId }).select('_id');
	if (!conversations.length) return 'Normal';

	const messages = await Message.find({ conversation: { $in: conversations.map((c) => c._id) } })
		.sort({ conversation: 1, createdAt: 1 })
		.select('conversation senderRole createdAt');

	const gaps = [];
	let currentConv = null;
	let pendingStudentMsgAt = null;
	for (const m of messages) {
		const conv = String(m.conversation);
		if (conv !== currentConv) {
			currentConv = conv;
			pendingStudentMsgAt = null;
		}
		if (m.senderRole === 'student') {
			pendingStudentMsgAt = m.createdAt;
		} else if (m.senderRole === 'landlord' && pendingStudentMsgAt) {
			gaps.push(m.createdAt - pendingStudentMsgAt);
			pendingStudentMsgAt = null;
		}
	}

	if (!gaps.length) return 'Normal';
	const avgHours = (gaps.reduce((a, b) => a + b, 0) / gaps.length) / (1000 * 60 * 60);
	if (avgHours <= 1) return 'Fast Response';
	if (avgHours <= 6) return 'Normal Response';
	return 'Slow Response';
};

// ── GET A LANDLORD'S PUBLIC LISTINGS ──────────────────────
export const getLandlordPublicListings = async (req, res) => {
	try {
		const listings = await Listing.find({
			landlord: req.params.landlordId,
			available: true,
			flagged: false,
		})
			.sort({ createdAt: -1 })
			.select('-__v');

		const [ratingAgg] = await Review.aggregate([
			{ $match: { landlord: new mongoose.Types.ObjectId(req.params.landlordId) } },
			{ $group: { _id: '$landlord', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
		]);

		const responseLabel = await getLandlordResponseLabel(req.params.landlordId);

		res.status(200).json({
			listings,
			total: listings.length,
			rating: ratingAgg ? Math.round(ratingAgg.avg * 10) / 10 : 0,
			totalReviews: ratingAgg ? ratingAgg.count : 0,
			responseLabel,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};