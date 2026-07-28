import { motion } from 'framer-motion';
import { getRiskLevel, identifyRiskFactors } from '../../utils/riskCalculator';

/**
 * CompareRiskCard - Risk analysis for a single property
 */
export default function CompareRiskCard({ listing, index }) {
	const riskScore = listing.riskScore || 0;
	const riskLevel = getRiskLevel(riskScore);
	const riskFactors = identifyRiskFactors(listing);

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			className={`bg-surface/50 border-2 rounded-lg p-6 ${riskLevel.className}`}
		>
			<div className="flex items-start justify-between gap-4 mb-4">
				<div>
					<h3 className="font-bold text-text mb-1 line-clamp-1">
						{listing.title}
					</h3>
					<div className="flex items-center gap-2">
						<span className="font-semibold uppercase tracking-wide text-sm text-primary-ink">{riskLevel.level}</span>
					</div>
				</div>

				{/* Risk Score */}
				<div className="text-right">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2 }}
						className="text-3xl font-bold text-primary-ink"
					>
						{riskScore}
					</motion.div>
					<div className="text-xs text-muted">/100</div>
				</div>
			</div>

			{/* Risk Factors */}
			{riskFactors.length > 0 ? (
				<div className="space-y-2">
					<h4 className="text-xs font-bold uppercase tracking-wide text-primary-ink mb-3">
						Risk Factors
					</h4>
					{riskFactors.map((factor, i) => (
						<motion.div
							key={factor.type}
							initial={{ opacity: 0, x: -10 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ delay: (0.2 + i * 0.05) }}
							className={`flex items-center gap-2 text-xs p-2 rounded ${
								factor.severity === 'high'
									? 'bg-danger/10 text-danger-ink'
									: factor.severity === 'medium'
										? 'bg-highlight/10 text-highlight-ink'
										: 'bg-primary/10 text-primary-ink'
							}`}
						>
							<span className="font-bold">•</span>
							<span>{factor.message}</span>
						</motion.div>
					))}
				</div>
			) : (
				<div className="text-sm text-muted">
					No major risk factors identified
				</div>
			)}
		</motion.div>
	);
}

