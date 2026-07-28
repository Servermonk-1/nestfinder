import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const NAV_LINKS = [
	{ to: '/for-landlords', label: 'Home' },
	{ to: '/landlord/dashboard', label: 'Dashboard' },
	{ to: '/landlord/bookings', label: 'Bookings' },
	{ to: '/landlord/messages', label: 'Messages' },
	{ to: '/landlord/account', label: 'Account' },
];

export default function LandlordNavbar() {
	const { logout } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const { unreadTotal } = useNotifications();

	const handleSignOut = () => { logout(); navigate('/for-landlords'); };

	return (
		<nav className="fixed top-0 z-50 w-full border-b border-line/70 glass-strong">
			<div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-8">
				<div className="flex items-center gap-6">
					{/* Logo → landlord landing */}
					<Link to="/for-landlords" className="flex items-center gap-2.5">
						<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow-sm">
							<Home className="h-5 w-5 text-white" />
						</span>
						<div>
							<span className="font-serif text-lg font-extrabold leading-tight text-text">NestFinder</span>
							<p className="text-[10px] font-bold uppercase tracking-wider text-primary-ink">Landlord Portal</p>
						</div>
					</Link>
					<div className="hidden items-center gap-1 md:flex">
						{NAV_LINKS.map((link) => {
							const active = location.pathname === link.to;
							return (
								<Link
									key={link.to}
									to={link.to}
									className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:text-primary-ink'}`}
								>
									{link.label}
									{link.to === '/landlord/messages' && unreadTotal > 0 && (
										<span className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-gradient px-1 text-[10px] font-bold leading-none text-white shadow-glow-sm">
											{unreadTotal > 9 ? '9+' : unreadTotal}
										</span>
									)}
								</Link>
							);
						})}
					</div>
				</div>
				<button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold text-muted transition hover:text-danger-ink">
					<LogOut className="h-4 w-4" /> Sign out
				</button>
			</div>
		</nav>
	);
}
