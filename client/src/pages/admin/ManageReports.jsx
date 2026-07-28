import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import {
	Flag, ShieldAlert, ShieldCheck, MessageSquare, Home, Trash2, Ban,
	Check, X, RefreshCw, ChevronDown, Loader2, ExternalLink,
} from 'lucide-react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';
import { formatPrice } from '../../utils/price';

const TABS = [
	{ key: 'listing', label: 'Listing reports', icon: Home },
	{ key: 'user', label: 'Chat reports', icon: MessageSquare },
];
const STATUSES = ['open', 'resolved', 'dismissed'];

const REASON_LABELS = {
	fake: 'Fake or fraudulent listing', overpriced: 'Overpriced', misleading: 'Misleading info', other: 'Other',
	scam: 'Scam or fraud', harassment: 'Harassment or abuse', spam: 'Spam', impersonation: 'Impersonation',
};

function Pill({ tone = 'muted', children }) {
	const tones = {
		muted: 'bg-surface-alt text-muted border-line',
		danger: 'bg-danger/10 text-danger-ink border-danger/30',
		success: 'bg-success/10 text-success-ink border-success/30',
		warn: 'bg-highlight/15 text-highlight-ink border-highlight/40',
	};
	return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${tones[tone]}`}>{children}</span>;
}

/** The recent messages behind a chat report — loaded on demand. */
function ConversationContext({ reportId }) {
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState(null);
	const [loading, setLoading] = useState(false);

	const toggle = async () => {
		const next = !open;
		setOpen(next);
		if (next && messages === null) {
			setLoading(true);
			try {
				const { data } = await api.get(`/admin/reports/user/${reportId}/messages`);
				setMessages(data.messages || []);
			} catch { setMessages([]); }
			finally { setLoading(false); }
		}
	};

	return (
		<div className="mt-3">
			<button onClick={toggle} aria-expanded={open} className="flex items-center gap-1.5 text-xs font-bold text-primary-ink hover:underline">
				<MessageSquare className="h-3.5 w-3.5" />
				{open ? 'Hide conversation' : 'View conversation'}
				<ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence>
				{open && (
					<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
						<div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-line bg-surface-alt/50 p-3">
							<p className="text-[10px] font-bold uppercase tracking-wide text-muted">Shown for moderation · last 20 messages</p>
							{loading ? (
								<p className="text-xs text-muted">Loading…</p>
							) : !messages?.length ? (
								<p className="text-xs text-muted">No messages in this conversation.</p>
							) : messages.map((m, i) => (
								<div key={i} className={`max-w-[85%] rounded-lg px-3 py-1.5 text-xs ${m.senderRole === 'landlord' ? 'bg-royal/10 text-text' : 'ml-auto bg-primary/10 text-text'}`}>
									<span className="block text-[10px] font-bold uppercase tracking-wide text-muted">{m.senderRole}</span>
									{m.text}
								</div>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function ReportCard({ report, type, onReview, onAction, busy }) {
	const [note, setNote] = useState('');
	const isListing = type === 'listing';
	const subject = isListing ? report.listing : report.reportedUser;
	const reporter = isListing ? report.reporter : report.reporterUser;

	return (
		<motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}
			className="rounded-2xl border border-line bg-surface p-5 shadow-card">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<Pill tone="danger"><Flag className="h-3 w-3" /> {REASON_LABELS[report.reason] || report.reason}</Pill>
						{report.status !== 'open' && (
							<Pill tone={report.status === 'resolved' ? 'success' : 'muted'}>{report.status}</Pill>
						)}
						{!isListing && subject?.suspended && <Pill tone="danger">suspended</Pill>}
						{!isListing && (subject?.verified
							? <Pill tone="success"><ShieldCheck className="h-3 w-3" /> verified</Pill>
							: <Pill tone="warn"><ShieldAlert className="h-3 w-3" /> unverified</Pill>)}
					</div>

					<p className="mt-2 font-serif text-base font-bold text-text">
						{isListing
							? (subject?.title || 'Listing removed')
							: `${subject?.fullName || 'Unknown'} (${report.reportedRole})`}
					</p>
					<p className="text-xs text-muted">
						Reported by {reporter?.fullName || 'Unknown'}
						{report.createdAt && <> · {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}</>}
					</p>
					{isListing && subject?.city && <p className="text-xs text-muted">{subject.city} · {formatPrice(subject)}</p>}
				</div>

				{isListing && report.listing?._id && (
					<Link to={`/listings/${report.listing._id}`} target="_blank"
						className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-primary-ink transition hover:border-primary/40">
						View listing <ExternalLink className="h-3 w-3" />
					</Link>
				)}
			</div>

			{report.details && (
				<p className="mt-3 rounded-xl border border-line bg-surface-alt/60 p-3 text-sm leading-relaxed text-text">“{report.details}”</p>
			)}

			{!isListing && <ConversationContext reportId={report._id} />}

			{report.actionTaken && (
				<p className="mt-3 text-xs font-semibold text-success-ink">Action taken: {report.actionTaken}</p>
			)}
			{report.adminNote && (
				<p className="mt-1 text-xs text-muted">Note: {report.adminNote}</p>
			)}

			{report.status === 'open' && (
				<>
					<input
						value={note}
						onChange={(e) => setNote(e.target.value)}
						placeholder="Add a note (optional)"
						className="mt-4 w-full rounded-xl border border-line bg-surface-alt/60 px-3 py-2 text-sm text-text outline-none transition focus:border-primary/50"
					/>
					<div className="mt-3 flex flex-wrap gap-2">
						{isListing ? (
							<button onClick={() => onAction(report._id, 'remove-listing')} disabled={busy}
								className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-50">
								<Trash2 className="h-3.5 w-3.5" /> Remove listing
							</button>
						) : (
							<button onClick={() => onAction(report._id, 'suspend')} disabled={busy || subject?.suspended}
								className="inline-flex items-center gap-1.5 rounded-xl bg-danger px-4 py-2 text-xs font-bold text-white transition hover:brightness-105 disabled:opacity-50">
								<Ban className="h-3.5 w-3.5" /> Suspend {report.reportedRole}
							</button>
						)}
						<button onClick={() => onReview(report._id, 'resolved', note)} disabled={busy}
							className="inline-flex items-center gap-1.5 rounded-xl border border-success/40 px-4 py-2 text-xs font-bold text-success-ink transition hover:bg-success/10 disabled:opacity-50">
							<Check className="h-3.5 w-3.5" /> Resolve
						</button>
						<button onClick={() => onReview(report._id, 'dismissed', note)} disabled={busy}
							className="inline-flex items-center gap-1.5 rounded-xl border border-line px-4 py-2 text-xs font-bold text-muted transition hover:text-text disabled:opacity-50">
							<X className="h-3.5 w-3.5" /> Dismiss
						</button>
					</div>
				</>
			)}
		</motion.div>
	);
}

export default function ManageReports() {
	const [type, setType] = useState('listing');
	const [status, setStatus] = useState('open');
	const [reports, setReports] = useState([]);
	const [counts, setCounts] = useState({ open: 0, resolved: 0, dismissed: 0 });
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState(false);

	const load = useCallback(() => {
		setLoading(true);
		api.get('/admin/reports', { params: { type, status } })
			.then(({ data }) => { setReports(data.reports || []); setCounts(data.counts || {}); })
			.catch(() => { setReports([]); toast.error('Could not load reports'); })
			.finally(() => setLoading(false));
	}, [type, status]);

	useEffect(() => { load(); }, [load]);

	const review = async (id, next, note) => {
		setBusy(true);
		try {
			const { data } = await api.patch(`/admin/reports/${type}/${id}`, { status: next, adminNote: note });
			toast.success(data.message);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not update report'); }
		finally { setBusy(false); }
	};

	const act = async (id, action) => {
		const confirmText = action === 'remove-listing'
			? 'Remove this listing permanently?'
			: 'Suspend this account? They will not be able to sign in.';
		if (!window.confirm(confirmText)) return;
		setBusy(true);
		try {
			const { data } = await api.post(`/admin/reports/${type}/${id}/action`, { action });
			toast.success(data.message);
			load();
		} catch (err) { toast.error(err.response?.data?.message || 'Could not complete action'); }
		finally { setBusy(false); }
	};

	return (
		<div className="min-h-screen bg-base text-text">
			<AdminNavbar />
			<div className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:px-8">
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
						<Flag className="h-6 w-6 text-primary-ink" />
					</div>
					<div>
						<p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
							<span className="h-px w-6 bg-primary/50" /> Moderation
						</p>
						<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">Reports</h1>
						<p className="text-sm text-muted">Review what students and landlords have flagged.</p>
					</div>
				</motion.div>

				{/* Type tabs + refresh */}
				<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
					<div className="inline-flex rounded-xl border border-line bg-surface p-1">
						{TABS.map((t) => (
							<button key={t.key} onClick={() => setType(t.key)}
								className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${type === t.key ? 'bg-brand-gradient text-white shadow-glow-sm' : 'text-muted hover:text-text'}`}>
								<t.icon className="h-4 w-4" /> {t.label}
							</button>
						))}
					</div>
					<button onClick={load} className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink">
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
					</button>
				</div>

				{/* Status filter */}
				<div className="mt-3 flex flex-wrap gap-2">
					{STATUSES.map((s) => (
						<button key={s} onClick={() => setStatus(s)}
							className={`rounded-full border px-3.5 py-1.5 text-xs font-bold capitalize transition ${status === s ? 'border-primary/40 bg-primary/10 text-primary-ink' : 'border-line text-muted hover:text-text'}`}>
							{s} {counts[s] !== undefined && <span>({counts[s]})</span>}
						</button>
					))}
				</div>

				<div className="mt-6 space-y-4">
					{loading ? (
						[...Array(2)].map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-line bg-surface" />)
					) : reports.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-20 text-center shadow-card">
							<ShieldCheck className="h-10 w-10 text-success-ink" />
							<p className="mt-4 font-serif text-lg font-bold text-text">Nothing here</p>
							<p className="mt-1 text-sm text-muted">No {status} {type === 'listing' ? 'listing' : 'chat'} reports.</p>
						</div>
					) : (
						<AnimatePresence>
							{reports.map((r) => (
								<ReportCard key={r._id} report={r} type={type} onReview={review} onAction={act} busy={busy} />
							))}
						</AnimatePresence>
					)}
				</div>

				{busy && (
					<p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted">
						<Loader2 className="h-3.5 w-3.5 animate-spin" /> Working…
					</p>
				)}
			</div>
		</div>
	);
}
