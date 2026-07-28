import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Shield, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
	{ label: 'Dashboard', to: '/admin/dashboard' },
	{ label: 'Verifications', to: '/admin/verifications' },
	{ label: 'Reports', to: '/admin/reports' },
	{ label: 'Listings', to: '/admin/listings' },
	{ label: 'SIWES', to: '/admin/companies' },
	{ label: 'Bookings', to: '/admin/bookings' },
];

export default function AdminNavbar() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const { logout } = useAuth();

	const signOut = () => { logout(); navigate('/admin/login'); };

	return (
		<nav className="fixed top-0 z-40 w-full glass-strong border-b border-line">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-8">
				<Link to="/admin/dashboard" className="flex items-center gap-2">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient shadow-glow-sm">
						<Shield className="h-4 w-4 text-white" />
					</div>
					<span className="font-serif text-lg font-bold text-text">NestFinder <span className="text-primary-ink">Admin</span></span>
				</Link>

				<div className="hidden items-center gap-1 md:flex">
					{NAV_LINKS.map((link) => (
						<Link
							key={link.to}
							to={link.to}
							className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
								pathname === link.to ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:text-text'
							}`}
						>
							{link.label}
						</Link>
					))}
				</div>

				<button
					onClick={signOut}
					className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted transition hover:border-danger/40 hover:text-danger-ink"
				>
					<LogOut className="h-4 w-4" /> Sign Out
				</button>
			</div>
		</nav>
	);
}
