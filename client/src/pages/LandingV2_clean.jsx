import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Home, Building2, Search, Shield, Zap, ChevronRight, Users, MapPin, Clock } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { BlurText } from '../lib/TextAnimations';

export default function LandingPageV2() {
	const navigate = useNavigate();
	const [hoveredFeature, setHoveredFeature] = useState(null);

	const features = [
		{ 
			icon: Search, 
			label: 'Smart Search', 
			description: 'Find listings instantly with advanced filters' 
		},
		{ 
			icon: Shield, 
			label: 'Verified Listings', 
			description: 'All properties verified and fraud-checked' 
		},
		{ 
			icon: Zap, 
			label: 'Instant Messaging', 
			description: 'Chat directly with landlords' 
		},
	];

	const stats = [
		{ number: '5K+', label: 'Happy Students' },
		{ number: '2K+', label: 'Verified Rooms' },
		{ number: '98%', label: 'Success Rate' },
	];

	const steps = [
		{ number: '01', title: 'Create Account', description: 'Sign up in 2 minutes with your email' },
		{ number: '02', title: 'Search Listings', description: 'Browse verified accommodations' },
		{ number: '03', title: 'Connect', description: 'Message landlords directly' },
		{ number: '04', title: 'Secure Booking', description: 'Complete your booking securely' },
	];

	return (
		<div className="min-h-screen bg-surface text-text">
			<Navbar />

			{/* ==================== HERO SECTION ==================== */}
			<section className="relative pt-32 pb-20 px-4 md:px-8 overflow-hidden">
				{/* Subtle background decoration */}
				<div className="absolute inset-0 -z-10">
					<div className="absolute top-20 right-10 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-50" />
					<div className="absolute bottom-0 left-10 w-80 h-80 bg-orange-50 rounded-full blur-3xl opacity-40" />
				</div>

				{/* Hero Content */}
				<motion.div
					className="max-w-4xl mx-auto text-center"
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8 }}
				>
					{/* Badge */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-full text-sm font-medium"
					>
						<Zap className="w-4 h-4" />
						The Future of Student Housing
					</motion.div>

					{/* Main heading with BlurText */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.2 }}
						className="mb-8"
					>
						<h1 className="text-5xl md:text-7xl font-bold mb-4">
							<BlurText 
								text="Find Your Perfect Room" 
								duration={1.2}
								blur={15}
								className="text-orange-600"
							/>
						</h1>
					</motion.div>

					{/* Subheading */}
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-lg md:text-xl text-muted mb-12 max-w-2xl mx-auto leading-relaxed"
					>
						Connect with verified landlords and find affordable, quality accommodation designed for SIWES students.
					</motion.p>

					{/* CTA Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
						className="flex gap-4 justify-center flex-wrap mb-16"
					>
						<button
							onClick={() => navigate('/student/register')}
							className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
						>
							<Home className="w-5 h-5" />
							Find Accommodation
							<ArrowRight className="w-5 h-5" />
						</button>

						<button
							onClick={() => navigate('/landlord/register')}
							className="px-8 py-4 bg-surface border-2 border-orange-600 text-orange-600 hover:bg-orange-50 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2"
						>
							<Building2 className="w-5 h-5" />
							List Property
						</button>
					</motion.div>

					{/* Stats */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ delay: 0.8 }}
						className="grid grid-cols-3 gap-8 max-w-2xl mx-auto"
					>
						{stats.map((stat, i) => (
							<motion.div 
								key={i}
								className="text-center p-4"
								whileHover={{ scale: 1.05 }}
							>
								<div className="text-4xl md:text-5xl font-bold text-orange-600">
									{stat.number}
								</div>
								<div className="text-muted text-sm mt-2">{stat.label}</div>
							</motion.div>
						))}
					</motion.div>
				</motion.div>
			</section>

			{/* ==================== FEATURES SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-[#141B23]">
				<div className="max-w-6xl mx-auto">
					{/* Section heading */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="text-center mb-16"
					>
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">Why Choose NestFinder?</h2>
						<p className="text-lg text-muted max-w-2xl mx-auto">Everything you need to find the perfect accommodation</p>
					</motion.div>

					{/* Feature cards */}
					<div className="grid md:grid-cols-3 gap-8">
						{features.map((feature, index) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={index}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: index * 0.1 }}
									viewport={{ once: true }}
									onMouseEnter={() => setHoveredFeature(index)}
									onMouseLeave={() => setHoveredFeature(null)}
									className="group p-8 bg-surface rounded-2xl border border-[#8B95A1]/20 shadow-sm hover:shadow-xl hover:border-orange-300 transition-all duration-300 cursor-pointer"
								>
									<div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-200 transition-colors">
										<Icon className="w-8 h-8 text-orange-600" />
									</div>
									<h3 className="text-xl font-bold mb-3 text-text">{feature.label}</h3>
									<p className="text-muted leading-relaxed">{feature.description}</p>
									{hoveredFeature === index && (
										<motion.div
											initial={{ opacity: 0, x: -10 }}
											animate={{ opacity: 1, x: 0 }}
											className="mt-4 flex items-center gap-2 text-orange-600 font-medium"
										>
											Learn more <ChevronRight className="w-4 h-4" />
										</motion.div>
									)}
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ==================== HOW IT WORKS SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-surface">
				<div className="max-w-6xl mx-auto">
					{/* Section heading */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="text-center mb-16"
					>
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">How It Works</h2>
						<p className="text-lg text-muted">Get started in 4 simple steps</p>
					</motion.div>

					{/* Steps */}
					<div className="grid md:grid-cols-4 gap-6 md:gap-4">
						{steps.map((step, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								viewport={{ once: true }}
								className="relative"
							>
								{/* Connector line */}
								{index < steps.length - 1 && (
									<div className="hidden md:block absolute top-12 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-1 bg-gradient-to-r from-orange-600 to-orange-100" />
								)}

								<div className="relative z-10 bg-surface border-2 border-orange-200 rounded-2xl p-8 text-center hover:border-orange-600 transition-all duration-300">
									<div className="w-12 h-12 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
										{step.number}
									</div>
									<h3 className="text-lg font-bold mb-2 text-text">{step.title}</h3>
									<p className="text-muted text-sm">{step.description}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ==================== TESTIMONIALS SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-[#141B23]">
				<div className="max-w-6xl mx-auto">
					{/* Section heading */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
						className="text-center mb-16"
					>
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">What Students Say</h2>
						<p className="text-lg text-muted">Real reviews from happy NestFinder users</p>
					</motion.div>

					{/* Testimonials */}
					<div className="grid md:grid-cols-3 gap-8">
						{[
							{ name: 'Chioma O.', text: 'Found my perfect room in just 2 days! The verification process gave me peace of mind.' },
							{ name: 'Tunde M.', text: 'Best platform for student accommodation. Easy to use and landlords are very responsive.' },
							{ name: 'Amara P.', text: 'The smart search feature saved me so much time. Highly recommended!' },
						].map((testimonial, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: index * 0.1 }}
								viewport={{ once: true }}
								className="bg-surface rounded-2xl p-8 border border-[#8B95A1]/20 hover:border-orange-300 transition-all duration-300"
							>
								<div className="flex gap-1 mb-4">
									{[...Array(5)].map((_, i) => (
										<span key={i} className="text-orange-600">★</span>
									))}
								</div>
								<p className="text-muted mb-4 leading-relaxed">{testimonial.text}</p>
								<p className="font-semibold text-text">{testimonial.name}</p>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ==================== CTA SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-surface">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true }}
					className="max-w-4xl mx-auto bg-gradient-to-r from-orange-600 to-orange-500 rounded-3xl p-12 md:p-16 text-center shadow-2xl"
				>
					<h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Ready to Find Your Perfect Room?</h2>
					<p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto">Join thousands of students who have found their ideal accommodation with NestFinder.</p>
					<button
						onClick={() => navigate('/student/register')}
						className="px-10 py-4 bg-surface text-orange-600 rounded-lg font-bold hover:bg-orange-50 transition-all duration-200 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl transform hover:-translate-y-1"
					>
						Get Started Now
						<ArrowRight className="w-5 h-5" />
					</button>
				</motion.div>
			</section>

			{/* ==================== FOOTER ==================== */}
			<footer className="bg-surface text-white py-12 px-4 md:px-8">
				<div className="max-w-6xl mx-auto">
					<div className="grid md:grid-cols-4 gap-8 mb-8">
						<div>
							<h3 className="font-bold text-lg mb-4">NestFinder</h3>
							<p className="text-muted text-sm">Finding perfect accommodation for SIWES students.</p>
						</div>
						<div>
							<h4 className="font-semibold mb-4">For Students</h4>
							<ul className="space-y-2 text-muted text-sm">
								<li><a href="#" className="hover:text-orange-500 transition">Search Listings</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">How It Works</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">Pricing</a></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">For Landlords</h4>
							<ul className="space-y-2 text-muted text-sm">
								<li><a href="#" className="hover:text-orange-500 transition">List Property</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">Dashboard</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">Support</a></li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold mb-4">Company</h4>
							<ul className="space-y-2 text-muted text-sm">
								<li><a href="#" className="hover:text-orange-500 transition">About</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">Contact</a></li>
								<li><a href="#" className="hover:text-orange-500 transition">Privacy</a></li>
							</ul>
						</div>
					</div>

					<div className="border-t border-gray-800 pt-8">
						<div className="flex justify-between items-center">
							<p className="text-muted text-sm">© 2024 NestFinder. All rights reserved.</p>
							<div className="flex gap-4">
								<a href="#" className="text-muted hover:text-orange-500 transition">Twitter</a>
								<a href="#" className="text-muted hover:text-orange-500 transition">LinkedIn</a>
								<a href="#" className="text-muted hover:text-orange-500 transition">Instagram</a>
							</div>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}

