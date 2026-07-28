import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import Landlord from '../models/Landlord.js';
import Listing from '../models/Listing.js';
import { runFraudShield, computeTrustScore } from '../services/fraudShield.js';

const base = {
	address: '1 Test St', city: 'Ibadan', area: 'Agbowo', state: 'Oyo',
	roomType: 'single', rooms: 1, contactPhone: '0800', contactEmail: 'x@x.io',
};
const CLEAN_DESC = 'A tidy self-contained room a short walk from the university gate, with steady power and water throughout the week.';

const makeLandlord = async (over = {}) => Landlord.create({
	fullName: 'Musa Danladi', email: `l-${Math.random()}@x.io`,
	password: await bcrypt.hash('pw', 10), phone: '08012345678', verified: true, ...over,
});

// Give the price rule something to compare against. Each comparable belongs to
// a DIFFERENT landlord — as it would in reality — so seeding the market doesn't
// make the listing under test look like a bulk poster.
const seedComparables = async (prices = [180000, 200000, 220000, 190000]) =>
	Promise.all(prices.map(async (p, i) => {
		const owner = await makeLandlord();
		return Listing.create({ ...base, title: `Comparable ${i}`, description: `${CLEAN_DESC} number ${i}`, price: p, landlord: owner._id });
	}));

describe('Fraud Shield — full pipeline', () => {
	it('leaves an honest listing clear and unflagged', async () => {
		const L = await makeLandlord();
		await seedComparables();
		const listing = await Listing.create({ ...base, title: 'Honest Room', description: CLEAN_DESC, price: 190000, landlord: L._id });

		const verdict = await runFraudShield(listing._id);
		expect(verdict.score).toBe(0);
		expect(verdict.shouldFlag).toBe(false);

		const saved = await Listing.findById(listing._id);
		expect(saved.flagged).toBe(false);
		expect(saved.fraudLevel).toBe('clear');
		expect(saved.fraudCheckedAt).toBeTruthy();
	});

	it('auto-flags a scam listing and stores every reason', async () => {
		const L = await makeLandlord({ verified: false });
		await seedComparables();
		const listing = await Listing.create({
			...base, title: 'Cheap Room URGENT', price: 20000, landlord: L._id,
			description: 'URGENT! Pay the deposit first to secure it. WhatsApp me on 08031234567. I am abroad so no viewing is possible.',
		});

		const verdict = await runFraudShield(listing._id);
		expect(verdict.shouldFlag).toBe(true);

		const saved = await Listing.findById(listing._id);
		expect(saved.flagged).toBe(true);               // lands in the admin queue
		expect(saved.fraudScore).toBeGreaterThanOrEqual(40);
		expect(['medium', 'high']).toContain(saved.fraudLevel);
		const rules = saved.fraudFlags.map((f) => f.rule);
		expect(rules).toEqual(expect.arrayContaining(['price-outlier', 'unverified-landlord', 'offsite-contact', 'scam-language']));
		expect(saved.fraudFlags[0].detail).toBeTruthy(); // human-readable reason
	});

	it('cannot be defeated by a scammer flooding the market with cheap listings', async () => {
		// Real market set by honest landlords…
		await seedComparables([180000, 200000, 220000, 190000]);

		// …then one scammer posts many cheap rooms. Their own listings must NOT
		// be allowed to drag the median down and make the bait look normal.
		const scammer = await makeLandlord({ verified: false });
		const theirs = await Promise.all([0, 1, 2, 3, 4].map((i) =>
			Listing.create({ ...base, title: `Cheap ${i}`, description: `${CLEAN_DESC} listing ${i}`, price: 18000, landlord: scammer._id })));

		const verdict = await runFraudShield(theirs[0]._id);
		expect(verdict.flags.map((f) => f.rule)).toContain('price-outlier');
	});

	it('does not accuse an honest landlord who prices per month', async () => {
		// The comparables are annual. A ₦16,000/month room is ₦192,000/year —
		// perfectly normal — but comparing the raw numbers makes it look 91%
		// below market and brands a real landlord a scammer.
		const L = await makeLandlord();
		await seedComparables();
		const listing = await Listing.create({
			...base, title: 'Monthly Room', description: CLEAN_DESC,
			price: 16000, priceUnit: 'monthly', landlord: L._id,
		});

		const verdict = await runFraudShield(listing._id);

		expect(verdict.flags.map((f) => f.rule)).not.toContain('price-outlier');
		expect(verdict.score).toBe(0);
	});

	it('still catches genuine bait pricing across mixed units', async () => {
		// The flip side: normalising must not blind the rule. ₦1,000/month is
		// ₦12,000/year against a ₦190,000 market — that is real bait.
		const L = await makeLandlord();
		await seedComparables();
		const listing = await Listing.create({
			...base, title: 'Bait Room', description: `${CLEAN_DESC} extra`,
			price: 1000, priceUnit: 'monthly', landlord: L._id,
		});

		const verdict = await runFraudShield(listing._id);
		expect(verdict.flags.map((f) => f.rule)).toContain('price-outlier');
	});

	it('detects a description copy-pasted from another listing', async () => {
		const A = await makeLandlord();
		const B = await makeLandlord();
		const shared = 'Beautiful spacious self contained apartment with constant electricity and water supply, very close to campus and the main road.';
		await Listing.create({ ...base, title: 'Original', description: shared, price: 200000, landlord: A._id });
		const copy = await Listing.create({ ...base, title: 'Copy', description: shared, price: 200000, landlord: B._id });

		const verdict = await runFraudShield(copy._id);
		expect(verdict.flags.map((f) => f.rule)).toContain('duplicate-text');
	});

	it('never clears a flag an admin set by hand', async () => {
		const L = await makeLandlord();
		await seedComparables();
		const listing = await Listing.create({ ...base, title: 'Manually Flagged', description: CLEAN_DESC, price: 190000, landlord: L._id, flagged: true });

		await runFraudShield(listing._id);
		expect((await Listing.findById(listing._id)).flagged).toBe(true);
	});

	it('returns null for a listing that no longer exists', async () => {
		expect(await runFraudShield('6a6751f2b4f0088bed3feeb2')).toBeNull();
	});
});

describe('Fraud Shield — landlord trust score', () => {
	it('rewards a verified landlord above an unverified one', async () => {
		const verified = await makeLandlord({ verified: true });
		const unverified = await makeLandlord({ verified: false });
		const a = await computeTrustScore(verified._id);
		const b = await computeTrustScore(unverified._id);
		expect(a.score).toBeGreaterThan(b.score);
		expect(a.factors.identityVerified).toBe(30);
	});

	it('penalises flagged listings and reports', async () => {
		const clean = await makeLandlord();
		const dodgy = await makeLandlord();
		await Listing.create({ ...base, title: 'Fine', description: CLEAN_DESC, price: 200000, landlord: clean._id });
		await Listing.create({ ...base, title: 'Bad', description: CLEAN_DESC, price: 200000, landlord: dodgy._id, flagged: true, fraudScore: 80, reportCount: 2 });

		const good = await computeTrustScore(clean._id);
		const bad = await computeTrustScore(dodgy._id);
		expect(bad.score).toBeLessThan(good.score);
		expect(bad.factors.flaggedPenalty).toBeLessThan(0);
		expect(bad.factors.reportPenalty).toBeLessThan(0);
	});

	it('drops a suspended landlord to the floor', async () => {
		const L = await makeLandlord({ suspended: true, verified: false });
		const { score } = await computeTrustScore(L._id);
		expect(score).toBe(0);
	});

	it('persists the score on the landlord', async () => {
		const L = await makeLandlord();
		await computeTrustScore(L._id);
		const saved = await Landlord.findById(L._id);
		expect(saved.trustScore).toBeGreaterThan(0);
		expect(saved.trustUpdatedAt).toBeTruthy();
	});

	it('keeps the score inside 0–100', async () => {
		const L = await makeLandlord({ verified: true });
		await Promise.all([1, 2, 3].map((i) => Listing.create({ ...base, title: `Bad ${i}`, description: CLEAN_DESC, price: 200000, landlord: L._id, flagged: true, fraudScore: 100, reportCount: 10 })));
		const { score } = await computeTrustScore(L._id);
		expect(score).toBeGreaterThanOrEqual(0);
		expect(score).toBeLessThanOrEqual(100);
	});
});
