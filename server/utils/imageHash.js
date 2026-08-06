import sharp from 'sharp';

/**
 * Perceptual "average hash" (aHash) for stolen-photo detection.
 *
 * A byte-for-byte checksum is useless here — re-saving or resizing an image
 * changes every byte. aHash reduces the picture to a 8x8 greyscale grid and
 * records which cells are brighter than the average, so a resized, recompressed
 * or lightly-cropped copy still produces a near-identical fingerprint.
 */

// Photos now live on Cloudinary, so what used to be a local file path is an
// https URL — and sharp only reads buffers and paths. Fetch remote sources into
// a buffer first. Capped so a wrong/huge URL can't blow up the container: a
// listing photo is well under this, and Fraud Shield runs in the background
// where a slow fetch would otherwise hold memory indefinitely.
const FETCH_TIMEOUT_MS = 10000;
const MAX_BYTES = 10 * 1024 * 1024;

const isRemote = (src) => typeof src === 'string' && /^https?:\/\//i.test(src);

const fetchBuffer = async (url) => {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) return null;
		const size = Number(res.headers.get('content-length') || 0);
		if (size && size > MAX_BYTES) return null;
		const buf = Buffer.from(await res.arrayBuffer());
		return buf.length > MAX_BYTES ? null : buf;
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
	}
};

export async function hashImage(pathOrBuffer) {
	try {
		const input = isRemote(pathOrBuffer) ? await fetchBuffer(pathOrBuffer) : pathOrBuffer;
		if (!input) return null;

		const pixels = await sharp(input)
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
