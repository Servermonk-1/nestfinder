import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitCompare, MousePointerClick, ListChecks, Sparkles, X } from 'lucide-react';

const STORAGE_KEY = 'nestfinder_dismissed_compare_guide';

const STEPS = [
	{ icon: MousePointerClick, title: 'Tap "+ Compare"', text: 'Pick 2 or 3 homes you\'re interested in from the grid below.' },
	{ icon: ListChecks, title: 'Check your picks', text: 'A bar appears at the bottom of the screen showing what you\'ve selected.' },
	{ icon: Sparkles, title: 'Tap "Compare"', text: 'See scores, cost estimates, and a personal recommendation side by side.' },
];

export default function CompareGuideBanner() {
	const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

	const handleDismiss = () => {
		localStorage.setItem(STORAGE_KEY, 'true');
		setDismissed(true);
	};

	return (
		<AnimatePresence>
			{!dismissed && (
				<motion.div
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, height: 0, marginBottom: 0 }}
					transition={{ duration: 0.3 }}
					className="relative mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-5"
				>
					<button
						onClick={handleDismiss}
						aria-label="Dismiss guide"
						className="absolute right-4 top-4 text-muted transition hover:text-text"
					>
						<X className="h-4 w-4" />
					</button>

					<div className="mb-4 flex items-center gap-2 pr-8">
						<GitCompare className="h-4 w-4 text-primary-ink" />
						<p className="text-sm font-bold text-text">New here? Here's how comparing works</p>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						{STEPS.map(({ icon: Icon, title, text }, i) => (
							<div key={title} className="flex items-start gap-3">
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary-ink">
									{i + 1}
								</div>
								<div className="min-w-0">
									<p className="flex items-center gap-1.5 text-xs font-bold text-text">
										<Icon className="h-3.5 w-3.5 text-primary-ink shrink-0" /> {title}
									</p>
									<p className="mt-1 text-xs leading-relaxed text-muted">{text}</p>
								</div>
							</div>
						))}
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
