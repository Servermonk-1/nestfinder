/**
 * URL Helper Utilities
 * Centralizes URL resolution for API and static assets
 */

export const getApiBaseUrl = () => {
	return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

export const getServerBaseUrl = () => {
	const apiUrl = getApiBaseUrl();
	return apiUrl.replace('/api', '');
};

/**
 * Convert relative image path to full URL
 * @param {string} imagePath - Relative image path (e.g., "uploads/listing-1.jpg")
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
	if (!imagePath) return null;
	
	// If it's already an absolute URL, return as-is
	if (imagePath.startsWith('http')) {
		return imagePath;
	}
	
	const baseUrl = getServerBaseUrl();
	return `${baseUrl}/${imagePath}`;
};

/**
 * Get upload directory URL
 * @returns {string} Base uploads URL
 */
export const getUploadsUrl = () => {
	return `${getServerBaseUrl()}/uploads`;
};

export default {
	getApiBaseUrl,
	getServerBaseUrl,
	getImageUrl,
	getUploadsUrl,
};
