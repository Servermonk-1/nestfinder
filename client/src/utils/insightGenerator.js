/**
 * NestFinder Insight Generator
 * Creates trade-off analysis and decision insights
 */

/**
 * Generate property strengths
 */
export const generatePropertyStrengths = (property, allListings) => {
	const strengths = [];

	// Price advantage
	const prices = allListings.map(l => l.price || Infinity);
	const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

	if (property.price && property.price < avgPrice) {
		const saving = ((avgPrice - property.price) / avgPrice * 100).toFixed(0);
		strengths.push({
			icon: '',
			text: `${saving}% cheaper than average`,
		});
	}

	// Amenities
	if (property.amenities && property.amenities.length >= 5) {
		strengths.push({
			icon: '',
			text: `${property.amenities.length} amenities included`,
		});
	}

	// Verified landlord
	if (property.landlord?.verified) {
		strengths.push({
			icon: '',
			text: 'Verified landlord',
		});
	}

	// High rating
	if (property.averageRating && property.averageRating >= 4.5) {
		strengths.push({
			icon: '',
			text: `Highly rated (${property.averageRating}/5 stars)`,
		});
	}

	// Available
	if (property.available) {
		strengths.push({
			icon: '',
			text: 'Available now',
		});
	}

	// Close to school
	if (property.distanceToSchool && property.distanceToSchool < 1) {
		strengths.push({
			icon: '',
			text: 'Close to school',
		});
	}

	return strengths;
};

/**
 * Generate property weaknesses
 */
export const generatePropertyWeaknesses = (property, allListings) => {
	const weaknesses = [];

	// Price disadvantage
	const prices = allListings.map(l => l.price || 0).filter(p => p > 0);
	const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

	if (property.price && property.price > avgPrice * 1.2) {
		const markup = ((property.price - avgPrice) / avgPrice * 100).toFixed(0);
		weaknesses.push({
			icon: '',
			text: `${markup}% more expensive than average`,
		});
	}

	// Limited amenities
	if (!property.amenities || property.amenities.length < 3) {
		weaknesses.push({
			icon: '',
			text: 'Limited amenities',
		});
	}

	// Unverified landlord
	if (!property.landlord?.verified) {
		weaknesses.push({
			icon: '',
			text: 'Landlord not yet verified',
		});
	}

	// Low rating
	if (property.averageRating && property.averageRating < 3.5) {
		weaknesses.push({
			icon: '',
			text: `Low rating (${property.averageRating}/5 stars)`,
		});
	}

	// Not available soon
	if (!property.available) {
		const availableDate = property.availableFrom ? new Date(property.availableFrom).toLocaleDateString() : 'TBD';
		weaknesses.push({
			icon: '',
			text: `Not available until ${availableDate}`,
		});
	}

	// Far from school
	if (property.distanceToSchool && property.distanceToSchool > 3) {
		weaknesses.push({
			icon: '',
			text: `${property.distanceToSchool}km from school`,
		});
	}

	// No reviews
	if (!property.reviews || property.reviews.length === 0) {
		weaknesses.push({
			icon: '',
			text: 'No reviews yet',
		});
	}

	return weaknesses;
};

/**
 * Generate comparison insights
 */
export const generateComparisonInsights = (listings) => {
	if (!listings || listings.length < 2) return [];

	const insights = [];

	// Price spread
	const prices = listings.map(l => l.price || 0).filter(p => p > 0);
	const minPrice = Math.min(...prices);
	const maxPrice = Math.max(...prices);
	const spread = ((maxPrice - minPrice) / minPrice * 100).toFixed(0);

	if (spread > 20) {
		insights.push({
			type: 'price-spread',
			icon: '',
			title: 'Price Variation',
			text: `Price varies by ${spread}% across properties (₦${minPrice.toLocaleString()} - ₦${maxPrice.toLocaleString()})`,
		});
	}

	// Amenities comparison
	const amenityCounts = listings.map(l => l.amenities?.length || 0);
	const maxAmenities = Math.max(...amenityCounts);
	const minAmenities = Math.min(...amenityCounts);

	if (maxAmenities - minAmenities >= 3) {
		insights.push({
			type: 'amenities-gap',
			icon: '',
			title: 'Feature Gap',
			text: `Best-equipped property has ${maxAmenities - minAmenities} more amenities than least-equipped`,
		});
	}

	// Verification status
	const verifiedCount = listings.filter(l => l.landlord?.verified).length;
	const unverifiedCount = listings.length - verifiedCount;

	if (unverifiedCount > 0) {
		insights.push({
			type: 'verification',
			icon: '',
			title: 'Verification Status',
			text: `${verifiedCount} of ${listings.length} landlords are verified`,
		});
	}

	// Availability
	const availableCount = listings.filter(l => l.available).length;

	if (availableCount < listings.length) {
		insights.push({
			type: 'availability',
			icon: '',
			title: 'Availability Notice',
			text: `Only ${availableCount} of ${listings.length} properties available immediately`,
		});
	}

	// Location diversity
	const uniqueAreas = new Set(listings.map(l => l.area).filter(Boolean)).size;

	if (uniqueAreas === listings.length) {
		insights.push({
			type: 'location-diversity',
			icon: '',
			title: 'Diverse Locations',
			text: 'Properties are spread across different areas',
		});
	}

	return insights;
};

/**
 * Generate affordability summary
 */
export const generateAffordabilitySummary = (property, monthlyBudget) => {
	if (!property || !monthlyBudget) return null;

	const rent = property.price || 0;
	const utilityEstimate = 5000; // Estimated utilities
	const foodEstimate = 40000; // Estimated food
	const transportEstimate = 10000; // Estimated transport

	const totalMonthlyExpense = rent + utilityEstimate + foodEstimate + transportEstimate;
	const remaining = monthlyBudget - totalMonthlyExpense;
	const percentageOfBudget = (rent / monthlyBudget * 100).toFixed(1);

	let status = 'Comfortable Budget';
	let statusIcon = '';
	let color = 'green';

	if (remaining < 5000) {
		status = 'Tight Budget';
		statusIcon = '';
		color = 'amber';
	}

	if (remaining < 0) {
		status = 'Over Budget';
		statusIcon = '';
		color = 'red';
	}

	return {
		rent,
		utilities: utilityEstimate,
		food: foodEstimate,
		transport: transportEstimate,
		total: totalMonthlyExpense,
		remaining,
		budget: monthlyBudget,
		percentageOfBudget: parseFloat(percentageOfBudget),
		status,
		statusIcon,
		color,
		breakdown: [
			{ label: 'Rent', amount: rent, percentage: (rent / monthlyBudget * 100).toFixed(1) },
			{ label: 'Food', amount: foodEstimate, percentage: (foodEstimate / monthlyBudget * 100).toFixed(1) },
			{ label: 'Transport', amount: transportEstimate, percentage: (transportEstimate / monthlyBudget * 100).toFixed(1) },
			{ label: 'Utilities', amount: utilityEstimate, percentage: (utilityEstimate / monthlyBudget * 100).toFixed(1) },
			{ label: 'Remaining', amount: Math.max(0, remaining), percentage: (Math.max(0, remaining) / monthlyBudget * 100).toFixed(1) },
		],
	};
};

/**
 * Generate commute summary
 */
export const generateCommuteSummary = (property, school) => {
	if (!property || !school) return null;

	const distance = property.distanceToSchool || 0;

	// Estimate commute times
	const commuteTimes = {
		walk: distance > 2 ? null : Math.round(distance * 12), // 12 mins per km
		bicycle: Math.round(distance * 3), // 3 mins per km
		publicTransport: Math.round(distance * 1.5 + 3), // 1.5 mins per km + waiting
		drive: Math.round(distance * 1.2), // 1.2 mins per km
	};

	return {
		distance,
		distanceFormatted: `${distance.toFixed(1)} km`,
		school,
		commuteTimes,
		accessibility: {
			walk: distance <= 2,
			bicycle: true,
			publicTransport: true,
			drive: true,
		},
	};
};

/**
 * Generate market comparison
 */
export const generateMarketComparison = (property, marketAverage) => {
	if (!property || !marketAverage) return null;

	const diff = property.price - marketAverage;
	const percentDiff = (diff / marketAverage * 100).toFixed(1);
	const status = diff < 0 ? 'Below Market' : 'Above Market';
	const statusIcon = diff < 0 ? '' : '';

	return {
		propertyPrice: property.price,
		marketAverage,
		difference: Math.abs(diff),
		percentDifference: Math.abs(parseFloat(percentDiff)),
		status,
		statusIcon,
		message: `${Math.abs(percentDiff)}% ${diff < 0 ? 'below' : 'above'} market average`,
	};
};
