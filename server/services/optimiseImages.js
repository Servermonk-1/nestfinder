import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Shrink uploaded photos before they are ever served.
 *
 * Landlords upload straight off a phone — 3–5MB, 4000px wide — and every
 * student then downloads that over Nigerian mobile data to look at a 400px
 * card. Resizing on upload is the single biggest thing that makes the app
 * usable on a slow connection.
 *
 * Runs AFTER the response is sent (see the caller), so a slow conversion never
 * delays the landlord's upload.
 */

// Big enough for a full-width hero on a large screen, small enough to be cheap.
const MAX_WIDTH = 1600;
const QUALITY = 78;
// Cards and thumbnails never need more than this.
const THUMB_WIDTH = 480;

const isImage = (file) => /\.(jpe?g|png|webp|jfif)$/i.test(file);

/** `uploads/123.jpg` → `uploads/123-thumb.webp` */
export const thumbPathFor = (filePath) => {
	const dir = path.dirname(filePath);
	const base = path.basename(filePath, path.extname(filePath));
	return path.join(dir, `${base}-thumb.webp`);
};

/**
 * Optimise one file in place and write a thumbnail beside it.
 * Never throws — a failed conversion must leave the original usable.
 */
export async function optimiseOne(filePath) {
	if (!isImage(filePath)) return null;

	try {
		const before = (await fs.stat(filePath)).size;

		// Read fully into memory first: sharp cannot safely write to the file it
		// is reading from, and writing to a temp file then renaming avoids
		// leaving a truncated image if the process dies mid-write.
		const input = await fs.readFile(filePath);
		const meta = await sharp(input).metadata();

		const tmp = `${filePath}.tmp`;
		await sharp(input)
			// `withoutEnlargement` so a small photo isn't upscaled into blur.
			.resize({ width: MAX_WIDTH, withoutEnlargement: true })
			.rotate()                       // honour EXIF orientation — phones rely on it
			.jpeg({ quality: QUALITY, mozjpeg: true })
			.toFile(tmp);
		await fs.rename(tmp, filePath);

		await sharp(input)
			.resize({ width: THUMB_WIDTH, withoutEnlargement: true })
			.rotate()
			.webp({ quality: 72 })
			.toFile(thumbPathFor(filePath));

		const after = (await fs.stat(filePath)).size;
		return {
			file: filePath,
			before,
			after,
			savedPercent: before ? Math.round((1 - after / before) * 100) : 0,
			width: Math.min(meta.width || MAX_WIDTH, MAX_WIDTH),
		};
	} catch (err) {
		// A photo that failed to optimise is still a perfectly good photo.
		console.error('Image optimisation failed:', filePath, err.message);
		return null;
	}
}

/** Optimise every file from one upload. Sequential — sharp is CPU-bound. */
export async function optimiseUploaded(files = []) {
	const results = [];
	for (const f of files) {
		const p = typeof f === 'string' ? f : f.path;
		const r = await optimiseOne(p);
		if (r) results.push(r);
	}
	return results;
}
