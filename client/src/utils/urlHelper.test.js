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

	it('prefixes relative upload paths with the server base URL', () => {
		expect(getImageUrl('uploads/room.jpg')).toBe(`${getServerBaseUrl()}/uploads/room.jpg`);
	});
});
