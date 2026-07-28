/**
 * NestFinder Smart Compare Scoring System
 * 10-Factor Intelligent Scoring Algorithm
 * 
 * Factors:
 * - Price Score (30%) - Lower price = higher score
 * - Amenity Score (25%) - More amenities = higher score
 * - Verification Score (20%) - Verified landlord = full points
 * - Availability Score (15%) - Available = full points
 * - Location Score (10%) - Has specific area = full points
 */

export const DEFAULT_WEIGHTS = { price: 70, amenities: 60, trust: 80, availability: 90 };

const dimensionScores = (listing, allListings) => {
	const prices = allListings.map((l) => l.price || 0).filter((p) => p > 0);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	const priceScore = maxPrice === minPrice || !listing.price
		? 100
		: ((maxPrice - listing.price) / (maxPrice - minPrice)) * 100;

	const maxAmenities = Math.max(...allListings.map((l) => l.amenities?.length || 0));
	const amenityScore = maxAmenities > 0 ? ((listing.amenities?.length || 0) / maxAmenities) * 100 : 0;

	const trustScore = listing.landlord?.verified ? 100 : 30;
	const availabilityScore = listing.available ? 100 : 0;
	const locationScore = listing.area && listing.city ? 100 : 50;
	const securityScore = listing.amenities?.some((a) => a.toLowerCase() === 'security') ? 100 : 0;

	return { priceScore, amenityScore, trustScore, availabilityScore, locationScore, securityScore };
};

/**
 * Personalized weighted score — student-adjustable priority sliders (0-100)
 * scale how much each dimension counts on top of its fixed category weight.
 */
export const calculateWeightedScore = (listing, allListings, weights = DEFAULT_WEIGHTS) => {
	if (!listing || !allListings || allListings.length === 0) return 0;

	const { priceScore, amenityScore, trustScore, availabilityScore, locationScore } = dimensionScores(listing, allListings);

	const final =
		(priceScore * (weights.price / 100)) * 0.35 +
		(amenityScore * (weights.amenities / 100)) * 0.25 +
		(trustScore * (weights.trust / 100)) * 0.20 +
		(availabilityScore * (weights.availability / 100)) * 0.10 +
		(locationScore * 1) * 0.10;

	return Math.round(final);
};

export const getDimensionScores = dimensionScores;

export const calculateScore = (listing, allListings) => {
	if (!listing || !allListings || allListings.length === 0) return 0;

	// Extract price values
	const prices = allListings.map(l => l.price || 0).filter(p => p > 0);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);

	// 1. PRICE SCORE (30 points) - Lower price = better
	const priceScore = (() => {
		if (maxPrice === minPrice) return 30; // All same price
		if (!listing.price) return 0;
		const normalizedPrice = (maxPrice - listing.price) / (maxPrice - minPrice);
		return Math.round(normalizedPrice * 30);
	})();

	// 2. AMENITY SCORE (25 points) - More amenities = better
	const amenitiesCount = listing.amenities?.length || 0;
	const maxAmenities = Math.max(...allListings.map(l => l.amenities?.length || 0));
	const amenityScore = maxAmenities > 0
		? Math.round((amenitiesCount / maxAmenities) * 25)
		: 0;

	// 3. VERIFICATION SCORE (20 points) - Verified landlord = full score
	const verifiedScore = listing.landlord?.verified ? 20 : 0;

	// 4. AVAILABILITY SCORE (15 points) - Available = full score
	const availableScore = listing.available ? 15 : 0;

	// 5. LOCATION SCORE (10 points) - Has specific area = full score
	const locationScore = listing.area ? 10 : 0;

	// Calculate total before deductions
	const baseScore = priceScore + amenityScore + verifiedScore + availableScore + locationScore;

	// DEDUCTIONS for missing critical data
	let deductions = 0;

	// Missing reviews (up to -5 points)
	if (!listing.reviews || listing.reviews.length === 0) {
		deductions += 5;
	}

	// Missing contact info (up to -3 points)
	if (!listing.landlord?.phone || !listing.landlord?.email) {
		deductions += 3;
	}

	// Incomplete amenities list (up to -2 points)
	if (!listing.amenities || listing.amenities.length === 0) {
		deductions += 2;
	}

	// Calculate final score
	const finalScore = Math.max(0, baseScore - deductions);

	return Math.round(finalScore);
};

/**
 * Get match percentage - how well property matches student priorities
 */
export const calculateMatchPercentage = (listing, preferences = {}) => {
	if (!listing || !preferences) return 50;

	let matchScore = 0;
	let totalWeight = 0;

	// Define preference categories and their checks
	const priorityChecks = {
		lowestPrice: (l) => l.price && l.price < 50000,
		security: (l) => l.amenities?.includes('Security') || l.amenities?.includes('CCTV'),
		electricity: (l) => l.amenities?.includes('Electricity'),
		water: (l) => l.amenities?.includes('Water'),
		wifi: (l) => l.amenities?.includes('WiFi'),
		parking: (l) => l.amenities?.includes('Parking'),
		kitchen: (l) => l.amenities?.includes('Kitchen'),
		verifiedLandlord: (l) => l.landlord?.verified,
		closeToSchool: (l) => l.distanceToSchool && l.distanceToSchool < 2,
		largeRoom: (l) => l.size && l.size > 1000,
		available: (l) => l.available,
		quietEnvironment: (l) => l.amenities?.includes('Quiet') || l.amenities?.includes('Soundproof'),
		fastInternet: (l) => l.amenities?.includes('WiFi') || l.amenities?.includes('Fast Internet'),
	};

	// Calculate match based on preferences
	Object.entries(preferences).forEach(([key, isSelected]) => {
		if (isSelected && priorityChecks[key]) {
			totalWeight += 1;
			if (priorityChecks[key](listing)) {
				matchScore += 1;
			}
		}
	});

	if (totalWeight === 0) return 50; // Default if no preferences

	return Math.round((matchScore / totalWeight) * 100);
};

/**
 * Get score badge with category
 */
export const getScoreBadge = (score) => {
	if (score >= 80) return { badge: 'Excellent', label: 'Excellent Match', category: 'excellent' };
	if (score >= 60) return { badge: 'Very Good', label: 'Very Good Match', category: 'veryGood' };
	if (score >= 40) return { badge: 'Good', label: 'Good Match', category: 'good' };
	if (score >= 0) return { badge: 'Fair', label: 'Fair Match', category: 'fair' };
	return { badge: 'Poor', label: 'Poor Match', category: 'poor' };
};

/**
 * Determine winner across multiple listings
 */
export const findWinner = (listings) => {
	if (!listings || listings.length === 0) return null;

	let maxScore = -1;
	let winnerIndex = -1;

	listings.forEach((listing, index) => {
		const score = listing.score || 0;
		if (score > maxScore) {
			maxScore = score;
			winnerIndex = index;
		}
	});

	return winnerIndex >= 0 ? winnerIndex : null;
};

/**
 * Find cheapest property
 */
export const findCheapest = (listings) => {
	if (!listings || listings.length === 0) return null;

	return listings.reduce((cheapest, current) => {
		return (current.price || Infinity) < (cheapest.price || Infinity) ? current : cheapest;
	}, listings[0]);
};

/**
 * Find most amenities
 */
export const findMostAmenities = (listings) => {
	if (!listings || listings.length === 0) return null;

	return listings.reduce((most, current) => {
		const currentCount = current.amenities?.length || 0;
		const mostCount = most.amenities?.length || 0;
		return currentCount > mostCount ? current : most;
	}, listings[0]);
};

/**
 * Compare two listings for trade-off insights
 */
export const generateTradeOffInsights = (listings) => {
	if (!listings || listings.length < 2) return [];

	const insights = [];

	// Price comparison
	const cheapest = findCheapest(listings);
	const mostExpensive = listings.reduce((most, current) => {
		return (current.price || 0) > (most.price || 0) ? current : most;
	}, listings[0]);

	if (cheapest && mostExpensive && cheapest !== mostExpensive) {
		const priceDiff = ((mostExpensive.price - cheapest.price) / mostExpensive.price * 100).toFixed(0);
		insights.push(`${cheapest.title} is ${priceDiff}% cheaper than ${mostExpensive.title}`);
	}

	// Amenities comparison
	const mostAmenities = findMostAmenities(listings);
	const leastAmenities = listings.reduce((least, current) => {
		const currentCount = current.amenities?.length || 0;
		const leastCount = least.amenities?.length || 0;
		return currentCount < leastCount ? current : least;
	}, listings[0]);

	if (mostAmenities && leastAmenities && mostAmenities !== leastAmenities) {
		const diff = (mostAmenities.amenities?.length || 0) - (leastAmenities.amenities?.length || 0);
		insights.push(`${mostAmenities.title} offers ${diff} more amenities than ${leastAmenities.title}`);
	}

	// Verification comparison
	const verifiedListings = listings.filter(l => l.landlord?.verified);
	const unverifiedListings = listings.filter(l => !l.landlord?.verified);

	if (verifiedListings.length > 0 && unverifiedListings.length > 0) {
		insights.push(`${verifiedListings.length} landlord${verifiedListings.length > 1 ? 's' : ''} verified, ${unverifiedListings.length} unverified`);
	}

	return insights;
};
