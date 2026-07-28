/**
 * What a student pays to move in, and how that money is split.
 *
 * Kept on the SERVER and stored on the booking, because a price quoted in the
 * browser can be tampered with and a landlord must not be able to change the
 * figures after a student has agreed to them. The stored breakdown is the
 * contract.
 *
 * Nigerian lettings almost never cost just the rent — caution, agent and legal
 * fees routinely add 30–50% on top, and students find out at the door. Quoting
 * the honest total up front is the whole point of this file.
 */

// ── How the money divides ─────────────────────────────────
// Set by the platform owner: of what the student pays, the landlord takes 70%,
// a 5% service charge covers running costs (payment processing, support), and
// the platform keeps 25%.
export const SPLIT = {
	landlord: 0.70,
	service: 0.05,
	platform: 0.25,
};

/**
 * The split is applied to the NON-REFUNDABLE money only.
 *
 * A caution deposit belongs to the student — it is returned at the end of the
 * tenancy. Splitting it would mean paying out money we are contractually
 * obliged to give back, leaving nothing to refund with. So it is held whole and
 * separate, and only rent and fees are divided.
 */
const naira = (n) => Math.max(0, Math.round(Number(n) || 0));

/** Whole months between two dates, minimum 1. */
export const monthsBetween = (start, end) => {
	const a = new Date(start);
	const b = new Date(end);
	if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b <= a) return null;
	return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24 * 30.44)));
};

/**
 * @param listing  needs monthlyPrice (or price+priceUnit), cautionDeposit, agentFee, legalFee
 * @param months   length of the stay the student asked for
 */
export function calculateBookingCost(listing, months) {
	const n = Math.max(1, Math.round(Number(months) || 1));

	// Always price from the NORMALISED monthly figure — a listing may be stored
	// annually, and multiplying an annual price by a month count would overcharge
	// by twelvefold.
	const monthly = naira(
		listing.monthlyPrice
		|| (listing.priceUnit === 'monthly' ? listing.price : (listing.price || 0) / 12)
	);

	const rent = monthly * n;
	const cautionDeposit = naira(listing.cautionDeposit);
	const agentFee = naira(listing.agentFee);
	const legalFee = naira(listing.legalFee);

	// Everything the student does NOT get back — this is what gets divided.
	const divisible = rent + agentFee + legalFee;
	const total = divisible + cautionDeposit;

	// Landlord and service are rounded; the platform takes the remainder so the
	// three shares always sum to exactly `divisible` and no naira is invented.
	const landlordShare = Math.round(divisible * SPLIT.landlord);
	const serviceFee = Math.round(divisible * SPLIT.service);
	const platformShare = divisible - landlordShare - serviceFee;

	return {
		months: n,
		monthlyRent: monthly,
		rent,
		cautionDeposit,
		agentFee,
		legalFee,
		total,

		// ── the split ──
		divisible,
		landlordShare,
		serviceFee,
		platformShare,
		splitRates: { ...SPLIT },

		// What the student gets back at the end if all is well. Stated explicitly
		// so `total` never reads as money burned.
		refundableAtEnd: cautionDeposit,
		// What actually reaches the landlord when escrow releases. The caution
		// deposit is NOT theirs to keep — we hold it for the student.
		landlordReceives: landlordShare,
	};
}

/** Human-readable rows for the student, in the order they should be shown. */
export function costRows(cost) {
	return [
		{ key: 'rent', label: `Rent — ${cost.months} month${cost.months === 1 ? '' : 's'}`, amount: cost.rent },
		{ key: 'cautionDeposit', label: 'Caution deposit (refundable)', amount: cost.cautionDeposit },
		{ key: 'agentFee', label: 'Agent fee', amount: cost.agentFee },
		{ key: 'legalFee', label: 'Legal / agreement fee', amount: cost.legalFee },
	].filter((r) => r.amount > 0);
}

/** How the platform divides it — for the landlord's and admin's view, not the student's. */
export function splitRows(cost) {
	return [
		{ key: 'landlordShare', label: `Landlord (${Math.round(SPLIT.landlord * 100)}%)`, amount: cost.landlordShare },
		{ key: 'serviceFee', label: `Service charge (${Math.round(SPLIT.service * 100)}%)`, amount: cost.serviceFee },
		{ key: 'platformShare', label: `NestFinder (${Math.round(SPLIT.platform * 100)}%)`, amount: cost.platformShare },
		{ key: 'cautionDeposit', label: 'Caution deposit — held for the student', amount: cost.cautionDeposit },
	].filter((r) => r.amount > 0);
}
