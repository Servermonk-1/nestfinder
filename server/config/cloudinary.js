import { v2 as cloudinary } from 'cloudinary';

/**
 * Cloudinary Configuration
 *
 * Replaces local server/uploads storage with cloud hosting.
 * Images are stored on Cloudinary and accessed via their CDN URLs.
 */

let configured = false;

export const configureCloudinary = () => {
	if (configured) return;

	const cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
	const api_key = process.env.CLOUDINARY_API_KEY;
	const api_secret = process.env.CLOUDINARY_API_SECRET;

	if (!cloud_name || !api_key || !api_secret) {
		console.warn('⚠️  Cloudinary credentials missing. Image uploads will fail.');
		console.warn('   Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env');
		return;
	}

	cloudinary.config({
		cloud_name,
		api_key,
		api_secret,
		secure: true,
	});

	configured = true;
	console.log(`☁️  Cloudinary configured: ${cloud_name}`);
};

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options
 * @param {string} options.folder - Cloudinary folder (e.g., 'listings', 'avatars', 'kyc')
 * @param {string} options.public_id - Optional custom public ID
 * @param {string} options.resource_type - 'image' (default), 'raw' (for PDFs)
 * @returns {Promise<Object>} Upload result with secure_url and public_id
 */
export const uploadToCloudinary = (buffer, options = {}) => {
	return new Promise((resolve, reject) => {
		// Resolve this once. Reading `options.resource_type` again below would
		// skip the transformation whenever a caller relies on the default, which
		// is exactly the case where the optimisation matters most.
		const resourceType = options.resource_type || 'image';

		const uploadOptions = {
			folder: options.folder || 'nestfinder',
			resource_type: resourceType,
			...(options.public_id ? { public_id: options.public_id } : {}),
			// Replaces the old local `sharp` pipeline: cap the long edge, let
			// Cloudinary pick the quality and serve WebP/AVIF to browsers that
			// take it. Only images can be transformed — a `raw` PDF must be
			// stored byte-for-byte.
			...(resourceType === 'image'
				? { transformation: [{ width: 1600, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] }
				: {}),
		};

		const uploadStream = cloudinary.uploader.upload_stream(
			uploadOptions,
			(error, result) => {
				if (error) {
					reject(error);
				} else {
					resolve(result);
				}
			}
		);

		uploadStream.end(buffer);
	});
};

/**
 * Delete an image from Cloudinary using its public ID
 * @param {string} publicId - The public ID of the image
 * @param {string} resourceType - 'image' or 'raw'
 * @returns {Promise<Object>} Deletion result
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
	try {
		const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
		return result;
	} catch (error) {
		console.error('Cloudinary deletion failed:', publicId, error.message);
		throw error;
	}
};

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of public IDs
 * @param {string} resourceType - 'image' or 'raw'
 * @returns {Promise<Array>} Array of deletion results
 */
export const deleteMultipleFromCloudinary = async (publicIds, resourceType = 'image') => {
	if (!publicIds || publicIds.length === 0) return [];

	try {
		const results = await Promise.all(
			publicIds.map(id => deleteFromCloudinary(id, resourceType).catch(err => ({ error: err.message, id })))
		);
		return results;
	} catch (error) {
		console.error('Batch deletion failed:', error.message);
		throw error;
	}
};

/**
 * Extract the public ID (the delete handle) from a Cloudinary URL.
 *
 * Nothing stores public IDs separately — the URL contains one, so deriving it
 * keeps the schema unchanged and works for rows written before this migration.
 *
 * @param {string} url - Full Cloudinary URL
 * @returns {string|null} Public ID or null when the URL isn't Cloudinary's
 */
export const extractPublicId = (url) => {
	if (!url || !url.includes('cloudinary.com')) return null;

	// https://res.cloudinary.com/{cloud}/{resource_type}/upload/v{version}/{public_id}.{ext}
	// Version segment is optional, and the public ID may contain slashes (folders).
	const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
	if (!match) return null;

	// For images the extension is a delivery format, not part of the ID, so it
	// must come off. For `raw` (our PDFs) the extension IS part of the ID —
	// stripping it makes every PDF deletion silently no-op.
	const withExtension = match[1];
	if (/\/raw\/upload\//.test(url)) return withExtension;

	return withExtension.replace(/\.\w+$/, '');
};

export default cloudinary;
