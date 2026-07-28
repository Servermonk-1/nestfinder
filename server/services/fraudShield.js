import Listing from '../models/Listing.js';
import Landlord from '../models/Landlord.js';
import { assessFraud } from '../utils/fraudRules.js';
import { hashImages, isDuplicate } from '../utils/imageHash.js';
import { distanceKm } from '../utils/geocode.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Normalise text so trivial edits don't defeat duplicate detection. */
const normalise = (s = '') => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Median price of comparable rooms (same city + room type).
 *
 * Critically this EXCLUDES the listing's own landlord: a scammer who floods the
 * market with cheap listings would otherwise drag the median down to their own
 * price and make their bait look perfectly normal. The baseline has to come
 * from other people's listings to mean anything.
 */
async function localPriceContext(listing) {
	const comparables = await Listing.find({
		_id: { $ne: listing._id },
		landlord: { $ne: listing.landlord },
		city: listing.city,
		roomType: listing.roomType,
	}).select('monthlyPrice').lean();

	if (!comparables.length) return { medianPrice: null, comparableCount: 0 };
	// Compare NORMALISED rent. Raw `price` may be annual on one listing and
	// monthly on the next, and mixing them makes an honest ₦15,000/month room
	// look 90% below a median built from yearly figures — a false accusation.
	const prices = comparables.map((c) => c.monthlyPrice).sort((a, b) => a - b);
	const mid = Math.floor(prices.length / 2);
	const medianPrice = prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2;
	return { medianPrice, comparableCount: prices.length };
}

/**
 * How far this listing sits from where its stated city actually is.
 *
 * The reference point is the median position of OTHER landlords' listings in the
 * same city — same reasoning as the price median: a scammer's own listings must
 * not be allowed to define "normal". Median rather than mean so one bad pin
 * can't drag the centre.
 */
async function locationContext(listing) {
	const here = listing.location?.coordinates;
	if (!here || here.length !== 2) return { distanceFromCityKm: null, cityListingCount: 0 };

	const others = await Listing.find({
		_id: { $ne: listing._id },
		landlord: { $ne: listing.landlord },
		city: listing.city,
		'location.coordinates': { $exists: true },
	}).select('location').lean();

	if (others.length < 3) return { distanceFromCityKm: null, cityListingCount: others.length };

	const median = (nums) => {
		const s = [...nums].sort((a, b) => a - b);
		const mid = Math.floor(s.length / 2);
		return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
	};
	const centre = {
		lng: median(others.map((o) => o.location.coordinates[0])),
		lat: median(others.map((o) => o.location.coordinates[1])),
	};

	return {
		distanceFromCityKm: distanceKm({ lat: here[1], lng: here[0] }, centre),
		cityListingCount: others.length,
	};
}

/** Images whose fingerprint already belongs to a DIFFERENT landlord's listing. */
async function findDuplicateImages(listing, hashes) {
	if (!hashes.length) return [];
	const others = await Listing.find({
		_id: { $ne: listing._id },
		landlord: { $ne: listing.landlord },
		imageHashes: { $exists: true, $ne: [] },
	}).select('imageHashes').lean();

	const matches = [];
	for (const h of hashes) {
		const hit = others.find((o) => (o.imageHashes || []).some((oh) => isDuplicate(h, oh)));
		if (hit) matches.push(h);
	}
	return matches;
}

/** A near-identical description already on the platform. */
async function findDuplicateText(listing) {
	const key = normalise(listing.description).slice(0, 160);
	if (key.length < 40) return false;
	const others = await Listing.find({ _id: { $ne: listing._id } }).select('description').lean();
	return others.some((o) => normalise(o.description).slice(0, 160) === key);
}

/**
 * Run the full pipeline for one listing, persist the verdict, and auto-flag it
 * for admin review when the score crosses the threshold.
 */
export async function runFraudShield(listingId) {
	const listing = await Listing.findById(listingId);
	if (!listing) return null;

	const landlord = await Landlord.findById(listing.landlord).select('verified createdAt').lean();

	// Fingerprint the photos once, then reuse for duplicate detection.
	const imageHashes = listing.imageHashes?.length
		? listing.imageHashes
		: await hashImages(listing.images || []);

	const [priceCtx, locationCtx, duplicateImageMatches, duplicateTextMatch, landlordListingCount] = await Promise.all([
		localPriceContext(listing),
		locationContext(listing),
		findDuplicateImages(listing, imageHashes),
		findDuplicateText(listing),
		Listing.countDocuments({ landlord: listing.landlord }),
	]);

	const verdict = assessFraud({
		// Normalised rent — see localPriceContext.
		price: listing.monthlyPrice,
		geocodePrecision: listing.geocodePrecision,
		title: listing.title,
		description: listing.description,
		landlordVerified: Boolean(landlord?.verified),
		landlordAgeDays: landlord?.createdAt ? (Date.now() - new Date(landlord.createdAt)) / DAY_MS : undefined,
		landlordListingCount,
		duplicateImageMatches,
		duplicateTextMatch,
		...priceCtx,
		...locationCtx,
	});

	listing.imageHashes = imageHashes;
	listing.fraudScore = verdict.score;
	listing.fraudLevel = verdict.level;
	listing.fraudFlags = verdict.flags;
	listing.fraudCheckedAt = new Date();
	// Only ever ADD a flag automatically — never clear one an admin set by hand.
	if (verdict.shouldFlag) listing.flagged = true;
	// Don't touch `updatedAt`. It's shown to students as "last updated", so a
	// background re-screen must not make a stale listing look freshly edited.
	await listing.save({ timestamps: false });

	return verdict;
}

/**
 * Landlord trust score (0–100) — a rolled-up signal students can actually read,
 * and admins can sort by. Starts neutral and moves on evidence.
 */
export async function computeTrustScore(landlordId) {
	const landlord = await Landlord.findById(landlordId);
	if (!landlord) return null;

	const listings = await Listing.find({ landlord: landlordId })
		.select('fraudScore flagged reportCount rating totalReviews')
		.lean();

	const ageDays = (Date.now() - new Date(landlord.createdAt)) / DAY_MS;
	const flaggedCount = listings.filter((l) => l.flagged).length;
	const reports = listings.reduce((s, l) => s + (l.reportCount || 0), 0);
	const avgFraud = listings.length
		? listings.reduce((s, l) => s + (l.fraudScore || 0), 0) / listings.length
		: 0;
	const rated = listings.filter((l) => l.totalReviews > 0);
	const avgRating = rated.length ? rated.reduce((s, l) => s + l.rating, 0) / rated.length : null;

	const factors = {
		identityVerified: landlord.verified ? 30 : 0,
		accountAge: Math.min(15, Math.floor(ageDays / 30) * 5),      // +5/month, capped
		reviews: avgRating ? Math.round((avgRating / 5) * 15) : 0,    // up to +15
		fraudPenalty: -Math.round(avgFraud * 0.4),                    // up to -40
		flaggedPenalty: -Math.min(20, flaggedCount * 10),
		reportPenalty: -Math.min(15, reports * 5),
		suspended: landlord.suspended ? -50 : 0,
	};

	const base = 40; // neutral starting point for a brand-new landlord
	const score = Math.max(0, Math.min(100, base + Object.values(factors).reduce((a, b) => a + b, 0)));

	landlord.trustScore = score;
	landlord.trustFactors = factors;
	landlord.trustUpdatedAt = new Date();
	await landlord.save();

	return { score, factors };
}
