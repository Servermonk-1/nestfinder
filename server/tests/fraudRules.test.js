import { describe, it, expect } from 'vitest';
import {
	priceOutlier, duplicateImages, duplicateText, unverifiedLandlord,
	offsiteContact, scamLanguage, bulkPosting, assessFraud, FLAG_THRESHOLD,
} from '../utils/fraudRules.js';
import { hashImage, hashDistance, isDuplicate } from '../utils/imageHash.js';
import sharp from 'sharp';

// A clean, honest listing — the baseline every rule must leave alone.
const CLEAN = {
	price: 180000, medianPrice: 200000, comparableCount: 10,
	title: 'Ensuite room near campus',
	description: 'A tidy self-contained room a short walk from the university gate, with steady power and water. Viewing available on weekends.',
	landlordVerified: true, landlordAgeDays: 400, landlordListingCount: 3,
	duplicateImageMatches: [], duplicateTextMatch: false,
};

describe('fraud rules — individually', () => {
	it('price-outlier fires only on bait pricing', () => {
		expect(priceOutlier(CLEAN)).toBeNull();
		expect(priceOutlier({ ...CLEAN, price: 40000 })).toMatchObject({ rule: 'price-outlier' });
		// A cheap-but-plausible room shouldn't fire.
		expect(priceOutlier({ ...CLEAN, price: 120000 })).toBeNull();
	});

	it('price-outlier stays silent without enough comparables', () => {
		expect(priceOutlier({ ...CLEAN, price: 10000, comparableCount: 2 })).toBeNull();
		expect(priceOutlier({ ...CLEAN, price: 10000, medianPrice: null })).toBeNull();
	});

	it('duplicate-images fires when photos belong to someone else', () => {
		expect(duplicateImages(CLEAN)).toBeNull();
		expect(duplicateImages({ duplicateImageMatches: ['abc', 'def'] })).toMatchObject({ rule: 'duplicate-images', severity: 35 });
	});

	it('duplicate-text catches copy-pasted descriptions', () => {
		expect(duplicateText(CLEAN)).toBeNull();
		expect(duplicateText({ duplicateTextMatch: true })).toMatchObject({ rule: 'duplicate-text' });
	});

	it('unverified-landlord fires only when KYC is missing', () => {
		expect(unverifiedLandlord(CLEAN)).toBeNull();
		expect(unverifiedLandlord({ landlordVerified: false })).toMatchObject({ rule: 'unverified-landlord' });
	});

	it('offsite-contact catches phone, email and handles in the description', () => {
		expect(offsiteContact(CLEAN)).toBeNull();
		expect(offsiteContact({ description: 'call me on 08031234567' })).toMatchObject({ rule: 'offsite-contact' });
		expect(offsiteContact({ description: 'email me at scam@x.com' })).toMatchObject({ rule: 'offsite-contact' });
		expect(offsiteContact({ description: 'WhatsApp me for details' })).toMatchObject({ rule: 'offsite-contact' });
	});

	it('scam-language catches upfront payment, untraceable transfer, no-viewing and urgency', () => {
		expect(scamLanguage(CLEAN)).toBeNull();
		expect(scamLanguage({ description: 'You must pay a deposit before viewing.' })).toMatchObject({ rule: 'scam-language' });
		expect(scamLanguage({ description: 'Send payment by bitcoin only' })).toMatchObject({ rule: 'scam-language' });
		expect(scamLanguage({ description: "I'm abroad so no inspection is possible" })).toMatchObject({ rule: 'scam-language' });
		// More patterns = higher severity
		const many = scamLanguage({ description: 'URGENT! Pay a deposit first to secure it. I am abroad, no viewing. Bitcoin accepted.' });
		expect(many.severity).toBeGreaterThan(10);
	});

	it('bulk-posting fires only for a new account with many listings', () => {
		expect(bulkPosting(CLEAN)).toBeNull();
		expect(bulkPosting({ landlordAgeDays: 2, landlordListingCount: 8 })).toMatchObject({ rule: 'bulk-posting' });
		expect(bulkPosting({ landlordAgeDays: 2, landlordListingCount: 2 })).toBeNull();   // new but modest
		expect(bulkPosting({ landlordAgeDays: 300, landlordListingCount: 20 })).toBeNull(); // established
	});
});

describe('assessFraud — scoring', () => {
	it('scores a clean listing at zero and does not flag it', () => {
		const v = assessFraud(CLEAN);
		expect(v.score).toBe(0);
		expect(v.flags).toHaveLength(0);
		expect(v.shouldFlag).toBe(false);
		expect(v.level).toBe('clear');
	});

	it('does not flag a listing that only trips one soft rule', () => {
		const v = assessFraud({ ...CLEAN, landlordVerified: false }); // 15 only
		expect(v.shouldFlag).toBe(false);
		expect(v.level).toBe('low');
	});

	it('flags a classic scam listing and reports every reason', () => {
		const v = assessFraud({
			...CLEAN,
			price: 25000,
			landlordVerified: false,
			description: 'URGENT! Pay the deposit first to secure it. WhatsApp me on 08031234567. I am abroad so no viewing.',
			duplicateImageMatches: ['aaa'],
			landlordAgeDays: 1, landlordListingCount: 9,
		});
		expect(v.shouldFlag).toBe(true);
		expect(v.level).toBe('high');
		expect(v.score).toBeGreaterThanOrEqual(FLAG_THRESHOLD);
		const rules = v.flags.map((f) => f.rule);
		expect(rules).toEqual(expect.arrayContaining([
			'price-outlier', 'duplicate-images', 'unverified-landlord',
			'offsite-contact', 'scam-language', 'bulk-posting',
		]));
	});

	it('clamps the score at 100', () => {
		const v = assessFraud({
			...CLEAN, price: 1000, landlordVerified: false, duplicateImageMatches: ['a'], duplicateTextMatch: true,
			description: 'urgent pay deposit first bitcoin no viewing whatsapp me on 08031234567',
			landlordAgeDays: 0, landlordListingCount: 30,
		});
		expect(v.score).toBeLessThanOrEqual(100);
	});
});

describe('perceptual image hashing', () => {
	const img = (opts) => sharp({ create: { width: 200, height: 200, channels: 3, ...opts } }).png().toBuffer();

	it('gives an identical hash to a resized copy of the same image', async () => {
		const original = await sharp({ create: { width: 240, height: 240, channels: 3, background: { r: 200, g: 120, b: 60 } } })
			.composite([{ input: await img({ background: { r: 20, g: 20, b: 20 } }).then((b) => sharp(b).resize(120, 120).png().toBuffer()), top: 0, left: 0 }])
			.png().toBuffer();
		const resized = await sharp(original).resize(90, 90).jpeg({ quality: 70 }).toBuffer();

		const a = await hashImage(original);
		const b = await hashImage(resized);
		expect(a).toBeTruthy();
		expect(isDuplicate(a, b)).toBe(true); // survives resize + recompression
	});

	it('gives a different hash to a visually different image', async () => {
		const left = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 240, g: 240, b: 240 } } })
			.composite([{ input: await img({ background: { r: 0, g: 0, b: 0 } }).then((b) => sharp(b).resize(100, 200).png().toBuffer()), top: 0, left: 0 }])
			.png().toBuffer();
		const top = await sharp({ create: { width: 200, height: 200, channels: 3, background: { r: 240, g: 240, b: 240 } } })
			.composite([{ input: await img({ background: { r: 0, g: 0, b: 0 } }).then((b) => sharp(b).resize(200, 100).png().toBuffer()), top: 0, left: 0 }])
			.png().toBuffer();

		const a = await hashImage(left);
		const b = await hashImage(top);
		expect(isDuplicate(a, b)).toBe(false);
		expect(hashDistance(a, b)).toBeGreaterThan(6);
	});

	it('returns null for unreadable data instead of throwing', async () => {
		expect(await hashImage(Buffer.from('not an image'))).toBeNull();
	});
});
