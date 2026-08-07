import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ArrowRight, GitCompare } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';

export default function CompareBar() {
	const { compareList, removeFromCompare, clearCompare } = useCompare();
	const navigate = useNavigate();
	const selectedCount = compareList.length;

	return (
		<AnimatePresence>
			{compareList.length > 0 && (
				<motion.div
					initial={{ y: 100, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					exit={{ y: 100, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 300, damping: 30 }}
					id="tour-compare-bar"
					className="fixed bottom-24 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4 md:bottom-6"
				>
					<div className="glass-strong rounded-2xl border border-line p-3 shadow-card-lg sm:p-4">
						{/* Chips and actions share one row from sm up. On a phone they
						    cannot: the action cluster alone is ~200px and a single chip
						    is ~160px, which exceeds the 296px available at 360px and
						    pushed the Compare button off the right edge. Stacking is
						    what keeps it reachable. */}
						<div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-4">

							{/* Icon */}
							<div className="hidden w-9 h-9 bg-primary/20 rounded-xl sm:flex items-center justify-center flex-shrink-0">
								<GitCompare className="w-4 h-4 text-primary-ink" />
							</div>

							{/* Selected listings */}
							<div className="flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-nowrap sm:items-center sm:gap-3 sm:overflow-hidden sm:overflow-x-auto">
								{compareList.map((listing) => (
									<motion.div
										key={listing._id}
										initial={{ scale: 0, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										exit={{ scale: 0, opacity: 0 }}
										className="flex items-center gap-2 bg-surface-alt border border-line rounded-xl px-3 py-1.5 flex-shrink-0"
									>
										<span className="text-text text-xs font-semibold truncate max-w-[120px] sm:max-w-[100px]">
											{listing.title}
										</span>
										<button
											onClick={() => removeFromCompare(listing._id)}
											aria-label={`Remove ${listing.title} from comparison`}
											className="text-muted hover:text-text transition-colors"
										>
											<X className="w-3 h-3" />
										</button>
									</motion.div>
								))}

								{/* Empty slots */}
								{[...Array(3 - compareList.length)].map((_, i) => (
									<div
										key={i}
										className="hidden items-center justify-center w-24 h-8 border border-dashed border-muted/15 rounded-xl flex-shrink-0 sm:flex"
									>
										<span className="text-muted text-xs">+ Add more</span>
									</div>
								))}
							</div>

							{/* Actions */}
							<div className="flex shrink-0 items-center justify-between gap-2 sm:justify-start">
								<button
									onClick={clearCompare}
									className="text-muted hover:text-text text-xs transition-colors px-2"
								>
									Clear
								</button>
								<motion.button
									onClick={() => navigate('/compare')}
									disabled={selectedCount < 2}
									whileHover={{ scale: 1.03 }}
									whileTap={{ scale: 0.97 }}
									className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-white shadow-glow-sm transition-all hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-50 sm:flex-initial"
								>
									Compare ({compareList.length})
									<ArrowRight className="w-4 h-4" />
								</motion.button>
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
