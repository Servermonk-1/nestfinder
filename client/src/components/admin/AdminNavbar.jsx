import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LogoLockup } from '../common/Logo';

export default function AdminNavbar({ children }) {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const { pathname } = useLocation();
	const [open, setOpen] = useState(false);

	const signOut = () => {
		logout();
		navigate('/admin/login');
	};

	const links = [
		{ to: '/admin/dashboard', label: 'Dashboard' },
		{ to: '/admin/verifications', label: 'Verifications' },
		{ to: '/admin/reports', label: 'Reports' },
		{ to: '/admin/listings', label: 'Listings' },
		{ to: '/admin/landlords', label: 'Landlords' },
		{ to: '/admin/companies', label: 'SIWES' },
		{ to: '/admin/bookings', label: 'Bookings' },
		{ to: '/admin/payments', label: 'Payments' },
		{ to: '/admin/payment-settings', label: 'Payment Settings' },
		{ to: '/admin/health', label: 'Health' },
	];

	useEffect(() => {
		setOpen(false);
	}, [pathname]);

	return (
		<div className="min-h-screen bg-paper text-text">
			<div className="relative flex min-h-screen">
				<aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-surface/95 px-5 py-6 lg:flex">
					<Link to="/admin/dashboard" className="mb-8 inline-flex items-center gap-3 text-ink">
						<LogoLockup size={28} wordmark="NestFinder Console" className="text-ink" />
					</Link>
					<nav className="flex-1 space-y-1">
						{links.map((link) => {
							const active = pathname === link.to || (link.match && link.match.test(pathname));
							return (
								<Link
									key={link.to}
									to={link.to}
									className={`block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
										active ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:bg-primary/5 hover:text-ink'
									}`}
								>
									{link.label}
								</Link>
							);
						})}
					</nav>
					<button
						onClick={signOut}
						className="mt-6 inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white px-4 py-3 text-sm font-semibold text-danger-ink transition hover:bg-danger/[0.08]"
					>
						<LogOut className="h-4 w-4" strokeWidth={1.75} />
						Sign out
					</button>
				</aside>

				<div className="flex-1">
					<div className="flex items-center justify-between border-b border-line bg-surface/95 px-4 py-3 lg:hidden">
						<Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-lg font-semibold text-ink">
							<LogoLockup size={24} wordmark="NestFinder" className="text-ink" />
						</Link>
						<button
							onClick={() => setOpen((value) => !value)}
							aria-label={open ? 'Close menu' : 'Open menu'}
							className="rounded-full p-2.5 text-ink transition hover:bg-ink/[0.06]"
						>
							{open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
						</button>
					</div>

					<AnimatePresence>
						{open && (
							<motion.div
								initial={{ opacity: 0, y: -12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -12 }}
								transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
								className="glass-strong pointer-events-auto absolute inset-x-4 top-[58px] z-40 rounded-3xl border border-line/70 bg-surface/95 p-4 shadow-lift lg:hidden"
							>
								<nav className="space-y-1">
									{links.map((link) => {
										const active = pathname === link.to || (link.match && link.match.test(pathname));
										return (
											<Link
												key={link.to}
												to={link.to}
												className={`block rounded-3xl px-4 py-3 text-sm font-semibold transition ${
												active ? 'bg-primary/10 text-primary-ink' : 'text-muted hover:bg-primary/5 hover:text-ink'
											}`}
											>
												{link.label}
											</Link>
										);
									})}
								</nav>
								<button
									onClick={signOut}
									className="mt-4 w-full rounded-full border border-line px-4 py-3 text-left text-sm font-semibold text-danger-ink transition hover:bg-danger/[0.08]"
								>
									Sign out
								</button>
							</motion.div>
						)}
					</AnimatePresence>

					<main className="min-h-screen">{children}</main>
				</div>
			</div>
		</div>
	);
}
