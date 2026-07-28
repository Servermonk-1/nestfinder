import { motion } from 'framer-motion';
import { generateComparisonInsights, generatePropertyStrengths, generatePropertyWeaknesses } from '../../utils/insightGenerator';

/**
 * CompareInsights - Trade-off analysis and insights
 */
export default function CompareInsights({ listings }) {
	if (!listings || listings.length < 2) return null;

	const insights = generateComparisonInsights(listings);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, delay: 0.4 }}
			className="space-y-6"
		>
			<div>
				<h3 className="text-2xl font-bold text-text mb-4">Quick Insights</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{insights.map((insight, index) => (
						<motion.div
							key={insight.type}
							initial={{ opacity: 0, x: -20 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: index * 0.1 }}
							className="bg-surface/50 border border-primary/20 rounded-lg p-4 hover:border-primary/40 transition-all"
						>
							<div className="flex items-start gap-3">
								<div className="text-2xl">{insight.icon}</div>
								<div>
									<h4 className="font-bold text-text text-sm mb-1">
										{insight.title}
									</h4>
									<p className="text-muted text-xs leading-relaxed">
										{insight.text}
									</p>
								</div>
							</div>
						</motion.div>
					))}
				</div>
			</div>

			{/* Property Strengths & Weaknesses */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{listings.map((listing, index) => {
					const strengths = generatePropertyStrengths(listing, listings);
					const weaknesses = generatePropertyWeaknesses(listing, listings);

					return (
						<motion.div
							key={listing._id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: (0.4 + index * 0.1) }}
							className="bg-surface/50 border border-primary/10 rounded-lg p-6"
						>
							<h4 className="font-bold text-text mb-4 line-clamp-1">
								{listing.title}
							</h4>

							{/* Strengths */}
							<div className="mb-6">
								<h5 className="text-xs font-bold uppercase tracking-wide text-primary-ink mb-3">
									Strengths
								</h5>
								<ul className="space-y-2">
									{strengths.length > 0 ? (
										strengths.map((strength, i) => (
											<motion.li
												key={i}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: i * 0.05 }}
												className="flex items-start gap-2 text-sm text-muted"
											>
												<span className="text-lg flex-shrink-0">{strength.icon}</span>
												<span>{strength.text}</span>
											</motion.li>
										))
									) : (
										<p className="text-xs text-muted/50">No notable strengths</p>
									)}
								</ul>
							</div>

							{/* Weaknesses */}
							<div>
								<h5 className="text-xs font-bold uppercase tracking-wide text-danger-ink mb-3">
									Weaknesses
								</h5>
								<ul className="space-y-2">
									{weaknesses.length > 0 ? (
										weaknesses.map((weakness, i) => (
											<motion.li
												key={i}
												initial={{ opacity: 0, x: -10 }}
												animate={{ opacity: 1, x: 0 }}
												transition={{ delay: (0.1 + i * 0.05) }}
												className="flex items-start gap-2 text-sm text-muted"
											>
												<span className="text-lg flex-shrink-0">{weakness.icon}</span>
												<span>{weakness.text}</span>
											</motion.li>
										))
									) : (
										<p className="text-xs text-muted/50">No notable weaknesses</p>
									)}
								</ul>
							</div>
						</motion.div>
					);
				})}
			</div>
		</motion.div>
	);
}

