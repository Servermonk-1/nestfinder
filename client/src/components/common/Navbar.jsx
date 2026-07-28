import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const [scrolled, setScrolled] = useState(false);
	const [mobileOpen, setMobileOpen] = useState(false);
	const [dropdownOpen, setDropdownOpen] = useState(false);

	useEffect(() => {
		const handleScroll = () => setScrolled(window.scrollY > 20);
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	const handleLogout = () => {
		logout();
		navigate('/');
	};

	const getDashboardLink = () => {
		if (user?.role === 'student') return '/dashboard';
		if (user?.role === 'landlord') return '/landlord/dashboard';
		if (user?.role === 'admin') return '/admin/dashboard';
		return '/';
	};

	const navLinks = [
		{ to: '/', label: 'Home' },
		{ to: '/dashboard', label: 'Properties' },
		{ to: '/landlord/login', label: 'List Property' },
	];

	return (
		<motion.nav
			initial={{ y: -100 }}
			animate={{ y: 0 }}
			transition={{ duration: 0.6, ease: 'easeOut' }}
			className="fixed top-0 left-0 right-0 z-[9999] bg-surface/95 px-4 pb-3 pt-3 shadow-sm backdrop-blur-xl transition-all duration-300"
		>
			<div
				className={`max-w-7xl mx-auto h-16 flex items-center justify-between rounded-2xl border px-5 md:px-6 transition-all duration-300 ${
					scrolled
						? 'bg-surface/95 border-primary/20 shadow-xl shadow-base/40 backdrop-blur-xl'
						: 'bg-surface/80 border-primary/10 shadow-lg shadow-base/20 backdrop-blur-md'
				}`}
			>

				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5 group">
					<motion.div
						whileHover={{ rotate: 8, scale: 1.05 }}
						transition={{ type: 'spring', stiffness: 400 }}
						className="relative"
					>
						<div className="absolute inset-0 rounded-xl bg-primary/25 blur-md opacity-70 transition-opacity group-hover:opacity-100" />
						<div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-muted/25 bg-surface text-primary-ink shadow-sm">
							<Home className="h-5 w-5" strokeWidth={2.4} />
						</div>
					</motion.div>
					<span className="text-lg font-extrabold text-text">NestFinder</span>
				</Link>

				{/* Desktop Nav */}
				<div className="hidden md:flex items-center gap-1 rounded-full bg-surface-alt/80 p-1">
					{navLinks.map((link) => {
						const isActive = pathname === link.to;

						return (
							<Link
								key={link.to}
								to={link.to}
								className={`relative rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
									isActive ? 'text-primary-ink' : 'text-muted hover:text-text'
								}`}
							>
								{isActive && (
									<motion.span
										layoutId="navbar-active-pill"
										className="absolute inset-0 rounded-full bg-surface shadow-sm ring-1 ring-primary/20"
										transition={{ type: 'spring', stiffness: 420, damping: 34 }}
									/>
								)}
								<span className="relative z-10">{link.label}</span>
							</Link>
						);
					})}
				</div>

				{/* Right side */}
				<div className="hidden md:flex items-center gap-3">
					{user ? (
						<div className="relative">
							<button
								onClick={() => setDropdownOpen(!dropdownOpen)}
								className="flex items-center gap-2 rounded-full border border-muted/15 bg-surface px-4 py-2 shadow-sm transition-all hover:border-muted/25 hover:bg-surface"
							>
								<div className="w-6 h-6 bg-gradient-to-r from-primary to-highlight rounded-full flex items-center justify-center">
									<span className="text-base text-xs font-bold">
										{user.fullName?.charAt(0).toUpperCase()}
									</span>
								</div>
								<span className="text-sm font-semibold text-text">{user.fullName?.split(' ')[0]}</span>
								<ChevronDown className={`w-4 h-4 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
							</button>

							<AnimatePresence>
								{dropdownOpen && (
									<motion.div
										initial={{ opacity: 0, y: 8, scale: 0.95 }}
										animate={{ opacity: 1, y: 0, scale: 1 }}
										exit={{ opacity: 0, y: 8, scale: 0.95 }}
										transition={{ duration: 0.15 }}
										className="absolute right-0 top-12 w-48 overflow-hidden rounded-2xl border border-muted/15 bg-surface shadow-2xl"
									>
										<Link
											to={getDashboardLink()}
											onClick={() => setDropdownOpen(false)}
											className="flex items-center gap-3 px-4 py-3 text-sm text-muted transition-colors hover:bg-surface hover:text-primary-ink"
										>
											<LayoutDashboard className="w-4 h-4" />
											Dashboard
										</Link>
										<div className="h-px bg-surface-alt" />
										<button
											onClick={() => { handleLogout(); setDropdownOpen(false); }}
											className="w-full flex items-center gap-3 px-4 py-3 text-danger-ink hover:bg-danger/10 transition-colors text-sm"
										>
											<LogOut className="w-4 h-4" />
											Sign Out
										</button>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					) : (
						<>
							<Link
								to="/student/login"
								className="px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-primary-ink"
							>
								Sign In
							</Link>
							<Link
								to="/student/register"
								className="rounded-xl bg-gradient-to-r from-primary to-highlight px-5 py-2.5 text-sm font-bold text-base shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-primary/30"
							>
								Sign Up
							</Link>
						</>
					)}
				</div>

				{/* Mobile menu button */}
				<button
					onClick={() => setMobileOpen(!mobileOpen)}
					className="md:hidden rounded-xl border border-muted/15 p-2 text-muted transition-colors hover:border-muted/25 hover:bg-surface hover:text-primary-ink"
				>
					{mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
				</button>
			</div>

			{/* Mobile menu */}
			<AnimatePresence>
				{mobileOpen && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className="mx-auto mt-2 max-w-7xl overflow-hidden rounded-2xl border border-muted/15 bg-surface/95 shadow-xl backdrop-blur-xl md:hidden"
					>
						<div className="px-6 py-4 space-y-3">
							{navLinks.map((link) => (
								<Link
									key={link.to}
									to={link.to}
									onClick={() => setMobileOpen(false)}
									className={`block rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
										pathname === link.to
											? 'bg-surface text-primary-ink'
											: 'text-muted hover:bg-surface-alt hover:text-text'
									}`}
								>
									{link.label}
								</Link>
							))}
							<div className="h-px bg-surface-alt my-2" />
							{user ? (
								<button onClick={handleLogout} className="block text-danger-ink text-sm py-2">Sign Out</button>
							) : (
								<>
									<Link to="/student/login" onClick={() => setMobileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-surface-alt">Sign In</Link>
									<Link to="/student/register" onClick={() => setMobileOpen(false)} className="block rounded-xl bg-gradient-to-r from-primary to-highlight px-3 py-2 text-center text-sm font-bold text-base">Sign Up</Link>
								</>
							)}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.nav>
	);
}

