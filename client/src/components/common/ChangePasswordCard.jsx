import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import api from '../../services/api';

export default function ChangePasswordCard() {
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState('');
	const [next, setNext] = useState('');
	const [confirm, setConfirm] = useState('');
	const [show, setShow] = useState(false);
	const [saving, setSaving] = useState(false);

	const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setShow(false); };

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!current || !next) { toast.error('Fill in both password fields'); return; }
		if (next.length < 6) { toast.error('New password must be at least 6 characters'); return; }
		if (next !== confirm) { toast.error('New passwords do not match'); return; }
		if (current === next) { toast.error('New password must be different from your current one'); return; }
		setSaving(true);
		try {
			await api.post('/auth/change-password', { currentPassword: current, newPassword: next });
			toast.success('Password changed successfully');
			reset();
			setOpen(false);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not change password');
		} finally {
			setSaving(false);
		}
	};

	const field = (value, onChange, placeholder, autoFocus = false) => (
		<div className="group relative">
			<Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
			<input
				autoFocus={autoFocus}
				type={show ? 'text' : 'password'}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-xl border border-line bg-surface-alt py-3 pl-11 pr-4 text-sm text-text outline-none transition focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20"
			/>
		</div>
	);

	return (
		<div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
						<KeyRound className="h-5 w-5 text-primary-ink" />
					</div>
					<div>
						<p className="font-serif text-base font-bold text-text">Password</p>
						<p className="text-xs text-muted">Change the password you use to sign in.</p>
					</div>
				</div>
				{!open && (
					<button
						onClick={() => setOpen(true)}
						className="shrink-0 rounded-xl border border-line px-4 py-2 text-sm font-bold text-primary-ink transition hover:border-primary/40 hover:bg-primary/5"
					>
						Change
					</button>
				)}
			</div>

			{open && (
				<motion.form
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					onSubmit={handleSubmit}
					className="mt-5 space-y-3 overflow-hidden"
				>
					{field(current, setCurrent, 'Current password', true)}
					{field(next, setNext, 'New password (min 6 characters)')}
					{field(confirm, setConfirm, 'Confirm new password')}

					<div className="flex justify-end -mt-1">
						<button
							type="button"
							onClick={() => setShow((v) => !v)}
							className="flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-primary-ink"
						>
							{show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
							{show ? 'Hide' : 'Show'} passwords
						</button>
					</div>

					<div className="flex gap-2 pt-1">
						<button
							type="submit"
							disabled={saving}
							className="flex-1 rounded-xl bg-brand-gradient py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-60"
						>
							{saving ? 'Saving…' : 'Save New Password'}
						</button>
						<button
							type="button"
							onClick={() => { reset(); setOpen(false); }}
							className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text"
						>
							Cancel
						</button>
					</div>
				</motion.form>
			)}
		</div>
	);
}
