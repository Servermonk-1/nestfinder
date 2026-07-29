import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
	Users, Search, ShieldCheck, ShieldAlert, Ban, Check, RefreshCw,
	Home, Flag, Mail, Phone,
} from 'lucide-react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';

const FILTERS = ['all', 'verified', 'unverified', 'suspended'];

function Pill({ tone = 'muted', children }) {
	const tones = {
		muted: 'bg-surface-alt text-muted border-line',
		danger: 'bg-danger/10 text-danger-ink border-danger/30',
		success: 'bg-success/10 text-success-ink border-success/30',
		warn: 'bg-highlight/15 text-highlight-ink border-highlight/40',
	};
	return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

export default function ManageLandlords() {
	const [landlords, setLandlords] = useState([]);
	const [counts, setCounts] = useState({});
	const [status, setStatus] = useState('all');
	const [q, setQ] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(null);

	const load = useCallback(() => {
		setLoading(true);
		api.get('/admin/landlords', { params: { status: status === 'all' ? undefined : status, q: q || undefined } })
			.then(({ data }) => { setLandlords(data.landlords || []); setCounts(data.counts || {}); })
			.catch(() => toast.error('Could not load landlords'))
			.finally(() => setLoading(false));
	}, [status, q]);

	// Debounce the search so typing doesn't fire a request per keystroke.
	useEffect(() => {
		const t = setTimeout(load, q ? 350 : 0);
		return () => clearTimeout(t);
	}, [load, q]);

	const verify = async (id, name) => {
		setBusy(id);
		try {
			const { data } = await api.patch(`/admin/landlords/${id}/verify`);
			toast.success(data.message || `${name} verified`);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not verify'); }
		finally { setBusy(null); }
	};

	const toggleSuspend = async (id, currentlySuspended, name) => {
		const verb = currentlySuspended ? 'Unsuspend' : 'Suspend';
		if (!window.confirm(`${verb} ${name}? ${currentlySuspended ? 'They will be able to sign in again.' : 'They will not be able to sign in.'}`)) return;
		setBusy(id);
		try {
			const { data } = await api.patch(`/admin/landlords/${id}/suspend`);
			toast.success(data.message);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not update'); }
		finally { setBusy(null); }
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<AdminNavbar />
			<div className="mx-auto max-w-4xl px-4 pb-16 pt-24 md:px-8">
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
						<Users className="h-6 w-6 text-primary-ink" />
					</div>
					<div>
						<p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
							<span className="h-px w-6 bg-primary/50" /> Accounts
						</p>
						<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">Landlords</h1>
						<p className="text-sm text-muted">Verify, suspend, and review the people listing properties.</p>
					</div>
				</motion.div>

				<div className="mt-6 flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[220px]">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search name, email or phone…"
							aria-label="Search landlords"
							className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-sm text-text outline-none transition focus:border-primary/50"
						/>
					</div>
					<button onClick={load} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink">
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
					</button>
				</div>

				<div className="mt-3 flex flex-wrap gap-2">
					{FILTERS.map((s) => (
						<button key={s} onClick={() => setStatus(s)}
							className={`rounded-full border px-3.5 py-1.5 text-xs font-bold capitalize transition ${status === s ? 'border-primary/40 bg-primary/10 text-primary-ink' : 'border-line text-muted hover:text-text'}`}>
							{s} {counts[s] !== undefined && <span>({counts[s]})</span>}
						</button>
					))}
				</div>

				<div className="mt-6 space-y-3">
					{loading ? (
						[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />)
					) : landlords.length === 0 ? (
						<div className="rounded-2xl border border-line bg-surface py-16 text-center shadow-card">
							<Users className="mx-auto h-10 w-10 text-muted" />
							<p className="mt-4 font-serif text-lg font-bold text-text">No landlords found</p>
							<p className="mt-1 text-sm text-muted">{q ? 'Try a different search.' : `No ${status} landlords yet.`}</p>
						</div>
					) : (
						<AnimatePresence>
							{landlords.map((l) => (
								<motion.div key={l._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
									className="rounded-2xl border border-line bg-surface p-5 shadow-card">
									<div className="flex flex-wrap items-start justify-between gap-4">
										<div className="flex min-w-0 items-start gap-3">
											<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-bold text-white">
												{l.fullName?.charAt(0).toUpperCase() || '?'}
											</div>
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<p className="font-serif text-base font-bold text-text">{l.fullName}</p>
													{l.verified ? <Pill tone="success"><ShieldCheck className="h-3 w-3" /> verified</Pill>
														: <Pill tone="warn"><ShieldAlert className="h-3 w-3" /> unverified</Pill>}
													{l.suspended && <Pill tone="danger"><Ban className="h-3 w-3" /> suspended</Pill>}
												</div>
												<p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
													<span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {l.email}</span>
													{l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {l.phone}</span>}
												</p>
												<p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
													<span className="inline-flex items-center gap-1"><Home className="h-3 w-3" /> {l.listingCount} listing{l.listingCount !== 1 ? 's' : ''}</span>
													{l.flaggedCount > 0 && <span className="inline-flex items-center gap-1 font-bold text-danger-ink"><Flag className="h-3 w-3" /> {l.flaggedCount} flagged</span>}
													{l.createdAt && <span>joined {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</span>}
												</p>
											</div>
										</div>

										<div className="flex shrink-0 flex-wrap gap-2">
											{!l.verified && (
												<button onClick={() => verify(l._id, l.fullName)} disabled={busy === l._id}
													className="inline-flex items-center gap-1.5 rounded-xl border border-success/40 px-3.5 py-2 text-xs font-bold text-success-ink transition hover:bg-success/10 disabled:opacity-50">
													<Check className="h-3.5 w-3.5" /> Verify
												</button>
											)}
											<button onClick={() => toggleSuspend(l._id, l.suspended, l.fullName)} disabled={busy === l._id}
												className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:opacity-50 ${l.suspended ? 'border border-line text-muted hover:text-text' : 'bg-danger text-white hover:brightness-105'}`}>
												<Ban className="h-3.5 w-3.5" /> {l.suspended ? 'Unsuspend' : 'Suspend'}
											</button>
										</div>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					)}
				</div>
			</div>
		</div>
	);
}
