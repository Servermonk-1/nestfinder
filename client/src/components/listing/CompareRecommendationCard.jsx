import { motion } from 'framer-motion';
import { generateRecommendation } from '../../utils/recommendationEngine';

/**
 * CompareRecommendationCard - AI recommendation display
 */
export default function CompareRecommendationCard({ listings, preferences }) {
	if (!listings || listings.length === 0) return null;

	const recommendation = generateRecommendation(listings, preferences);

	if (!recommendation) return null;

	const { property, reasons, confidence, badge, explanation } = recommendation;

	return (
		<motion.div
			initial={{ opacity: 0, y: -20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-8 backdrop-blur-sm"
		>
			<div className="space-y-6">
				{/* Header */}
				<div>
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2 }}
						className="text-4xl mb-3"
					>
						<strong>Recommended</strong>
					</motion.div>
					<h2 className="text-2xl font-bold text-text mb-2">
						NestFinder Recommendation
					</h2>
					<p className="text-muted">
						{explanation}
					</p>
				</div>

				{/* Recommended Property */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="bg-surface/50 border border-primary/20 rounded-lg p-6"
				>
					<div className="text-xs font-bold uppercase tracking-wide text-primary-ink mb-2">
						Recommended Property
					</div>
					<h3 className="text-xl font-bold text-text mb-3">
						{property.title}
					</h3>

					{/* Reasons */}
					<div className="space-y-2 mb-6">
						{reasons.map((reason, index) => (
							<motion.div
								key={index}
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								transition={{ delay: (0.3 + index * 0.05) }}
								className="flex items-center gap-3 text-sm text-muted"
							>
								{reason.icon && <span className="text-xl">{reason.icon}</span>}
								<span>{reason.text}</span>
							</motion.div>
						))}
					</div>

					{/* Confidence Meter */}
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-xs font-bold text-primary-ink">Confidence</span>
							<span className="text-sm font-bold text-primary-ink">{confidence}%</span>
						</div>
						<motion.div
							initial={{ scaleX: 0 }}
							animate={{ scaleX: 1 }}
							transition={{ duration: 0.8, delay: 0.4 }}
							className="origin-left h-2 bg-surface rounded-full overflow-hidden"
						>
							<motion.div
								animate={{ width: `${confidence}%` }}
								transition={{ duration: 1, delay: 0.5 }}
								className="h-full bg-gradient-to-r from-primary to-highlight"
							/>
						</motion.div>
					</div>
				</motion.div>

				{/* Badge */}
				<motion.div
					animate={{ scale: [1, 1.05, 1] }}
					transition={{ duration: 2, repeat: Infinity }}
					className="inline-block bg-primary/20 border border-primary rounded-full px-6 py-3 text-sm font-bold text-primary-ink"
				>
					{badge}
				</motion.div>
			</div>
		</motion.div>
	);
}

