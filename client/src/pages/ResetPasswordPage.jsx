import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, KeyRound, ShieldAlert } from 'lucide-react';
import api from '../services/api';

function AuthBackdrop() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			<div className="absolute inset-0 bg-grid opacity-70" />
			<div className="absolute -left-52 -top-44 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[130px] animate-aurora" />
			<div className="absolute -right-52 top-4 h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-[140px] animate-float-slow" />
			<div className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-highlight/20 blur-[130px] animate-aurora" />
		</div>
	);
}

export default function ResetPasswordPage() {
	const navigate = useNavigate();
	const [params] = useSearchParams();
	const token = params.get('token');

	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [show, setShow] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
		if (password !== confirm) { toast.error('Passwords do not match'); return; }
		setLoading(true);
		try {
			const { data } = await api.post('/auth/reset-password', { token, password });
			toast.success(data.message || 'Password reset successful');
			navigate('/student/login');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not reset password');
		} finally {
			setLoading(false);
		}
	};

	// No token in the URL → the link was mistyped or stripped.
	if (!token) {
		return (
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-4">
				<AuthBackdrop />
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-strong relative w-full max-w-md rounded-3xl p-8 text-center shadow-card-lg"
				>
					<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
						<ShieldAlert className="h-8 w-8 text-danger-ink" />
					</div>
					<h1 className="font-serif text-3xl font-extrabold text-text">Invalid reset link</h1>
					<p className="mt-2 text-sm text-muted">This link is missing its token. Request a fresh one to continue.</p>
					<Link
						to="/forgot-password"
						className="mt-7 block w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow"
					>
						Request New Link
					</Link>
				</motion.div>
			</div>
		);
	}

	const pwInput = (value, onChange, placeholder, autoFocus = false) => (
		<div className="group relative">
			<Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
			<input
				autoFocus={autoFocus}
				type={show ? 'text' : 'password'}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				className="w-full rounded-xl border border-line bg-surface-alt py-3.5 pl-11 pr-11 text-sm text-text outline-none transition-all duration-200 focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20"
			/>
		</div>
	);

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-base p-4">
			<AuthBackdrop />
			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-strong relative w-full max-w-md rounded-3xl p-8 shadow-card-lg"
			>
				<div className="relative mx-auto mb-5 h-16 w-16">
					<div className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg animate-glow-pulse" />
					<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
						<KeyRound className="h-8 w-8 text-white" />
					</div>
				</div>

				<h1 className="text-center font-serif text-3xl font-extrabold text-text">Set a new password</h1>
				<p className="mt-2 text-center text-sm text-muted">Choose a strong password you don't use elsewhere.</p>

				<form onSubmit={handleSubmit} className="mt-7 space-y-4">
					{pwInput(password, setPassword, 'New password (min 6 characters)', true)}
					{pwInput(confirm, setConfirm, 'Confirm new password')}

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

					<motion.button
						type="submit"
						disabled={loading}
						whileHover={{ scale: 1.015 }}
						whileTap={{ scale: 0.985 }}
						className="w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-60"
					>
						{loading
							? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
							: 'Reset Password'}
					</motion.button>
				</form>

				<p className="mt-7 text-center text-xs text-muted">
					<Link to="/student/login" className="font-bold text-primary-ink hover:underline">Back to sign in</Link>
				</p>
			</motion.div>
		</div>
	);
}
