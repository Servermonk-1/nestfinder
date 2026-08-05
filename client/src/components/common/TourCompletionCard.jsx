import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const CONFETTI_COLORS = ['#0B6BD8', '#F5A524', '#0A8046', '#A9CEFA', '#FBCF7A'];
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
	id: i,
	left: `${(i * 53) % 100}%`,
	color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
	delay: (i % 6) * 0.08,
	duration: 1.4 + (i % 5) * 0.2,
}));

export default function TourCompletionCard({ onClose }) {
	useEffect(() => {
		const timeout = setTimeout(onClose, 3000);
		return () => clearTimeout(timeout);
	}, [onClose]);

	return (
		<div className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-ink/55 backdrop-blur-sm px-4">
			{CONFETTI.map((c) => (
				<motion.span
					key={c.id}
					initial={{ top: '-5%', opacity: 1, rotate: 0 }}
					animate={{ top: '105%', opacity: 0, rotate: 360 }}
					transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn' }}
					className="pointer-events-none absolute h-2 w-2 rounded-sm"
					style={{ left: c.left, backgroundColor: c.color }}
				/>
			))}

			<motion.div
				initial={{ opacity: 0, scale: 0.9, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				transition={{ type: 'spring', stiffness: 260, damping: 22 }}
				role="dialog"
				aria-modal="true"
				aria-labelledby="tour-done-title"
				className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-card-lg"
			>
				<motion.div
					initial={{ scale: 0 }}
					animate={{ scale: 1 }}
					transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
					className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-success/15"
				>
					<CheckCircle2 className="h-9 w-9 text-success-ink" />
				</motion.div>

				<h2 id="tour-done-title" className="font-serif text-2xl font-bold text-text">You are all set</h2>
				<p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted">
					Good luck finding your SIWES accommodation.
				</p>

				<button
					onClick={onClose}
					className="mt-8 rounded-xl bg-brand-gradient px-6 py-2.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
				>
					Start Exploring →
				</button>
			</motion.div>
		</div>
	);
}
