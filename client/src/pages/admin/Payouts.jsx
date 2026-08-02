import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Banknote, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import AdminNavbar from '../../components/admin/AdminNavbar';
import { naira } from '../../utils/price';
import api from '../../services/api';

const when = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '—');

/**
 * What the platform owes, and to whom.
 *
 * Releasing escrow settles who money belongs to; it does not move it. Nothing in
 * this system can make a bank transfer, so every released booking becomes a debt
 * that a person has to settle and record here.
 *
 * Before this screen existed the interface simply announced that the landlord
 * had been paid, and the obligation was invisible.
 */
export default function Payouts() {
	const [tab, setTab] = useState('due');
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState('');

	const load = useCallback((state) => {
		setLoading(true);
		api.get('/bookings/admin/payouts', { params: { state } })
			.then(({ data }) => setData(data))
			.catch(() => toast.error('Could not load payouts'))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => { load(tab); }, [load, tab]);

	const markPaid = async (b) => {
		const reference = window.prompt(
			`Bank transfer reference for ${naira(b.payout?.amount)} to ${b.landlord?.fullName}?\n\n`
			+ 'This is recorded so the payment can be checked against a statement.'
		);
		if (reference === null) return;
		if (!reference.trim()) { toast.error('A transfer reference is required'); return; }

		setBusy(b._id);
		try {
			await api.patch(`/bookings/admin/payouts/${b._id}/paid`, { reference: reference.trim() });
			toast.success('Payout recorded');
			load(tab);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not record the payout');
		} finally {
			setBusy('');
		}
	};

	const rows = data?.bookings || [];

	return (
		<div className="min-h-screen bg-paper text-text">
			<AdminNavbar />

			<div className="mx-auto max-w-6xl px-6 pb-16 pt-28">
				<h1 className="font-serif text-3xl font-extrabold">Payouts</h1>
				<p className="mt-1 text-sm text-muted">
					Money the platform owes landlords for stays students have confirmed.
				</p>

				<div className="mt-6 grid gap-3 sm:grid-cols-2">
					<Stat label="Owed right now" value={naira(data?.totalDue)} tone="due" icon={AlertTriangle} />
					<Stat label="Paid out to date" value={naira(data?.totalPaid)} tone="paid" icon={CheckCircle2} />
				</div>

				<p className="mt-4 flex items-start gap-2 border border-highlight/40 bg-highlight/10 p-4 text-sm">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-highlight-ink" />
					<span>
						<span className="font-bold">NestFinder cannot move money.</span> Releasing escrow only
						settles who it belongs to. Each landlord below has to be paid by bank transfer, then
						marked off here with the transfer reference.
					</span>
				</p>

				<div className="mt-6 flex gap-2">
					{['due', 'paid'].map((t) => (
						<button
							key={t}
							onClick={() => setTab(t)}
							className={`px-4 py-2 text-sm font-semibold transition ${
								tab === t ? 'bg-primary text-white' : 'border border-line bg-surface text-muted hover:text-text'
							}`}
						>
							{t === 'due' ? 'Owed' : 'Paid'}
						</button>
					))}
				</div>

				{loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : rows.length === 0 ? (
					<div className="mt-4 border border-line bg-surface p-12 text-center">
						<Banknote className="mx-auto mb-3 h-8 w-8 text-success-ink" />
						<p className="font-serif text-xl font-bold">
							{tab === 'due' ? 'Nothing is owed' : 'Nothing paid out yet'}
						</p>
						<p className="mt-1 text-sm text-muted">
							{tab === 'due'
								? 'Every confirmed stay has been settled with its landlord.'
								: 'Recorded payouts will appear here with their transfer references.'}
						</p>
					</div>
				) : (
					<div className="mt-4 space-y-3">
						{rows.map((b, i) => {
							const bank = b.landlord?.payout;
							const payable = Boolean(bank?.bankName && bank?.accountNumber && bank?.accountName);
							return (
								<motion.div
									key={b._id}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: Math.min(i * 0.03, 0.25) }}
									className="border border-line bg-surface p-5"
								>
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="min-w-0 flex-1">
											<Link to={`/bookings/${b._id}`} className="font-serif text-base font-bold hover:text-primary-ink hover:underline">
												{b.listing?.title}
											</Link>
											<p className="mt-0.5 text-sm text-muted">
												{b.landlord?.fullName} · stay confirmed by {b.student?.fullName}
											</p>

											{/* Where the money is supposed to go. Without this the payout
											    cannot honestly be marked as made. */}
											<div className="mt-3 border border-line bg-surface-alt p-3">
												{payable ? (
													<p className="font-mono text-xs">
														{bank.bankName} · {bank.accountNumber}
														<span className="block text-muted">{bank.accountName}</span>
													</p>
												) : (
													<p className="flex items-start gap-2 text-xs text-danger-ink">
														<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
														<span>
															<span className="font-bold">No bank details on file.</span> This landlord
															cannot be paid until they add an account to their profile.
														</span>
													</p>
												)}
											</div>

											<p className="mt-2 font-mono text-xs text-muted">
												{tab === 'due'
													? `owed since ${when(b.payout?.dueAt)}`
													: `paid ${when(b.payout?.paidAt)} · ref ${b.payout?.reference}`}
											</p>
										</div>

										<div className="shrink-0 text-right">
											<p className="font-mono text-lg font-bold tabular-nums">{naira(b.payout?.amount)}</p>
											{tab === 'due' && (
												<button
													onClick={() => markPaid(b)}
													disabled={busy === b._id || !payable}
													title={payable ? '' : 'Add bank details first'}
													className="mt-2 inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 text-xs font-bold text-white transition hover:bg-primary-dark disabled:opacity-50"
												>
													{busy === b._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
													Record transfer
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
		</div>
	);
}

function Stat({ label, value, tone, icon: Icon }) {
	const c = tone === 'due' ? 'text-danger-ink' : 'text-success-ink';
	return (
		<div className="border border-line bg-surface p-5">
			<p className="label-meta flex items-center gap-1.5">
				<Icon className={`h-3.5 w-3.5 ${c}`} strokeWidth={1.75} /> {label}
			</p>
			<p className={`mt-1 font-mono text-2xl font-bold tabular-nums ${c}`}>{value}</p>
		</div>
	);
}
