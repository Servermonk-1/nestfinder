import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Loader2, Lock, CreditCard, ShieldCheck, CheckCircle2, XCircle,
	ArrowLeft, Info, Copy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentNavbar from '../../components/common/StudentNavbar';
import CostBreakdown from '../../components/booking/CostBreakdown';
import api from '../../services/api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

// Card numbers are grouped for readability while typing, then stripped before
// they are sent — the server matches on digits alone.
const groupCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const groupExpiry = (v) => {
	const d = v.replace(/\D/g, '').slice(0, 4);
	return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

/**
 * Checkout.
 *
 * The previous flow was a single button that initialised and verified in the
 * same breath, so paying looked like nothing happened. This is the step that
 * was missing: a real card form, a real processing state, real PIN and OTP
 * challenges, and a receipt at the end.
 *
 * The card numbers accepted here are Paystack's own published test cards, so
 * the behaviour matches what real test keys would do. Nothing entered on this
 * page is a real card, and no money moves.
 */
export default function CheckoutPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [booking, setBooking] = useState(null);
	const [init, setInit] = useState(null);
	const [loading, setLoading] = useState(true);

	const [card, setCard] = useState('');
	const [expiry, setExpiry] = useState('');
	const [cvv, setCvv] = useState('');
	const [pin, setPin] = useState('');
	const [otp, setOtp] = useState('');

	// idle → processing → challenge(pin|otp) → done | failed
	const [stage, setStage] = useState('idle');
	const [failure, setFailure] = useState('');
	const [receipt, setReceipt] = useState(null);

	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const { data } = await api.get(`/bookings/${id}`);
				if (!live) return;
				setBooking(data.booking);

				if (data.booking.status === 'paid' || data.booking.escrow?.state === 'held') {
					setStage('done');
					setReceipt({ reference: data.booking.payment?.reference, alreadyPaid: true });
					return;
				}
				if (data.booking.status !== 'accepted') return;

				// Reserve the reference up front, the way a provider does — so the
				// amount on screen is the amount the server will insist on.
				const { data: started } = await api.post(`/bookings/${id}/pay`);
				if (live) setInit(started);
			} catch (err) {
				if (live) toast.error(err.response?.data?.message || 'Could not open checkout');
			} finally {
				if (live) setLoading(false);
			}
		})();
		return () => { live = false; };
	}, [id]);

	const submit = useCallback(async (e) => {
		e?.preventDefault();
		setStage('processing');
		setFailure('');
		try {
			const { data } = await api.post(`/bookings/${id}/verify`, {
				reference: init?.reference,
				card: card.replace(/\s/g, ''),
				pin: pin || undefined,
				otp: otp || undefined,
			});

			// Not a failure — the provider wants another factor.
			if (data.challenge) {
				setStage(data.challenge);
				toast(data.message, { icon: '🔒' });
				return;
			}
			setReceipt({ reference: data.booking?.payment?.reference, booking: data.booking });
			setStage('done');
		} catch (err) {
			setFailure(err.response?.data?.message || 'Payment could not be completed.');
			setStage('failed');
		}
	}, [id, init, card, pin, otp]);

	const retry = () => { setStage('idle'); setFailure(''); setPin(''); setOtp(''); };

	if (loading) {
		return (
			<div className="min-h-screen bg-paper">
				<StudentNavbar />
				<div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
			</div>
		);
	}

	if (!booking) {
		return (
			<div className="min-h-screen bg-paper text-text">
				<StudentNavbar />
				<div className="mx-auto max-w-lg px-6 pt-32 text-center">
					<p className="font-serif text-xl font-bold">Booking not found</p>
					<Link to="/bookings" className="mt-4 inline-block bg-primary px-5 py-2.5 text-sm font-semibold text-white">
						Back to bookings
					</Link>
				</div>
			</div>
		);
	}

	// ── RECEIPT ──
	if (stage === 'done') {
		return (
			<div className="min-h-screen bg-paper text-text">
				<StudentNavbar />
				<div className="mx-auto max-w-lg px-6 pb-20 pt-28">
					<motion.div
						initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
						className="border border-line bg-surface p-8 text-center shadow-card"
					>
						<motion.div
							initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
							transition={{ delay: 0.1, type: 'spring', stiffness: 220, damping: 18 }}
							className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/12"
						>
							<CheckCircle2 className="h-8 w-8 text-success-ink" strokeWidth={2} />
						</motion.div>

						<h1 className="font-serif text-2xl font-extrabold">
							{receipt?.alreadyPaid ? 'Already paid' : 'Payment received'}
						</h1>
						<p className="mx-auto mt-2 max-w-sm text-sm text-muted">
							{naira(booking.cost.total)} is now held by NestFinder. The landlord is told your
							place is secured, but receives nothing until you confirm you have moved in.
						</p>

						<div className="mt-6 space-y-2 border-t border-line pt-5 text-left">
							<Row label="Amount" value={naira(booking.cost.total)} />
							<Row label="Reference" value={receipt?.reference} mono copyable />
							<Row label="Status" value="Held in escrow" />
						</div>

						<div className="mt-6 flex flex-col gap-2">
							<button
								onClick={() => navigate(`/bookings/${id}`)}
								className="w-full bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark"
							>
								View this booking
							</button>
							<Link to="/bookings" className="px-5 py-2 text-sm font-semibold text-muted hover:text-text">
								All my bookings
							</Link>
						</div>
					</motion.div>
				</div>
			</div>
		);
	}

	if (booking.status !== 'accepted') {
		return (
			<div className="min-h-screen bg-paper text-text">
				<StudentNavbar />
				<div className="mx-auto max-w-lg px-6 pt-32 text-center">
					<p className="font-serif text-xl font-bold">This booking is not awaiting payment</p>
					<p className="mt-2 text-sm text-muted">
						Its status is <span className="font-semibold text-text">{booking.status}</span>.
					</p>
					<Link to={`/bookings/${id}`} className="mt-5 inline-block bg-primary px-5 py-2.5 text-sm font-semibold text-white">
						Back to the booking
					</Link>
				</div>
			</div>
		);
	}

	const busy = stage === 'processing';
	const challenging = stage === 'pin' || stage === 'otp';

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />

			<div className="mx-auto max-w-4xl px-6 pb-20 pt-28">
				<Link to={`/bookings/${id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
					<ArrowLeft className="h-4 w-4" /> Back to the booking
				</Link>

				{init?.sandbox && (
					<div className="mb-6 flex items-start gap-3 border border-highlight/40 bg-highlight/10 p-4">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-highlight-ink" />
						<p className="text-sm">
							<span className="font-bold">Test mode — no real money moves.</span>{' '}
							This checkout accepts Paystack's published test cards and behaves the way their
							test environment does. Never enter a real card here.
						</p>
					</div>
				)}

				<div className="grid gap-6 md:grid-cols-[1.15fr_1fr]">
					{/* ── Card form ── */}
					<div className="border border-line bg-surface p-6 shadow-card">
						<div className="mb-5 flex items-center justify-between">
							<h1 className="font-serif text-xl font-extrabold">Pay {naira(booking.cost.total)}</h1>
							<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
								<Lock className="h-3.5 w-3.5" /> Secured
							</span>
						</div>

						<form onSubmit={submit} className="space-y-4">
							<Field label="Card number">
								<div className="relative">
									<CreditCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
									<input
										value={card}
										onChange={(e) => setCard(groupCard(e.target.value))}
										inputMode="numeric"
										autoComplete="off"
										placeholder="0000 0000 0000 0000"
										disabled={busy || challenging}
										className="w-full border border-line bg-surface-alt py-3 pl-10 pr-3 font-mono text-sm outline-none focus:border-primary disabled:opacity-60"
									/>
								</div>
							</Field>

							<div className="grid grid-cols-2 gap-3">
								<Field label="Expiry">
									<input
										value={expiry}
										onChange={(e) => setExpiry(groupExpiry(e.target.value))}
										inputMode="numeric" placeholder="MM/YY"
										disabled={busy || challenging}
										className="w-full border border-line bg-surface-alt px-3 py-3 font-mono text-sm outline-none focus:border-primary disabled:opacity-60"
									/>
								</Field>
								<Field label="CVV">
									<input
										value={cvv}
										onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
										inputMode="numeric" placeholder="123"
										disabled={busy || challenging}
										className="w-full border border-line bg-surface-alt px-3 py-3 font-mono text-sm outline-none focus:border-primary disabled:opacity-60"
									/>
								</Field>
							</div>

							{/* Extra factors appear only when the provider asks for them. */}
							<AnimatePresence>
								{stage === 'pin' && (
									<Challenge key="pin" label="Card PIN" hint="This card is PIN-protected.">
										<input
											autoFocus value={pin} inputMode="numeric" placeholder="••••"
											onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
											className="w-full border border-primary/50 bg-surface px-3 py-3 text-center font-mono text-lg tracking-[0.5em] outline-none focus:border-primary"
										/>
									</Challenge>
								)}
								{stage === 'otp' && (
									<Challenge key="otp" label="One-time code" hint="Sent to the phone on this account.">
										<input
											autoFocus value={otp} inputMode="numeric" placeholder="000000"
											onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
											className="w-full border border-primary/50 bg-surface px-3 py-3 text-center font-mono text-lg tracking-[0.4em] outline-none focus:border-primary"
										/>
									</Challenge>
								)}
							</AnimatePresence>

							{stage === 'failed' && (
								<motion.div
									initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
									className="flex items-start gap-2 border border-danger/40 bg-danger/8 p-3.5 text-sm"
								>
									<XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
									<span>
										<span className="font-bold text-danger-ink">Payment failed.</span> {failure}
									</span>
								</motion.div>
							)}

							{stage === 'failed' ? (
								<button type="button" onClick={retry}
									className="w-full bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark">
									Try again
								</button>
							) : (
								<button
									type="submit"
									disabled={busy || !card.replace(/\s/g, '')}
									className="flex w-full items-center justify-center gap-2 bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
								>
									{busy
										? <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
										: challenging
											? <>Confirm</>
											: <><Lock className="h-4 w-4" /> Pay {naira(booking.cost.total)}</>}
								</button>
							)}
						</form>

						<p className="mt-4 flex items-start gap-2 text-xs text-muted">
							<ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-ink" />
							Your money is held by NestFinder, not sent to the landlord. It is released only
							when you confirm you have moved in — and refundable before that.
						</p>
					</div>

					{/* ── Summary + test cards ── */}
					<div className="space-y-4">
						<div className="border border-line bg-surface p-5 shadow-card">
							<h2 className="label-meta mb-3">What you are paying for</h2>
							<p className="font-serif text-base font-bold">{booking.listing?.title}</p>
							<p className="mt-0.5 text-sm text-muted">
								{[booking.listing?.area, booking.listing?.city].filter(Boolean).join(', ')}
							</p>
							<div className="mt-4 border-t border-line pt-4">
								<CostBreakdown cost={booking.cost} />
							</div>
						</div>

						{init?.testCards?.length > 0 && (
							<div className="border border-line bg-surface-alt p-5">
								<h2 className="label-meta mb-3">Test cards</h2>
								<p className="mb-3 text-xs text-muted">
									Any future expiry date works. Tap a card to fill the form.
								</p>
								<ul className="space-y-2">
									{init.testCards.map((c) => (
										<li key={c.number}>
											<button
												type="button"
												onClick={() => { setCard(c.number); setCvv(c.cvv); setExpiry('12/30'); retry(); }}
												className="w-full border border-line bg-surface p-2.5 text-left transition hover:border-primary/50"
											>
												<span className="block font-mono text-xs">{c.number}</span>
												<span className="mt-0.5 block text-xs text-muted">
													CVV {c.cvv}{c.pin ? ` · PIN ${c.pin}` : ''}{c.otp ? ` · OTP ${c.otp}` : ''} — {c.label}
												</span>
											</button>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

function Field({ label, children }) {
	return (
		<label className="block">
			<span className="label-meta mb-1.5 block">{label}</span>
			{children}
		</label>
	);
}

function Challenge({ label, hint, children }) {
	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
			className="overflow-hidden"
		>
			<div className="border border-primary/30 bg-primary/[0.04] p-4">
				<p className="label-meta mb-1">{label}</p>
				<p className="mb-2.5 text-xs text-muted">{hint}</p>
				{children}
			</div>
		</motion.div>
	);
}

function Row({ label, value, mono, copyable }) {
	return (
		<div className="flex items-baseline justify-between gap-3">
			<span className="text-sm text-muted">{label}</span>
			<span className={`text-sm font-semibold ${mono ? 'font-mono text-xs' : ''}`}>
				{value || '—'}
				{copyable && value && (
					<button
						onClick={() => { navigator.clipboard?.writeText(value); toast.success('Reference copied'); }}
						aria-label="Copy reference"
						className="ml-1.5 align-middle text-muted hover:text-text"
					>
						<Copy className="inline h-3 w-3" />
					</button>
				)}
			</span>
		</div>
	);
}
