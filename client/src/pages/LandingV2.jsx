import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavPill from '../components/common/NavPill';
import BrandMark from '../components/common/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ArrowRight, ArrowUpRight, BadgeCheck, Bed, ChevronDown, Home, LayoutDashboard,
	LogOut, Mail, MapPin, MessageCircle, Phone, Quote, Search, ShieldCheck,
	Sparkles, KeyRound, } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getImageUrl } from '../utils/urlHelper';

const HERO_IMG = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1100&q=85';
const HERO_IMG_2 = 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=700&q=85';
const TRUST_IMG = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=85';

// Unsplash will serve any width from the same photo, so a phone can fetch a
// file sized for its screen instead of the full-width desktop one.
const srcSetFor = (url) => {
	const full = Number(url.match(/w=(\d+)/)?.[1]) || 1100;
	return `${url.replace(/w=\d+/, 'w=640')} 640w, ${url} ${full}w`;
};

const stats = [
	{ value: '1,200+', label: 'Verified Homes' },
	{ value: '30+', label: 'Cities Covered' },
	{ value: '98%', label: 'Match Rate' },
	{ value: '24/7', label: 'Live Support' },
];

const cities = [
	{ name: 'Lagos', count: '480+ homes', image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80' },
	{ name: 'Ibadan', count: '210+ homes', image: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=80' },
	{ name: 'Abeokuta', count: '140+ homes', image: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=800&q=80' },
	{ name: 'Akure', count: '95+ homes', image: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=800&q=80' },
];

const fallbackListings = [
	{ _id: 'a', title: 'The Glass Pavilion', area: 'Lekki Phase 1', city: 'Lagos', price: 420000, roomType: 'self-contained', rooms: 3, images: ['https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85'], landlord: { verified: true } },
	{ _id: 'b', title: 'Skyline Studio', area: 'Victoria Island', city: 'Lagos', price: 280000, roomType: 'single', rooms: 1, images: ['https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=900&q=85'], landlord: { verified: true } },
	{ _id: 'c', title: 'Bodija Courtyard', area: 'Bodija', city: 'Ibadan', price: 180000, roomType: 'shared', rooms: 2, images: ['https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=85'], landlord: { verified: false } },
];

const journeySteps = [
	{ number: '01', title: 'Search & shortlist', text: 'Filter verified homes by city, budget, and room type. No spam, no ghost listings.', icon: Search },
	{ number: '02', title: 'Verify your identity', text: 'A quick ID check unlocks messaging and full listing details — it keeps everyone safe.', icon: KeyRound },
	{ number: '03', title: 'Message the landlord', text: 'Chat directly with ID-verified landlords, ask questions, and arrange a viewing.', icon: MessageCircle },
	{ number: '04', title: 'Move in with confidence', text: 'You know exactly who you’re renting from. Real people, real homes, real clarity.', icon: BadgeCheck },
];

const trustPoints = [
	{ title: 'ID-verified on both sides', text: 'Students and landlords both pass a government-ID check, matched against their profile photo by an admin.', icon: ShieldCheck },
	{ title: 'Secure 2-step login', text: 'Every sign-in is protected by a one-time code sent to your email — a stolen password isn’t enough.', icon: KeyRound },
	{ title: 'Built for SIWES', text: 'Find accommodation close to your industrial-training placement, compare options, and move fast.', icon: MapPin },
];

const testimonials = [
	{ name: 'Amaka O.', school: 'University of Lagos · Computer Science', quote: 'Found a place 10 minutes from my placement in two days. No stress, no fake listings.' },
	{ name: 'Tunde A.', school: 'OAU · Mechanical Engineering', quote: 'The verified badge gave me confidence to talk to the landlord before ever visiting in person.' },
	{ name: 'Blessing E.', school: 'University of Ibadan · Mass Comm.', quote: 'The 2-step login and ID checks make it feel safe — like a real property platform, not a group chat.' },
];

const faqs = [
	{ q: 'How are landlords verified?', a: 'Every landlord uploads a government ID and a profile photo. An admin reviews and matches them before the account earns its verified badge and can publish listings.' },
	{ q: 'Is there a fee to search?', a: 'No. Browsing, searching, and comparing listings is completely free for students. You only pay the landlord directly for rent and any agreed deposit.' },
	{ q: 'Why do I need to verify my identity?', a: 'It protects everyone. Verifying with an ID unlocks messaging and full listing details, and lets landlords know they’re dealing with a real student.' },
	{ q: 'What if I move during my placement?', a: 'You can search and shortlist new accommodation any time from your dashboard, and message landlords directly to arrange a transition.' },
];

const roomLabel = { single: 'Single Room', shared: 'Shared Room', 'self-contained': 'Self-Contained' };

function Eyebrow({ children }) {
	return <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-primary-ink"><span className="h-px w-6 bg-primary/50" />{children}</p>;
}

function HeroSearch({ onSearch }) {
	const [city, setCity] = useState('');
	const [roomType, setRoomType] = useState('');
	return (
		<form
			onSubmit={(e) => { e.preventDefault(); onSearch({ city, roomType }); }}
			className="glass-strong mt-8 flex w-full flex-col gap-2 rounded-2xl p-2.5 shadow-card sm:flex-row sm:items-center sm:gap-0"
		>
			<div className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3 sm:border-r sm:border-line">
				<MapPin className="h-4 w-4 shrink-0 text-primary-ink" />
				<input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City or area — e.g. Bodija" className="w-full bg-transparent text-sm text-text placeholder-muted outline-none" />
			</div>
			<div className="flex flex-1 items-center gap-3 px-4 py-3">
				<Home className="h-4 w-4 shrink-0 text-primary-ink" />
				<select aria-label="Room type" value={roomType} onChange={(e) => setRoomType(e.target.value)} className="w-full cursor-pointer bg-transparent text-sm text-text outline-none [&>option]:bg-surface">
					<option value="">Any room type</option>
					<option value="single">Single Room</option>
					<option value="shared">Shared Room</option>
					<option value="self-contained">Self-Contained</option>
				</select>
			</div>
			<button type="submit" className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow">
				<Search className="h-4 w-4" /> Search
			</button>
		</form>
	);
}

function PropertyCard({ listing, onClick, index }) {
	const verified = listing.landlord?.verified;
	return (
		<motion.button
			onClick={onClick}
			initial={{ opacity: 0, y: 22 }}
			whileInView={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: index * 0.07 }}
			viewport={{ once: true }}
			className="group overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card-lg"
		>
			<div className="relative h-52 overflow-hidden">
				<img src={getImageUrl(listing.images?.[0]) || HERO_IMG} alt={listing.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
				<div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
				{verified && (
					<span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[13px] font-bold text-success-ink shadow-sm">
						<BadgeCheck className="h-3.5 w-3.5" /> Verified
					</span>
				)}
				<span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 font-serif text-sm font-bold text-primary-ink shadow-sm">
					₦{Number(listing.price).toLocaleString()}<span className="text-[13px] font-semibold text-muted">/yr</span>
				</span>
			</div>
			<div className="p-5">
				<h3 className="font-serif text-lg font-bold text-text transition group-hover:text-primary-ink">{listing.title}</h3>
				<p className="mt-1 flex items-center gap-1 text-sm text-muted"><MapPin className="h-3.5 w-3.5" /> {listing.area}, {listing.city}</p>
				<div className="mt-4 flex items-center gap-4 border-t border-line pt-3 text-xs font-semibold text-muted">
					<span className="flex items-center gap-1.5"><Home className="h-3.5 w-3.5 text-primary-ink" /> {roomLabel[listing.roomType] || listing.roomType}</span>
					<span className="flex items-center gap-1.5"><Bed className="h-3.5 w-3.5 text-primary-ink" /> {listing.rooms} {listing.rooms > 1 ? 'rooms' : 'room'}</span>
				</div>
			</div>
		</motion.button>
	);
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

export default function LandingPageV2() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const [openFaq, setOpenFaq] = useState(0);
	const [featured, setFeatured] = useState([]);

	useEffect(() => {
		api.get('/listings', { params: { limit: 6 } })
			.then(({ data }) => setFeatured((data.listings || []).slice(0, 6)))
			.catch(() => { /* fall back to sample homes */ });
	}, []);

	const homes = featured.length ? featured : fallbackListings;

	const dashLink = () => (user?.role === 'landlord' ? '/landlord/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/dashboard');
	const handleHeroSearch = ({ city, roomType }) => {
		const p = new URLSearchParams();
		if (city) p.set('city', city);
		if (roomType) p.set('roomType', roomType);
		navigate(`/dashboard${p.toString() ? `?${p}` : ''}`);
	};
	const openListing = (id) => navigate(`/listings/${id}`);

	const NAV = [
		{ label: 'Homes', href: '#featured' },
		{ label: 'Cities', href: '#cities' },
		{ label: 'How it works', href: '#journey' },
		{ label: 'Why us', href: '#trust' },
		{ label: 'FAQ', href: '#faq' },
	];

	return (
		<div className="min-h-screen bg-paper text-text">
			{/* ══ NAVBAR ══ */}
			{/* Anchor links live on this page, so the pill carries them and the
			    account actions sit on the right. No mark — the wordmark is the brand. */}
			<NavPill
				links={NAV.map((l) => ({ to: l.href, label: l.label }))}
				right={
					user ? (
						<>
							<button onClick={() => navigate(dashLink())} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-primary-dark">
								<LayoutDashboard className="h-4 w-4" strokeWidth={1.75} /> Dashboard
							</button>
							<button onClick={() => { logout(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold text-muted transition hover:text-danger-ink">
								<LogOut className="h-4 w-4" strokeWidth={1.75} /> Sign out
							</button>
						</>
					) : (
						<>
							<button onClick={() => navigate('/student/login')} className="rounded-full px-3.5 py-2 text-[14px] font-semibold text-ink transition hover:bg-ink/[0.06]">Sign in</button>
							<button onClick={() => navigate('/student/register')} className="rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-white transition hover:bg-primary-dark">Get started</button>
						</>
					)
				}
				mobileExtras={
					user ? (
						<button onClick={() => navigate(dashLink())} className="block w-full px-4 py-3 text-left text-sm font-semibold text-primary-ink">Dashboard</button>
					) : (
						<>
							<button onClick={() => navigate('/student/login')} className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink">Sign in</button>
							<button onClick={() => navigate('/student/register')} className="block w-full px-4 py-3 text-left text-sm font-semibold text-primary-ink">Get started</button>
						</>
					)
				}
			/>

			{/* ══ HERO ══ */}
			<section className="relative overflow-hidden px-4 pb-16 pt-28 md:px-8 md:pt-36">
				<div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
				<div className="pointer-events-none absolute -left-40 -top-20 h-[30rem] w-[30rem] rounded-full bg-primary/15 blur-[130px] animate-aurora" />
				<div className="pointer-events-none absolute -right-32 top-20 h-[26rem] w-[26rem] rounded-full bg-highlight/20 blur-[130px] animate-float-slow" />

				<div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
					{/* Left — copy */}
					<div>
						<motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-ink">
							<Sparkles className="h-3.5 w-3.5" /> Verified housing for SIWES students
						</motion.div>

						<motion.h1 initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-4xl font-extrabold leading-[1.05] tracking-tight text-text sm:text-5xl sm:leading-[1.02] md:text-7xl">
							Find a home that <span className="italic text-gradient">feels like yours</span>
						</motion.h1>

						<motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
							Handpicked, ID-verified accommodation near your industrial-training placement. No scam listings, no endless scrolling — just real homes from real, verified landlords.
						</motion.p>

						<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="max-w-2xl">
							<HeroSearch onSearch={handleHeroSearch} />
						</motion.div>

						<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }} className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-3 text-xs font-semibold uppercase tracking-wide text-muted">
							<span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary-ink" /> Verified landlords</span>
							<span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-primary-ink" /> Secure 2-step login</span>
							<span className="flex items-center gap-2"><BadgeCheck className="h-4 w-4 text-primary-ink" /> No hidden fees</span>
						</motion.div>
					</div>

					{/* Right — image collage */}
					<motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }} className="relative mx-auto w-full max-w-lg">
						<div className="relative overflow-hidden rounded-none border-4 border-surface shadow-card-lg">
							{/* Phones get the photo's own landscape aspect instead of a fixed
							    height — cropping a 3:2 room shot into a near-square 288×300
							    box throws away most of the frame. Fixed heights return from
							    sm up, where the column is wide enough to fill them. */}
							<img
								src={HERO_IMG}
								srcSet={srcSetFor(HERO_IMG)}
								sizes="(min-width: 1024px) 512px, 100vw"
								alt="A verified home on NestFinder"
								className="aspect-[3/2] w-full object-cover sm:aspect-auto sm:h-[420px] md:h-[500px]"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
							<span className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-success-ink shadow-sm">
								<BadgeCheck className="h-4 w-4" /> Verified Listing
							</span>
						</div>

						{/* Floating small image */}
						<motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute -left-6 -bottom-8 hidden w-40 overflow-hidden rounded-2xl border-4 border-surface shadow-card-lg sm:block">
							<img src={HERO_IMG_2} alt="" className="h-28 w-full object-cover" />
						</motion.div>

						{/* Floating stat card */}
						<motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="glass-strong absolute -right-4 top-10 rounded-2xl p-4 shadow-card-lg">
							<div className="flex items-center gap-2.5">
								<div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient"><Home className="h-4 w-4 text-white" /></div>
								<div>
									<p className="font-serif text-lg font-extrabold leading-none text-text">1,200+</p>
									<p className="text-[12px] font-bold uppercase tracking-wide text-muted">Verified homes</p>
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

			{/* ══ FEATURED HOMES ══ */}
			<section id="featured" className="px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 flex flex-wrap items-end justify-between gap-6">
						<div className="max-w-2xl">
							<Eyebrow>Fresh on NestFinder</Eyebrow>
							<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Homes worth a look</h2>
							<p className="mt-4 text-muted">Every listing comes from a landlord who passed our ID check. Tap any home to see the full details.</p>
						</div>
						<button onClick={() => navigate('/dashboard')} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary-ink transition hover:bg-primary/5 hover:gap-3">
							Browse all homes <ArrowRight className="h-4 w-4" />
						</button>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
						{homes.map((l, i) => <PropertyCard key={l._id} listing={l} index={i} onClick={() => openListing(l._id)} />)}
					</div>
				</div>
			</section>

			{/* ══ CITIES ══ */}
			<section id="cities" className="bg-surface/50 px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<Eyebrow>Explore by location</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Wherever your placement takes you</h2>
					</div>
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{cities.map((c, i) => (
							<motion.button key={c.name} onClick={() => navigate(`/dashboard?city=${encodeURIComponent(c.name)}`)} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} viewport={{ once: true }} className="group relative h-64 overflow-hidden rounded-2xl text-left shadow-card">
								<img src={c.image} alt={c.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
								<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
								<div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
									<div>
										<h3 className="font-serif text-2xl font-extrabold text-white">{c.name}</h3>
										<p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/85">{c.count}</p>
									</div>
									<ArrowUpRight className="h-6 w-6 text-white transition group-hover:-translate-y-1 group-hover:translate-x-1" />
								</div>
							</motion.button>
						))}
					</div>
				</div>
			</section>

			{/* ══ HOW IT WORKS ══ */}
			<section id="journey" className="px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<Eyebrow>Your path to home</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Four steps to settle in</h2>
					</div>
					<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
						{journeySteps.map((s, i) => {
							const Icon = s.icon;
							return (
								<motion.div key={s.number} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="group rounded-2xl border border-line bg-surface p-6 shadow-card transition hover:-translate-y-1">
									<div className="mb-5 flex items-center justify-between">
										<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm"><Icon className="h-5 w-5 text-white" /></div>
										<span className="font-serif text-3xl font-extrabold text-line">{s.number}</span>
									</div>
									<h3 className="mb-2 font-serif text-lg font-bold text-text">{s.title}</h3>
									<p className="text-sm leading-relaxed text-muted">{s.text}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ══ WHY US ══ */}
			<section id="trust" className="bg-surface/50 px-4 py-24 md:px-8">
				<div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1fr] lg:items-center">
					<div>
						<Eyebrow>Why choose us</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Safe by design</h2>
						<p className="mt-5 max-w-lg text-muted">No data brokers. No fake reviews. Just real homes from ID-verified landlords, on a platform built to keep students and owners safe.</p>
						<div className="mt-10 space-y-7">
							{trustPoints.map((t) => {
								const Icon = t.icon;
								return (
									<motion.div key={t.title} initial={{ opacity: 0, x: -14 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="flex gap-4">
										<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Icon className="h-5 w-5 text-primary-ink" /></div>
										<div>
											<h3 className="mb-1 font-serif text-lg font-bold text-text">{t.title}</h3>
											<p className="leading-relaxed text-muted">{t.text}</p>
										</div>
									</motion.div>
								);
							})}
						</div>
					</div>
					<motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="relative overflow-hidden rounded-none border-4 border-surface shadow-card-lg">
						<img
							src={TRUST_IMG}
							srcSet={srcSetFor(TRUST_IMG)}
							sizes="(min-width: 1024px) 512px, 100vw"
							alt="Verified NestFinder home"
							className="aspect-[3/2] w-full object-cover sm:aspect-auto sm:h-[440px]"
						/>
						<div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
						<div className="glass-strong absolute inset-x-5 bottom-5 rounded-2xl p-5">
							<div className="flex items-center gap-2">
								<BadgeCheck className="h-5 w-5 text-success-ink" />
								<h3 className="font-serif text-lg font-bold text-text">Every home, verified</h3>
							</div>
							<p className="mt-1.5 text-sm text-muted">Landlord ID checked · profile-photo matched · reviewed by an admin.</p>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ══ TESTIMONIALS ══ */}
			<section className="px-4 py-24 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-14 max-w-2xl">
						<Eyebrow>From students like you</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Real stories, real moves</h2>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{testimonials.map((t, i) => (
							<motion.div key={t.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }} className="flex flex-col rounded-2xl border border-line bg-surface p-7 shadow-card">
								<Quote className="mb-4 h-7 w-7 text-primary-ink/40" />
								<p className="flex-1 leading-relaxed text-text">&ldquo;{t.quote}&rdquo;</p>
								<div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
									<span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient font-serif font-bold text-white">{t.name.charAt(0)}</span>
									<div>
										<p className="text-sm font-bold text-text">{t.name}</p>
										<p className="text-xs text-muted">{t.school}</p>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ══ FAQ ══ */}
			<section id="faq" className="bg-surface/50 px-4 py-24 md:px-8">
				<div className="mx-auto max-w-4xl">
					<div className="mb-10 max-w-2xl">
						<Eyebrow>Questions, answered</Eyebrow>
						<h2 className="font-serif text-4xl font-extrabold text-text md:text-5xl">Frequently asked</h2>
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
						<h2 className="mx-auto max-w-2xl font-serif text-4xl font-extrabold leading-tight text-white md:text-5xl">Ready to find your place?</h2>
						<p className="mx-auto mt-4 max-w-xl leading-relaxed text-white/85">Join students who’ve already found a safe, verified home for their industrial training.</p>
						<div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row">
							<button onClick={() => navigate(user ? dashLink() : '/student/register')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-primary-ink shadow-lg transition hover:-translate-y-0.5">
								{user ? 'Go to dashboard' : 'Start browsing'} <ArrowRight className="h-4 w-4" />
							</button>
							<button onClick={() => navigate(user?.role === 'landlord' ? '/landlord/dashboard' : '/for-landlords')} className="inline-flex items-center justify-center rounded-xl border-2 border-white/60 px-8 py-4 font-bold text-white transition hover:bg-white/10">
								List your property
							</button>
						</div>
					</div>
				</motion.div>
			</section>

			{/* ══ FOOTER ══ */}
			<footer className="border-t border-line bg-surface px-4 py-16 md:px-8">
				<div className="mx-auto max-w-7xl">
					<div className="mb-12 grid gap-10 md:grid-cols-4">
						<div>
							<div className="mb-5 flex items-center gap-2.5">
								<BrandMark size={38} className="text-primary" />
								<span className="font-serif text-xl font-extrabold text-text">NestFinder</span>
							</div>
							<p className="max-w-xs text-sm leading-relaxed text-muted">Verified off-campus accommodation for students on industrial training. Real homes. Real landlords. Real clarity.</p>
						</div>
						<div>
							<h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary-ink">Explore</h4>
							<div className="space-y-3 text-sm">
								<a href="#featured" className="block text-muted transition hover:text-primary-ink">Featured homes</a>
								<a href="#cities" className="block text-muted transition hover:text-primary-ink">Browse by city</a>
								<a href="#journey" className="block text-muted transition hover:text-primary-ink">How it works</a>
								<a href="#faq" className="block text-muted transition hover:text-primary-ink">FAQ</a>
							</div>
						</div>
						<div>
							<h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary-ink">For landlords</h4>
							<div className="space-y-3 text-sm">
								<button onClick={() => navigate('/for-landlords')} className="block text-muted transition hover:text-primary-ink">List a property</button>
								<a href="mailto:landlord@nestfinder.com" className="block text-muted transition hover:text-primary-ink">Landlord support</a>
							</div>
						</div>
						<div>
							<h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary-ink">Contact</h4>
							<div className="space-y-3 text-sm">
								<a href="mailto:support@nestfinder.com" className="flex items-center gap-2 text-muted transition hover:text-primary-ink"><Mail className="h-4 w-4" /> support@nestfinder.com</a>
								<a href="tel:+2348012345678" className="flex items-center gap-2 text-muted transition hover:text-primary-ink"><Phone className="h-4 w-4" /> +234 801 234 5678</a>
							</div>
						</div>
					</div>
					<div className="flex flex-col gap-4 border-t border-line pt-8 text-sm text-muted md:flex-row md:items-center md:justify-between">
						<p>© {new Date().getFullYear()} NestFinder. Built for SIWES students.</p>
						<div className="flex gap-6">
							<a href="#" className="transition hover:text-primary-ink">Privacy</a>
							<a href="#" className="transition hover:text-primary-ink">Terms</a>
							<a href="#" className="transition hover:text-primary-ink">Cookies</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
