import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { MailCheck, ShieldCheck, Loader2, XCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function VerifyEmailPage() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();
	const location = useLocation();
	const { user, updateUser } = useAuth();

	const token = searchParams.get('token');
	const [demoToken, setDemoToken] = useState(() => {
		const url = location.state?.devVerifyUrl;
		try { return url ? new URL(url).searchParams.get('token') : null; } catch { return null; }
	});

	// Email + context come from navigation state (register / login-block) or the
	// logged-in user (a landlord who registered under the softer flow).
	const email = location.state?.email || user?.email;
	const needsVerification = location.state?.needsVerification;
	const [status, setStatus] = useState(token ? 'verifying' : 'sent');
	const [message, setMessage] = useState('');
	const [resending, setResending] = useState(false);
	const ran = useRef(false);

	useEffect(() => {
		if (!token || ran.current) return;
		ran.current = true;
		setStatus('verifying');
		api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
			.then(({ data }) => {
				setStatus('success');
				setMessage(data.message || 'Email verified.');
				if (user) updateUser({ emailVerified: true });
			})
			.catch((err) => {
				setStatus('error');
				setMessage(err.response?.data?.message || 'This link is invalid or has expired.');
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token]);

	const handleResend = async () => {
		if (!email) { toast.error('Head back to sign in and try again.'); return; }
		setResending(true);
		try {
			const { data } = await api.post('/auth/verify-email/resend', { email });
			toast.success('Verification link sent. Check your inbox.');
			if (data.devVerifyUrl) {
				try { setDemoToken(new URL(data.devVerifyUrl).searchParams.get('token')); } catch { /* ignore */ }
			}
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not resend link');
		} finally {
			setResending(false);
		}
	};

	const goHome = () => navigate(user?.role === 'landlord' ? '/landlord/dashboard' : '/dashboard');
	const btn = 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-60';

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4 text-text">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute inset-0 bg-grid opacity-60" />
				<div className="absolute -left-40 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[120px] animate-aurora" />
				<div className="absolute -right-40 bottom-0 h-[24rem] w-[24rem] rounded-full bg-highlight/20 blur-[120px] animate-float-slow" />
			</div>

			<motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-strong relative w-full max-w-md rounded-3xl p-8 text-center shadow-card-lg">
				<div className="relative mx-auto mb-6 h-16 w-16">
					<div className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg" />
					<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-sm">
						{status === 'verifying' && <Loader2 className="h-8 w-8 animate-spin text-white" />}
						{status === 'success' && <ShieldCheck className="h-8 w-8 text-white" />}
						{status === 'error' && <XCircle className="h-8 w-8 text-white" />}
						{status === 'sent' && <MailCheck className="h-8 w-8 text-white" />}
					</div>
				</div>

				{status === 'verifying' && (
					<>
						<h1 className="font-serif text-2xl font-extrabold">Verifying your email…</h1>
						<p className="mt-2 text-sm text-muted">Hang tight, this only takes a second.</p>
					</>
				)}

				{status === 'success' && (
					<>
						<h1 className="font-serif text-2xl font-extrabold">Email verified 🎉</h1>
						<p className="mt-2 text-sm text-muted">{message} You now have full access to NestFinder.</p>
						<button onClick={user ? goHome : () => navigate('/student/login')} className={`mt-6 ${btn}`}>
							{user ? 'Go to Dashboard' : 'Sign In'} <ArrowRight className="h-4 w-4" />
						</button>
					</>
				)}

				{status === 'error' && (
					<>
						<h1 className="font-serif text-2xl font-extrabold">Link expired</h1>
						<p className="mt-2 text-sm text-muted">{message}</p>
						{email ? (
							<button onClick={handleResend} disabled={resending} className={`mt-6 ${btn}`}>
								{resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Send a new link
							</button>
						) : (
							<Link to="/student/login" className="mt-6 inline-block text-sm font-semibold text-primary-ink hover:underline">Back to sign in</Link>
						)}
					</>
				)}

				{status === 'sent' && (
					<>
						<h1 className="font-serif text-2xl font-extrabold">
							{needsVerification ? 'Verify your email to continue' : 'Check your email'}
						</h1>
						<p className="mt-2 text-sm text-muted">
							{needsVerification
								? 'Your account isn\'t verified yet. We\'ve sent a verification link to'
								: 'We\'ve sent a verification link to'}
							{email ? <span className="font-semibold text-text"> {email}</span> : ' your inbox'}.
							Click it to activate your account, then sign in.
						</p>

						{email && (
							<button onClick={handleResend} disabled={resending} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/40 px-5 py-3 text-sm font-bold text-primary-ink transition hover:bg-primary/10 disabled:opacity-60">
								{resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Resend link
							</button>
						)}

						{demoToken && (
							<div className="mt-5 rounded-2xl border border-highlight/40 bg-highlight/10 p-4 text-left">
								<p className="text-xs font-bold uppercase tracking-wide text-highlight-ink">Demo mode</p>
								<p className="mt-1 text-xs text-muted">No email service is configured, so here's your verification link for testing:</p>
								<Link to={`/verify-email?token=${demoToken}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-highlight px-4 py-2 text-xs font-bold text-white transition hover:brightness-105">
									Verify my email now <ArrowRight className="h-3.5 w-3.5" />
								</Link>
							</div>
						)}

						{/* A logged-in landlord (softer flow) may skip; students have no session
						    here, so they can't — verification is required to proceed. */}
						{user ? (
							<button onClick={goHome} className="mt-6 block w-full text-xs font-semibold text-muted transition hover:text-text">
								Skip for now — browse listings
							</button>
						) : (
							<Link to="/student/login" className="mt-6 block w-full text-xs font-semibold text-muted transition hover:text-primary-ink">
								Back to sign in
							</Link>
						)}
					</>
				)}
			</motion.div>
		</div>
	);
}
