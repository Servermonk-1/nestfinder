import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
	ArrowLeft, Loader2, ShieldCheck, CalendarDays, Home, CreditCard,
	CheckCircle2, XCircle, Info, MapPin, Undo2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import StudentNavbar from '../../components/common/StudentNavbar';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import CostBreakdown from '../../components/booking/CostBreakdown';
import { statusMeta, TONE_CLASS } from '../../components/booking/bookingStatus';
import { useAuth } from '../../context/AuthContext';
import { naira } from '../../utils/price';
import api from '../../services/api';

const when = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '—');

/**
 * One booking, from application through payment to move-in.
 *
 * Shared by the student and the landlord: the same record, the same timeline,
 * different available actions. Showing both sides the identical history is what
 * makes a dispute resolvable.
 */
export default function BookingDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();

	const [booking, setBooking] = useState(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);
	const [sandbox, setSandbox] = useState(true);

	const load = useCallback(() => {
		setLoading(true);
		api.get(`/bookings/${id}`)
			.then(({ data }) => { setBooking(data.booking); setSandbox(!data.paymentsAreLive); })
			.catch(() => setBooking(null))
			.finally(() => setLoading(false));
	}, [id]);

	useEffect(load, [load]);

	const isStudent = user?.role === 'student';
	const isLandlord = user?.role === 'landlord';

	const act = async (fn, successMsg) => {
		setBusy(true);
		try {
			const { data } = await fn();
			toast.success(successMsg || data.message);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Something went wrong');
		} finally {
			setBusy(false);
		}
	};

	// Sandbox pay: initialise, then verify. With Paystack keys present, the
	// initialise step would hand back a hosted checkout URL to redirect to.
	const pay = async (simulate) => {
		setBusy(true);
		try {
			const { data: init } = await api.post(`/bookings/${id}/pay`);
			if (!init.sandbox && init.authorizationUrl?.startsWith('http')) {
				window.location.href = init.authorizationUrl;
				return;
			}
			const { data } = await api.post(`/bookings/${id}/verify`, { reference: init.reference, simulate });
			toast.success(data.message);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Payment could not be completed');
			load();
		} finally {
			setBusy(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-paper">
				{isLandlord ? <LandlordNavbar /> : <StudentNavbar />}
				<div className="flex justify-center pt-40"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
			</div>
		);
	}

	if (!booking) {
		return (
			<div className="min-h-screen bg-paper text-text">
				{isLandlord ? <LandlordNavbar /> : <StudentNavbar />}
				<div className="mx-auto max-w-2xl px-6 pt-40 text-center">
					<h1 className="font-serif text-2xl font-bold">Booking not found</h1>
					<Link to={isLandlord ? '/landlord/bookings' : '/bookings'} className="mt-4 inline-block font-bold text-primary-ink hover:underline">
						Back to bookings
					</Link>
				</div>
			</div>
		);
	}

	const meta = statusMeta(booking.status);
	const escrowHeld = booking.escrow?.state === 'held';

	return (
		<div className="min-h-screen bg-paper text-text">
			{isLandlord ? <LandlordNavbar /> : <StudentNavbar />}

			<div className="mx-auto max-w-3xl px-6 pb-16 pt-28">
				<button
					onClick={() => navigate(isLandlord ? '/landlord/bookings' : '/bookings')}
					className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
				>
					<ArrowLeft className="h-4 w-4" /> Back to bookings
				</button>

				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
					<span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${TONE_CLASS[meta.tone]}`}>
						{meta.label}
					</span>
					<h1 className="mt-2 font-serif text-3xl font-extrabold text-text">{booking.listing?.title}</h1>
					<p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
						<MapPin className="h-4 w-4 shrink-0 text-primary-ink" />
						{[booking.listing?.area, booking.listing?.city].filter(Boolean).join(', ')}
					</p>
				</motion.div>

				<p className="mt-4 rounded-xl border border-muted/15 bg-surface p-4 text-sm text-text">
					{isLandlord ? meta.landlord : meta.student}
				</p>

				{/* ── The stay ── */}
				<div className="mt-6 grid gap-3 sm:grid-cols-3">
					<Fact icon={CalendarDays} label="Move in" value={when(booking.moveInDate)} />
					<Fact icon={CalendarDays} label="Move out" value={when(booking.moveOutDate)} />
					<Fact icon={Home} label="Length" value={`${booking.months} month${booking.months === 1 ? '' : 's'}`} />
				</div>

				{booking.message && (
					<div className="mt-4 rounded-xl border border-muted/10 bg-surface-alt/40 p-4">
						<p className="text-xs font-bold uppercase tracking-wide text-muted">Message from the student</p>
						<p className="mt-1 text-sm text-text">{booking.message}</p>
					</div>
				)}

				{/* ── Money ── */}
				<div className="mt-6">
					<CostBreakdown cost={booking.cost} showSplit={isLandlord || user?.role === 'admin'} />
				</div>

				{escrowHeld && (
					<p className="mt-3 flex items-start gap-2 rounded-xl border border-success/30 bg-success/8 p-4 text-sm text-text">
						<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" />
						<span>
							<span className="font-bold">{naira(booking.cost.total)} is being held by NestFinder.</span>{' '}
							{isLandlord
								? `${naira(booking.cost.landlordReceives)} will be released to you as soon as the student confirms they have moved in.`
								: 'It goes to the landlord only when you confirm you have moved in. If the room is not as advertised, contact support before confirming.'}
						</span>
					</p>
				)}

				{/* ── Actions ── */}
				<div className="mt-7 flex flex-wrap gap-3">
					{isLandlord && booking.status === 'pending' && (
						<>
							<button
								disabled={busy}
								onClick={() => act(() => api.patch(`/bookings/${id}/respond`, { accept: true }))}
								className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
							>
								<CheckCircle2 className="h-4 w-4" /> Accept application
							</button>
							<button
								disabled={busy}
								onClick={() => {
									const reason = window.prompt('Why are you declining? (optional, shown to the student)') ?? '';
									act(() => api.patch(`/bookings/${id}/respond`, { accept: false, reason }));
								}}
								className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-4 py-2.5 text-sm font-bold text-danger-ink disabled:opacity-60"
							>
								<XCircle className="h-4 w-4" /> Decline
							</button>
						</>
					)}

					{isStudent && booking.status === 'accepted' && (
						<>
							<button
								disabled={busy}
								onClick={() => pay()}
								className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
							>
								{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
								Pay {naira(booking.cost.total)}
							</button>
							{sandbox && (
								<button
									disabled={busy}
									onClick={() => pay('fail')}
									className="inline-flex items-center gap-2 rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted disabled:opacity-60"
									title="Sandbox only — exercises the failed-payment path"
								>
									Simulate a failed payment
								</button>
							)}
						</>
					)}

					{isStudent && ['pending', 'accepted'].includes(booking.status) && (
						<button
							disabled={busy}
							onClick={() => act(() => api.patch(`/bookings/${id}/cancel`))}
							className="inline-flex items-center gap-2 rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted disabled:opacity-60"
						>
							<Undo2 className="h-4 w-4" /> Withdraw
						</button>
					)}

					{isStudent && booking.status === 'paid' && (
						<button
							disabled={busy}
							onClick={() => {
								if (!window.confirm('Confirm you have moved in? This releases your payment to the landlord and cannot be undone.')) return;
								act(() => api.patch(`/bookings/${id}/moved-in`));
							}}
							className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
						>
							<CheckCircle2 className="h-4 w-4" /> I've moved in — release the payment
						</button>
					)}
				</div>

				{sandbox && ['accepted', 'paid'].includes(booking.status) && (
					<p className="mt-4 flex items-start gap-2 text-xs text-muted">
						<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
						Payments are running in <span className="font-bold">sandbox mode</span> — no real money moves.
						Adding a Paystack secret key switches this to live checkout without any other change.
					</p>
				)}

				{booking.status === 'movedIn' && isStudent && (
					<p className="mt-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-text">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
						You can now <Link to={`/listings/${booking.listing?._id}`} className="font-bold text-primary-ink hover:underline">review this home</Link> — reviews are only open to people who actually stayed.
					</p>
				)}

				{/* ── Timeline ── */}
				<div className="mt-8 border-t border-muted/10 pt-6">
					<h2 className="mb-3 font-serif text-lg font-bold text-text">History</h2>
					<ul className="space-y-2 text-sm text-muted">
						<Event when={booking.createdAt} text="Application sent" />
						<Event when={booking.respondedAt} text={booking.status === 'declined' ? `Landlord declined${booking.declineReason ? ` — "${booking.declineReason}"` : ''}` : 'Landlord accepted'} />
						<Event when={booking.cancelledAt} text="Student withdrew the application" />
						<Event when={booking.payment?.paidAt} text={`Payment received (${booking.payment?.reference})`} />
						<Event when={booking.escrow?.heldAt} text="Money held in escrow by NestFinder" />
						<Event when={booking.movedInConfirmedAt} text="Student confirmed move-in" />
						<Event when={booking.escrow?.releasedAt} text={`Escrow released — ${naira(booking.cost.landlordReceives)} to the landlord`} />
						<Event when={booking.escrow?.refundedAt} text={`Refunded to the student${booking.escrow?.refundReason ? ` — ${booking.escrow.refundReason}` : ''}`} />
					</ul>
				</div>
			</div>
		</div>
	);
}

function Fact({ icon: Icon, label, value }) {
	return (
		<div className="rounded-xl border border-muted/15 bg-surface p-4">
			<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
				<Icon className="h-3.5 w-3.5" /> {label}
			</p>
			<p className="mt-1 font-serif text-lg font-bold text-text">{value}</p>
		</div>
	);
}

function Event({ when: at, text }) {
	if (!at) return null;
	return (
		<li className="flex flex-wrap items-baseline gap-2">
			<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
			<span className="text-text">{text}</span>
			<span className="text-xs">{format(new Date(at), 'd MMM yyyy, HH:mm')}</span>
		</li>
	);
}
