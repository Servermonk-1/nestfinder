import { motion } from 'framer-motion';
import { getScoreBadge } from '../../utils/compareScore';

/**
 * CompareScoreBadge - Display score with badge and percentage
 */
export default function CompareScoreBadge({ score, matchPercentage = 50, isWinner = false }) {
	const badge = getScoreBadge(score);

	return (
		<motion.div
			initial={{ scale: 0.8, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ duration: 0.4, delay: 0.2 }}
			className="text-center space-y-3"
		>
			{/* Winner Badge */}
			{isWinner && (
				<motion.div
					animate={{ scale: [1, 1.05, 1] }}
					transition={{ duration: 2, repeat: Infinity }}
					className="inline-block bg-primary/20 border border-primary rounded-full px-4 py-1 text-xs font-bold text-primary-ink"
				>
					Best Value
				</motion.div>
			)}

			{/* Score Container */}
			<div className="space-y-2">
				{/* Badge + Score */}
				<div className="flex items-center justify-center gap-2">
					<span className="text-3xl">{badge.badge}</span>
					<motion.div
						initial={{ scale: 0.5 }}
						animate={{ scale: 1 }}
						transition={{ duration: 0.5, delay: 0.3 }}
						className="text-4xl font-bold text-primary-ink"
					>
						{score}
					</motion.div>
					<span className="text-lg text-muted">/100</span>
				</div>

				{/* Label */}
				<div className="text-sm font-bold text-muted">
					{badge.label}
				</div>

				{/* Match Percentage */}
				<motion.div
					initial={{ scaleX: 0 }}
					animate={{ scaleX: 1 }}
					transition={{ duration: 0.6, delay: 0.4 }}
					className="origin-left text-xs text-muted"
				>
					{matchPercentage}% Match
				</motion.div>
			</div>
		</motion.div>
	);
}

