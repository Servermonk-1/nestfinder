import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ArrowRight, BadgeCheck, ChevronDown, Home, KeyRound, LayoutDashboard, LogOut,
	Menu, MessageCircle, ShieldCheck, Sparkles, UploadCloud, Users, Wallet, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BrandMark from '../components/common/Logo';

const HERO_IMG = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1100&q=85';

const stats = [
	{ value: '1K+', label: 'Students searching' },
	{ value: 'Free', label: 'To list a room' },
	{ value: 'ID', label: 'Verified tenants' },
	{ value: '24/7', label: 'Live support' },
];

const benefits = [
	{ title: 'Reach verified students', text: 'Every student who contacts you has passed a government-ID check — no time-wasters, no fake enquiries.', icon: Users },
	{ title: 'Direct, secure messaging', text: 'Chat with students one-on-one on the platform. No agents, no middlemen, no hidden cuts.', icon: MessageCircle },
	{ title: 'Free to list', text: 'Posting your rooms costs nothing. You only ever deal directly with the student for rent.', icon: Wallet },
	{ title: 'A simple dashboard', text: 'Add rooms, mark them taken, edit details and track views — all from one clean dashboard.', icon: LayoutDashboard },
];

const steps = [
	{ n: '01', title: 'Create your account', text: 'Sign up as a landlord in under a minute with your email and phone.', icon: Home },
	{ n: '02', title: 'Verify your identity', text: 'Upload a government ID and a photo. An admin approves it, earning your Verified badge.', icon: KeyRound },
	{ n: '03', title: 'Post your rooms', text: 'Add photos, price, location and amenities. Your listing goes live to searching students.', icon: UploadCloud },
	{ n: '04', title: 'Chat & fill them', text: 'Verified students message you directly. Arrange viewings and fill your rooms fast.', icon: MessageCircle },
];

const faqs = [
	{ q: 'Does it cost anything to list?', a: 'No. Creating an account and listing your rooms is completely free. You deal directly with the student for rent and any deposit.' },
	{ q: 'Why do I need to verify my identity?', a: 'Verification earns you a “Verified Landlord” badge and lets you publish listings. It reassures students they’re renting from a real, accountable person.' },
	{ q: 'How do students reach me?', a: 'Verified students message you directly through the platform’s secure chat. You get a notification and can reply from your dashboard.' },
	{ q: 'How do I get paid?', a: 'Payments are arranged directly between you and the student — NestFinder never handles your rent or takes a cut.' },
];

function Eyebrow({ children }) {
	return <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-primary-ink"><span className="h-px w-6 bg-primary/50" />{children}</p>;
}

function FaqItem({ faq, isOpen, onToggle }) {
	return (
		<div className="border-b border-line py-6">
			<button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 text-left">
				<span className="font-serif text-lg font-semibold text-text">{faq.q}</span>
				<ChevronDown className={`h-5 w-5 shrink-0 text-primary-ink transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
			</button>
			<AnimatePresence initial={false}>
				{isOpen && (
					<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
						<p className="max-w-2xl pt-4 leading-relaxed text-muted">{faq.a}</p>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default function LandlordLanding() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [openFaq, setOpenFaq] = useState(0);
	const [menu, setMenu] = useState(false);

	const isLandlord = user?.role === 'landlord';
	const NAV = [
		{ label: 'Why list', href: '#why' },
		{ label: 'How it works', href: '#how' },
		{ label: 'FAQ', href: '#faq' },
		{ label: 'For students', href: '/' },
	];

	return (
		<div className="min-h-screen bg-paper text-text">
			{/* ══ NAVBAR ══ */}
			<nav className="fixed inset-x-0 top-0 z-50 border-b border-line/70 glass-strong">
				<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
					<button onClick={() => navigate('/for-landlords')} className="flex items-center gap-2.5">
						<BrandMark size={36} className="text-primary" />
						<span className="font-serif text-xl font-extrabold text-text">NestFinder <span className="text-primary-ink">Landlords</span></span>
					</button>

					<div className="hidden items-center gap-8 lg:flex">
						{NAV.map((l) => (
							l.href.startsWith('#')
								? <a key={l.href} href={l.href} className="text-sm font-semibold text-muted transition hover:text-primary-ink">{l.label}</a>
								: <button key={l.href} onClick={() => navigate(l.href)} className="text-sm font-semibold text-muted transition hover:text-primary-ink">{l.label}</button>
						))}
					</div>

					<div className="hidden items-center gap-3 md:flex">
						{isLandlord ? (
							<>
								<button onClick={() => navigate('/landlord/dashboard')} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow">
									<LayoutDashboard className="h-4 w-4" /> Dashboard
								</button>
								<button onClick={() => { logout(); navigate('/for-landlords'); }} className="inline-flex items-center gap-1.5 text-sm font-bold text-muted transition hover:text-danger-ink"><LogOut className="h-4 w-4" /> Sign out</button>
							</>
						) : (
							<>
								<button onClick={() => navigate('/landlord/login')} className="text-sm font-bold text-text transition hover:text-primary-ink">Landlord login</button>
								<button onClick={() => navigate('/landlord/register')} className="rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow">List a property</button>
							</>
						)}
					</div>

					<button onClick={() => setMenu(!menu)} className="rounded-xl border border-line bg-surface p-2 text-text md:hidden">{menu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
				</div>
				{menu && (
					<div className="space-y-1 border-t border-line px-4 py-4 md:hidden">
						{NAV.map((l) => <a key={l.href} href={l.href.startsWith('#') ? l.href : undefined} onClick={() => { setMenu(false); if (!l.href.startsWith('#')) navigate(l.href); }} className="block rounded-lg px-3 py-2 text-sm font-semibold text-muted">{l.label}</a>)}
						{isLandlord
							? <button onClick={() => navigate('/landlord/dashboard')} className="mt-2 w-full rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white">Dashboard</button>
							: <>
								<button onClick={() => navigate('/landlord/login')} className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-muted">Landlord login</button>
								<button onClick={() => navigate('/landlord/register')} className="mt-1 w-full rounded-xl bg-brand-gradient px-4 py-3 text-sm font-bold text-white">List a property</button>
							</>}
					</div>
				)}
			</nav>

			{/* ══ HERO ══ */}
			<section className="relative overflow-hidden px-4 pb-16 pt-28 md:px-8 md:pt-36">
				<div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
				<div className="pointer-events-none absolute -left-40 -top-20 h-[30rem] w-[30rem] rounded-full bg-primary/15 blur-[130px] animate-aurora" />
				<div className="pointer-events-none absolute -right-32 top-20 h-[26rem] w-[26rem] rounded-full bg-highlight/20 blur-[130px] animate-float-slow" />

				<div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
					<div>
						<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-ink">
							<Sparkles className="h-3.5 w-3.5" /> For landlords &amp; agents
						</motion.div>
						<motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-5xl font-extrabold leading-[1.02] tracking-tight text-text md:text-7xl">
							Fill your rooms with <span className="italic text-gradient">verified students</span>
						</motion.h1>
						<motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
							List your off-campus rooms for free and connect directly with ID-verified SIWES students looking for a safe place to stay. No agents, no cuts, no time-wasters.
						</motion.p>
						<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mt-8 flex flex-col gap-3 sm:flex-row">
							<button onClick={() => navigate(isLandlord ? '/landlord/dashboard' : '/landlord/register')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-7 py-4 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow">
								{isLandlord ? 'Go to dashboard' : 'List a property'} <ArrowRight className="h-4 w-4" />
							</button>
							{!isLandlord && (
								<button onClick={() => navigate('/landlord/login')} className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-7 py-4 text-sm font-bold text-text transition hover:border-primary/40 hover:shadow-card">
									Landlord login
								</button>
							)}
						</motion.div>
						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-semibold uppercase tracking-wide text-muted">
							<span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-primary-ink" /> Free to list</span>
							<span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary-ink" /> Verified tenants</span>
							<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary-ink" /> Secure &amp; direct</span>
						</motion.div>
					</div>

					<motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-lg">
						<div className="relative overflow-hidden rounded-none border-4 border-surface shadow-card-lg">
							<img src={HERO_IMG} alt="A room ready to list" className="h-[420px] w-full object-cover md:h-[500px]" />
							<div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
							<span className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-success-ink shadow-sm"><BadgeCheck className="h-4 w-4" /> Verified Landlord</span>
						</div>
						<motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="glass-strong absolute -right-4 top-10 rounded-2xl p-4 shadow-card-lg">
							<div className="flex items-center gap-2.5">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient"><Users className="h-4 w-4 text-white" /></div>
								<div>
									<p className="font-serif text-lg font-extrabold leading-none text-text">1,000+</p>
									<p className="text-[12px] font-bold uppercase tracking-wide text-muted">Students searching</p>
								</div>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* ══ STATS ══ */}
			<section className="border-y border-line bg-surface/60 px-4 py-14 md:px-8">
				<div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center md:grid-cols-4">
					{stats.map((s, i) => (
						<motion.div key={s.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }}>
							<p className="font-serif text-4xl font-extrabold text-gradient md:text-5xl">{s.value}</p>
							<p className="mt-2 text-xs font-bold uppercase tracking-widest text-muted">{s.label}</p>
						</motion.div>
					))}
				</div>
			</section>

			{/* ══ WHY LIST ══ */}
			<section id="why" className="px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<Eyebrow>Why list with us</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Built to fill rooms, safely</h2>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{benefits.map((bnf, i) => {
							const Icon = bnf.icon;
							return (
								<motion.div key={bnf.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} viewport={{ once: true }} className="rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1">
									<div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm"><Icon className="h-5 w-5 text-white" /></div>
									<h3 className="mb-2 font-serif text-lg font-bold text-text">{bnf.title}</h3>
									<p className="text-sm leading-relaxed text-muted">{bnf.text}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ══ HOW IT WORKS ══ */}
			<section id="how" className="bg-surface/50 px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<Eyebrow>How it works</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">From sign-up to signed lease</h2>
					</div>
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{steps.map((s, i) => {
							const Icon = s.icon;
							return (
								<motion.div key={s.n} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1">
									<div className="mb-5 flex items-center justify-between">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm"><Icon className="h-5 w-5 text-white" /></div>
										<span className="font-serif text-3xl font-extrabold text-line">{s.n}</span>
									</div>
									<h3 className="mb-2 font-serif text-lg font-bold text-text">{s.title}</h3>
									<p className="text-sm leading-relaxed text-muted">{s.text}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ══ FAQ ══ */}
			<section id="faq" className="px-4 py-24 md:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="mb-10 max-w-2xl">
						<Eyebrow>Landlord questions</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Good to know</h2>
					</div>
					{faqs.map((f, i) => <FaqItem key={f.q} faq={f} isOpen={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />)}
				</div>
			</section>

			{/* ══ CTA ══ */}
			<section className="px-4 py-24 md:px-8">
				<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative mx-auto max-w-7xl overflow-hidden rounded-none bg-warm-deep p-10 text-center shadow-card-lg md:p-16">
					<div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
					<div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
					<div className="relative">
						<h2 className="mx-auto max-w-2xl font-serif text-4xl font-extrabold leading-tight text-white md:text-5xl">Ready to list your first room?</h2>
						<p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/85">It’s free, and your rooms go live to verified students the moment you’re approved.</p>
						<div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
							<button onClick={() => navigate(isLandlord ? '/landlord/dashboard' : '/landlord/register')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-primary-ink shadow-lg transition hover:-translate-y-0.5">
								{isLandlord ? 'Go to dashboard' : 'List a property'} <ArrowRight className="h-4 w-4" />
							</button>
							<button onClick={() => navigate('/')} className="inline-flex items-center justify-center rounded-xl border-2 border-white/60 px-8 py-4 font-bold text-white transition hover:bg-white/10">
								I’m a student
							</button>
						</div>
					</div>
				</motion.div>
			</section>

			{/* ══ FOOTER ══ */}
			<footer className="border-t border-line bg-surface px-4 py-12 md:px-8">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
					<div className="flex items-center gap-2.5">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient"><Home className="h-5 w-5 text-white" /></span>
						<span className="font-serif text-xl font-extrabold text-text">NestFinder</span>
					</div>
					<p className="text-sm text-muted">© {new Date().getFullYear()} NestFinder · <button onClick={() => navigate('/')} className="font-semibold text-primary-ink hover:underline">Looking for a room?</button></p>
				</div>
			</footer>
		</div>
	);
}
