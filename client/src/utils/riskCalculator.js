/**
 * NestFinder Risk Analysis Engine
 * Calculates risk score and identifies potential issues
 */

export const calculateRiskScore = (listing) => {
	if (!listing) return 100; // Max risk if no listing

	let riskScore = 0;

	// 1. Unverified landlord (up to +25 risk)
	if (!listing.landlord?.verified) {
		riskScore += 25;
	}

	// 2. Missing critical contact info (up to +20 risk)
	const missingContact = !listing.landlord?.phone || !listing.landlord?.email;
	if (missingContact) {
		riskScore += 20;
	}

	// 3. No reviews (up to +15 risk)
	if (!listing.reviews || listing.reviews.length === 0) {
		riskScore += 15;
	}

	// 4. Incomplete property details (up to +15 risk)
	const incompleteDetails = !listing.amenities || listing.amenities.length === 0 || !listing.area;
	if (incompleteDetails) {
		riskScore += 15;
	}

	// 5. Limited images (up to +10 risk)
	if (!listing.images || listing.images.length < 2) {
		riskScore += 10;
	}

	// 6. No availability info (up to +10 risk)
	if (listing.available === undefined || listing.available === null) {
		riskScore += 10;
	}

	// 7. Landlord account age (newly created = higher risk)
	if (listing.landlord?.accountAge && listing.landlord.accountAge < 3) { // Less than 3 months
		riskScore += 5;
	}

	// Cap risk score at 100
	return Math.min(100, Math.max(0, riskScore));
};

/**
 * Get risk level badge and color
 */
export const getRiskLevel = (riskScore) => {
	if (riskScore <= 30) {
		return {
			level: 'Low Risk',
			color: '#C0903F',
			className: 'bg-primary/10 border-primary/20 text-primary-ink',
		};
	}

	if (riskScore <= 60) {
		return {
			level: 'Medium Risk',
			color: '#D9A54C',
			className: 'bg-highlight/10 border-highlight/20 text-highlight',
		};
	}

	return {
		level: 'High Risk',
		color: '#C1503A',
		className: 'bg-danger/10 border-danger/20 text-danger-ink',
	};
};

/**
 * Identify specific risk factors
 */
export const identifyRiskFactors = (listing) => {
	const factors = [];

	if (!listing.landlord?.verified) {
		factors.push({
			type: 'unverified-landlord',
			message: 'Landlord not yet verified',
			severity: 'high',
		});
	}

	if (!listing.landlord?.phone) {
		factors.push({
			type: 'missing-phone',
			message: 'Phone number not provided',
			severity: 'high',
		});
	}

	if (!listing.landlord?.email) {
		factors.push({
			type: 'missing-email',
			message: 'Email address not provided',
			severity: 'high',
		});
	}

	if (!listing.reviews || listing.reviews.length === 0) {
		factors.push({
			type: 'no-reviews',
			message: 'No student reviews yet',
			severity: 'medium',
		});
	}

	if (!listing.amenities || listing.amenities.length === 0) {
		factors.push({
			type: 'incomplete-amenities',
			message: 'Amenities list incomplete',
			severity: 'medium',
		});
	}

	if (!listing.images || listing.images.length < 3) {
		factors.push({
			type: 'limited-images',
			message: `Only ${listing.images?.length || 0} image(s) provided`,
			severity: 'low',
		});
	}

	if (!listing.area) {
		factors.push({
			type: 'missing-area',
			message: 'Specific area not specified',
			severity: 'low',
		});
	}

	if (listing.landlord?.accountAge && listing.landlord.accountAge < 1) {
		factors.push({
			type: 'new-account',
			message: 'Account recently created',
			severity: 'medium',
		});
	}

	return factors;
};

/**
 * Get risk recommendation
 */
export const getRiskRecommendation = (riskScore) => {
	if (riskScore <= 20) {
		return 'Safe to proceed. Contact landlord for more details.';
	}

	if (riskScore <= 40) {
		return 'Verify landlord details before proceeding. Ask for references.';
	}

	if (riskScore <= 60) {
		return 'Request additional information and reviews from landlord before deciding.';
	}

	return 'High risk. Strongly recommend getting more information and verification before proceeding.';
};

/**
 * Compare risks between multiple listings
 */
export const compareRisks = (listings) => {
	if (!listings || listings.length === 0) return null;

	const risks = listings.map((listing, index) => ({
		index,
		title: listing.title,
		riskScore: calculateRiskScore(listing),
		riskLevel: getRiskLevel(calculateRiskScore(listing)).level,
	}));

	// Find safest
	const safest = risks.reduce((min, current) =>
		current.riskScore < min.riskScore ? current : min
	);

	// Find riskiest
	const riskiest = risks.reduce((max, current) =>
		current.riskScore > max.riskScore ? current : max
	);

	return { all: risks, safest, riskiest };
};

