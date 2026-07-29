import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import api from '../services/api';
import Turnstile, { captchaEnabled } from '../components/common/Turnstile';

/* Bright ambient backdrop — mirrors the sign-in screen */
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

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);
	const [sent, setSent] = useState(false);
	const [devResetUrl, setDevResetUrl] = useState(null);
	const [captchaToken, setCaptchaToken] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!email.trim()) { toast.error('Enter your email address'); return; }
		if (captchaEnabled && !captchaToken) { toast.error('Please complete the verification'); return; }
		setLoading(true);
		try {
			const { data } = await api.post('/auth/forgot-password', { email: email.trim(), captchaToken });
			setSent(true);
			if (data.devResetUrl) setDevResetUrl(data.devResetUrl);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Something went wrong. Try again.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4">
			<AuthBackdrop />
			<motion.div
				initial={{ opacity: 0, y: 18 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-strong relative w-full max-w-md rounded-3xl p-8 shadow-card-lg"
			>
				<Link
					to="/student/login"
					className="mb-6 flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-primary-ink"
				>
					<ArrowLeft className="h-4 w-4" /> Back to sign in
				</Link>

				<div className="relative mx-auto mb-5 h-16 w-16">
					<div className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg animate-glow-pulse" />
					<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
						{sent ? <MailCheck className="h-8 w-8 text-white" /> : <KeyRound className="h-8 w-8 text-white" />}
					</div>
				</div>

				{sent ? (
					<>
						<h1 className="text-center font-serif text-3xl font-extrabold text-text">Check your email</h1>
						<p className="mt-3 text-center text-sm leading-relaxed text-muted">
							If an account exists for <span className="font-semibold text-text">{email.trim()}</span>, we've sent a link to reset your password. It expires in 1 hour.
						</p>

						{devResetUrl && (
							<div className="mt-6 rounded-2xl border border-highlight/40 bg-highlight/10 p-4 text-center">
								<p className="text-[11px] font-bold uppercase tracking-wide text-highlight-ink">Demo mode</p>
								<p className="mt-1 text-xs text-muted">No email configured — use this link to reset:</p>
								<a href={devResetUrl} className="mt-2 block break-all text-xs font-semibold text-primary-ink hover:underline">
									{devResetUrl}
								</a>
							</div>
						)}

						<Link
							to="/student/login"
							className="mt-7 block w-full rounded-xl bg-brand-gradient py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow"
						>
							Back to Sign In
						</Link>
						<button
							onClick={() => { setSent(false); setDevResetUrl(null); }}
							className="mt-4 block w-full text-center text-xs font-semibold text-muted transition hover:text-primary-ink"
						>
							Didn't get it? Try a different email
						</button>
					</>
				) : (
					<>
						<h1 className="text-center font-serif text-3xl font-extrabold text-text">Forgot password?</h1>
						<p className="mt-2 text-center text-sm text-muted">
							Enter the email tied to your account and we'll send you a link to reset it.
						</p>

						<form onSubmit={handleSubmit} className="mt-7 space-y-4">
							<div className="group relative">
								<Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
								<input
									autoFocus
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="Email address"
									className="w-full rounded-xl border border-line bg-surface-alt py-3.5 pl-11 pr-4 text-sm text-text outline-none transition-all duration-200 focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20"
								/>
							</div>
							<Turnstile onVerify={setCaptchaToken} />
								<motion.button
								type="submit"
								disabled={loading}
								whileHover={{ scale: 1.015 }}
								whileTap={{ scale: 0.985 }}
								className="w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-60"
							>
								{loading
									? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
									: 'Send Reset Link'}
							</motion.button>
						</form>

						<p className="mt-7 text-center text-xs text-muted">
							Remembered it?{' '}
							<Link to="/student/login" className="font-bold text-primary-ink hover:underline">Sign in</Link>
						</p>
					</>
				)}
			</motion.div>
		</div>
	);
}
