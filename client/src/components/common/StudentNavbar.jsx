import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import HelpCenter from './HelpCenter';

const NAV_LINKS = [
	{ to: '/dashboard', label: 'Browse' },
	{ to: '/companies', label: 'Companies' },
	{ to: '/bookings', label: 'Bookings' },
	{ to: '/saved', label: 'Saved' },
	{ to: '/messages', label: 'Messages' },
	{ to: '/account', label: 'Account' },
];

function UnreadBadge({ count, className = '' }) {
	if (!count) return null;
	return (
		<span className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold leading-none text-white shadow-glow-sm ${className}`}>
			{count > 9 ? '9+' : count}
		</span>
	);
}

export default function StudentNavbar({ onRestartTour }) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { logout } = useAuth();
	const { unreadTotal } = useNotifications();

	const handleSignOut = () => { logout(); navigate('/'); };
	const handleRestartTour = onRestartTour || (() => navigate('/dashboard?tour=1'));

	return (
		<nav className="fixed top-0 z-50 w-full border-b border-line/70 glass-strong">
			<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 md:px-8">
				{/* Logo */}
				<motion.button
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					onClick={() => navigate('/')}
					className="flex items-center gap-2.5"
				>
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm">
						<Home className="h-5 w-5 text-white" />
					</span>
					<span className="font-serif text-xl font-extrabold text-text">NestFinder</span>
				</motion.button>

				{/* Desktop nav */}
				<div className="hidden items-center gap-1 md:flex">
					{NAV_LINKS.map((link) => {
						const active = pathname === link.to;
						return (
							<Link
								key={link.to}
								id={link.to === '/account' ? 'tour-user-profile' : undefined}
								to={link.to}
								className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:text-primary-ink'}`}
							>
								{link.label}
								{link.to === '/messages' && <UnreadBadge count={unreadTotal} />}
							</Link>
						);
					})}
				</div>

				{/* Right */}
				<div className="hidden items-center gap-2 md:flex">
					<HelpCenter onRestartTour={handleRestartTour} />
					<button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-muted transition hover:text-danger-ink">
						<LogOut className="h-4 w-4" /> Sign out
					</button>
				</div>

				{/* Mobile menu button */}
				<button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label={isMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={isMenuOpen} className="rounded-xl border border-line bg-surface p-2 text-text md:hidden">
					{isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
				</button>
			</div>

			{/* Mobile menu */}
			{isMenuOpen && (
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-1 border-t border-line px-4 py-4 md:hidden">
					{NAV_LINKS.map((link) => (
						<Link key={link.to} to={link.to} onClick={() => setIsMenuOpen(false)} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${pathname === link.to ? 'bg-primary/10 text-primary-ink' : 'text-muted'}`}>
							{link.label}
							{link.to === '/messages' && <UnreadBadge count={unreadTotal} />}
						</Link>
					))}
					<button onClick={() => { setIsMenuOpen(false); handleRestartTour(); }} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-muted">Help &amp; restart tour</button>
					<button onClick={handleSignOut} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-bold text-danger-ink">Sign out</button>
				</motion.div>
			)}
		</nav>
	);
}
