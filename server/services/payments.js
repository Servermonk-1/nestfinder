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

/**
 * Paystack's OWN published test cards, and their real outcomes.
 *
 * Using the same numbers the live test mode uses is the whole point: what a
 * student types here is what they would type against `sk_test_`, and the same
 * card produces the same result. Nothing about the demo has to be relearned if
 * a real test key is added later — the checkout screen simply hands off to
 * Paystack's hosted page instead of ours.
 *
 * Source: paystack.com/docs/payments/test-payments
 */
const TEST_CARDS = {
	'4084084084084081': { ok: true, auth: 'none' },
	'507850785078507812': { ok: true, auth: 'pin', pin: '1111' },
	'5060666666666666666': { ok: true, auth: 'pin_otp', pin: '1234', otp: '123456' },
	'4084080000005408': { ok: false, reason: 'Your card was declined by the issuing bank.' },
	'4084080000670037': { ok: false, reason: 'Insufficient funds in the account.' },
};

// ── SANDBOX ───────────────────────────────────────────────
const sandbox = {
	async initialise({ amount, email, bookingId }) {
		return {
			provider: 'sandbox',
			reference: reference(),
			amount,
			// A real provider returns a hosted checkout URL. Ours points at our own
			// checkout screen so the flow is complete and clickable end to end.
			authorizationUrl: `/bookings/${bookingId}/pay`,
			email,
			sandbox: true,
		};
	},

	/**
	 * Outcome comes from the CARD, exactly as it does in Paystack test mode —
	 * not from a debug flag. `challenge` is not a failure: it is the provider
	 * asking for a PIN or an OTP, and the checkout re-submits with it.
	 */
	async verify(ref, { card, pin, otp } = {}) {
		const digits = String(card || '').replace(/\D/g, '');
		if (!digits) return { success: false, reference: ref, reason: 'Enter a card number.', sandbox: true };

		const t = TEST_CARDS[digits];
		// An unknown number is declined rather than quietly accepted — otherwise
		// the screen would teach that any card works, which is the opposite of
		// what a payment form should demonstrate.
		if (!t) {
			return { success: false, reference: ref, sandbox: true,
				reason: 'Card declined. Use one of the test cards listed on this page.' };
		}
		if (!t.ok) return { success: false, reference: ref, reason: t.reason, sandbox: true };

		if (t.auth === 'pin' || t.auth === 'pin_otp') {
			if (!pin) return { success: false, challenge: 'pin', reference: ref, sandbox: true,
				reason: 'Enter the 4-digit PIN for this card.' };
			if (pin !== t.pin) return { success: false, reference: ref, reason: 'Incorrect PIN.', sandbox: true };
		}
		if (t.auth === 'pin_otp') {
			if (!otp) return { success: false, challenge: 'otp', reference: ref, sandbox: true,
				reason: 'Enter the OTP sent to the phone on this account.' };
			if (otp !== t.otp) return { success: false, reference: ref, reason: 'Incorrect OTP.', sandbox: true };
		}

		return {
			success: true,
			reference: ref,
			paidAt: new Date(),
			channel: 'card',
			last4: digits.slice(-4),
			sandbox: true,
		};
	},
};

// Shown on the checkout screen so the tester does not have to leave the app to
// find them. Never includes a card that would be mistaken for a real one.
export const sandboxTestCards = () => ([
	{ number: '4084 0840 8408 4081', cvv: '408', label: 'Succeeds immediately' },
	{ number: '5078 5078 5078 5078 12', cvv: '081', pin: '1111', label: 'Succeeds after PIN' },
	{ number: '5060 6666 6666 6666 666', cvv: '123', pin: '1234', otp: '123456', label: 'Succeeds after PIN + OTP' },
	{ number: '4084 0800 0000 5408', cvv: '001', label: 'Declined by issuer' },
	{ number: '4084 0800 0067 0037', cvv: '787', label: 'Insufficient funds' },
]);

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
