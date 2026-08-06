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
 * @param {string} imagePath - Image path (Cloudinary URL or legacy relative path)
 * @returns {string} Full image URL
 */
export const getImageUrl = (imagePath) => {
	if (!imagePath) return null;

	// Already an absolute URL (Cloudinary or any CDN) — return as-is
	if (imagePath.startsWith('http')) {
		return imagePath;
	}

	// Legacy relative path from before the Cloudinary migration — prefix with server base.
	// New uploads go straight to Cloudinary and never hit this branch.
	const baseUrl = getServerBaseUrl();
	return `${baseUrl}/${imagePath}`;
};

/**
 * Get upload directory URL (legacy — new uploads use Cloudinary)
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
