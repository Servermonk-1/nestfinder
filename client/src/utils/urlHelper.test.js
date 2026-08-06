import { describe, it, expect } from 'vitest';
import { getImageUrl, getServerBaseUrl } from './urlHelper';

describe('getImageUrl', () => {
	it('returns null for empty input', () => {
		expect(getImageUrl('')).toBe(null);
		expect(getImageUrl(null)).toBe(null);
		expect(getImageUrl(undefined)).toBe(null);
	});

	it('passes absolute http(s) URLs through unchanged', () => {
		expect(getImageUrl('https://cdn.example.com/a.jpg')).toBe('https://cdn.example.com/a.jpg');
		expect(getImageUrl('http://x.io/b.png')).toBe('http://x.io/b.png');
	});

	// Every image the API returns is now a Cloudinary secure_url. If this ever
	// regressed to prefixing the server base, the app would request
	// `https://api.example.com/https://res.cloudinary.com/...` and every photo
	// on the site would 404 at once.
	it('passes Cloudinary URLs through unchanged', () => {
		const url = 'https://res.cloudinary.com/demo/image/upload/v1700000000/nestfinder/listings/abc123.jpg';
		expect(getImageUrl(url)).toBe(url);
	});

	it('prefixes legacy relative upload paths with the server base URL', () => {
		expect(getImageUrl('uploads/room.jpg')).toBe(`${getServerBaseUrl()}/uploads/room.jpg`);
	});
});
