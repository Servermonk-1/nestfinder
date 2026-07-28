import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Shield, MessageCircle, Users, TrendingUp, Lock, Clock, Home } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { BlurText } from '../lib/TextAnimations';

export default function LandingPageV2() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-surface text-text">
			<Navbar />

			{/* ==================== HERO SECTION ==================== */}
			<section className="relative pt-20 pb-32 px-4 md:px-8 bg-gradient-to-b from-white to-slate-50">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
						{/* Left Content */}
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
						>
							<div className="mb-6">
									<span className="inline-block px-4 py-2 bg-primary/10 text-primary-ink rounded-full text-sm font-semibold">
									AI-Powered Student Housing
								</span>
							</div>

							<h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6 text-text">
								Find Your Perfect
								<br />
								<BlurText 
									text="Student Room"
									duration={1.5}
									blur={20}
										className="text-primary-ink"
								/>
							</h1>

							<p className="text-xl text-muted mb-10 leading-relaxed max-w-lg font-light">
								NestFinder connects SIWES students with verified, affordable accommodation. Search smart, connect directly, move confidently.
							</p>

							<div className="flex flex-col sm:flex-row gap-5 mb-12">
								<button
									onClick={() => navigate('/student/register')}
									className="px-10 py-4 bg-primary hover:bg-primary/90 text-text rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
								>
									Find Now
									<ArrowRight className="w-5 h-5" />
								</button>
								<button
									onClick={() => navigate('/landlord/register')}
									className="px-10 py-4 bg-surface border-2 border-[#8B95A1]/25 text-text hover:border-primary hover:text-primary-ink rounded-lg font-semibold transition-all duration-200"
								>
									List Property
								</button>
							</div>

							{/* Stats */}
							<div className="flex gap-12">
								<div>
									<p className="text-4xl font-bold text-primary-ink">5K+</p>
									<p className="text-muted text-sm font-light">Active Students</p>
								</div>
								<div>
									<p className="text-4xl font-bold text-primary-ink">2K+</p>
									<p className="text-muted text-sm font-light">Verified Rooms</p>
								</div>
								<div>
									<p className="text-4xl font-bold text-primary-ink">98%</p>
									<p className="text-muted text-sm font-light">Success Rate</p>
								</div>
							</div>
						</motion.div>

						{/* Right Visual - Minimalist */}
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.8 }}
							className="relative"
						>
							<div className="aspect-square bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-12 flex flex-col justify-center items-center shadow-xl">
								<div className="mb-8">
									<Home className="w-24 h-24 text-primary-ink opacity-20" />
								</div>
								<h3 className="text-2xl font-bold text-text mb-8 text-center">Smart Property Discovery</h3>
								
								<div className="w-full space-y-4">
									<div className="flex items-center gap-4 bg-surface p-4 rounded-lg shadow-sm">
										<Search className="w-5 h-5 text-primary-ink" />
										<span className="text-muted font-medium">Advanced Search</span>
									</div>
									<div className="flex items-center gap-4 bg-surface p-4 rounded-lg shadow-sm">
										<Shield className="w-5 h-5 text-primary-ink" />
										<span className="text-muted font-medium">Verified Listings</span>
									</div>
									<div className="flex items-center gap-4 bg-surface p-4 rounded-lg shadow-sm">
										<MessageCircle className="w-5 h-5 text-primary-ink" />
										<span className="text-muted font-medium">Direct Chat</span>
									</div>
									<div className="flex items-center gap-4 bg-surface p-4 rounded-lg shadow-sm">
										<Lock className="w-5 h-5 text-primary-ink" />
										<span className="text-muted font-medium">Secure Booking</span>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ==================== FEATURES SECTION ==================== */}
			<section className="py-24 px-4 md:px-8 bg-surface">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-20">
						<h2 className="text-5xl md:text-6xl font-bold mb-6 text-text">Why NestFinder</h2>
						<p className="text-xl text-muted font-light max-w-2xl mx-auto">
							Everything you need to find perfect student accommodation, all in one place
						</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
						{[
							{
								icon: Search,
								title: 'Smart Search',
								description: 'Advanced filters to find the perfect room matching your budget and location preferences'
							},
							{
								icon: Shield,
								title: 'Verified Listings',
								description: 'Every property and landlord is verified to ensure your safety and authenticity'
							},
							{
								icon: MessageCircle,
								title: 'Direct Messaging',
								description: 'Chat directly with landlords without intermediaries for transparent communication'
							},
							{
								icon: TrendingUp,
								title: 'Market Insights',
								description: 'Real-time pricing trends and neighborhood data for smart decisions'
							}
						].map((feature, i) => {
							const Icon = feature.icon;
							return (
								<motion.div
									key={i}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, delay: i * 0.1 }}
									viewport={{ once: true }}
									className="group p-10 bg-surface border border-[#8B95A1]/20 rounded-2xl hover:shadow-xl hover:border-primary/30 transition-all duration-300"
								>
									<div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
										<Icon className="w-7 h-7 text-primary-ink" />
									</div>
									<h3 className="text-xl font-bold mb-3 text-text">{feature.title}</h3>
									<p className="text-muted leading-relaxed font-light">{feature.description}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ==================== HOW IT WORKS ==================== */}
			<section className="py-24 px-4 md:px-8 bg-slate-50">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-20">
						<h2 className="text-5xl md:text-6xl font-bold mb-6 text-text">How It Works</h2>
						<p className="text-xl text-muted font-light">Get started in 4 simple steps</p>
					</div>

					<div className="grid md:grid-cols-4 gap-8">
						{[
							{ number: '1', title: 'Sign Up', desc: 'Create your account in 2 minutes' },
							{ number: '2', title: 'Search', desc: 'Browse verified listings and filters' },
							{ number: '3', title: 'Connect', desc: 'Message landlords directly' },
							{ number: '4', title: 'Secure', desc: 'Complete booking safely' }
						].map((step, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: i * 0.1 }}
								viewport={{ once: true }}
								className="relative"
							>
								{i < 3 && (
									<div className="hidden md:block absolute top-8 -right-4 w-8 h-1 bg-gradient-to-r from-primary to-transparent" />
								)}

								<div className="bg-surface rounded-2xl p-10 text-center border border-[#8B95A1]/20 hover:border-primary transition-all duration-300 h-full">
									<div className="w-12 h-12 bg-primary text-text rounded-full flex items-center justify-center mx-auto mb-6 font-bold text-xl">
										{step.number}
									</div>
									<h3 className="text-lg font-bold mb-2 text-text">{step.title}</h3>
									<p className="text-muted text-sm font-light">{step.desc}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ==================== BENEFITS SECTION ==================== */}
			<section className="py-24 px-4 md:px-8 bg-surface">
				<div className="max-w-7xl mx-auto">
					<div className="grid md:grid-cols-3 gap-12">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<Lock className="w-8 h-8 text-primary-ink" />
							</div>
							<h3 className="text-xl font-bold mb-3 text-text">Secure & Safe</h3>
							<p className="text-muted font-light leading-relaxed">
								Industry-standard encryption protects all your transactions and personal data
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<Users className="w-8 h-8 text-primary-ink" />
							</div>
							<h3 className="text-xl font-bold mb-3 text-text">Trusted Community</h3>
							<p className="text-muted font-light leading-relaxed">
								Join thousands of students who found their perfect homes through NestFinder
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
								<Clock className="w-8 h-8 text-primary-ink" />
							</div>
							<h3 className="text-xl font-bold mb-3 text-text">24/7 Support</h3>
							<p className="text-muted font-light leading-relaxed">
								Our support team is always available to help with questions and issues
							</p>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ==================== TESTIMONIALS ==================== */}
			<section className="py-24 px-4 md:px-8 bg-slate-50">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-20">
						<h2 className="text-5xl md:text-6xl font-bold mb-6 text-text">What Students Say</h2>
						<p className="text-xl text-muted font-light">Real stories from our community</p>
					</div>

					<div className="grid md:grid-cols-3 gap-10">
						{[
							{
								name: 'Chioma Okoro',
								text: 'Found my perfect room in 2 days. The verification process was thorough and I felt completely secure moving in.',
								city: 'Lagos'
							},
							{
								name: 'Tunde Afolayan',
								text: 'Best platform for student housing. The filters are intuitive and landlords respond quickly to messages.',
								city: 'Ibadan'
							},
							{
								name: 'Amara Nwosu',
								text: 'Direct messaging saved me so much time. No middlemen, just transparent communication with landlords.',
								city: 'Port Harcourt'
							}
						].map((testimonial, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: i * 0.1 }}
								viewport={{ once: true }}
								className="bg-surface rounded-2xl p-10 border border-[#8B95A1]/20 hover:border-primary/30 transition-all duration-300"
							>
								<div className="flex gap-1 mb-5">
									{[...Array(5)].map((_, idx) => (
										<span key={idx} className="text-highlight text-lg">★</span>
									))}
								</div>
								<p className="text-muted mb-6 leading-relaxed font-light text-lg">{testimonial.text}</p>
								<div>
									<p className="font-bold text-text">{testimonial.name}</p>
									<p className="text-muted text-sm font-light">{testimonial.city}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ==================== CTA SECTION ==================== */}
			<section className="py-24 px-4 md:px-8 bg-gradient-to-r from-primary to-primary/90">
				<div className="max-w-5xl mx-auto text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<h2 className="text-5xl md:text-6xl font-bold text-text mb-6">Start Your Search Today</h2>
						<p className="text-xl text-text/80 mb-12 font-light">
							Join thousands of students finding their perfect room on NestFinder
						</p>
						
						<div className="flex flex-col sm:flex-row gap-5 justify-center">
							<button
								onClick={() => navigate('/student/register')}
								className="px-12 py-5 bg-surface text-primary-ink rounded-lg font-bold hover:bg-surface/80 transition-all duration-200 text-lg flex items-center justify-center gap-3"
							>
								Get Started
								<ArrowRight className="w-5 h-5" />
							</button>
							<button
								onClick={() => navigate('/landlord/register')}
								className="px-12 py-5 bg-highlight hover:bg-highlight/90 text-text rounded-lg font-bold transition-all duration-200 text-lg"
							>
								List Your Property
							</button>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ==================== FOOTER ==================== */}
			<footer className="bg-surface text-muted py-16 px-4 md:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="grid md:grid-cols-4 gap-10 mb-12">
						<div>
							<h4 className="text-white font-bold mb-4 text-lg">NestFinder</h4>
							<p className="text-sm font-light leading-relaxed">
								Finding perfect student accommodation for SIWES interns since 2024
							</p>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">For Students</h4>
							<ul className="space-y-3 text-sm font-light">
								<li><a href="#" className="hover:text-primary-ink transition">Search Listings</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">How It Works</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">Support</a></li>
							</ul>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">For Landlords</h4>
							<ul className="space-y-3 text-sm font-light">
								<li><a href="#" className="hover:text-primary-ink transition">List Property</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">Dashboard</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">Resources</a></li>
							</ul>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">Company</h4>
							<ul className="space-y-3 text-sm font-light">
								<li><a href="#" className="hover:text-primary-ink transition">About Us</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">Contact</a></li>
								<li><a href="#" className="hover:text-primary-ink transition">Privacy</a></li>
							</ul>
						</div>
					</div>

					<div className="border-t border-gray-800 pt-8">
						<p className="text-center text-sm font-light">© 2024 NestFinder. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

