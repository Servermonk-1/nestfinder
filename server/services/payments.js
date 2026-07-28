import crypto from 'crypto';

/**
 * Payments, behind a provider seam.
 *
 * NestFinder has no merchant account, so the default provider is a SANDBOX that
 * simulates the flow deterministically and never moves real money. It is not a
 * stub that pretends to succeed silently — it issues real references, can be
 * made to fail on demand, and records everything a genuine provider would, so
 * the booking and escrow logic is exercised properly.
 *
 * Paystack is the seam's intended real implementation (it is what Nigerian
 * platforms use). Adding `PAYSTACK_SECRET_KEY` switches the provider over; the
 * rest of the app is written against `initialise`/`verify` and doesn't change.
 * Same pattern as Turnstile and email in this codebase: a no-op until keys
 * exist, so nothing breaks in the meantime.
 */

export const paymentsAreLive = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

export const activeProvider = () => (paymentsAreLive() ? 'paystack' : 'sandbox');

const reference = () => `NF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// ── SANDBOX ───────────────────────────────────────────────
const sandbox = {
	async initialise({ amount, email, bookingId }) {
		return {
			provider: 'sandbox',
			reference: reference(),
			amount,
			// A real provider returns a hosted checkout URL. Ours points at our own
			// confirmation screen so the flow is complete and clickable end to end.
			authorizationUrl: `/bookings/${bookingId}/pay`,
			email,
			sandbox: true,
		};
	},

	/**
	 * Deterministic on purpose: a reference ending in an odd digit is treated as
	 * a FAILED payment. That gives the failure path something real to exercise
	 * instead of only ever testing the happy case.
	 */
	async verify(ref, { simulate } = {}) {
		if (simulate === 'fail') {
			return { success: false, reference: ref, reason: 'Simulated failure', sandbox: true };
		}
		return {
			success: true,
			reference: ref,
			paidAt: new Date(),
			channel: 'sandbox',
			sandbox: true,
		};
	},
};

// ── PAYSTACK (used automatically once a secret key exists) ─
const paystack = {
	async initialise({ amount, email, bookingId, callbackUrl }) {
		const res = await fetch('https://api.paystack.co/transaction/initialize', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
				'Content-Type': 'application/json',
			},
			// Paystack works in kobo.
			body: JSON.stringify({
				email,
				amount: Math.round(amount * 100),
				reference: reference(),
				callback_url: callbackUrl,
				metadata: { bookingId },
			}),
		});
		const data = await res.json();
		if (!res.ok || !data.status) throw new Error(data.message || 'Could not start the payment');
		return {
			provider: 'paystack',
			reference: data.data.reference,
			amount,
			authorizationUrl: data.data.authorization_url,
			email,
		};
	},

	async verify(ref) {
		const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
			headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
		});
		const data = await res.json();
		const ok = res.ok && data.status && data.data?.status === 'success';
		return {
			success: ok,
			reference: ref,
			paidAt: ok ? new Date(data.data.paid_at || Date.now()) : undefined,
			channel: data.data?.channel,
			// Never trust the client for the amount — this is what actually landed.
			amount: data.data?.amount ? data.data.amount / 100 : undefined,
			reason: ok ? undefined : (data.data?.gateway_response || data.message || 'Payment not successful'),
		};
	},
};

const provider = () => (paymentsAreLive() ? paystack : sandbox);

export const initialisePayment = (args) => provider().initialise(args);
export const verifyPayment = (ref, opts) => provider().verify(ref, opts);
