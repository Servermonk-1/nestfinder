import { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ArrowRight,
	BadgeCheck,
	BarChart3,
	Building2,
	Car,
	ChevronRight,
	Clock3,
	Droplets,
	Eye,
	Flame,
	Home,
	Lock,
	MapPin,
	MessageCircle,
	Radar,
	Search,
	Shield,
	ShieldAlert,
	Sparkles,
	Users,
	Wifi,
	Zap,
	Star,
	TrendingUp,
	Lightbulb,
	Heart,
	CheckCircle,
	Code,
	Rocket,
	Target,
	ArrowUp,
	Volume2,
	Zap as Lightning,
	Flame as Fire,
	Wind,
	AlertCircle,
	Trophy,
	Cpu,
	Layers,
	Infinity,
	Brain,
	Eye as EyeIcon,
	Crosshair,
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import heroMark from '../assets/hero.png';

// ==================== DATA ====================

const listings = [
	{
		title: 'Self-contained room',
		location: 'Ring Road, Ibadan',
		price: 45000,
		distance: 8,
		safety: 92,
		type: 'self-contained',
		amenities: ['WiFi', 'Water', 'Security'],
		verified: true,
		landlordScore: 4.8,
		responseTime: '2 hours',
	},
	{
		title: 'Shared apartment',
		location: 'Yaba, Lagos',
		price: 65000,
		distance: 5,
		safety: 88,
		type: 'shared',
		amenities: ['Power', 'Parking', 'Kitchen'],
		verified: true,
		landlordScore: 4.6,
		responseTime: '30 min',
	},
	{
		title: 'Single room near office hub',
		location: 'Garki, Abuja',
		price: 52000,
		distance: 6,
		safety: 95,
		type: 'single',
		amenities: ['Water', 'Security', 'Private Bath'],
		verified: true,
		landlordScore: 4.9,
		responseTime: '1 hour',
	},
];

const cityPins = [
	{ city: 'Ibadan', x: '33%', y: '52%', rooms: 124, trend: '+12%' },
	{ city: 'Lagos', x: '24%', y: '64%', rooms: 198, trend: '+28%' },
	{ city: 'Abuja', x: '58%', y: '36%', rooms: 87, trend: '+5%' },
	{ city: 'Enugu', x: '69%', y: '58%', rooms: 61, trend: '+18%' },
	{ city: 'Port Harcourt', x: '73%', y: '72%', rooms: 74, trend: '+9%' },
];

const amenities = [
	{ icon: Zap, label: 'Electricity', color: 'text-yellow-300' },
	{ icon: Droplets, label: 'Water', color: 'text-sky-300' },
	{ icon: Shield, label: 'Security', color: 'text-emerald-300' },
	{ icon: Wifi, label: 'WiFi', color: 'text-violet-300' },
	{ icon: Car, label: 'Parking', color: 'text-orange-300' },
	{ icon: Flame, label: 'Kitchen', color: 'text-rose-300' },
	{ icon: Lock, label: 'Private Bath', color: 'text-blue-300' },
];

const testimonials = [
	{
		name: 'Chioma Okonkwo',
		role: 'FUTO Student',
		text: 'Found my perfect apartment in 15 minutes. The safety scores actually matter!',
		avatar: '👩‍🎓',
		rating: 5,
		savings: 'Saved ₦45,000',
	},
	{
		name: 'Tunde Adeleke',
		role: 'UI Student, Ibadan',
		text: 'No more agent scams. Direct contact with landlords is a game changer.',
		avatar: '👨‍🎓',
		rating: 5,
		savings: 'Zero agent fees',
	},
	{
		name: 'Zainab Hassan',
		role: 'UNEC Student',
		text: 'The AI scoring actually understands what students need. Mind blowing!',
		avatar: '👩‍💼',
		rating: 5,
		savings: '3hrs time saved',
	},
];

const features = [
	{
		icon: Brain,
		title: 'Neural Match AI',
		description: 'Machine learning algorithm that learns your preferences and gets smarter with every search',
		gradient: 'from-blue-500 to-cyan-500',
		tag: 'Smart',
	},
	{
		icon: Cpu,
		title: 'Real-time Fraud Detection',
		description: 'Quantum-level pattern recognition catches scams before you see them',
		gradient: 'from-rose-500 to-pink-500',
		tag: 'Secure',
	},
	{
		icon: Eye,
		title: 'Live Safety Radar',
		description: 'Real-time neighborhood safety data with crime heatmaps and incident reports',
		gradient: 'from-emerald-500 to-green-500',
		tag: 'Safe',
	},
	{
		icon: MessageCircle,
		title: 'Instant Landlord Chat',
		description: 'AI-powered chatbot suggests questions and negotiates on your behalf',
		gradient: 'from-purple-500 to-pink-500',
		tag: 'Fast',
	},
	{
		icon: BarChart3,
		title: 'Market Intelligence',
		description: 'Price predictions, availability forecasts, and demand analytics',
		gradient: 'from-orange-500 to-red-500',
		tag: 'Data-Driven',
	},
	{
		icon: Layers,
		title: 'Smart Comparisons',
		description: 'Multi-dimensional room comparison with weighted scoring system',
		gradient: 'from-indigo-500 to-blue-500',
		tag: 'Smart',
	},
];

const powerFeatures = [
	{
		icon: Volume2,
		title: 'Voice Search',
		description: 'Search for rooms using natural language voice commands',
		color: 'from-blue-500 to-cyan-500',
	},
	{
		icon: Crosshair,
		title: 'Location Radius Map',
		description: 'Draw a radius around your workplace and find rooms within that area',
		color: 'from-purple-500 to-pink-500',
	},
	{
		icon: Infinity,
		title: 'Smart Notifications',
		description: 'Get instant alerts when new rooms match your exact criteria',
		color: 'from-emerald-500 to-green-500',
	},
	{
		icon: Trophy,
		title: 'Landlord Leaderboard',
		description: 'See which landlords respond fastest and treat students best',
		color: 'from-amber-500 to-orange-500',
	},
];

const stats = [
	{ value: '500+', label: 'Verified Listings', icon: Home, color: 'text-blue-400', growth: '+45%' },
	{ value: '20+', label: 'Student Cities', icon: MapPin, color: 'text-rose-400', growth: '+3' },
	{ value: '1K+', label: 'Happy Students', icon: Users, color: 'text-emerald-400', growth: '+200%' },
	{ value: '99.2%', label: 'Fraud Detection', icon: Shield, color: 'text-purple-400', growth: '+0.8%' },
];

const formatNaira = (amount) => `NGN ${amount.toLocaleString()}`;

const scoreListing = (listing, budget, distancePriority, safetyPriority) => {
	const budgetScore = Math.max(0, 100 - Math.abs(listing.price - budget) / 700);
	const distanceScore = Math.max(0, 100 - listing.distance * 8);
	const safetyScore = listing.safety;
	const weighted = budgetScore * 0.42 + distanceScore * (distancePriority / 100) * 0.28 + safetyScore * (safetyPriority / 100) * 0.3;
	return Math.min(99, Math.max(48, Math.round(weighted)));
};

// ==================== COMPONENTS ====================

// 🎯 Enhanced Mini Listing with Landlord Score
const MiniListing = ({ listing, selected, onClick, score }) => (
	<motion.button
		type="button"
		onClick={onClick}
		whileHover={{ scale: 1.02, y: -2 }}
		whileTap={{ scale: 0.98 }}
		className={`w-full rounded-2xl border p-4 text-left transition-all duration-300 relative overflow-hidden group ${selected
			? 'border-blue-400/50 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 shadow-2xl shadow-blue-500/20'
			: 'border-[#8B95A1]/15 bg-surface/[0.04] hover:border-[#8B95A1]/20 hover:bg-surface/[0.07]'
			}`}
	>
		<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/0 to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
		<div className="relative z-10">
			<div className="flex items-start justify-between gap-4">
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<p className="text-sm font-black text-white">{listing.title}</p>
						{listing.verified && (
							<motion.div
								animate={{ scale: [1, 1.2, 1] }}
								transition={{ duration: 2, repeat: Infinity }}
							>
								<CheckCircle className="h-4 w-4 text-emerald-400" />
							</motion.div>
						)}
					</div>
					<p className="mt-1 flex items-center gap-1 text-xs font-medium text-muted">
						<MapPin className="h-3.5 w-3.5 text-blue-400" />
						{listing.location}
					</p>
				</div>
				<div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 px-3 py-1">
					<Star className="h-3 w-3 text-emerald-300 fill-emerald-300" />
					<span className="text-xs font-black text-emerald-300">{score}%</span>
				</div>
			</div>

			<div className="mt-3 flex items-center justify-between text-xs">
				<div className="flex items-center gap-1">
					<Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
					<span className="font-bold text-muted">{listing.landlordScore}</span>
					<span className="text-muted">landlord</span>
				</div>
				<span className="text-cyan-400 font-bold">{listing.responseTime} avg reply</span>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				{listing.amenities.map((item) => (
					<span key={item} className="rounded-full bg-surface/5 px-2.5 py-1 text-xs font-semibold text-muted backdrop-blur">
						{item}
					</span>
				))}
			</div>
			<div className="mt-4 flex items-center justify-between pt-4 border-t border-[#8B95A1]/15">
				<p className="text-base font-black text-white">
					{formatNaira(listing.price)}
					<span className="ml-1 text-xs font-medium text-muted">/mo</span>
				</p>
				<p className="text-xs font-bold text-blue-400">{listing.distance}km away</p>
			</div>
		</div>
	</motion.button>
);

// 🎨 Feature Card with Icon Animation
const FeatureCard = ({ icon: Icon, title, description, gradient, tag, index }) => (
	<motion.div
		initial={{ opacity: 0, y: 24 }}
		whileInView={{ opacity: 1, y: 0 }}
		viewport={{ once: true, margin: '-80px' }}
		transition={{ delay: index * 0.1 }}
		whileHover={{ translateY: -8, scale: 1.02 }}
		className="group relative rounded-2xl border border-[#8B95A1]/15 bg-gradient-to-br from-gray-900 to-gray-950 p-6 overflow-hidden hover:border-[#8B95A1]/20 transition-all duration-300"
	>
		<div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
		<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
			<div className={`absolute inset-0 bg-gradient-to-br ${gradient} blur-2xl opacity-20`} />
		</div>
		<div className="relative z-10">
			<div className="flex items-start justify-between">
				<div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} p-[1px]`}>
					<div className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface group-hover:bg-surface transition-colors">
						<Icon className="h-6 w-6 text-white" />
					</div>
				</div>
				<span className="text-xs font-black px-2 py-1 rounded-full bg-surface/10 text-muted">
					{tag}
				</span>
			</div>
			<h3 className="mt-5 text-lg font-black text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text transition-all" style={{
				backgroundImage: `linear-gradient(135deg, #fff, #fff)`,
				backgroundClip: 'text',
			}}>
				{title}
			</h3>
			<p className="mt-3 text-sm leading-6 text-muted group-hover:text-muted transition-colors">
				{description}
			</p>
		</div>
	</motion.div>
);

// 💫 Floating Particle
const FloatingParticle = ({ delay, duration }) => (
	<motion.div
		className="absolute w-2 h-2 bg-blue-400 rounded-full opacity-60"
		initial={{
			x: Math.random() * window.innerWidth,
			y: Math.random() * window.innerHeight,
		}}
		animate={{
			y: [0, -100, 0],
			x: [0, 30, 0],
			opacity: [0, 0.6, 0],
		}}
		transition={{
			duration,
			delay,
			repeat: Infinity,
		}}
		style={{ pointerEvents: 'none' }}
	/>
);

// 📊 Animated Counter
const AnimatedCounter = ({ end, suffix = '' }) => {
	const [count, setCount] = useState(0);
	const nodeRef = useRef(null);

	useEffect(() => {
		let interval;
		const observer = new IntersectionObserver(([entry]) => {
			if (entry.isIntersecting) {
				interval = setInterval(() => {
					setCount((prev) => {
						if (prev < end) return prev + Math.ceil(end / 50);
						return end;
					});
				}, 30);
			}
		});
		if (nodeRef.current) observer.observe(nodeRef.current);
		return () => clearInterval(interval);
	}, [end]);

	return (
		<span ref={nodeRef}>{Math.floor(count)}{suffix}</span>
	);
};

// 🎬 Testimonial Card
const TestimonialCard = ({ name, role, text, avatar, rating, savings, index }) => (
	<motion.div
		initial={{ opacity: 0, y: 24 }}
		whileInView={{ opacity: 1, y: 0 }}
		viewport={{ once: true }}
		transition={{ delay: index * 0.1 }}
		whileHover={{ scale: 1.05 }}
		className="rounded-2xl border border-[#8B95A1]/15 bg-gradient-to-br from-gray-900 to-gray-950 p-6 backdrop-blur overflow-hidden group"
	>
		<div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/5 group-hover:to-cyan-500/5 transition-all duration-300" />
		<div className="relative z-10">
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-2">
					{[...Array(rating)].map((_, i) => (
						<motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 + i * 0.05 }}>
							<Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
						</motion.div>
					))}
				</div>
				<div className="text-xs font-black px-2 py-1 rounded-full bg-green-500/20 text-green-300">
					✓ {savings}
				</div>
			</div>
			<p className="text-sm leading-7 text-muted italic">"{text}"</p>
			<div className="mt-4 flex items-center gap-3 pt-4 border-t border-[#8B95A1]/15">
				<div className="text-2xl">{avatar}</div>
				<div>
					<p className="text-sm font-black text-white">{name}</p>
					<p className="text-xs text-muted">{role}</p>
				</div>
			</div>
		</div>
	</motion.div>
);

// 🔥 Power Feature Card
const PowerFeatureCard = ({ icon: Icon, title, description, color, index }) => (
	<motion.div
		initial={{ opacity: 0, x: index % 2 === 0 ? -40 : 40 }}
		whileInView={{ opacity: 1, x: 0 }}
		viewport={{ once: true }}
		transition={{ delay: index * 0.1 }}
		whileHover={{ scale: 1.05 }}
		className={`rounded-2xl border border-[#8B95A1]/15 bg-gradient-to-br ${color} bg-opacity-10 p-6 relative overflow-hidden group`}
	>
		<div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
		<div className="relative z-10">
			<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface/10 group-hover:bg-surface/20 transition-colors">
				<Icon className="h-7 w-7 text-white" />
			</div>
			<h3 className="mt-4 text-xl font-black text-white">{title}</h3>
			<p className="mt-2 text-sm text-muted">{description}</p>
		</div>
	</motion.div>
);

// ==================== MAIN COMPONENT ====================

export default function Landing() {
	const navigate = useNavigate();
	const [searchCity, setSearchCity] = useState('');
	const [roomType, setRoomType] = useState('');
	const [budget, setBudget] = useState(55000);
	const [distancePriority, setDistancePriority] = useState(70);
	const [safetyPriority, setSafetyPriority] = useState(85);
	const [activeListing, setActiveListing] = useState(0);
	const [activePin, setActivePin] = useState(cityPins[0]);
	const [showCityModal, setShowCityModal] = useState(false);

	const scoredListings = useMemo(
		() =>
			listings
				.map((listing) => ({
					...listing,
					score: scoreListing(listing, budget, distancePriority, safetyPriority),
				}))
				.sort((a, b) => b.score - a.score),
		[budget, distancePriority, safetyPriority]
	);

	const bestListing = scoredListings[activeListing] || scoredListings[0];

	const handleSearch = () => {
		const params = new URLSearchParams();
		if (searchCity) params.set('city', searchCity);
		if (roomType) params.set('roomType', roomType);
		navigate(`/dashboard?${params.toString()}`);
	};

	return (
		<div className="min-h-screen overflow-hidden bg-surface text-white">
			<Navbar />

			{/* ==================== HERO SECTION ====================  */}
			<section className="relative min-h-screen px-6 pb-20 pt-28 overflow-hidden">
				{/* Particles Background */}
				<div className="absolute inset-0 overflow-hidden">
					{[...Array(20)].map((_, i) => (
						<FloatingParticle
							key={i}
							delay={i * 0.3}
							duration={4 + i * 0.2}
						/>
					))}
				</div>

				{/* Enhanced Gradient Background */}
				<div className="absolute inset-0">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(26,86,219,0.35),rgba(26,86,219,0),transparent_80%),radial-gradient(ellipse_80%_80%_at_80%_80%,rgba(59,130,246,0.2),transparent_50%),radial-gradient(ellipse_80%_80%_at_20%_50%,rgba(139,92,246,0.15),transparent_50%)]" />
					<div className="absolute inset-0" style={{
						backgroundImage: 'linear-gradient(rgba(255,255,255,.01) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.01) 1px, transparent 1px)',
						backgroundSize: '54px 54px',
					}} />
				</div>

				<div className="relative mx-auto grid min-h-[calc(100vh-7rem)] max-w-7xl items-center gap-14 lg:grid-cols-[1fr_1fr]">
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
						{/* Badge */}
						<motion.div
							initial={{ opacity: 0, y: 18 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-200 backdrop-blur group cursor-pointer"
						>
							<motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity }}>
								<Sparkles className="h-4 w-4 text-blue-400" />
							</motion.div>
							Next-Gen Housing AI
						</motion.div>

						{/* Main Headline */}
						<motion.h1
							initial={{ opacity: 0, y: 28 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className="mt-8 max-w-2xl text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.1] tracking-tight"
						>
							<span className="block">Your AI</span>
							<span className="block bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
								housing copilot
							</span>
							<span className="block">awaits.</span>
						</motion.h1>

						{/* Subheadline */}
						<motion.p
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.3 }}
							className="mt-6 max-w-2xl text-lg leading-8 text-muted"
						>
							Neural match scoring. Real-time fraud detection. Live safety data. Instant landlord chat. Zero agents. Zero scams. Just pure housing intelligence.
						</motion.p>

						{/* Search Box */}
						<motion.div
							initial={{ opacity: 0, y: 24 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.4 }}
							className="mt-10 rounded-2xl border border-[#8B95A1]/15 bg-surface/[0.04] p-2 shadow-2xl shadow-blue-500/10 backdrop-blur-xl hover:border-[#8B95A1]/20 transition-all duration-300 group"
						>
							<div className="grid gap-2 md:grid-cols-[1fr_140px_auto]">
								<div className="flex items-center gap-3 rounded-xl bg-surface/50 px-5 py-4 group-hover:bg-surface/70 transition-colors">
									<MapPin className="h-5 w-5 text-blue-400" />
									<input
										type="text"
										value={searchCity}
										onChange={(e) => setSearchCity(e.target.value)}
										onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
										placeholder="Ibadan, Lagos, Abuja..."
										className="w-full bg-transparent text-sm font-semibold text-white outline-none placeholder:text-muted"
									/>
								</div>
								<select
									value={roomType}
									onChange={(e) => setRoomType(e.target.value)}
									className="rounded-xl border border-[#8B95A1]/15 bg-surface/50 px-4 py-4 text-sm font-semibold text-muted outline-none"
								>
									<option value="">Any type</option>
									<option value="single">Single</option>
									<option value="shared">Shared</option>
									<option value="self-contained">Studio</option>
								</select>
								<motion.button
									type="button"
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									onClick={handleSearch}
									className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-7 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
								>
									<Search className="h-4 w-4" />
									Find
								</motion.button>
							</div>
						</motion.div>

						{/* Quick City Links */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ delay: 0.5 }}
							className="mt-6 flex flex-wrap gap-2"
						>
							{['Lagos', 'Ibadan', 'Abuja'].map((city) => (
								<motion.button
									key={city}
									whileHover={{ scale: 1.05 }}
									onClick={() => navigate(`/dashboard?city=${city}`)}
									className="rounded-full border border-[#8B95A1]/15 bg-surface/[0.04] px-4 py-2 text-xs font-bold text-muted transition hover:border-blue-400/40 hover:text-blue-200"
								>
									{city}
								</motion.button>
							))}
						</motion.div>
					</motion.div>

					{/* Right Side - Live Match Lab */}
					<motion.div
						initial={{ opacity: 0, x: 40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.3 }}
						className="relative hidden lg:block"
					>
						<div className="absolute -inset-20 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 blur-3xl rounded-full" />
						<div className="relative rounded-3xl border border-[#8B95A1]/15 bg-gradient-to-br from-gray-900/80 to-gray-950/80 p-6 shadow-2xl backdrop-blur-xl">
							<div className="flex items-center justify-between border-b border-[#8B95A1]/15 pb-4">
								<div>
									<p className="text-xs font-black uppercase tracking-wider text-blue-400">⚡ Live Match Lab</p>
									<h2 className="mt-2 text-2xl font-black text-white">AI Scoring Engine</h2>
								</div>
								<motion.div
									animate={{ rotate: 360 }}
									transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
									className="h-8 w-8 text-blue-400"
								>
									<Rocket className="h-full w-full" />
								</motion.div>
							</div>

							<div className="mt-6 space-y-5">
								{/* Budget Slider */}
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-xs font-black uppercase tracking-wider text-muted">
											💰 Budget
										</label>
										<span className="text-sm font-black bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
											{formatNaira(budget)}
										</span>
									</div>
									<input
										type="range"
										min="18000"
										max="90000"
										step="1000"
										value={budget}
										onChange={(e) => setBudget(Number(e.target.value))}
										className="w-full accent-blue-500 h-2 bg-surface rounded-lg appearance-none cursor-pointer hover:accent-blue-400 transition-all"
									/>
								</div>

								{/* Distance Priority */}
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-xs font-black uppercase tracking-wider text-muted">
											📍 Distance
										</label>
										<span className="text-sm font-black text-cyan-400">{distancePriority}%</span>
									</div>
									<input
										type="range"
										min="10"
										max="100"
										value={distancePriority}
										onChange={(e) => setDistancePriority(Number(e.target.value))}
										className="w-full accent-cyan-500 h-2 bg-surface rounded-lg appearance-none cursor-pointer"
									/>
								</div>

								{/* Safety Priority */}
								<div>
									<div className="flex items-center justify-between mb-2">
										<label className="text-xs font-black uppercase tracking-wider text-muted">
											🛡️ Safety
										</label>
										<span className="text-sm font-black text-emerald-400">{safetyPriority}%</span>
									</div>
									<input
										type="range"
										min="10"
										max="100"
										value={safetyPriority}
										onChange={(e) => setSafetyPriority(Number(e.target.value))}
										className="w-full accent-emerald-500 h-2 bg-surface rounded-lg appearance-none cursor-pointer"
									/>
								</div>
							</div>

							{/* Listings */}
							<div className="mt-6 space-y-3 max-h-80 overflow-y-auto scrollbar-hide">
								{scoredListings.map((listing, index) => (
									<MiniListing
										key={listing.title}
										listing={listing}
										score={listing.score}
										selected={bestListing.title === listing.title}
										onClick={() => setActiveListing(index)}
									/>
								))}
							</div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ==================== STATS SECTION ====================  */}
			<section className="relative px-6 py-16 border-y border-[#8B95A1]/15 bg-gradient-to-b from-gray-900/40 to-gray-950">
				<div className="mx-auto max-w-7xl grid gap-8 md:grid-cols-4">
					{stats.map(({ value, label, icon: Icon, color, growth }, idx) => (
						<motion.div
							key={label}
							initial={{ opacity: 0, y: 24 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: idx * 0.1 }}
							whileHover={{ scale: 1.05 }}
							className="group rounded-2xl border border-[#8B95A1]/15 bg-surface/[0.04] p-6 hover:border-[#8B95A1]/20 hover:bg-surface/[0.08] transition-all duration-300 relative overflow-hidden"
						>
							<div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-black text-green-400">
								<ArrowUp className="h-3 w-3" />
								{growth}
							</div>
							<Icon className={`h-6 w-6 ${color}`} />
							<p className="mt-4 text-4xl font-black text-white">
								<AnimatedCounter end={parseInt(value)} suffix={value.replace(/[0-9]/g, '')} />
							</p>
							<p className="mt-1 text-sm font-semibold text-muted">{label}</p>
						</motion.div>
					))}
				</div>
			</section>

			{/* ==================== FEATURES SECTION ====================  */}
			<section className="relative px-6 py-24">
				<div className="mx-auto max-w-7xl">
					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="mx-auto max-w-2xl text-center mb-16"
					>
						<p className="text-sm font-black uppercase tracking-wider text-blue-400">🚀 Why NestFinder Wins</p>
						<h2 className="mt-4 text-5xl font-black leading-tight text-white">The future of student housing is here</h2>
						<p className="mt-4 text-muted">AI-powered, verified, and designed by students for students</p>
					</motion.div>

					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature, idx) => (
							<FeatureCard key={feature.title} {...feature} index={idx} />
						))}
					</div>
				</div>
			</section>

			{/* ==================== POWER FEATURES SECTION ====================  */}
			<section className="relative px-6 py-24 bg-gradient-to-b from-gray-900/20 to-transparent">
				<div className="mx-auto max-w-7xl">
					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="mx-auto max-w-2xl text-center mb-16"
					>
						<p className="text-sm font-black uppercase tracking-wider text-purple-400">🔥 Game Changers</p>
						<h2 className="mt-4 text-5xl font-black leading-tight text-white">Features that break the internet</h2>
					</motion.div>

					<div className="grid gap-6 md:grid-cols-2">
						{powerFeatures.map((feature, idx) => (
							<PowerFeatureCard key={feature.title} {...feature} index={idx} />
						))}
					</div>
				</div>
			</section>

			{/* ==================== TESTIMONIALS SECTION ====================  */}
			<section className="relative px-6 py-24 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent">
				<div className="mx-auto max-w-7xl">
					<motion.div
						initial={{ opacity: 0 }}
						whileInView={{ opacity: 1 }}
						viewport={{ once: true }}
						className="mx-auto max-w-2xl text-center mb-16"
					>
						<p className="text-sm font-black uppercase tracking-wider text-yellow-400">💬 Love From Students</p>
						<h2 className="mt-4 text-5xl font-black leading-tight text-white">Join 1K+ happy students</h2>
					</motion.div>

					<div className="grid gap-6 md:grid-cols-3">
						{testimonials.map((testimonial, idx) => (
							<TestimonialCard key={testimonial.name} {...testimonial} index={idx} />
						))}
					</div>
				</div>
			</section>

			{/* ==================== BIG CTA SECTION ====================  */}
			<section className="relative px-6 py-24 overflow-hidden">
				<div className="absolute inset-0">
					<div className="absolute inset-0 bg-gradient-to-r from-blue-600/30 to-cyan-600/30 blur-3xl" />
					{[...Array(15)].map((_, i) => (
						<motion.div
							key={i}
							className="absolute w-1 h-1 bg-blue-400 rounded-full"
							animate={{
								x: [0, Math.random() * 100 - 50],
								y: [0, Math.random() * 100 - 50],
								opacity: [0, 1, 0],
							}}
							transition={{
								duration: 3 + Math.random() * 2,
								repeat: Infinity,
								delay: i * 0.2,
							}}
							style={{
								left: `${Math.random() * 100}%`,
								top: `${Math.random() * 100}%`,
							}}
						/>
					))}
				</div>

				<div className="relative mx-auto max-w-4xl rounded-3xl border border-[#8B95A1]/15 bg-gradient-to-br from-gray-900 to-gray-950 p-12 text-center shadow-2xl">
					<motion.div
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
					>
						<motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="inline-block mb-6">
							<Home className="mx-auto h-16 w-16 text-blue-400" />
						</motion.div>
						<h2 className="text-4xl font-black text-white">Ready to win at housing?</h2>
						<p className="mt-4 text-lg text-muted">Stop wasting time. Start winning with AI.</p>

						<div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => navigate('/student/register')}
								className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-8 py-4 text-base font-black text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all"
							>
								🚀 Start Searching
								<ArrowRight className="h-5 w-5" />
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => navigate('/landlord/register')}
								className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B95A1]/20 px-8 py-4 text-base font-black text-white hover:border-white/40 hover:bg-surface/5 transition-all"
							>
								List Property
								<Building2 className="h-5 w-5" />
							</motion.button>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ==================== AMENITIES SECTION ====================  */}
			<section className="relative px-6 py-16 border-y border-[#8B95A1]/15 bg-surface/30">
				<div className="mx-auto max-w-7xl">
					<div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
						<div>
							<p className="text-sm font-black uppercase tracking-wider text-blue-400">🏠 Filter & Find</p>
							<h2 className="mt-3 text-3xl font-black text-white">What matters to you?</h2>
						</div>
						<div className="flex flex-wrap gap-3">
							{amenities.map(({ icon: Icon, label, color }, idx) => (
								<motion.button
									key={label}
									initial={{ opacity: 0, y: 10 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ delay: idx * 0.05 }}
									whileHover={{ scale: 1.08, y: -2 }}
									onClick={() => navigate(`/dashboard?amenity=${label.toLowerCase()}`)}
									className="inline-flex items-center gap-2 rounded-full border border-[#8B95A1]/15 bg-surface/[0.04] px-4 py-3 text-sm font-bold text-gray-200 hover:border-white/30 hover:bg-surface/[0.08] transition-all duration-300"
								>
									<Icon className={`h-4 w-4 ${color}`} />
									{label}
								</motion.button>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* ==================== FOOTER ====================  */}
			<footer className="border-t border-[#8B95A1]/15 bg-surface px-6 py-12">
				<div className="mx-auto flex max-w-7xl flex-col gap-8">
					<div className="grid gap-12 md:grid-cols-4">
						<div>
							<div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
								<Home className="h-6 w-6" />
							</div>
							<p className="mt-3 font-black text-white">NestFinder</p>
							<p className="text-xs text-muted">AI-powered housing for students.</p>
						</div>
						<div>
							<p className="text-sm font-black text-white">For Students</p>
							<div className="mt-3 space-y-2">
								<Link to="/student/login" className="block text-sm text-muted hover:text-white transition-colors">Login</Link>
								<Link to="/student/register" className="block text-sm text-muted hover:text-white transition-colors">Sign Up</Link>
								<Link to="/dashboard" className="block text-sm text-muted hover:text-white transition-colors">Browse Rooms</Link>
							</div>
						</div>
						<div>
							<p className="text-sm font-black text-white">For Landlords</p>
							<div className="mt-3 space-y-2">
								<Link to="/landlord/login" className="block text-sm text-muted hover:text-white transition-colors">Login</Link>
								<Link to="/landlord/register" className="block text-sm text-muted hover:text-white transition-colors">List Property</Link>
								<a href="#pricing" className="block text-sm text-muted hover:text-white transition-colors">Pricing</a>
							</div>
						</div>
						<div>
							<p className="text-sm font-black text-white">Legal</p>
							<div className="mt-3 space-y-2">
								<a href="#" className="block text-sm text-muted hover:text-white transition-colors">Privacy</a>
								<a href="#" className="block text-sm text-muted hover:text-white transition-colors">Terms</a>
								<a href="#" className="block text-sm text-muted hover:text-white transition-colors">Contact</a>
							</div>
						</div>
					</div>
					<div className="border-t border-[#8B95A1]/15 pt-8 flex items-center justify-between text-sm text-muted">
						<p>© {new Date().getFullYear()} NestFinder. Built with 💙 for students.</p>
						<p>AATU SIWES Housing Platform</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
