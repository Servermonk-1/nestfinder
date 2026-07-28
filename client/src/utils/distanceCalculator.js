/**
 * Distance and Commute Calculator
 * Calculates distance and commute estimates
 */

// Sample schools with coordinates (latitude, longitude)
const SCHOOLS = {
	'University of Ibadan': { lat: 7.4051, lng: 3.8971, name: 'UI' },
	'Abiola Ajimobi Technical University': { lat: 7.3769, lng: 3.8936, name: 'AATU' },
	'Ladoke Akintola University': { lat: 7.2606, lng: 3.7329, name: 'LAUTECH' },
	'Federal Polytechnic Ibadan': { lat: 7.3847, lng: 3.8911, name: 'FPIBD' },
	'Institute of Technology': { lat: 7.3903, lng: 3.9077, name: 'IT' },
};

// Sample areas with coordinates
const AREAS = {
	'Ring Road': { lat: 7.3895, lng: 3.8972, region: 'Ibadan North' },
	'Bodija': { lat: 7.3769, lng: 3.8936, region: 'Ibadan North' },
	'Ikoyi': { lat: 7.3789, lng: 3.9011, region: 'Ibadan North' },
	'Agodi': { lat: 7.3905, lng: 3.8845, region: 'Ibadan Central' },
	'Mokola': { lat: 7.3747, lng: 3.9156, region: 'Ibadan East' },
	'Oluyole': { lat: 7.3811, lng: 3.8912, region: 'Ibadan Central' },
	'Ashi': { lat: 7.3598, lng: 3.9203, region: 'Ibadan East' },
	'Dugbe': { lat: 7.3741, lng: 3.8912, region: 'Ibadan Central' },
	'GRA': { lat: 7.3789, lng: 3.9067, region: 'Ibadan North' },
	'Akobo': { lat: 7.2855, lng: 3.8645, region: 'Ibadan South' },
};

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
	const R = 6371; // Earth's radius in kilometers
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(lat1)) *
		Math.cos(toRad(lat2)) *
		Math.sin(dLon / 2) *
		Math.sin(dLon / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
};

const toRad = (degrees) => {
	return degrees * (Math.PI / 180);
};

/**
 * Calculate distance to school
 */
export const calculateDistanceToSchool = (propertyArea, schoolName) => {
	const area = AREAS[propertyArea];
	const school = SCHOOLS[schoolName];

	if (!area || !school) {
		return {
			distance: null,
			error: 'Area or school not found in database',
		};
	}

	const distance = haversineDistance(area.lat, area.lng, school.lat, school.lng);

	return {
		distance: parseFloat(distance.toFixed(2)),
		distanceFormatted: `${distance.toFixed(1)} km`,
		area: propertyArea,
		school: schoolName,
		valid: true,
	};
};

/**
 * Estimate commute times for different transport modes
 */
export const estimateCommuteTimes = (distanceKm) => {
	if (!distanceKm) return null;

	return {
		walk: distanceKm <= 2 ? Math.round(distanceKm * 12) : null, // 12 mins per km
		bicycle: Math.round(distanceKm * 3), // 3 mins per km
		publicTransport: Math.round(distanceKm * 1.5 + 5), // 1.5 mins per km + 5 mins waiting
		drive: Math.round(distanceKm * 1.2), // 1.2 mins per km
		motorcycle: Math.round(distanceKm * 1.5), // 1.5 mins per km
	};
};

/**
 * Classify distance closeness
 */
export const classifyProximity = (distanceKm) => {
	if (!distanceKm) return 'Unknown';
	if (distanceKm < 0.5) return 'Walking Distance';
	if (distanceKm < 1) return 'Very Close';
	if (distanceKm < 2) return 'Close';
	if (distanceKm < 3) return 'Moderate';
	if (distanceKm < 5) return 'Far';
	return 'Very Far';
};

/**
 * Get all available schools
 */
export const getAvailableSchools = () => {
	return Object.entries(SCHOOLS).map(([name, data]) => ({
		name,
		shortName: data.name,
	}));
};

/**
 * Get all available areas
 */
export const getAvailableAreas = () => {
	return Object.entries(AREAS).map(([name, data]) => ({
		name,
		region: data.region,
	}));
};

/**
 * Find areas closest to school
 */
export const findClosestAreas = (schoolName, limit = 5) => {
	const school = SCHOOLS[schoolName];

	if (!school) return [];

	const distances = Object.entries(AREAS).map(([areaName, areaData]) => ({
		area: areaName,
		distance: parseFloat(haversineDistance(areaData.lat, areaData.lng, school.lat, school.lng).toFixed(2)),
		region: areaData.region,
	}));

	return distances.sort((a, b) => a.distance - b.distance).slice(0, limit);
};

/**
 * Compare distances between multiple properties and school
 */
export const compareDistances = (properties, schoolName) => {
	if (!properties || !schoolName) return [];

	const comparisons = properties.map((prop, index) => {
		const distanceData = calculateDistanceToSchool(prop.area, schoolName);

		return {
			index,
			title: prop.title,
			area: prop.area,
			distance: distanceData.distance,
			distanceFormatted: distanceData.distanceFormatted,
			commuteTimes: estimateCommuteTimes(distanceData.distance),
			proximity: classifyProximity(distanceData.distance),
		};
	});

	// Sort by distance
	return comparisons.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
};

/**
 * Get commute summary for property
 */
export const getCommuteSummary = (property, schoolName) => {
	const distanceData = calculateDistanceToSchool(property.area, schoolName);

	if (!distanceData.valid) {
		return {
			available: false,
			error: distanceData.error,
		};
	}

	const commuteTimes = estimateCommuteTimes(distanceData.distance);

	return {
		available: true,
		distance: distanceData.distance,
		distanceFormatted: distanceData.distanceFormatted,
		school: schoolName,
		proximity: classifyProximity(distanceData.distance),
		commuteTimes,
		commuteSummary: `${distanceData.distance.toFixed(1)}km away (${commuteTimes.publicTransport} mins by public transport)`,
		bestMode: 'publicTransport',
		walkable: distanceData.distance <= 2,
		bikeable: true,
	};
};
