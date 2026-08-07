import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import useModalA11y from '../../hooks/useModalA11y';

export default function DeleteAccountCard() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);

	const isLandlord = user?.role === 'landlord';
	// What actually gets destroyed differs by role, and so does where you land
	// afterwards — a landlord shouldn't be dropped on the student homepage.
	const losesText = isLandlord
		? 'Permanently removes your profile, all your listings, messages and reviews.'
		: 'Permanently removes your profile, saved homes, messages and reviews.';
	const afterDelete = isLandlord ? '/for-landlords' : '/';

	const close = () => { if (!busy) { setConfirmOpen(false); setPassword(''); } };
	const dialogRef = useModalA11y(confirmOpen, close);

	const confirmDelete = async () => {
		if (!password) { toast.error('Enter your password to confirm'); return; }
		setBusy(true);
		try {
			await api.delete('/profile', { data: { password } });
			toast.success('Your account has been deleted');
			logout();
			navigate(afterDelete);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not delete account');
			setBusy(false);
		}
	};

	return (
		<>
			<div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger/10">
							<AlertTriangle className="h-5 w-5 text-danger-ink" />
						</div>
						<div>
							<p className="font-serif text-base font-bold text-text">Delete account</p>
							<p className="text-xs text-muted">{losesText}</p>
						</div>
					</div>
					<button
						onClick={() => setConfirmOpen(true)}
						className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-danger/40 px-4 py-2 text-sm font-bold text-danger-ink transition hover:bg-danger/10"
					>
						<Trash2 className="h-4 w-4" /> Delete
					</button>
				</div>
			</div>

			<AnimatePresence>
				{confirmOpen && (
					<div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/50 px-4 backdrop-blur-sm">
						<div className="fixed inset-0" onClick={close} />
						<motion.div
							ref={dialogRef}
							tabIndex={-1}
							role="dialog"
							aria-modal="true"
							aria-labelledby="delete-account-title"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-card-lg sm:p-6"
						>
							<button onClick={close} aria-label="Close dialog" className="absolute right-4 top-4 text-muted hover:text-text">
								<X className="h-4 w-4" />
							</button>
							<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-danger/10">
								<AlertTriangle className="h-6 w-6 text-danger-ink" />
							</div>
							<h3 id="delete-account-title" className="font-serif text-lg font-bold text-text">Delete your account?</h3>
							<p className="mt-2 text-sm text-muted">
								This can't be undone. Enter your password to permanently delete your account and all its data.
							</p>
							<input
								autoFocus
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="Your password"
								className="mt-4 w-full rounded-xl border border-line bg-surface-alt px-4 py-3 text-sm text-text outline-none transition focus:border-danger/60 focus:ring-2 focus:ring-danger/20"
							/>
							<div className="mt-4 flex gap-2">
								<button
									onClick={confirmDelete}
									disabled={busy}
									className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60"
								>
									{busy ? 'Deleting…' : 'Delete forever'}
								</button>
								<button onClick={close} disabled={busy} className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text disabled:opacity-60">
									Cancel
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</>
	);
}
