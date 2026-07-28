import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HelpCircle, RotateCcw, GitCompare, Trophy, AlertTriangle, MessageSquare, X } from 'lucide-react';
import api from '../../services/api';
import useModalA11y from '../../hooks/useModalA11y';

const INFO_MODALS = {
	compare: {
		title: 'How Compare Works',
		body: 'Select 2 or 3 listings using the "+ Compare" button on any card. NestFinder scores each one on price, amenities, landlord trust, and availability, then highlights the best overall match. Adjust the priority sliders on the Compare page to personalize the ranking.',
	},
	scoring: {
		title: 'How Scoring Works',
		body: 'Every listing gets a Match Score out of 100: 35% price, 25% amenities, 20% landlord trust, 10% availability, 10% location detail. Cheaper, better-equipped, verified, available listings score higher. Higher is better.',
	},
};

export default function HelpCenter({ onRestartTour }) {
	const [menuOpen, setMenuOpen] = useState(false);
	const [infoModal, setInfoModal] = useState(null);
	const [feedbackType, setFeedbackType] = useState(null);
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);

	const closeMenu = () => setMenuOpen(false);
	const infoRef = useModalA11y(Boolean(infoModal), () => setInfoModal(null));
	const feedbackRef = useModalA11y(Boolean(feedbackType), () => setFeedbackType(null));

	const submitFeedback = async () => {
		if (!message.trim() || sending) return;
		setSending(true);
		try {
			await api.post('/feedback', { type: feedbackType, message: message.trim() });
			toast.success(feedbackType === 'problem' ? "Thanks — we'll look into it" : 'Thanks for the feedback!');
			setFeedbackType(null);
			setMessage('');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not send. Try again.');
		} finally {
			setSending(false);
		}
	};

	const menuItems = [
		{ icon: RotateCcw, label: 'Restart Tour', onClick: () => { onRestartTour(); closeMenu(); } },
		{ icon: GitCompare, label: 'How Compare Works', onClick: () => { setInfoModal('compare'); closeMenu(); } },
		{ icon: Trophy, label: 'How Scoring Works', onClick: () => { setInfoModal('scoring'); closeMenu(); } },
		{ icon: AlertTriangle, label: 'Report a Problem', onClick: () => { setFeedbackType('problem'); closeMenu(); } },
		{ icon: MessageSquare, label: 'Send Feedback', onClick: () => { setFeedbackType('feedback'); closeMenu(); } },
	];

	return (
		<>
			<div className="relative">
				<button
					id="tour-help-button"
					onClick={() => setMenuOpen((v) => !v)}
					aria-label="Help center"
					className="flex h-9 w-9 items-center justify-center rounded-full border border-muted/15 text-muted transition hover:border-primary/40 hover:text-primary-ink"
				>
					<HelpCircle className="h-4 w-4" />
				</button>

				<AnimatePresence>
					{menuOpen && (
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: -8 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: -8 }}
							className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-surface shadow-card-lg"
						>
							<p className="border-b border-line px-4 py-3 text-xs font-bold uppercase tracking-widest text-primary-ink">
								Help Center
							</p>
							{menuItems.map(({ icon: Icon, label, onClick }) => (
								<button
									key={label}
									onClick={onClick}
									className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-text transition hover:bg-primary/5"
								>
									<Icon className="h-4 w-4 text-primary-ink" /> {label}
								</button>
							))}
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Click-catcher for the dropdown — portaled so it isn't confined by the navbar's
			    backdrop-blur, which (like `filter`) creates a containing block for fixed descendants. */}
			{menuOpen && createPortal(
				<div className="fixed inset-0 z-40" onClick={closeMenu} />,
				document.body
			)}

			{/* Info modal — portaled to <body> for the same reason. */}
			{createPortal(
				<AnimatePresence>
					{infoModal && (
						<div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
							<div className="fixed inset-0" onClick={() => setInfoModal(null)} />
							<motion.div
								ref={infoRef}
								tabIndex={-1}
								role="dialog"
								aria-modal="true"
								aria-labelledby="help-info-title"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card-lg"
							>
								<button onClick={() => setInfoModal(null)} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text">
									<X className="h-4 w-4" />
								</button>
								<h3 id="help-info-title" className="pr-6 font-serif text-lg font-bold text-text">{INFO_MODALS[infoModal].title}</h3>
								<p className="mt-3 text-sm leading-relaxed text-muted">{INFO_MODALS[infoModal].body}</p>
							</motion.div>
						</div>
					)}
				</AnimatePresence>,
				document.body
			)}

			{/* Feedback / report modal — portaled to <body> for the same reason. */}
			{createPortal(
				<AnimatePresence>
					{feedbackType && (
						<div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
							<div className="fixed inset-0" onClick={() => setFeedbackType(null)} />
							<motion.div
								ref={feedbackRef}
								tabIndex={-1}
								role="dialog"
								aria-modal="true"
								aria-labelledby="help-feedback-title"
								initial={{ opacity: 0, scale: 0.95 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.95 }}
								className="relative w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card-lg"
							>
								<button onClick={() => setFeedbackType(null)} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text">
									<X className="h-4 w-4" />
								</button>
								<h3 id="help-feedback-title" className="pr-6 font-serif text-lg font-bold text-text">
									{feedbackType === 'problem' ? 'Report a Problem' : 'Send Feedback'}
								</h3>
								<textarea
									autoFocus
									value={message}
									onChange={(e) => setMessage(e.target.value)}
									rows={4}
									maxLength={2000}
									placeholder={feedbackType === 'problem'
										? 'What went wrong? The more detail, the faster we can fix it.'
										: "What's on your mind?"}
									className="mt-4 w-full resize-none rounded-xl border border-line bg-surface-alt/60 p-3 text-sm text-text outline-none transition focus:border-primary/50"
								/>
								<button
									onClick={submitFeedback}
									disabled={!message.trim() || sending}
									className="mt-4 w-full rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-50 disabled:hover:shadow-glow-sm"
								>
									{sending ? 'Sending…' : 'Send'}
								</button>
							</motion.div>
						</div>
					)}
				</AnimatePresence>,
				document.body
			)}
		</>
	);
}
