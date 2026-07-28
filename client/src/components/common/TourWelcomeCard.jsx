import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

export default function TourWelcomeCard({ totalSteps, onSkip, onStart }) {
	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center bg-ink/50 backdrop-blur-sm px-4">
			<motion.div
				initial={{ opacity: 0, scale: 0.9, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 260, damping: 22 }}
				role="dialog"
				aria-modal="true"
				aria-labelledby="tour-welcome-title"
				className="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-card-lg"
			>
				<motion.div
					animate={{ y: [0, -10, 0] }}
					transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
					className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow-sm"
				>
					<Home className="h-8 w-8 text-white" />
				</motion.div>

				<h2 id="tour-welcome-title" className="font-serif text-2xl font-bold text-text">Welcome to NestFinder</h2>
				<p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
					Your guide to finding verified off-campus accommodation during your industrial training.
				</p>

				<div className="mt-6 flex items-center justify-center gap-2">
					{Array.from({ length: totalSteps }).map((_, i) => (
						<span key={i} className="h-1.5 w-1.5 rounded-full bg-muted/30" />
					))}
				</div>
				<p className="mt-2 text-xs text-muted">{totalSteps} steps · less than 60 seconds</p>

				<div className="mt-8 flex items-center justify-center gap-3">
					<button
						onClick={onSkip}
						className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-text"
					>
						Skip Tour
					</button>
					<button
						onClick={onStart}
						className="rounded-xl bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
					>
						Start Tour →
					</button>
				</div>
			</motion.div>
		</div>
	);
}
