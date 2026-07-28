import { describe, it, expect } from 'vitest';
import {
	estimateCommute, commuteSummary, monthsFromStay, leaseFitsPlacement,
	distanceKm, distanceToPlacement, GENERIC_TRANSPORT,
} from './commute';

describe('estimateCommute', () => {
	it('returns null when the distance is unknown', () => {
		expect(estimateCommute(null)).toBeNull();
		expect(estimateCommute(undefined)).toBeNull();
		expect(estimateCommute(NaN)).toBeNull();
	});

	it('adds a detour allowance rather than quoting straight-line distance', () => {
		// Nobody walks through buildings; quoting the crow-flies number would
		// understate every journey.
		const c = estimateCommute(10);
		expect(c.roadKm).toBeGreaterThan(10);
		expect(c.roadKm).toBeCloseTo(13.5, 1);
	});

	it('calls a very short hop walkable and free', () => {
		const c = estimateCommute(0.5);
		expect(c.mode).toBe('walk');
		expect(c.monthlyCost).toBe(0);
		expect(commuteSummary(0.5)).toMatch(/min walk/);
	});

	it('picks the mode a student would actually use as distance grows', () => {
		expect(estimateCommute(2).mode).toBe('keke');
		expect(estimateCommute(6).mode).toBe('bus');
		expect(estimateCommute(30).mode).toBe('long');
	});

	it('rounds travel time UP, never down', () => {
		// A student aiming to reach work by 8am is better served by a pessimistic
		// number than an optimistic one. 6km straight-line → 8.1km by road → 27
		// minutes at bus speed, which must present as 30 rather than 25.
		const c = estimateCommute(6);
		expect(c.roadKm).toBeCloseTo(8.1, 1);
		expect(c.minutes).toBe(30);

		// And never below a 5-minute floor, however short the hop.
		expect(estimateCommute(0.05).minutes).toBe(5);
		[1, 3, 7, 20].forEach((km) => expect(estimateCommute(km).minutes % 5).toBe(0));
	});

	it('prices two trips a day across a working month', () => {
		const c = estimateCommute(6); // bus, ₦500 each way
		expect(c.monthlyCost).toBe(500 * 2 * 22);
	});

	it('gets further away with every band', () => {
		const bands = [0.5, 3, 8, 30].map((km) => estimateCommute(km).band);
		expect(bands).toEqual(['excellent', 'good', 'fair', 'far']);
	});
});

describe('monthsFromStay', () => {
	it('reads the common ways a stay is written', () => {
		expect(monthsFromStay('6 months')).toBe(6);
		expect(monthsFromStay('1 year')).toBe(12);
		expect(monthsFromStay('2 years')).toBe(24);
		expect(monthsFromStay('12')).toBe(12);
		expect(monthsFromStay('3 mo')).toBe(3);
	});

	it('returns null rather than guessing', () => {
		expect(monthsFromStay('')).toBeNull();
		expect(monthsFromStay(null)).toBeNull();
		expect(monthsFromStay('negotiable')).toBeNull();
	});
});

describe('leaseFitsPlacement', () => {
	const placement = { startDate: '2026-06-01', endDate: '2026-11-30' }; // ~6 months

	it('flags a lease that outlasts the training period', () => {
		// The specific SIWES trap: six months of training, twelve months of rent.
		const fit = leaseFitsPlacement({ minimumStay: '1 year' }, placement);
		expect(fit.fits).toBe(false);
		expect(fit.requiredMonths).toBe(12);
		expect(fit.placementMonths).toBe(6);
		expect(fit.extraMonths).toBe(6);
	});

	it('is happy when the stay fits inside the placement', () => {
		const fit = leaseFitsPlacement({ minimumStay: '3 months' }, placement);
		expect(fit.fits).toBe(true);
		expect(fit.extraMonths).toBe(0);
	});

	it('stays silent when it cannot know', () => {
		expect(leaseFitsPlacement({ minimumStay: '6 months' }, null)).toBeNull();
		expect(leaseFitsPlacement({ minimumStay: 'negotiable' }, placement)).toBeNull();
		expect(leaseFitsPlacement({ minimumStay: '6 months' }, { startDate: '2026-06-01' })).toBeNull();
	});

	it('ignores a placement whose dates are backwards', () => {
		const fit = leaseFitsPlacement({ minimumStay: '6 months' }, { startDate: '2026-11-30', endDate: '2026-06-01' });
		expect(fit).toBeNull();
	});
});

describe('distance helpers', () => {
	it('measures a known distance', () => {
		// Ibadan to Lagos, ~114 km straight-line.
		const d = distanceKm({ lat: 7.3775, lng: 3.947 }, { lat: 6.5244, lng: 3.3792 });
		expect(d).toBeGreaterThan(110);
		expect(d).toBeLessThan(118);
	});

	it('reads GeoJSON [lng, lat] in the right order', () => {
		// Reversing these silently puts every Nigerian listing in the ocean.
		const listing = { location: { type: 'Point', coordinates: [3.9022, 7.4177] } };
		const company = { location: { type: 'Point', coordinates: [3.9137, 7.4467] } };
		const d = distanceToPlacement(listing, company);
		expect(d).toBeGreaterThan(2);
		expect(d).toBeLessThan(5);
	});

	it('returns null when either end is missing', () => {
		expect(distanceToPlacement({ location: { coordinates: [3.9, 7.4] } }, null)).toBeNull();
		expect(distanceToPlacement({}, { location: { coordinates: [3.9, 7.4] } })).toBeNull();
	});
});

describe('the generic fallback', () => {
	it('is a plain number the UI can label as a guess', () => {
		expect(GENERIC_TRANSPORT).toBe(12000);
	});
});
