import { describe, it, expect } from 'vitest';
import { monthlyRent, annualRent, formatPrice, formatConverted, unitOf } from './price';
import { estimateDetailPageCost, calculatePropertyScore } from './listingInsights';

const annual = { price: 180000, priceUnit: 'annual' };
const monthly = { price: 15000, priceUnit: 'monthly' };
const legacy = { price: 180000 }; // pre-migration record with no unit

describe('price — unit handling', () => {
	it('treats a record with no unit as annual (matches the migration)', () => {
		expect(unitOf(legacy)).toBe('annual');
	});

	it('converts both directions', () => {
		expect(monthlyRent(annual)).toBe(15000);
		expect(annualRent(annual)).toBe(180000);
		expect(monthlyRent(monthly)).toBe(15000);
		expect(annualRent(monthly)).toBe(180000);
	});

	it('formats the headline exactly as the landlord entered it', () => {
		expect(formatPrice(annual)).toBe('₦180,000/yr');
		expect(formatPrice(monthly)).toBe('₦15,000/mo');
	});

	it('offers the other unit so a student can read it either way', () => {
		expect(formatConverted(annual)).toBe('≈ ₦15,000/mo');
		expect(formatConverted(monthly)).toBe('≈ ₦180,000/yr');
	});

	it('never renders a bare number without a unit', () => {
		for (const l of [annual, monthly, legacy]) {
			expect(formatPrice(l)).toMatch(/\/(yr|mo)$/);
		}
	});
});

describe('price — the 12x bug is gone', () => {
	it('an annual and a monthly listing of equal true cost agree', () => {
		expect(monthlyRent(annual)).toBe(monthlyRent(monthly));
		expect(annualRent(annual)).toBe(annualRent(monthly));
	});

	it('the living-cost estimate uses monthly rent, not the raw figure', () => {
		const cost = estimateDetailPageCost(annual);
		expect(cost.rent).toBe(15000);            // NOT 180000
		expect(cost.total).toBeLessThan(50000);   // a believable monthly total
	});

	it('two listings costing the same score the same on affordability', () => {
		expect(calculatePropertyScore(annual).affordability)
			.toBe(calculatePropertyScore(monthly).affordability);
	});

	it('an annual listing is not penalised as if it were monthly rent', () => {
		// ₦180,000/yr is ₦15,000/mo — comfortably the top affordability band.
		expect(calculatePropertyScore(annual).affordability).toBe(95);
	});
});
