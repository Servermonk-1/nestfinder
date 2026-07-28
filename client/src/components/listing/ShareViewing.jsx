import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { UserCheck, X, Copy, MessageCircle, Check } from 'lucide-react';
import useModalA11y from '../../hooks/useModalA11y';

function WhatsAppIcon({ className }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.25-8.25 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.25 8.24Z" />
		</svg>
	);
}

/**
 * "Tell someone where you're going" — lets a student send a trusted contact the
 * property address, the landlord's name and when they'll be there. Purely
 * client-side: it composes the message and hands off to WhatsApp/SMS/clipboard,
 * so no extra personal data is stored on our side.
 */
export default function ShareViewing({ listing }) {
	const [open, setOpen] = useState(false);
	const [when, setWhen] = useState('');
	const [copied, setCopied] = useState(false);

	const close = () => { setOpen(false); setCopied(false); };
	const dialogRef = useModalA11y(open, close);

	const address = [listing?.address, listing?.area, listing?.city, listing?.state].filter(Boolean).join(', ');
	const landlord = listing?.landlord?.fullName || 'the landlord';
	const phone = listing?.landlord?.phone || listing?.contactPhone;
	const whenText = when
		? new Date(when).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
		: 'soon';

	const message =
		`Hi! I'm viewing a place I found on NestFinder.\n\n` +
		`🏠 ${listing?.title || 'Property'}\n` +
		`📍 ${address || 'Address not provided'}\n` +
		`👤 Landlord: ${landlord}${phone ? ` (${phone})` : ''}\n` +
		`🕒 When: ${whenText}\n` +
		`🔗 ${typeof window !== 'undefined' ? window.location.href : ''}\n\n` +
		`Please check in on me afterwards.`;

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(message);
			setCopied(true);
			toast.success('Details copied — paste them to your contact');
			setTimeout(() => setCopied(false), 2500);
		} catch {
			toast.error('Could not copy. Select the text and copy manually.');
		}
	};

	return (
		<>
			<button
				onClick={() => setOpen(true)}
				className="flex w-full items-center justify-center gap-2 rounded-xl border border-line py-3 text-sm font-bold text-text transition hover:border-primary/40 hover:bg-primary/5"
			>
				<UserCheck className="h-4 w-4 text-primary-ink" /> Share my viewing
			</button>

			<AnimatePresence>
				{open && (
					<div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
						<div className="fixed inset-0" onClick={close} />
						<motion.div
							ref={dialogRef}
							tabIndex={-1}
							role="dialog"
							aria-modal="true"
							aria-labelledby="share-viewing-title"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card-lg"
						>
							<button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text">
								<X className="h-4 w-4" />
							</button>

							<div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
								<UserCheck className="h-5 w-5 text-primary-ink" />
							</div>
							<h3 id="share-viewing-title" className="pr-6 font-serif text-lg font-bold text-text">Share my viewing</h3>
							<p className="mt-1.5 text-sm leading-relaxed text-muted">
								Never inspect a property alone without telling anyone. Send a friend or family member where you'll be and who you're meeting.
							</p>

							<label htmlFor="viewing-time" className="mt-4 block text-xs font-bold uppercase tracking-wide text-muted">
								When are you going?
							</label>
							<input
								id="viewing-time"
								type="datetime-local"
								value={when}
								onChange={(e) => setWhen(e.target.value)}
								className="mt-1.5 w-full rounded-xl border border-line bg-surface-alt px-4 py-2.5 text-sm text-text outline-none transition focus:border-primary/60"
							/>

							<pre className="mt-4 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-surface-alt/60 p-3 text-[11px] leading-relaxed text-muted">
								{message}
							</pre>

							<div className="mt-4 grid gap-2 sm:grid-cols-2">
								<a
									href={`https://wa.me/?text=${encodeURIComponent(message)}`}
									target="_blank"
									rel="noreferrer"
									className="flex items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 py-2.5 text-sm font-bold text-success transition hover:bg-success/20"
								>
									<WhatsAppIcon className="h-4 w-4" /> WhatsApp
								</a>
								<a
									href={`sms:?body=${encodeURIComponent(message)}`}
									className="flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-bold text-text transition hover:border-primary/40"
								>
									<MessageCircle className="h-4 w-4 text-primary-ink" /> Text message
								</a>
							</div>
							<button
								onClick={copy}
								className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
							>
								{copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy details</>}
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</>
	);
}
