import { monthlyRent } from './price';
import { estimateCommute, GENERIC_TRANSPORT } from './commute';

const has = (listing, key) => listing.amenities?.some((a) => a.toLowerCase() === key);

// Every rent threshold below is expressed PER MONTH, so a listing priced
// annually must be converted first or it scores as twelve times too expensive.

/**
 * Auto-generated "Property Insights" paragraph — pure template string, no AI needed.
 */
export const generatePropertyInsight = (listing) => {
	const vibe = has(listing, 'security') ? 'secure and study-friendly'
		: has(listing, 'wifi') ? 'connected and convenient'
		: 'quiet';

	const featured = ['electricity', 'water', 'wifi', 'security', 'parking', 'kitchen']
		.filter((key) => has(listing, key));
	const highlights = featured.slice(0, 3).map((key) => (
		key === 'electricity' ? 'reliable electricity' :
		key === 'water' ? 'water supply' :
		key === 'wifi' ? 'WiFi' :
		key === 'security' ? 'security' :
		key === 'parking' ? 'parking' : 'a kitchen'
	));

	const amenityClause = highlights.length
		? `With ${highlights.join(', ')}, it offers a balanced experience for both academic and personal needs.`
		: 'It offers a straightforward base for both academic and personal needs.';

	const availabilityClause = listing.available
		? 'this property is currently available for immediate move-in'
		: 'this property is currently unavailable, but worth watching for a future opening';

	return `This ${listing.roomType} is ideal for SIWES students seeking a ${vibe} living environment. ${amenityClause} Located in ${listing.area}, ${listing.city}, ${availabilityClause}.`;
};

/**
 * Estimated monthly living cost — rent is exact, everything else is a clearly-labeled estimate.
 */
export const estimateDetailPageCost = (listing, placement = null) => {
	// Rent must be normalised to a monthly figure — a listing priced annually
	// would otherwise inflate this whole estimate twelvefold.
	const rent = Math.round(monthlyRent(listing));
	const electricity = has(listing, 'electricity') ? 3500 : 8000;
	const water = has(listing, 'water') ? 1500 : 2500;
	const internetIncluded = has(listing, 'wifi');
	const internet = internetIncluded ? 0 : 5000;

	// Transport used to be a flat ₦12,000 for every listing in the country,
	// which made the one cost that genuinely varies by location the one cost we
	// ignored. When the student has told us where they're training, price the
	// actual journey instead.
	const commute = placement ? estimateCommute(placement.distanceKm) : null;
	const transport = commute ? commute.monthlyCost : GENERIC_TRANSPORT;

	return {
		rent,
		electricity,
		water,
		internetIncluded,
		internet,
		transport,
		commute,                       // null when we don't know the placement
		transportIsEstimate: !commute, // lets the UI admit it's a generic figure
		total: rent + electricity + water + internet + transport,
	};
};

/**
 * Property Score — overall quality signal (not personalized, unlike Compare's weighted score).
 */
export const calculatePropertyScore = (listing) => {
	const rentPerMonth = monthlyRent(listing);
	const affordability = rentPerMonth <= 40000 ? 95
		: rentPerMonth <= 70000 ? 82
		: rentPerMonth <= 120000 ? 65
		: 45;
	const security = has(listing, 'security') ? 95 : 60;
	const comfort = (listing.furnished ? 20 : 0) + (has(listing, 'water') ? 10 : 0) + 60;
	const amenities = Math.min(100, Math.round(((listing.amenities?.length || 0) / 8) * 100));
	const landlordTrust = listing.landlord?.verified ? 100 : 40;

	const overall = Math.round(
		(affordability * 0.25) +
		(security * 0.20) +
		(comfort * 0.20) +
		(amenities * 0.20) +
		(landlordTrust * 0.15)
	);

	return { affordability, security, comfort: Math.min(comfort, 100), amenities, landlordTrust, overall };
};

/**
 * Student Suitability Index — the same underlying facts, scored from a SIWES student's perspective.
 */
export const calculateSuitabilityIndex = (listing, placement = null) => {
	const academicEnvironment = Math.min(100,
		60 + (has(listing, 'wifi') ? 20 : 0) + (has(listing, 'electricity') ? 15 : 0)
		+ (listing.environment?.noiseLevel === 'quiet' ? 5 : 0));

	const internetReliability = listing.utilities?.internetType === 'Fibre' ? 95
		: has(listing, 'wifi') ? 75
		: 30;

	// Transportation used to be `parking ? 85 : 70` — a listing scored well on
	// TRANSPORT because it had a parking space, regardless of where it was or how
	// far the student would travel. When we know the commute, score the commute;
	// only fall back to the amenity guess when we genuinely don't.
	const commute = placement ? estimateCommute(placement.distanceKm) : null;
	const transportation = commute
		? ({ excellent: 95, good: 82, fair: 62, far: 35 })[commute.band]
		: has(listing, 'parking') ? 85 : 70;

	const security = Math.min(100, 50 + (has(listing, 'security') ? 40 : 0) + (listing.landlord?.verified ? 10 : 0));

	const cityAverage = 60000;
	const rentPerMonth = monthlyRent(listing);
	const affordability = rentPerMonth <= cityAverage * 0.7 ? 95
		: rentPerMonth <= cityAverage ? 80
		: rentPerMonth <= cityAverage * 1.5 ? 65
		: 45;

	const comfort = Math.min(100,
		60 + (listing.furnished ? 20 : 0) + (has(listing, 'water') ? 10 : 0)
		+ (listing.environment?.ventilation === 'excellent' ? 10 : 0));

	const overall = Math.round(
		(academicEnvironment + internetReliability + transportation + security + affordability + comfort) / 6
	);

	return { academicEnvironment, internetReliability, transportation, security, affordability, comfort, overall };
};

/**
 * "Why Students Choose This" — auto-generated reasons, capped at 6.
 */
export const generateWhyStudentsChooseThis = (listing) => {
	const reasons = [];
	if (has(listing, 'electricity')) reasons.push('Reliable Electricity Supply');
	if (has(listing, 'wifi')) reasons.push('High-Speed WiFi Included');
	if (has(listing, 'parking')) reasons.push('Dedicated Parking Space');
	if (listing.landlord?.verified) reasons.push('Verified Landlord');
	if (listing.available) reasons.push('Immediate Move-in Available');
	if (listing.furnished) reasons.push('Fully Furnished');
	if (has(listing, 'security')) reasons.push('24/7 Security');
	if (has(listing, 'water')) reasons.push('Reliable Water Supply');
	return reasons.slice(0, 6);
};

/**
 * "Suitable For" tags.
 */
export const generateSuitableFor = (listing) => {
	const suitableFor = ['SIWES Students'];
	if (has(listing, 'wifi')) suitableFor.push('Remote Workers');
	if (monthlyRent(listing) < 50000) suitableFor.push('Budget Students');
	if (listing.furnished) suitableFor.push('Short-stay Interns');
	if (has(listing, 'parking')) suitableFor.push('Car Owners');
	suitableFor.push('NYSC Members', 'Young Professionals');
	return suitableFor;
};

/**
 * Student Tip — static, template-generated per city/area.
 */
export const generateStudentTip = (listing) => {
	return `Properties in ${listing.area} are generally student-friendly and well-connected to nearby commercial areas of ${listing.city}. When visiting, ask the landlord about generator availability during power outages and confirm the water source. Always inspect the property before making any payment.`;
};
