import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Search, Shield, MessageCircle, Users, TrendingUp, Lock, Clock } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import { BlurText } from '../lib/TextAnimations';

export default function LandingPageV3() {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-surface text-text">
			<Navbar />

			{/* ==================== HERO SECTION ==================== */}
			<section className="relative pt-20 pb-20 px-4 md:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
						{/* Left Content */}
						<motion.div
							initial={{ opacity: 0, x: -30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8 }}
						>
							<h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6 text-text">
								Find Your Perfect
								<span className="block mt-2">
									<BlurText 
										text="Student Room"
										duration={1.2}
										blur={15}
										className="text-amber-700"
									/>
								</span>
							</h1>

							<p className="text-lg text-muted mb-8 leading-relaxed max-w-lg">
								NestFinder connects SIWES students with verified, affordable accommodation. Search smart, find fast, move confidently.
							</p>

							<div className="flex flex-col sm:flex-row gap-4 mb-8">
								<button
									onClick={() => navigate('/student/register')}
									className="px-8 py-4 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
								>
									Search Rooms
									<ArrowRight className="w-5 h-5" />
								</button>
								<button
									onClick={() => navigate('/landlord/register')}
									className="px-8 py-4 bg-surface border-2 border-amber-700 text-amber-700 hover:bg-amber-50 rounded-lg font-semibold transition-all duration-200"
								>
									List Property
								</button>
							</div>

							<div className="flex gap-8">
								<div>
									<p className="text-3xl font-bold text-amber-700">5K+</p>
									<p className="text-muted text-sm">Active Students</p>
								</div>
								<div>
									<p className="text-3xl font-bold text-amber-700">2K+</p>
									<p className="text-muted text-sm">Verified Rooms</p>
								</div>
								<div>
									<p className="text-3xl font-bold text-amber-700">98%</p>
									<p className="text-muted text-sm">Success Rate</p>
								</div>
							</div>
						</motion.div>

						{/* Right Visual */}
						<motion.div
							initial={{ opacity: 0, x: 30 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.8 }}
							className="relative h-96 md:h-full"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl"></div>
							<div className="absolute inset-0 flex items-center justify-center">
								<div className="text-center">
									<p className="text-amber-700 font-semibold mb-4">Smart Search Dashboard</p>
									<div className="grid grid-cols-2 gap-4 text-sm text-muted">
										<div className="bg-surface p-4 rounded-lg shadow-sm">
											<p className="font-semibold text-amber-700">Advanced Filters</p>
										</div>
										<div className="bg-surface p-4 rounded-lg shadow-sm">
											<p className="font-semibold text-amber-700">Real-time Updates</p>
										</div>
										<div className="bg-surface p-4 rounded-lg shadow-sm">
											<p className="font-semibold text-amber-700">Direct Messaging</p>
										</div>
										<div className="bg-surface p-4 rounded-lg shadow-sm">
											<p className="font-semibold text-amber-700">Verified Landlords</p>
										</div>
									</div>
								</div>
							</div>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ==================== FEATURES SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-[#141B23]">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">Why Choose NestFinder</h2>
						<p className="text-lg text-muted max-w-2xl mx-auto">Complete solution for student accommodation with verification, messaging, and support</p>
					</div>

					<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
						{[
							{
								icon: Search,
								title: 'Smart Search',
								description: 'Advanced filters to find rooms matching your budget and preferences instantly'
							},
							{
								icon: Shield,
								title: 'Verified Listings',
								description: 'All properties and landlords are verified to ensure safety and authenticity'
							},
							{
								icon: MessageCircle,
								title: 'Direct Messaging',
								description: 'Chat directly with landlords without intermediaries for faster decisions'
							},
							{
								icon: TrendingUp,
								title: 'Market Insights',
								description: 'Access pricing trends and neighborhood data for informed decisions'
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
									className="bg-surface rounded-xl p-8 shadow-sm hover:shadow-md transition-all duration-300"
								>
									<div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
										<Icon className="w-6 h-6 text-amber-700" />
									</div>
									<h3 className="text-xl font-bold mb-3 text-text">{feature.title}</h3>
									<p className="text-muted leading-relaxed">{feature.description}</p>
								</motion.div>
							);
						})}
					</div>
				</div>
			</section>

			{/* ==================== HOW IT WORKS ==================== */}
			<section className="py-20 px-4 md:px-8 bg-surface">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">How It Works</h2>
						<p className="text-lg text-muted">Four simple steps to find your perfect room</p>
					</div>

					<div className="grid md:grid-cols-4 gap-6">
						{[
							{
								number: '01',
								title: 'Create Account',
								description: 'Sign up with your email and basic information'
							},
							{
								number: '02',
								title: 'Search & Filter',
								description: 'Browse verified listings with advanced filters'
							},
							{
								number: '03',
								title: 'Connect',
								description: 'Message landlords directly and ask questions'
							},
							{
								number: '04',
								title: 'Secure Booking',
								description: 'Complete your booking safely and move in'
							}
						].map((step, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: i * 0.1 }}
								viewport={{ once: true }}
								className="relative"
							>
								{/* Connection line */}
								{i < 3 && (
									<div className="hidden md:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-1 bg-amber-200" />
								)}

								<div className="relative z-10 bg-surface border-2 border-[#8B95A1]/20 hover:border-amber-700 rounded-xl p-8 text-center transition-all duration-300">
									<div className="w-12 h-12 bg-amber-700 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg">
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

			{/* ==================== TRUST SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-[#141B23]">
				<div className="max-w-7xl mx-auto">
					<div className="grid md:grid-cols-3 gap-12">
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Lock className="w-8 h-8 text-amber-700" />
							</div>
							<h3 className="text-xl font-bold mb-2 text-text">Secure & Safe</h3>
							<p className="text-muted">All transactions and data are encrypted and protected with industry-standard security</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.1 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Users className="w-8 h-8 text-amber-700" />
							</div>
							<h3 className="text-xl font-bold mb-2 text-text">Trusted Community</h3>
							<p className="text-muted">Join thousands of students who have successfully found their homes through NestFinder</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.6, delay: 0.2 }}
							viewport={{ once: true }}
							className="text-center"
						>
							<div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
								<Clock className="w-8 h-8 text-amber-700" />
							</div>
							<h3 className="text-xl font-bold mb-2 text-text">24/7 Support</h3>
							<p className="text-muted">Our support team is always available to help you with any questions or issues</p>
						</motion.div>
					</div>
				</div>
			</section>

			{/* ==================== TESTIMONIALS ==================== */}
			<section className="py-20 px-4 md:px-8 bg-surface">
				<div className="max-w-7xl mx-auto">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold mb-4 text-text">What Students Say</h2>
						<p className="text-lg text-muted">Real stories from our community</p>
					</div>

					<div className="grid md:grid-cols-3 gap-8">
						{[
							{
								name: 'Chioma Okoro',
								comment: 'Found my perfect room in just two days. The verification process gave me complete peace of mind and I moved in without any stress.',
								location: 'Lagos'
							},
							{
								name: 'Tunde Afolayan',
								comment: 'Best platform for student accommodation. The filters are intuitive and landlords respond quickly. Highly recommended for SIWES students.',
								location: 'Ibadan'
							},
							{
								name: 'Amara Nwosu',
								comment: 'The direct messaging feature saved so much time. I could ask questions and make decisions quickly without any middlemen involved.',
								location: 'Port Harcourt'
							}
						].map((testimonial, i) => (
							<motion.div
								key={i}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.6, delay: i * 0.1 }}
								viewport={{ once: true }}
								className="bg-[#141B23] rounded-xl p-8 border border-[#8B95A1]/20 hover:border-amber-300 transition-all duration-300"
							>
								<div className="flex gap-1 mb-4">
									{[...Array(5)].map((_, idx) => (
										<span key={idx} className="text-amber-700">★</span>
									))}
								</div>
								<p className="text-muted mb-6 leading-relaxed">{testimonial.comment}</p>
								<div>
									<p className="font-bold text-text">{testimonial.name}</p>
									<p className="text-sm text-muted">{testimonial.location}</p>
								</div>
							</motion.div>
						))}
					</div>
				</div>
			</section>

			{/* ==================== CTA SECTION ==================== */}
			<section className="py-20 px-4 md:px-8 bg-amber-700">
				<div className="max-w-4xl mx-auto text-center">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.6 }}
						viewport={{ once: true }}
					>
						<h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Start Your Search Today</h2>
						<p className="text-lg text-amber-100 mb-8">Join thousands of students who found their perfect room on NestFinder</p>
						
						<div className="flex flex-col sm:flex-row gap-4 justify-center">
							<button
								onClick={() => navigate('/student/register')}
								className="px-10 py-4 bg-surface text-amber-700 rounded-lg font-bold hover:bg-[#141B23] transition-all duration-200 flex items-center justify-center gap-2"
							>
								Get Started
								<ArrowRight className="w-5 h-5" />
							</button>
							<button
								onClick={() => navigate('/landlord/register')}
								className="px-10 py-4 bg-amber-800 hover:bg-amber-900 text-white rounded-lg font-bold transition-all duration-200"
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
					<div className="grid md:grid-cols-4 gap-8 mb-12">
						<div>
							<h4 className="text-white font-bold mb-4">NestFinder</h4>
							<p className="text-sm">Finding perfect accommodation for SIWES students since 2024</p>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">For Students</h4>
							<ul className="space-y-2 text-sm">
								<li><a href="#" className="hover:text-amber-700 transition">Search Listings</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">How It Works</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">Support</a></li>
							</ul>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">For Landlords</h4>
							<ul className="space-y-2 text-sm">
								<li><a href="#" className="hover:text-amber-700 transition">List Property</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">Dashboard</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">Resources</a></li>
							</ul>
						</div>
						<div>
							<h4 className="text-white font-bold mb-4">Company</h4>
							<ul className="space-y-2 text-sm">
								<li><a href="#" className="hover:text-amber-700 transition">About Us</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">Contact</a></li>
								<li><a href="#" className="hover:text-amber-700 transition">Privacy Policy</a></li>
							</ul>
						</div>
					</div>

					<div className="border-t border-gray-800 pt-8">
						<p className="text-center text-sm">© 2024 NestFinder. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

