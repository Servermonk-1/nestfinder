import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, User, Phone, Building, KeyRound, ArrowLeft, ShieldCheck, Sparkles, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { getDeviceToken, saveDeviceToken } from '../../utils/deviceTrust';
import Turnstile, { captchaEnabled } from '../../components/common/Turnstile';
import BrandMark from '../../components/common/Logo';
import { useIsDesktop } from '../../hooks/useMediaQuery';

/* Bright ambient backdrop — soft colour washes + fine grid */
function AuthBackdrop() {
	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			<div className="absolute inset-0 bg-grid opacity-70" />
			<div className="absolute -left-52 -top-44 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-[130px] animate-aurora" />
			<div className="absolute -right-52 top-4 h-[32rem] w-[32rem] rounded-full bg-accent/25 blur-[140px] animate-float-slow" />
			<div className="absolute bottom-[-12rem] left-1/3 h-[28rem] w-[28rem] rounded-full bg-primary/22 blur-[130px] animate-aurora" />
		</div>
	);
}

const InputField = ({ icon: Icon, error, showToggle, onToggle, show, ...props }) => (
	<div className="w-full">
		<div className="group relative">
			<Icon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
			<input
				{...props}
				className={`w-full ${showToggle ? 'pr-11' : 'pr-4'} rounded-xl border py-3.5 pl-11 text-sm text-text outline-none transition-all duration-200
          ${error
						? 'border-danger/70 bg-danger/5'
						: 'border-line bg-surface-alt focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20'}`}
			/>
			{showToggle && (
				<button type="button" onClick={onToggle} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-primary-ink">
					{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
				</button>
			)}
		</div>
		{error && <p className="mt-1.5 text-xs font-medium text-danger-ink">{error}</p>}
	</div>
);

// Declared at module scope, not inside the component. A component created
// during render is a NEW type on every render, so React unmounts and remounts
// the whole subtree — which drops focus mid-typing on a form like this one.
const Logo = () => (
	<div className="mb-8 flex items-center gap-3">
		<BrandMark size={40} className="text-primary" />
		<div>
			<p className="font-serif text-base font-extrabold leading-tight text-text">NestFinder</p>
			<p className="text-[13px] font-bold uppercase tracking-wider text-primary-ink">SIWES Housing</p>
		</div>
	</div>
);

export default function StudentAuth() {
	const navigate = useNavigate();
	const { login } = useAuth();
	// The sliding split-panel only works where there are two halves to slide
	// between. Below md the panels stack and we show one form at a time, so the
	// animation has to be switched off from JS — framer-motion writes `x` as an
	// inline transform that no responsive utility can override.
	const isDesktop = useIsDesktop();
	const [isSignIn, setIsSignIn] = useState(true);
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [signInData, setSignInData] = useState({ email: '', password: '' });
	const [signUpData, setSignUpData] = useState({
		fullName: '', email: '', password: '', phone: '', institution: ''
	});
	const [errors, setErrors] = useState({});
	const [captchaToken, setCaptchaToken] = useState('');

	// ── Login OTP (step 2) state ──
	const [otpStage, setOtpStage] = useState(null); // { email, devOtp } | null
	const [otpCode, setOtpCode] = useState('');
	const [otpLoading, setOtpLoading] = useState(false);

	const handleSignIn = async (e) => {
		e.preventDefault();
		const newErrors = {};
		if (!signInData.email) newErrors.email = 'Email is required';
		if (!signInData.password) newErrors.password = 'Password is required';
		if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
		setLoading(true);
		try {
			const { data } = await api.post('/auth/student/login', { ...signInData, deviceToken: getDeviceToken(signInData.email) });
			if (data.otpRequired) {
				// The server tells us whether the code actually left the building.
				// A hardcoded success toast here meant a failed send still read as
				// "check your email", so the student waited on a code that was
				// never sent. Use the server's own wording either way.
				if (data.emailSent === false && !data.devOtp) {
					// Nothing was delivered, so there is no code to type. Keep them
					// on the form instead of parking them on a dead code screen.
					toast.error(data.message || 'We could not send your code. Please try again.');
					return;
				}
				setOtpStage({ email: data.email, devOtp: data.devOtp });
				setOtpCode('');
				toast.success(data.message || 'We sent a 6-digit code to your email');
				return;
			}
			login(data.user, data.token);
			toast.success(`Welcome back, ${data.user.fullName}`);
			navigate('/dashboard');
		} catch (err) {
			// Hard email-verification gate — route them to the verify screen instead.
			if (err.response?.status === 403 && err.response.data?.emailVerificationRequired) {
				navigate('/verify-email', { state: { email: err.response.data.email || signInData.email, needsVerification: true } });
				return;
			}
			toast.error(err.response?.data?.message || 'Login failed');
		} finally { setLoading(false); }
	};

	const handleVerifyOtp = async (e) => {
		e.preventDefault();
		if (otpCode.trim().length !== 6) { toast.error('Enter the 6-digit code'); return; }
		setOtpLoading(true);
		try {
			const { data } = await api.post('/auth/student/verify-otp', {
				email: otpStage.email,
				otp: otpCode.trim(),
			});
			saveDeviceToken(signInData.email, data.deviceToken);
			login(data.user, data.token);
			toast.success(`Welcome back, ${data.user.fullName}`);
			navigate('/dashboard');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Invalid code');
		} finally { setOtpLoading(false); }
	};

	const resendLoginOtp = async () => {
		setOtpLoading(true);
		try {
			const { data } = await api.post('/auth/student/login', signInData);
			// This is the same endpoint as step 1, so it can answer with a finished
			// login (OTP disabled) or with a code it failed to send. Assuming a code
			// came back stranded the user on a blank screen and threw the token away.
			if (!data.otpRequired) {
				login(data.user, data.token);
				toast.success(`Welcome back, ${data.user.fullName}`);
				navigate('/dashboard');
				return;
			}
			setOtpStage({ email: data.email, devOtp: data.devOtp });
			if (data.emailSent === false && !data.devOtp) {
				toast.error(data.message || 'We could not send your code. Please try again.');
			} else {
				toast.success('New code sent');
			}
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not resend code');
		} finally { setOtpLoading(false); }
	};

	const handleSignUp = async (e) => {
		e.preventDefault();
		const newErrors = {};
		if (!signUpData.fullName) newErrors.fullName = 'Required';
		if (!signUpData.email) newErrors.email = 'Required';
		if (!signUpData.password || signUpData.password.length < 6) newErrors.password = 'Min 6 characters';
		if (!signUpData.phone) newErrors.phone = 'Required';
		if (!signUpData.institution) newErrors.institution = 'Required';
		if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
		if (captchaEnabled && !captchaToken) { toast.error('Please complete the verification'); return; }
		setLoading(true);
		try {
			const { data } = await api.post('/auth/student/register', { ...signUpData, captchaToken });
			toast.success('Account created! Check your email to verify.');
			// Hard block: no session until verified — send them to the verify screen.
			navigate('/verify-email', { state: { email: signUpData.email, devVerifyUrl: data.devVerifyUrl, justRegistered: true } });
		} catch (err) {
			toast.error(err.response?.data?.message || 'Registration failed');
		} finally { setLoading(false); }
	};

	const switchToSignUp = () => { setIsSignIn(false); setErrors({}); setShowPassword(false); };
	const switchToSignIn = () => { setIsSignIn(true); setErrors({}); setShowPassword(false); };

	// ══ LOGIN OTP STEP (2FA) ══
	if (otpStage) {
		return (
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4">
				<AuthBackdrop />
				<motion.div
					initial={{ opacity: 0, y: 18 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-strong relative w-full max-w-md rounded-3xl p-6 shadow-card-lg sm:p-8"
				>
					<button
						onClick={() => { setOtpStage(null); setOtpCode(''); }}
						className="mb-6 flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-primary-ink"
					>
						<ArrowLeft className="h-4 w-4" /> Back to sign in
					</button>

					<div className="relative mx-auto mb-5 h-16 w-16">
						<div className="absolute inset-0 rounded-2xl bg-primary/40 blur-lg animate-glow-pulse" />
						<div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
							<KeyRound className="h-8 w-8 text-white" />
						</div>
					</div>

					<h1 className="text-center font-serif text-3xl font-extrabold text-text">Enter your code</h1>
					<p className="mt-2 text-center text-sm text-muted">
						We sent a 6-digit code to <span className="font-semibold text-text">{otpStage.email}</span>
					</p>

					<form onSubmit={handleVerifyOtp} className="mt-7 space-y-4">
						<input
							autoFocus
							inputMode="numeric"
							maxLength={6}
							value={otpCode}
							onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
							placeholder="••••••"
							className="w-full rounded-2xl border border-line bg-surface-alt py-4 text-center font-serif text-2xl font-bold tracking-[0.35em] text-text outline-none sm:text-3xl sm:tracking-[0.55em] transition focus:border-primary/60 focus:bg-white focus:ring-2 focus:ring-primary/20"
						/>
						<motion.button
							type="submit"
							disabled={otpLoading}
							whileHover={{ scale: 1.015 }}
							whileTap={{ scale: 0.985 }}
							className="w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-60"
						>
							{otpLoading
								? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
								: 'Verify & Sign In'}
						</motion.button>
					</form>

					<button
						onClick={resendLoginOtp}
						disabled={otpLoading}
						className="mt-4 block w-full text-center text-xs font-semibold text-primary-ink transition hover:underline disabled:opacity-60"
					>
						Didn't get it? Resend code
					</button>

					{otpStage.devOtp && (
						<div className="mt-5 rounded-2xl border border-highlight/40 bg-highlight/10 p-3 text-center">
							<p className="text-[13px] font-bold uppercase tracking-wide text-highlight-ink">Demo mode</p>
							<p className="mt-1 text-xs text-muted">No email configured — your code is</p>
							<p className="mt-1 font-serif text-2xl font-extrabold tracking-widest text-highlight-ink">{otpStage.devOtp}</p>
						</div>
					)}
				</motion.div>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4">
			<AuthBackdrop />
			<motion.div
				initial={{ opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
				className="glass-strong relative flex w-full max-w-[1000px] overflow-hidden rounded-none shadow-card-lg md:min-h-[640px]"
			>
				{/* ══ SIGN IN FORM ══ */}
				<motion.div
					initial={false}
					animate={isDesktop ? { x: isSignIn ? '0%' : '-100%', opacity: isSignIn ? 1 : 0 } : { x: 0, opacity: 1 }}
					transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
					style={{ pointerEvents: !isDesktop || isSignIn ? 'all' : 'none' }}
					className={`${isSignIn ? 'flex' : 'hidden'} z-10 w-full items-center justify-center bg-surface/55 p-6 sm:p-8 md:absolute md:inset-y-0 md:left-0 md:flex md:w-1/2 md:p-12`}
				>
					<div className="w-full max-w-sm">
						<Logo />
						<h1 className="font-serif text-3xl font-extrabold leading-tight text-text sm:text-4xl">
							Welcome <span className="text-gradient">back</span>
						</h1>
						<p className="mb-8 mt-2 text-sm text-muted">Sign in to your accommodation dashboard</p>

						<form onSubmit={handleSignIn} className="space-y-4">
							<InputField
								icon={Mail}
								type="email"
								placeholder="Email address"
								value={signInData.email}
								onChange={e => { setSignInData({ ...signInData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
								error={errors.email}
							/>
							<InputField
								icon={Lock}
								type={showPassword ? 'text' : 'password'}
								placeholder="Password"
								value={signInData.password}
								onChange={e => { setSignInData({ ...signInData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
								error={errors.password}
								showToggle
								onToggle={() => setShowPassword(!showPassword)}
								show={showPassword}
							/>
							<div className="flex justify-end">
								<Link to="/forgot-password" className="text-xs font-semibold text-primary-ink transition hover:underline">
									Forgot password?
								</Link>
							</div>
							<motion.button
								type="submit"
								disabled={loading}
								whileHover={{ scale: 1.015, y: -1 }}
								whileTap={{ scale: 0.985 }}
								className="mt-1 w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-70"
							>
								{loading
									? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
									: 'Sign In'}
							</motion.button>
						</form>

						{/* The showcase panel carries the sign-up switch on desktop, but it
						    is hidden on phones — so the toggle has to live here too. */}
						<p className="mt-7 text-center text-xs text-muted md:hidden">
							New to NestFinder?{' '}
							<button type="button" onClick={switchToSignUp} className="font-bold text-primary-ink hover:underline">
								Create an account
							</button>
						</p>

						<p className="mt-3 text-center text-xs text-muted md:mt-7">
							Are you a landlord?{' '}
							<Link to="/landlord/login" className="font-bold text-primary-ink hover:underline">Login here</Link>
						</p>
					</div>
				</motion.div>

				{/* ══ SIGN UP FORM ══ */}
				<motion.div
					initial={false}
					animate={isDesktop ? { x: isSignIn ? '100%' : '0%', opacity: isSignIn ? 0 : 1 } : { x: 0, opacity: 1 }}
					transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
					style={{ pointerEvents: !isDesktop || !isSignIn ? 'all' : 'none' }}
					className={`${isSignIn ? 'hidden' : 'flex'} z-10 w-full items-center justify-center bg-surface/55 p-6 sm:p-8 md:absolute md:inset-y-0 md:left-1/2 md:flex md:w-1/2 md:p-12`}
				>
					<div className="w-full max-w-sm">
						<Logo />
						<h1 className="font-serif text-3xl font-extrabold leading-tight text-text sm:text-4xl">
							Create <span className="text-gradient">account</span>
						</h1>
						<p className="mb-6 mt-2 text-sm text-muted">Join thousands of SIWES students</p>

						<form onSubmit={handleSignUp} className="space-y-3">
							<InputField icon={User} type="text" placeholder="Full name"
								value={signUpData.fullName}
								onChange={e => { setSignUpData({ ...signUpData, fullName: e.target.value }); setErrors({ ...errors, fullName: '' }); }}
								error={errors.fullName} />
							<InputField icon={Mail} type="email" placeholder="Email address"
								value={signUpData.email}
								onChange={e => { setSignUpData({ ...signUpData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
								error={errors.email} />
							<InputField icon={Lock} type={showPassword ? 'text' : 'password'} placeholder="Password (min 6 characters)"
								value={signUpData.password}
								onChange={e => { setSignUpData({ ...signUpData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
								error={errors.password} showToggle onToggle={() => setShowPassword(!showPassword)} show={showPassword} />
							<InputField icon={Phone} type="tel" placeholder="Phone number"
								value={signUpData.phone}
								onChange={e => { setSignUpData({ ...signUpData, phone: e.target.value }); setErrors({ ...errors, phone: '' }); }}
								error={errors.phone} />
							<InputField icon={Building} type="text" placeholder="Institution name"
								value={signUpData.institution}
								onChange={e => { setSignUpData({ ...signUpData, institution: e.target.value }); setErrors({ ...errors, institution: '' }); }}
								error={errors.institution} />
							<Turnstile onVerify={setCaptchaToken} />
							<motion.button
								type="submit"
								disabled={loading}
								whileHover={{ scale: 1.015, y: -1 }}
								whileTap={{ scale: 0.985 }}
								className="w-full rounded-xl bg-brand-gradient py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-glow-sm transition-all hover:shadow-glow disabled:opacity-70"
							>
								{loading
									? <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
									: 'Create Account'}
							</motion.button>
						</form>

						{/* Mobile counterpart to the showcase panel's switch button. */}
						<p className="mt-6 text-center text-xs text-muted md:hidden">
							Already have an account?{' '}
							<button type="button" onClick={switchToSignIn} className="font-bold text-primary-ink hover:underline">
								Sign in
							</button>
						</p>
					</div>
				</motion.div>

				{/* ══ VIVID SHOWCASE PANEL ══ */}
				{/* Decorative, and there is no room for it beside a form on a phone —
				    the switch button it carries is mirrored under each form instead. */}
				<motion.div
					initial={false}
					animate={{ x: isSignIn ? '100%' : '0%' }}
					transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
					className="hidden overflow-hidden md:absolute md:inset-y-0 md:left-0 md:z-20 md:block md:w-1/2"
				>
					<div className="absolute inset-0 bg-brand-gradient" />
					<div className="absolute inset-0 bg-grid opacity-20" />
					<motion.div animate={{ scale: [1, 1.25, 1], rotate: [0, 40, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
						className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
					<motion.div animate={{ scale: [1.2, 1, 1.2] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
						className="absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-highlight/30 blur-3xl" />

					<AnimatePresence mode="wait">
						<motion.div
							key={isSignIn ? 'hello' : 'welcome'}
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -24 }}
							transition={{ duration: 0.4, delay: 0.2 }}
							className="relative z-10 flex h-full flex-col items-center justify-center px-12 text-center"
						>
							<motion.div animate={{ y: [0, -14, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
								className="relative mb-8">
								{/* The badge, not a generic house — with the mark now beside the
								    wordmark on the left, a second unrelated icon read as two competing
								    logos on one screen. It stands on its own rather than in a glass
								    tile: a round badge framed in a square box fights its own shape. */}
									<div className="absolute inset-0 scale-90 rounded-full bg-white/20 blur-2xl" />
									<BrandMark variant="full" size={104} className="relative text-white" />
							</motion.div>

							<h2 className="font-serif text-4xl font-extrabold text-white">
								{isSignIn ? 'Find your nest' : 'Welcome aboard'}
							</h2>
							<p className="mx-auto mb-8 mt-3 max-w-[240px] text-sm leading-relaxed text-white/85">
								{isSignIn
									? 'Verified off-campus housing for your industrial training — no scams, no stress.'
									: 'Create your account and start your accommodation journey with verified landlords.'}
							</p>

							<motion.button
								onClick={isSignIn ? switchToSignUp : switchToSignIn}
								whileHover={{ scale: 1.04 }}
								whileTap={{ scale: 0.97 }}
								className="rounded-full border-2 border-white/70 px-9 py-3 text-xs font-bold uppercase tracking-widest text-white transition-all hover:bg-white/15"
							>
								{isSignIn ? 'Sign Up' : 'Sign In'}
							</motion.button>

							<div className="mt-10 grid w-full max-w-[260px] grid-cols-2 gap-3">
								{(isSignIn ? [{ v: '500+', l: 'Listings' }, { v: '1K+', l: 'Students' }] : [{ v: '20+', l: 'Cities' }, { v: 'Free', l: 'Always' }]).map(s => (
									<div key={s.l} className="glass-tint rounded-2xl p-3.5">
										<div className="font-serif text-xl font-extrabold text-white">{s.v}</div>
										<div className="mt-0.5 text-[12px] font-bold uppercase tracking-wider text-white/75">{s.l}</div>
									</div>
								))}
							</div>

							<div className="mt-8 flex items-center gap-2 text-[13px] font-semibold text-white/85">
								<BadgeCheck className="h-3.5 w-3.5" /> ID-verified landlords
								<span className="mx-1 opacity-50">·</span>
								<ShieldCheck className="h-3.5 w-3.5" /> Secure 2-step login
							</div>
						</motion.div>
					</AnimatePresence>
				</motion.div>
			</motion.div>

			<Sparkles className="pointer-events-none absolute right-8 top-8 h-5 w-5 text-primary-ink/50 animate-glow-pulse" />
		</div>
	);
}
