/**
 * Budget and Affordability Calculator
 */

/**
 * Calculate total move-in cost
 */
export const calculateMoveInCost = (property) => {
	if (!property) return 0;

	const costs = {
		rent: property.price || 0,
		agencyFee: property.agencyFee || 0,
		agreementFee: property.agreementFee || 0,
		cautionFee: property.cautionFee || property.price || 0, // Usually 1 month's rent
		serviceCharge: property.serviceCharge || 0,
		otherCharges: property.otherCharges || 0,
	};

	const total = Object.values(costs).reduce((a, b) => a + b, 0);

	return {
		breakdown: costs,
		total,
		formatted: `₦${total.toLocaleString()}`,
	};
};

/**
 * Calculate monthly expenses
 */
export const calculateMonthlyExpenses = (property, studentBudget = {}) => {
	const defaults = {
		food: 40000,
		transport: 10000,
		utilities: 5000,
		miscellaneous: 5000,
		entertainment: 3000,
		books: 2000,
	};

	const expenses = {
		rent: property?.price || 0,
		food: studentBudget.food || defaults.food,
		transport: studentBudget.transport || defaults.transport,
		utilities: studentBudget.utilities || defaults.utilities,
		miscellaneous: studentBudget.miscellaneous || defaults.miscellaneous,
		entertainment: studentBudget.entertainment || defaults.entertainment,
		books: studentBudget.books || defaults.books,
	};

	const total = Object.values(expenses).reduce((a, b) => a + b, 0);

	return {
		breakdown: expenses,
		total,
		formatted: `₦${total.toLocaleString()}`,
	};
};

/**
 * Analyze affordability for a student's budget
 */
export const analyzeAffordability = (property, monthlyBudget, customExpenses = {}) => {
	const monthlyExpenses = calculateMonthlyExpenses(property, customExpenses);
	const remaining = monthlyBudget - monthlyExpenses.total;
	const rentPercentage = (property.price / monthlyBudget * 100).toFixed(1);

	// Determine affordability status
	let status = 'Comfortable Budget';
	let statusIcon = '';
	let statusColor = 'green';
	let recommendation = 'This property is affordable for your budget.';

	if (remaining < 0) {
		status = 'Over Budget';
		statusIcon = '';
		statusColor = 'red';
		recommendation = 'This property exceeds your budget. Consider other options.';
	} else if (remaining < 5000) {
		status = 'Tight Budget';
		statusIcon = '';
		statusColor = 'amber';
		recommendation = 'Little buffer for emergencies. Consider a cheaper option if possible.';
	} else if (remaining < 10000) {
		status = 'Managed Budget';
		statusIcon = '';
		statusColor = 'blue';
		recommendation = 'Budget is tight but manageable. Save carefully for emergencies.';
	}

	return {
		budget: monthlyBudget,
		expenses: monthlyExpenses,
		remaining: Math.max(0, remaining),
		remainingFormatted: `₦${Math.max(0, remaining).toLocaleString()}`,
		rentPercentage: parseFloat(rentPercentage),
		status,
		statusIcon,
		statusColor,
		recommendation,
		breakdown: monthlyExpenses.breakdown,
		isAffordable: remaining >= 0,
		comfortLevel: calculateComfortLevel(remaining, monthlyBudget),
	};
};

/**
 * Calculate comfort level (how much buffer exists)
 */
const calculateComfortLevel = (remaining, totalBudget) => {
	const percentage = (remaining / totalBudget * 100).toFixed(1);

	if (percentage < 0) return { level: 0, label: 'Unaffordable' };
	if (percentage < 3) return { level: 1, label: 'Extremely Tight' };
	if (percentage < 5) return { level: 2, label: 'Very Tight' };
	if (percentage < 10) return { level: 3, label: 'Tight' };
	if (percentage < 15) return { level: 4, label: 'Managed' };
	if (percentage < 20) return { level: 5, label: 'Comfortable' };
	return { level: 6, label: 'Very Comfortable' };
};

/**
 * Compare affordability across multiple properties
 */
export const compareAffordability = (properties, monthlyBudget) => {
	if (!properties || properties.length === 0) return [];

	const comparisons = properties.map((prop, index) => {
		const affordability = analyzeAffordability(prop, monthlyBudget);

		return {
			index,
			title: prop.title,
			price: prop.price,
			affordability,
			isAffordable: affordability.isAffordable,
			comfortLevel: affordability.comfortLevel.level,
		};
	});

	// Sort by comfort level (highest first)
	return comparisons.sort((a, b) => b.comfortLevel - a.comfortLevel);
};

/**
 * Find the most affordable property
 */
export const findMostAffordable = (properties, monthlyBudget) => {
	const comparisons = compareAffordability(properties, monthlyBudget);

	if (comparisons.length === 0) return null;

	// Prioritize affordable ones first
	const affordable = comparisons.filter(c => c.isAffordable);

	if (affordable.length > 0) {
		return affordable[0]; // First affordable (best comfort level)
	}

	// If none affordable, return least bad
	return comparisons[comparisons.length - 1];
};

/**
 * Calculate how much budget is needed for a property
 */
export const calculateRequiredBudget = (property, customExpenses = {}) => {
	const defaults = {
		food: 40000,
		transport: 10000,
		utilities: 5000,
		miscellaneous: 5000,
		entertainment: 3000,
		books: 2000,
	};

	const expenses = {
		rent: property?.price || 0,
		food: customExpenses.food || defaults.food,
		transport: customExpenses.transport || defaults.transport,
		utilities: customExpenses.utilities || defaults.utilities,
		miscellaneous: customExpenses.miscellaneous || defaults.miscellaneous,
		entertainment: customExpenses.entertainment || defaults.entertainment,
		books: customExpenses.books || defaults.books,
	};

	const total = Object.values(expenses).reduce((a, b) => a + b, 0);

	return {
		requiredBudget: total,
		formatted: `₦${total.toLocaleString()}`,
		breakdown: expenses,
	};
};

/**
 * Get budget recommendation
 */
export const getBudgetRecommendation = (property) => {
	if (!property || !property.price) return null;

	const minSafeBuffer = property.price * 0.1; // 10% of rent as buffer
	const recommendedBudget = calculateRequiredBudget(property).requiredBudget + minSafeBuffer;

	return {
		property: property.title,
		minimumBudget: calculateRequiredBudget(property).requiredBudget,
		recommendedBudget: Math.round(recommendedBudget),
		recommendedFormatted: `₦${Math.round(recommendedBudget).toLocaleString()}`,
		safeBuffer: Math.round(minSafeBuffer),
		message: `We recommend a monthly budget of ₦${Math.round(recommendedBudget).toLocaleString()} to comfortably afford this property.`,
	};
};
