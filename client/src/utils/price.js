/**
 * One place that decides how rent is written down.
 *
 * `listing.price` is meaningless without `listing.priceUnit` — the same number
 * was previously rendered as "/yr" on listing cards and "/month" on the detail
 * page, a 12x discrepancy on the most important figure in the product. Every
 * surface must format through here.
 */

const MONTHS = 12;

export const naira = (n) => `₦${Math.round(Number(n) || 0).toLocaleString()}`;

/** The unit a listing is priced in, defaulting to annual for older records. */
export const unitOf = (listing) => (listing?.priceUnit === 'monthly' ? 'monthly' : 'annual');

export const unitSuffix = (unit) => (unit === 'monthly' ? '/mo' : '/yr');
export const unitWord = (unit) => (unit === 'monthly' ? 'per month' : 'per year');

/** Rent expressed monthly — the common basis for comparing and sorting. */
export function monthlyRent(listing) {
	const price = Number(listing?.price) || 0;
	return unitOf(listing) === 'monthly' ? price : price / MONTHS;
}

/** Rent expressed annually. */
export function annualRent(listing) {
	const price = Number(listing?.price) || 0;
	return unitOf(listing) === 'monthly' ? price * MONTHS : price;
}

/** The headline figure, exactly as the landlord entered it. e.g. "₦180,000/yr" */
export function formatPrice(listing) {
	return `${naira(listing?.price)}${unitSuffix(unitOf(listing))}`;
}

/**
 * The same rent in the other unit, so a student can read it either way.
 * e.g. "≈ ₦15,000/mo" for an annual listing.
 */
export function formatConverted(listing) {
	return unitOf(listing) === 'monthly'
		? `≈ ${naira(annualRent(listing))}/yr`
		: `≈ ${naira(monthlyRent(listing))}/mo`;
}
