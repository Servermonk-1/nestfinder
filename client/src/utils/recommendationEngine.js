/**
 * NestFinder Recommendation Engine
 * Generates intelligent recommendations and explanations
 */

import { calculateScore, findWinner, findCheapest, findMostAmenities } from './compareScore';
import { calculateRiskScore } from './riskCalculator';

/**
 * Generate primary recommendation
 */
export const generateRecommendation = (listings, studentPreferences = {}) => {
	if (!listings || listings.length === 0) return null;

	// Calculate scores for all listings
	const scoredListings = listings.map((listing, index) => ({
		...listing,
		index,
		score: calculateScore(listing, listings),
		riskScore: calculateRiskScore(listing),
	}));

	// Find winner
	const winnerIndex = findWinner(scoredListings);
	if (winnerIndex === null) return null;

	const winner = scoredListings[winnerIndex];

	// Generate reasons
	const reasons = generateRecommendationReasons(winner, scoredListings, studentPreferences);

	// Calculate confidence
	const confidence = calculateConfidence(winner, scoredListings);

	return {
		property: winner,
		reasons,
		confidence,
		badge: getRecommendationBadge(confidence),
		explanation: buildExplanation(winner, reasons),
	};
};

/**
 * Generate reasons why property is recommended
 */
const generateRecommendationReasons = (property, allListings, preferences) => {
	const reasons = [];

	// Check if lowest price
	const cheapest = findCheapest(allListings);
	if (property === cheapest) {
		reasons.push({
			icon: '',
			text: 'Lowest monthly rent',
			priority: 1,
		});
	}

	// Check if lowest total cost (with move-in)
	const lowestTotal = allListings.reduce((min, current) => {
		const currentTotal = (current.price || 0) + (current.moveInCost || 0);
		const minTotal = (min.price || 0) + (min.moveInCost || 0);
		return currentTotal < minTotal ? current : min;
	}, allListings[0]);

	if (property === lowestTotal && property !== cheapest) {
		reasons.push({
			icon: '',
			text: 'Lowest total cost',
			priority: 1,
		});
	}

	// Check if verified landlord
	if (property.landlord?.verified) {
		reasons.push({
			icon: '',
			text: 'Verified landlord',
			priority: 2,
		});
	}

	// Check if most amenities
	const mostAmenities = findMostAmenities(allListings);
	if (property === mostAmenities && (property.amenities?.length || 0) > 5) {
		reasons.push({
			icon: '',
			text: `${property.amenities?.length || 0} amenities included`,
			priority: 2,
		});
	}

	// Check proximity to school
	if (property.distanceToSchool && property.distanceToSchool < 1) {
		reasons.push({
			icon: '',
			text: 'Close to school',
			priority: 3,
		});
	}

	// Check high rating
	if (property.averageRating && property.averageRating >= 4.5) {
		reasons.push({
			icon: '',
			text: `Highly rated (${property.averageRating}/5)`,
			priority: 3,
		});
	}

	// Check availability
	if (property.available) {
		reasons.push({
			icon: '',
			text: 'Available now',
			priority: 4,
		});
	}

	// Sort by priority and return top 4
	return reasons.sort((a, b) => a.priority - b.priority).slice(0, 4);
};

/**
 * Calculate recommendation confidence
 */
const calculateConfidence = (property, allListings) => {
	let confidence = 80; // Base confidence

	// Increase if significantly higher score
	const otherScores = allListings
		.filter(l => l !== property)
		.map(l => l.score);

	if (otherScores.length > 0) {
		const maxOther = Math.max(...otherScores);
		const scoreDiff = property.score - maxOther;

		if (scoreDiff > 15) confidence += 12;
		else if (scoreDiff > 10) confidence += 8;
		else if (scoreDiff > 5) confidence += 4;
		else if (scoreDiff <= 2) confidence -= 10;
	}

	// Decrease if low risk score (high number)
	if (property.riskScore > 50) confidence -= 15;
	else if (property.riskScore > 30) confidence -= 8;

	// Decrease if no reviews
	if (!property.reviews || property.reviews.length === 0) confidence -= 5;

	return Math.max(50, Math.min(99, confidence));
};

/**
 * Get recommendation badge
 */
const getRecommendationBadge = (confidence) => {
	if (confidence >= 90) return 'Highly Recommended';
	if (confidence >= 80) return 'Recommended';
	if (confidence >= 70) return 'Good Option';
	return 'Consider Carefully';
};

/**
 * Build explanation text
 */
const buildExplanation = (property, reasons) => {
	let explanation = `Based on our intelligent analysis, we recommend ${property.title}. `;

	if (reasons.length === 0) {
		return explanation + 'This property has a strong overall score.';
	}

	explanation += 'Here\'s why: ';
	explanation += reasons.map(r => r.text).join(', ') + '.';

	return explanation;
};

/**
 * Generate multi-property insights
 */
export const generateMultiPropertyInsights = (listings) => {
	if (!listings || listings.length < 2) return [];

	const insights = [];

	// Best value
	const scoredListings = listings.map(l => ({
		...l,
		score: calculateScore(l, listings),
	}));

	const best = scoredListings.reduce((max, current) =>
		current.score > max.score ? current : max
	);

	insights.push({
		type: 'best-value',
		icon: '',
		title: 'Best Overall Value',
		description: `${best.title} offers the best combination of price, amenities, and landlord verification.`,
		property: best,
	});

	// Cheapest
	const cheapest = findCheapest(listings);
	if (cheapest !== best) {
		insights.push({
			type: 'cheapest',
			icon: '',
			title: 'Most Affordable',
			description: `${cheapest.title} has the lowest monthly rent at ₦${cheapest.price?.toLocaleString()}.`,
			property: cheapest,
		});
	}

	// Most amenities
	const mostAmenities = findMostAmenities(listings);
	if (mostAmenities !== best) {
		insights.push({
			type: 'most-amenities',
			icon: '',
			title: 'Most Features',
			description: `${mostAmenities.title} includes ${mostAmenities.amenities?.length || 0} amenities.`,
			property: mostAmenities,
		});
	}

	// Highest rated
	const highestRated = listings.reduce((max, current) =>
		(current.averageRating || 0) > (max.averageRating || 0) ? current : max
	);

	if (highestRated && (highestRated.averageRating || 0) >= 4.0 && highestRated !== best) {
		insights.push({
			type: 'highest-rated',
			icon: '',
			title: 'Top Rated by Students',
			description: `${highestRated.title} has an average rating of ${highestRated.averageRating}/5 from ${highestRated.reviewCount || 0} students.`,
			property: highestRated,
		});
	}

	return insights;
};

/**
 * Get recommendation for specific criteria
 */
export const getRecommendationFor = (listings, criteria) => {
	if (!listings || listings.length === 0) return null;

	let selected = listings[0];

	switch (criteria) {
		case 'cheapest':
			selected = findCheapest(listings);
			return {
				property: selected,
				reason: `Lowest rent at ₦${selected.price?.toLocaleString()}/month`,
			};

		case 'safest':
			selected = listings.reduce((min, current) => {
				const minRisk = calculateRiskScore(min);
				const currentRisk = calculateRiskScore(current);
				return currentRisk < minRisk ? current : min;
			}, listings[0]);
			return {
				property: selected,
				reason: 'Lowest risk profile with verified landlord and complete information',
			};

		case 'most-amenities':
			selected = findMostAmenities(listings);
			return {
				property: selected,
				reason: `${selected.amenities?.length || 0} amenities included`,
			};

		case 'best-for-students':
			selected = listings.reduce((best, current) => {
				const currentScore = calculateScore(current, listings);
				const bestScore = calculateScore(best, listings);
				return currentScore > bestScore ? current : best;
			}, listings[0]);
			return {
				property: selected,
				reason: 'Best overall match for student needs',
			};

		default:
			return null;
	}
};
