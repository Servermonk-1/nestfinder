import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
	Building2, Search, Flag, Trash2, RefreshCw, ExternalLink,
	ShieldCheck, ShieldAlert, MapPin, Eye, Home, ScanLine, ChevronDown, AlertTriangle,
} from 'lucide-react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';
import { getImageUrl } from '../../utils/urlHelper';
import { formatPrice } from '../../utils/price';

const FILTERS = ['all', 'risky', 'flagged', 'reported'];

// Fraud Shield risk styling.
const RISK = {
	high:   { label: 'High risk',   cls: 'border-danger/40 bg-danger/10 text-danger-ink' },
	medium: { label: 'Medium risk', cls: 'border-highlight/50 bg-highlight/15 text-highlight-ink' },
	low:    { label: 'Low risk',    cls: 'border-line bg-surface-alt text-muted' },
};

/** The Fraud Shield verdict for one listing — score plus the reasons behind it. */
function FraudPanel({ listing }) {
	const [open, setOpen] = useState(false);
	const level = listing.fraudLevel;
	if (!level || level === 'clear') {
		return listing.fraudCheckedAt ? (
			<span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success-ink">
				<ShieldCheck className="h-3 w-3" /> screened · clear
			</span>
		) : null;
	}
	const tone = RISK[level] || RISK.low;
	return (
		<div className="mt-2">
			<button onClick={() => setOpen((v) => !v)} aria-expanded={open}
				className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${tone.cls}`}>
				<AlertTriangle className="h-3 w-3" />
				{tone.label} · {listing.fraudScore}/100
				<ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence>
				{open && (
					<motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
						className="mt-2 space-y-1.5 overflow-hidden rounded-xl border border-line bg-surface-alt/60 p-3">
						{(listing.fraudFlags || []).map((f) => (
							<li key={f.rule} className="text-[11px] leading-relaxed text-text">
								<span className="font-bold text-danger-ink">{f.rule}</span>
								<span className="text-muted"> (+{f.severity})</span> — {f.detail}
							</li>
						))}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function ManageListings() {
	const [listings, setListings] = useState([]);
	const [counts, setCounts] = useState({});
	const [filter, setFilter] = useState('all');
	const [q, setQ] = useState('');
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(null);
	const [scanning, setScanning] = useState(false);

	const load = useCallback(() => {
		setLoading(true);
		api.get('/admin/listings', { params: { filter: filter === 'all' ? undefined : filter, q: q || undefined } })
			.then(({ data }) => { setListings(data.listings || []); setCounts(data.counts || {}); })
			.catch(() => toast.error('Could not load listings'))
			.finally(() => setLoading(false));
	}, [filter, q]);

	useEffect(() => {
		const t = setTimeout(load, q ? 350 : 0);
		return () => clearTimeout(t);
	}, [load, q]);

	const rescanAll = async () => {
		setScanning(true);
		try {
			const { data } = await api.post('/admin/listings/rescan');
			toast.success(data.message);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Screening failed'); }
		finally { setScanning(false); }
	};

	const toggleFlag = async (id, flagged) => {
		setBusy(id);
		try {
			const { data } = await api.patch(`/admin/listings/${id}/flag`, { flagged: !flagged });
			toast.success(data.message);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not update'); }
		finally { setBusy(null); }
	};

	const remove = async (id, title) => {
		if (!window.confirm(`Permanently remove “${title}”? This cannot be undone.`)) return;
		setBusy(id);
		try {
			await api.delete(`/admin/listings/${id}`);
			toast.success('Listing removed');
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not remove listing'); }
		finally { setBusy(null); }
	};

	return (
		<div className="min-h-screen bg-base text-text">
			<AdminNavbar />
			<div className="mx-auto max-w-4xl px-4 pb-16 pt-24 md:px-8">
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
						<Building2 className="h-6 w-6 text-primary-ink" />
					</div>
					<div>
						<p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
							<span className="h-px w-6 bg-primary/50" /> Properties
						</p>
						<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">Listings</h1>
						<p className="text-sm text-muted">Review flagged and reported properties, and remove bad ones.</p>
					</div>
				</motion.div>

				<div className="mt-6 flex flex-wrap items-center gap-3">
					<div className="relative flex-1 min-w-[220px]">
						<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
						<input
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search title, city or area…"
							aria-label="Search listings"
							className="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-sm text-text outline-none transition focus:border-primary/50"
						/>
					</div>
					<button onClick={rescanAll} disabled={scanning}
						className="flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-60">
						<ScanLine className={`h-4 w-4 ${scanning ? 'animate-pulse' : ''}`} /> {scanning ? 'Screening…' : 'Run Fraud Shield'}
					</button>
					<button onClick={load} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink">
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
					</button>
				</div>

				<div className="mt-3 flex flex-wrap gap-2">
					{FILTERS.map((f) => (
						<button key={f} onClick={() => setFilter(f)}
							className={`rounded-full border px-3.5 py-1.5 text-xs font-bold capitalize transition ${filter === f ? 'border-primary/40 bg-primary/10 text-primary-ink' : 'border-line text-muted hover:text-text'}`}>
							{f} {counts[f] !== undefined && <span>({counts[f]})</span>}
						</button>
					))}
				</div>

				<div className="mt-6 space-y-3">
					{loading ? (
						[...Array(3)].map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />)
					) : listings.length === 0 ? (
						<div className="rounded-2xl border border-line bg-surface py-16 text-center shadow-card">
							<Home className="mx-auto h-10 w-10 text-muted" />
							<p className="mt-4 font-serif text-lg font-bold text-text">No listings found</p>
							<p className="mt-1 text-sm text-muted">{q ? 'Try a different search.' : `Nothing ${filter === 'all' ? 'here' : filter} right now.`}</p>
						</div>
					) : (
						<AnimatePresence>
							{listings.map((l) => (
								<motion.div key={l._id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
									className={`rounded-2xl border bg-surface p-4 shadow-card ${l.flagged ? 'border-danger/40' : 'border-line'}`}>
									<div className="flex flex-wrap items-start gap-4">
										<div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-alt">
											{l.images?.[0] ? (
												<img src={getImageUrl(l.images[0])} alt="" loading="lazy" className="h-full w-full object-cover" />
											) : (
												<div className="flex h-full w-full items-center justify-center"><Home className="h-5 w-5 text-muted" /></div>
											)}
										</div>

										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-serif text-base font-bold text-text">{l.title}</p>
												{l.flagged && <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger-ink"><Flag className="h-3 w-3" /> flagged</span>}
												{l.reportCount > 0 && <span className="rounded-full border border-highlight/40 bg-highlight/15 px-2 py-0.5 text-[10px] font-bold text-highlight-ink">{l.reportCount} report{l.reportCount !== 1 ? 's' : ''}</span>}
											</div>
											<p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
												<span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {l.area}, {l.city}</span>
												<span className="font-bold text-primary-ink">{formatPrice(l)}</span>
												<span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {l.views || 0}</span>
												{l.createdAt && <span>{formatDistanceToNow(new Date(l.createdAt), { addSuffix: true })}</span>}
											</p>
											<p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
												by <span className="font-semibold text-text">{l.landlord?.fullName || 'Unknown'}</span>
												{l.landlord?.verified
													? <ShieldCheck className="h-3 w-3 text-success-ink" />
													: <ShieldAlert className="h-3 w-3 text-highlight-ink" />}
												{l.landlord?.suspended && <span className="font-bold text-danger-ink">· suspended</span>}
											{typeof l.landlord?.trustScore === 'number' && (
												<span className="text-muted">· trust {l.landlord.trustScore}/100</span>
											)}
											</p>
											<FraudPanel listing={l} />
										</div>

										<div className="flex shrink-0 flex-wrap gap-2">
											<Link to={`/listings/${l._id}`} target="_blank"
												className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-primary-ink transition hover:border-primary/40">
												View <ExternalLink className="h-3 w-3" />
											</Link>
											<button onClick={() => toggleFlag(l._id, l.flagged)} disabled={busy === l._id}
												className="inline-flex items-center gap-1.5 rounded-xl border border-line px-3 py-2 text-xs font-bold text-muted transition hover:border-highlight/50 hover:text-highlight-ink disabled:opacity-50">
												<Flag className="h-3.5 w-3.5" /> {l.flagged ? 'Unflag' : 'Flag'}
											</button>
											<button onClick={() => remove(l._id, l.title)} disabled={busy === l._id}
												className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-3 py-2 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-50">
												<Trash2 className="h-3.5 w-3.5" /> Remove
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
