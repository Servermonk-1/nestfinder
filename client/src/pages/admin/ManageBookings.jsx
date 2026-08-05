import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, Undo2, ClipboardList, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { statusMeta, TONE_CLASS } from '../../components/booking/bookingStatus';
import { naira } from '../../utils/price';
import api from '../../services/api';

const TABS = ['all', 'pending', 'pendingPayment', 'confirmed', 'movedIn', 'declined', 'cancelled'];

/**
 * Bookings from the platform's side.
 *
 * The escrow figure at the top is the number that matters: it is money the
 * platform is holding on students' behalf and does not own.
 */
export default function ManageBookings() {
	const [data, setData] = useState({ bookings: [], counts: {}, escrowHeldTotal: 0 });
	const [loading, setLoading] = useState(true);
	const [status, setStatus] = useState('confirmed'); // held money first — that's the live risk
	const [busy, setBusy] = useState('');

	const load = useCallback(() => {
		setLoading(true);
		api.get('/bookings/admin/all', { params: { status: status === 'all' ? undefined : status } })
			.then(({ data }) => setData(data))
			.catch(() => toast.error('Could not load bookings'))
			.finally(() => setLoading(false));
	}, [status]);

	useEffect(load, [load]);

	// Refunds are handled manually outside the application. The UI no longer
	// exposes an admin refund action to avoid calling an endpoint that was
	// removed during the payment architecture refactor.

	return (
		<AdminNavbar>
			<div className="mx-auto max-w-6xl px-6 pb-16 pt-10">
				<h1 className="font-serif text-3xl font-extrabold text-text">Bookings & escrow</h1>
				<p className="mt-1 text-sm text-muted">
					Applications, payments, and money the platform is currently holding for students.
				</p>

				{/* The number that matters most. */}
				<div className="mt-5 flex flex-wrap gap-3">
					<div className="rounded-2xl border border-success/30 bg-success/8 px-5 py-4">
						<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
							<ShieldCheck className="h-3.5 w-3.5 text-success-ink" /> Held in escrow
						</p>
						<p className="mt-1 font-serif text-2xl font-bold tabular-nums text-ink font-mono">{naira(data.escrowHeldTotal)}</p>
						<p className="text-xs text-muted">owed to students or landlords, not ours</p>
					</div>
					<div className="rounded-2xl border border-muted/15 bg-surface px-5 py-4">
						<p className="text-xs font-bold uppercase tracking-wide text-muted">Payment provider</p>
						<p className="mt-1 font-serif text-2xl font-bold text-ink capitalize">{data.provider || 'sandbox'}</p>
						<p className="text-xs text-muted">{data.paymentsAreLive ? 'live' : 'no real money moves'}</p>
					</div>
				</div>

				{!data.paymentsAreLive && (
					<p className="mt-3 flex items-start gap-2 text-xs text-muted">
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
						Sandbox mode. Payments are not live — configure bank-transfer and USDT settings in the admin payment settings to enable real transfers.
					</p>
				)}

				<div className="mb-5 mt-6 flex flex-wrap gap-2">
					{TABS.map((t) => (
						<button
							key={t}
							onClick={() => setStatus(t)}
							aria-pressed={status === t}
							className={`rounded-full px-4 py-2 text-xs font-bold capitalize transition ${
								status === t ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
							}`}
						>
							{t === 'movedIn' ? 'Moved in' : t}
							{data.counts?.[t] !== undefined && ` (${data.counts[t]})`}
						</button>
					))}
				</div>

				{loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : data.bookings.length === 0 ? (
					<div className="rounded-2xl border border-muted/15 bg-surface p-10 text-center">
						<ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted" />
						<p className="font-serif text-xl font-bold text-text">Nothing here</p>
						<p className="mt-1 text-sm text-muted">No bookings with this status.</p>
					</div>
				) : (
					<div className="space-y-3">
						{data.bookings.map((b, i) => {
							const meta = statusMeta(b.status);
							return (
								<motion.div
									key={b._id}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: Math.min(i * 0.02, 0.2) }}
									className="rounded-2xl border border-muted/15 bg-surface p-5"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="min-w-0">
											<div className="flex flex-wrap items-center gap-2">
												<Link to={`/bookings/${b._id}`} className="font-serif text-base font-bold text-text hover:text-primary-ink hover:underline">
													{b.listing?.title}
												</Link>
												<span className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${TONE_CLASS[meta.tone]}`}>
													{meta.label}
												</span>
											</div>
											<p className="mt-1 text-xs text-muted">
												{b.student?.fullName} → {b.landlord?.fullName}
												{' · '}{format(new Date(b.moveInDate), 'd MMM yyyy')} for {b.months} month{b.months === 1 ? '' : 's'}
											</p>
											{b.payment?.reference && (
												<p className="mt-1 font-mono text-[13px] text-muted">{b.payment.reference}</p>
											)}
											{b.escrow?.refundReason && (
												<p className="mt-1 text-xs text-danger-ink">Refunded — {b.escrow.refundReason}</p>
											)}
										</div>

										<div className="flex shrink-0 flex-col items-end gap-2">
											<span className="text-right">
												<span className="block font-serif text-lg font-bold tabular-nums text-primary-ink font-mono">
													{naira(b.cost?.total)}
												</span>
												<span className="text-[13px] text-muted">
													landlord {naira(b.cost?.landlordShare)} · us {naira(b.cost?.platformShare)}
												</span>
											</span>
											{b.escrow?.state === 'held' && (
												<button
													onClick={() => refund(b)}
													disabled={busy === b._id}
													className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-xs font-bold text-danger-ink disabled:opacity-60"
												>
													<Undo2 className="h-3.5 w-3.5" /> Refund
												</button>
											)}
										</div>
									</div>
								</motion.div>
							);
						})}
					</div>
				)}
			</div>
		</AdminNavbar>
	);
}
