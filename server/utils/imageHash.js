import sharp from 'sharp';

/**
 * Perceptual "average hash" (aHash) for stolen-photo detection.
 *
 * A byte-for-byte checksum is useless here — re-saving or resizing an image
 * changes every byte. aHash reduces the picture to a 8x8 greyscale grid and
 * records which cells are brighter than the average, so a resized, recompressed
 * or lightly-cropped copy still produces a near-identical fingerprint.
 */
export async function hashImage(pathOrBuffer) {
	try {
		const pixels = await sharp(pathOrBuffer)
			.greyscale()
			.resize(8, 8, { fit: 'fill' })
			.raw()
			.toBuffer();

		const avg = pixels.reduce((s, v) => s + v, 0) / pixels.length;
		let bits = '';
		for (const v of pixels) bits += v >= avg ? '1' : '0';

		// 64 bits → 16 hex chars, compact to store and index.
		let hex = '';
		for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
		return hex;
	} catch {
		return null; // unreadable/corrupt image — never break the upload over this
	}
}

/** Hash several images, dropping any that fail. */
export async function hashImages(paths = []) {
	const hashes = await Promise.all(paths.map((p) => hashImage(p)));
	return hashes.filter(Boolean);
}

/** Hamming distance between two hex aHashes (lower = more similar). */
export function hashDistance(a, b) {
	if (!a || !b || a.length !== b.length) return Infinity;
	let dist = 0;
	for (let i = 0; i < a.length; i++) {
		let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
		while (x) { dist += x & 1; x >>= 1; }
	}
	return dist;
}

// Distance at or below this counts as "the same photo". 64 bits total, so ≤6
// tolerates recompression and small edits without matching unrelated images.
export const DUPLICATE_DISTANCE = 6;

export const isDuplicate = (a, b) => hashDistance(a, b) <= DUPLICATE_DISTANCE;
