import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ShieldAlert, Flag, Ban, X, ShieldCheck, Info, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import useModalA11y from '../../hooks/useModalA11y';
import { SAFETY_TIPS } from '../../utils/safetyChecks';

const REASONS = [
	{ value: 'scam', label: 'Scam or fraud attempt' },
	{ value: 'harassment', label: 'Harassment or abuse' },
	{ value: 'spam', label: 'Spam or advertising' },
	{ value: 'impersonation', label: 'Pretending to be someone else' },
	{ value: 'other', label: 'Something else' },
];

/** Small "Verified"/"Unverified" pill for the other party in the chat header. */
export function VerifiedPill({ verified }) {
	return verified ? (
		<span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success-ink">
			<ShieldCheck className="h-3 w-3" /> Verified
		</span>
	) : (
		<span className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2 py-0.5 text-[10px] font-bold text-highlight-ink">
			<ShieldAlert className="h-3 w-3" /> Unverified
		</span>
	);
}

/** Collapsible safety guidance shown at the top of a conversation. */
export function SafetyTipsBanner() {
	const [open, setOpen] = useState(false);
	return (
		<div className="border-b border-line bg-highlight/5 px-4 py-2.5">
			<button
				onClick={() => setOpen((v) => !v)}
				aria-expanded={open}
				className="flex w-full items-center gap-2 text-left text-xs font-bold text-text"
			>
				<Info className="h-3.5 w-3.5 shrink-0 text-highlight-ink" />
				Staying safe when arranging a viewing
				<ChevronDown className={`ml-auto h-3.5 w-3.5 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence>
				{open && (
					<motion.ul
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden"
					>
						{SAFETY_TIPS.map((t) => (
							<li key={t} className="mt-1.5 flex gap-2 text-[11px] leading-relaxed text-muted">
								<span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-highlight" /> {t}
							</li>
						))}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}

/** Inline warning rendered under a message that tripped a red-flag rule. */
export function RedFlagWarning({ warnings }) {
	if (!warnings?.length) return null;
	return (
		<div className="mt-1.5 max-w-[75%] rounded-xl border border-highlight/40 bg-highlight/10 px-3 py-2">
			{warnings.map((w) => (
				<p key={w.id} className="flex gap-1.5 text-[11px] font-medium leading-relaxed text-text">
					<ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-highlight-ink" /> {w.warning}
				</p>
			))}
		</div>
	);
}

/**
 * Report / block controls for a conversation. Used by both the student and
 * landlord inboxes — either party can report or block the other.
 */
export default function ChatSafetyMenu({ conversationId, blocked, blockedByMe, onChange }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [reason, setReason] = useState('');
	const [details, setDetails] = useState('');
	const [alsoBlock, setAlsoBlock] = useState(true);
	const [busy, setBusy] = useState(false);

	const closeReport = () => { if (!busy) { setReportOpen(false); setReason(''); setDetails(''); } };
	const dialogRef = useModalA11y(reportOpen, closeReport);

	const toggleBlock = async (next) => {
		setMenuOpen(false);
		if (next && !window.confirm('Block this conversation? Neither of you will be able to send messages.')) return;
		try {
			const { data } = await api.patch(`/messages/conversations/${conversationId}/block`, { blocked: next });
			toast.success(data.message);
			onChange?.({ blocked: data.blocked, blockedByMe: data.blockedByMe });
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not update this conversation');
		}
	};

	const submitReport = async () => {
		if (!reason || busy) return;
		setBusy(true);
		try {
			const { data } = await api.post(`/messages/conversations/${conversationId}/report`, {
				reason, details: details.trim(), block: alsoBlock,
			});
			toast.success(data.message);
			onChange?.({ blocked: data.blocked, blockedByMe: alsoBlock ? true : blockedByMe });
			setReportOpen(false);
			setReason(''); setDetails('');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not submit report');
		} finally {
			setBusy(false);
		}
	};

	return (
		<>
			<div className="relative shrink-0">
				<button
					onClick={() => setMenuOpen((v) => !v)}
					aria-label="Safety options"
					aria-expanded={menuOpen}
					className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-muted transition hover:border-primary/40 hover:text-primary-ink"
				>
					<ShieldAlert className="h-4 w-4" />
				</button>

				<AnimatePresence>
					{menuOpen && (
						<>
							<div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
							<motion.div
								initial={{ opacity: 0, scale: 0.95, y: -6 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0, scale: 0.95, y: -6 }}
								className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-line bg-surface shadow-card-lg"
							>
								<button
									onClick={() => { setMenuOpen(false); setReportOpen(true); }}
									className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-text transition hover:bg-primary/5"
								>
									<Flag className="h-4 w-4 text-danger-ink" /> Report this person
								</button>
								{blockedByMe ? (
									<button
										onClick={() => toggleBlock(false)}
										className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-text transition hover:bg-primary/5"
									>
										<Ban className="h-4 w-4 text-success-ink" /> Unblock
									</button>
								) : (
									<button
										onClick={() => toggleBlock(true)}
										disabled={blocked}
										className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-text transition hover:bg-primary/5 disabled:opacity-40"
									>
										<Ban className="h-4 w-4 text-danger-ink" /> Block
									</button>
								)}
							</motion.div>
						</>
					)}
				</AnimatePresence>
			</div>

			<AnimatePresence>
				{reportOpen && (
					<div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
						<div className="fixed inset-0" onClick={closeReport} />
						<motion.div
							ref={dialogRef}
							tabIndex={-1}
							role="dialog"
							aria-modal="true"
							aria-labelledby="report-user-title"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card-lg"
						>
							<button onClick={closeReport} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text">
								<X className="h-4 w-4" />
							</button>
							<h3 id="report-user-title" className="pr-6 font-serif text-lg font-bold text-text">Report this person</h3>
							<p className="mt-1 text-xs text-muted">Our team reviews reports within 24 hours.</p>

							<div className="mt-4 space-y-2">
								{REASONS.map((r) => (
									<label
										key={r.value}
										className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${reason === r.value ? 'border-primary/50 bg-primary/5' : 'border-line'}`}
									>
										<input
											type="radio"
											name="user-report-reason"
											value={r.value}
											checked={reason === r.value}
											onChange={() => setReason(r.value)}
											className="accent-primary"
										/>
										{r.label}
									</label>
								))}
							</div>

							<textarea
								value={details}
								onChange={(e) => setDetails(e.target.value)}
								rows={3}
								maxLength={500}
								placeholder="What happened? (optional)"
								className="mt-3 w-full resize-none rounded-xl border border-line bg-surface-alt/60 p-3 text-sm text-text outline-none transition focus:border-primary/50"
							/>

							<label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
								<input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-primary" />
								Also block them from messaging me
							</label>

							<button
								onClick={submitReport}
								disabled={!reason || busy}
								className="mt-4 w-full rounded-xl bg-danger py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
							>
								{busy ? 'Submitting…' : 'Submit report'}
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</>
	);
}
