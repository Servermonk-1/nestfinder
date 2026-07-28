import { describe, it, expect } from 'vitest';
import { loginPathForRole } from './api';

describe('loginPathForRole (role-aware 401 redirect)', () => {
	it('sends landlords to the landlord login', () => {
		expect(loginPathForRole('landlord')).toBe('/landlord/login');
	});

	it('sends admins to the admin login', () => {
		expect(loginPathForRole('admin')).toBe('/admin/login');
	});

	it('defaults students and unknown/missing roles to the student login', () => {
		expect(loginPathForRole('student')).toBe('/student/login');
		expect(loginPathForRole(undefined)).toBe('/student/login');
		expect(loginPathForRole(null)).toBe('/student/login');
	});
});
