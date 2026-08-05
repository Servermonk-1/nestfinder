import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Logo from './Logo';

/**
 * The floating navigation pill.
 *
 * The one rounded object in an otherwise square interface — that contrast is
 * what makes it read as a deliberate element rather than an inconsistency. It
 * detaches from the top edge and sits ON the page rather than bounding it, so
 * content scrolls beneath the glass.
 *
 * The active link is marked by a shared layout indicator that slides between
 * items, so navigation feels continuous instead of flickering between states.
 */
export default function NavPill({ links = [], right = null, mobileExtras = null, wordmark = 'NestFinder', wordmarkTo = '/' }) {
	const { pathname } = useLocation();
	const [open, setOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	// Tighten the pill once the page moves — a small acknowledgement that the
	// user has started reading.
	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 12);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	// Close the sheet on navigation.
	useEffect(() => setOpen(false), [pathname]);

	return (
		<div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3">
			<motion.nav
				initial={{ y: -24, opacity: 0 }}
				animate={{ y: scrolled ? 8 : 14, opacity: 1 }}
				transition={{ type: 'spring', stiffness: 380, damping: 34 }}
				className="nav-pill pointer-events-auto flex flex-wrap justify-start w-full max-w-6xl items-center gap-2 rounded-full py-2 pl-5 pr-2"
			>
				{/* Mark plus name. The mark alone at this size — the arched lettering in
				    the full badge is unreadable below about 96px. */}
				<Link
					to={wordmarkTo}
					className="group mr-1 flex shrink-0 items-center gap-2 font-display text-[16px] font-extrabold tracking-tight text-ink"
				>
					<Logo size={24} className="transition-transform duration-300 group-hover:rotate-45" />
					{wordmark}
				</Link>

				{/* Desktop links */}
				<div className="ml-2 hidden flex-1 min-w-0 flex-wrap items-center gap-0.5 md:flex">
					{links.map((link) => {
						const active = pathname === link.to || (link.match && link.match.test(pathname));
						return (
							<Link
								key={link.to}
								id={link.id}
								to={link.to}
								className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[14px] font-semibold transition-colors duration-200 ${
									active ? 'text-ink' : 'text-muted hover:text-ink'
								}`}
							>
								{active && (
									<motion.span
										layoutId="nav-active"
										transition={{ type: 'spring', stiffness: 420, damping: 36 }}
										className="absolute inset-0 -z-10 rounded-full bg-ink/[0.06]"
									/>
								)}
								{link.label}
								{link.badge}
							</Link>
						);
					})}
				</div>

				<div className="ml-auto hidden min-w-0 items-center gap-1 md:flex">{right}</div>

				<button
					onClick={() => setOpen((v) => !v)}
					aria-label={open ? 'Close menu' : 'Open menu'}
					aria-expanded={open}
					className="ml-auto rounded-full p-2.5 text-ink transition hover:bg-ink/[0.06] md:hidden"
				>
					{open ? <X className="h-5 w-5" strokeWidth={1.75} /> : <Menu className="h-5 w-5" strokeWidth={1.75} />}
				</button>
			</motion.nav>

			{/* Mobile sheet — square, to match the rest of the interface. */}
			<AnimatePresence>
				{open && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
						className="glass-strong pointer-events-auto absolute inset-x-3 top-[76px] border border-line/70 p-2 shadow-lift md:hidden"
					>
						{links.map((link, i) => {
							const active = pathname === link.to;
							return (
								<motion.div
									key={link.to}
									initial={{ opacity: 0, x: -8 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.03 * i, duration: 0.2 }}
								>
									<Link
										to={link.to}
										className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
											active ? 'bg-primary/[0.08] text-primary-ink' : 'text-muted hover:text-ink'
										}`}
									>
										{link.label}
										{link.badge}
									</Link>
								</motion.div>
							);
						})}
						{mobileExtras && <div className="mt-1 border-t border-line pt-1">{mobileExtras}</div>}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
