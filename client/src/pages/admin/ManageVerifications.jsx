import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { BadgeCheck, X, Check, GraduationCap, Phone, Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';
import { getImageUrl } from '../../utils/urlHelper';

const ENDPOINTS = {
	student: {
		list: '/admin/verifications/students/pending',
		key: 'students',
		approve: (id) => `/admin/students/${id}/approve`,
		reject: (id) => `/admin/students/${id}/reject`,
	},
	landlord: {
		list: '/admin/verifications/landlords/pending',
		key: 'landlords',
		approve: (id) => `/admin/landlords/${id}/approve-id`,
		reject: (id) => `/admin/landlords/${id}/reject-id`,
	},
};

function ReviewCard({ person, role, onDone }) {
	const [busy, setBusy] = useState(false);
	const [rejecting, setRejecting] = useState(false);
	const [reason, setReason] = useState('');
	const doc = person.idDocument || {};
	const cfg = ENDPOINTS[role];

	const approve = async () => {
		setBusy(true);
		try {
			await api.patch(cfg.approve(person._id));
			toast.success(`${person.fullName} verified`);
			onDone(person._id);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to approve');
			setBusy(false);
		}
	};

	const reject = async () => {
		if (!reason.trim()) { toast.error('Give a reason'); return; }
		setBusy(true);
		try {
			await api.patch(cfg.reject(person._id), { reason: reason.trim() });
			toast.success('ID rejected');
			onDone(person._id);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to reject');
			setBusy(false);
		}
	};

	return (
		<motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-gradient text-white font-bold">
						{person.fullName?.charAt(0).toUpperCase() || '?'}
					</div>
					<div>
						<p className="font-serif text-base font-bold text-text">{person.fullName}</p>
						<p className="text-xs text-muted">{person.email}</p>
						<p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
							{role === 'student'
								? <><GraduationCap className="h-3 w-3" /> {person.institution}</>
								: <><Phone className="h-3 w-3" /> {person.phone}</>}
						</p>
					</div>
				</div>
				<span className="rounded-full bg-highlight/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-highlight-ink">
					{doc.documentType || 'ID'}
				</span>
			</div>

			<p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-muted">Compare the face on the ID with the profile photo</p>
			<div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
				{/* Profile photo (for face-matching) */}
				<div className="relative overflow-hidden rounded-xl border-2 border-primary/40">
					{person.profilePicture ? (
						<a href={getImageUrl(person.profilePicture)} target="_blank" rel="noreferrer" className="group block">
							<img src={getImageUrl(person.profilePicture)} alt="profile" className="h-40 w-full object-cover transition group-hover:scale-105" />
						</a>
					) : (
						<div className="flex h-40 w-full items-center justify-center bg-surface-alt text-center text-[11px] text-muted">No profile photo</div>
					)}
					<span className="absolute bottom-1 left-1 rounded bg-brand-gradient px-1.5 py-0.5 text-[10px] font-bold text-white">Profile</span>
				</div>
				{/* ID images */}
				{['frontImage', 'backImage'].map((k) =>
					doc[k] ? (
						<a key={k} href={getImageUrl(doc[k])} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl border border-line">
							<img src={getImageUrl(doc[k])} alt={k} className="h-40 w-full object-cover transition group-hover:scale-105" />
							<span className="absolute bottom-1 left-1 rounded bg-ink/60 px-1.5 py-0.5 text-[10px] text-white">{k === 'frontImage' ? 'ID Front' : 'ID Back'}</span>
						</a>
					) : null
				)}
			</div>

			{!rejecting ? (
				<div className="mt-4 flex gap-2">
					<button onClick={approve} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-success py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:brightness-110 disabled:opacity-60">
						{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Approve
					</button>
					<button onClick={() => setRejecting(true)} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-danger/40 py-2.5 text-sm font-bold text-danger-ink transition hover:bg-danger/10 disabled:opacity-60">
						<X className="h-4 w-4" /> Reject
					</button>
				</div>
			) : (
				<div className="mt-4">
					<input autoFocus value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection (shown to them)" className="w-full rounded-xl border border-danger/30 bg-surface-alt px-3 py-2.5 text-sm text-text outline-none focus:border-danger" />
					<div className="mt-2 flex gap-2">
						<button onClick={reject} disabled={busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-danger py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60">
							{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm rejection'}
						</button>
						<button onClick={() => { setRejecting(false); setReason(''); }} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text">Cancel</button>
					</div>
				</div>
			)}
		</motion.div>
	);
}

export default function ManageVerifications() {
	const [tab, setTab] = useState('student');
	const [people, setPeople] = useState([]);
	const [loading, setLoading] = useState(true);

	const load = useCallback((showSpinner = true) => {
		if (showSpinner) setLoading(true);
		const cfg = ENDPOINTS[tab];
		api.get(cfg.list)
			.then(({ data }) => setPeople(data[cfg.key] || []))
			.catch(() => toast.error('Failed to load verifications'))
			.finally(() => setLoading(false));
	}, [tab]);

	useEffect(() => { load(); }, [load]);

	// Auto-refresh when the admin comes back to this tab/window, so newly
	// submitted verifications appear without a manual page reload.
	useEffect(() => {
		const onFocus = () => load(false);
		window.addEventListener('focus', onFocus);
		return () => window.removeEventListener('focus', onFocus);
	}, [load]);

	const handleDone = (id) => setPeople((prev) => prev.filter((p) => p._id !== id));

	return (
		<div className="min-h-screen bg-base text-text">
			<AdminNavbar />
			<div className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:px-8">
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
						<ShieldCheck className="h-6 w-6 text-primary-ink" />
					</div>
					<div>
						<p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
							<span className="h-px w-6 bg-primary/50" /> Moderation
						</p>
						<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">Identity Verifications</h1>
						<p className="text-sm text-muted">Review submitted IDs and approve or reject.</p>
					</div>
				</motion.div>

				{/* Tabs + refresh */}
				<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
					<div className="inline-flex rounded-xl border border-line bg-surface p-1">
						{['student', 'landlord'].map((r) => (
							<button
								key={r}
								onClick={() => setTab(r)}
								className={`rounded-lg px-5 py-2 text-sm font-bold capitalize transition ${
									tab === r ? 'bg-brand-gradient text-white shadow-glow-sm' : 'text-muted hover:text-text'
								}`}
							>
								{r}s
							</button>
						))}
					</div>
					<button
						onClick={() => load()}
						className="flex items-center gap-2 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink"
					>
						<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
					</button>
				</div>

				<div className="mt-6 space-y-4">
					{loading ? (
						[...Array(2)].map((_, i) => <div key={i} className="h-64 animate-pulse rounded-2xl border border-line bg-surface" />)
					) : people.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-20 text-center shadow-card">
							<BadgeCheck className="h-10 w-10 text-success-ink" />
							<p className="mt-4 font-serif text-lg font-bold text-text">All caught up</p>
							<p className="mt-1 text-sm text-muted">No {tab} IDs are waiting for review.</p>
						</div>
					) : (
						<AnimatePresence>
							{people.map((p) => <ReviewCard key={p._id} person={p} role={tab} onDone={handleDone} />)}
						</AnimatePresence>
					)}
				</div>
			</div>
		</div>
	);
}
