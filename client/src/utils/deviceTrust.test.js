import { describe, it, expect, beforeEach } from 'vitest';
import { getDeviceToken, saveDeviceToken } from './deviceTrust';

describe('deviceTrust', () => {
	beforeEach(() => localStorage.clear());

	it('returns null when no token is stored for an email', () => {
		expect(getDeviceToken('a@b.com')).toBe(null);
	});

	it('saves and retrieves a device token by email (case-insensitive, trimmed)', () => {
		saveDeviceToken('  User@Example.com ', 'tok123');
		expect(getDeviceToken('user@example.com')).toBe('tok123');
	});

	it('keeps separate tokens for different accounts on the same machine', () => {
		saveDeviceToken('student@x.io', 'stok');
		saveDeviceToken('landlord@x.io', 'ltok');
		expect(getDeviceToken('student@x.io')).toBe('stok');
		expect(getDeviceToken('landlord@x.io')).toBe('ltok');
	});

	it('ignores an empty token', () => {
		saveDeviceToken('a@b.com', '');
		expect(getDeviceToken('a@b.com')).toBe(null);
	});
});
