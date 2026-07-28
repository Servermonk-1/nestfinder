/**
 * Fraud Shield — the rule set.
 *
 * Each rule is a pure function of a "context" object, so it can be unit-tested
 * without a database. A rule returns null when it doesn't fire, or
 * { rule, severity, detail } when it does. Severity is the risk weight it
 * contributes (0–100 scale before clamping).
 *
 * Design note: these rules WARN and score — they never silently delete a
 * listing. A high score auto-flags it into the admin moderation queue, where a
 * human decides. Fraud heuristics are wrong often enough that automated
 * deletion would punish honest landlords.
 */

// Phone numbers, emails and messaging handles buried in the description are the
// classic "let's talk off-platform" move that precedes most scams.
const PHONE_RE = /(\+?234|0)[\s-]?[789]\d{1}[\s-]?\d{3}[\s-]?\d{4}/;
const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
const HANDLE_RE = /\b(whats\s?app|whatsapp|telegram|snapchat|instagram|ig[:\s]|dm\s+me|call\s+me\s+on|text\s+me\s+on)\b/i;

const SCAM_PHRASES = [
	/\b(pay|deposit|transfer)\b[^.!?]{0,30}\b(before|first|to\s+(secure|reserve|hold))\b/i,
	/\b(western\s?union|money\s?gram|gift\s?card|bitcoin|crypto|usdt)\b/i,
	/\b(no\s+(inspection|viewing)|can'?t\s+(show|view)|i'?m\s+(abroad|out\s+of\s+the\s+country))\b/i,
	/\b(urgent|hurry|act\s+now|first\s+come\s+first\s+serve|going\s+fast|last\s+(one|room))\b/i,
];

/** 1. Bait pricing — far below what comparable rooms in the same city cost. */
export const priceOutlier = ({ price, medianPrice, comparableCount }) => {
	if (!medianPrice || !comparableCount || comparableCount < 3) return null; // not enough data to judge
	const ratio = price / medianPrice;
	if (ratio >= 0.45) return null;
	return {
		rule: 'price-outlier',
		severity: ratio < 0.3 ? 30 : 20,
		detail: `₦${price?.toLocaleString()} is ${Math.round((1 - ratio) * 100)}% below the local median (₦${Math.round(medianPrice).toLocaleString()}) for ${comparableCount} comparable rooms.`,
	};
};

/** 2. Stolen photos — an image fingerprint already used by a DIFFERENT landlord. */
export const duplicateImages = ({ duplicateImageMatches = [] }) => {
	if (!duplicateImageMatches.length) return null;
	return {
		rule: 'duplicate-images',
		severity: 35,
		detail: `${duplicateImageMatches.length} photo(s) already appear on another landlord's listing.`,
	};
};

/** 3. Copy-pasted listing text (spam farms reuse the same blurb). */
export const duplicateText = ({ duplicateTextMatch }) => {
	if (!duplicateTextMatch) return null;
	return {
		rule: 'duplicate-text',
		severity: 20,
		detail: 'The description is near-identical to another listing already on the platform.',
	};
};

/** 4. The landlord has never passed identity verification. */
export const unverifiedLandlord = ({ landlordVerified }) => {
	if (landlordVerified) return null;
	return {
		rule: 'unverified-landlord',
		severity: 15,
		detail: 'This landlord has not completed identity verification.',
	};
};

/** 5. Contact details in the description — an attempt to move off-platform. */
export const offsiteContact = ({ description = '' }) => {
	const hits = [];
	if (PHONE_RE.test(description)) hits.push('phone number');
	if (EMAIL_RE.test(description)) hits.push('email address');
	if (HANDLE_RE.test(description)) hits.push('messaging handle');
	if (!hits.length) return null;
	return {
		rule: 'offsite-contact',
		severity: 15,
		detail: `The description contains a ${hits.join(' and ')}, pushing students off-platform.`,
	};
};

/** 6. Known scam phrasing in the description. */
export const scamLanguage = ({ description = '', title = '' }) => {
	const text = `${title} ${description}`;
	const matched = SCAM_PHRASES.filter((re) => re.test(text));
	if (!matched.length) return null;
	return {
		rule: 'scam-language',
		severity: Math.min(30, 10 * matched.length),
		detail: `Matched ${matched.length} known scam phrasing pattern(s) (upfront payment, untraceable transfer, no viewing, or false urgency).`,
	};
};

/** 7. A brand-new account posting listings in bulk. */
export const bulkPosting = ({ landlordAgeDays, landlordListingCount }) => {
	if (landlordAgeDays === undefined || landlordListingCount === undefined) return null;
	if (landlordAgeDays > 7 || landlordListingCount < 5) return null;
	return {
		rule: 'bulk-posting',
		severity: 20,
		detail: `${landlordListingCount} listings posted from an account only ${Math.max(0, Math.round(landlordAgeDays))} day(s) old.`,
	};
};

/**
 * 8. The address doesn't belong to the city it claims.
 *
 * A common bait: name a familiar area students search for, but give an address
 * somewhere else entirely. We only judge this when the address itself resolved
 * (a city-level fallback sits ON the city by definition and proves nothing), and
 * only against enough neighbours to establish where that city actually is.
 */
export const locationMismatch = ({ distanceFromCityKm, geocodePrecision, cityListingCount }) => {
	if (geocodePrecision !== 'address') return null;
	if (distanceFromCityKm === null || distanceFromCityKm === undefined) return null;
	if (!cityListingCount || cityListingCount < 3) return null; // not enough data to judge
	if (distanceFromCityKm < 25) return null; // ordinary spread within a Nigerian city
	return {
		rule: 'location-mismatch',
		severity: distanceFromCityKm >= 60 ? 30 : 20,
		detail: `The street address resolves ${distanceFromCityKm}km from other listings in the same stated city.`,
	};
};

export const RULES = [
	priceOutlier,
	duplicateImages,
	duplicateText,
	unverifiedLandlord,
	offsiteContact,
	scamLanguage,
	bulkPosting,
	locationMismatch,
];

// A listing at or above this score is auto-flagged for human review.
export const FLAG_THRESHOLD = 40;

/** Run every rule and turn the hits into a 0–100 risk score. */
export function assessFraud(context) {
	const flags = RULES.map((rule) => rule(context)).filter(Boolean);
	const score = Math.min(100, flags.reduce((sum, f) => sum + f.severity, 0));
	return {
		score,
		flags,
		shouldFlag: score >= FLAG_THRESHOLD,
		level: score >= 70 ? 'high' : score >= FLAG_THRESHOLD ? 'medium' : score > 0 ? 'low' : 'clear',
	};
}
