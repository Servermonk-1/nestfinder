import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/price';
import { useNavigate } from 'react-router-dom';

/**
 * CompareDecisionCard - Final decision card for each property
 */
export default function CompareDecisionCard({ listing, score, index, matchPercentage }) {
	const navigate = useNavigate();

	const getRiskColor = (score) => {
		if (score >= 80) return 'text-primary-ink';
		if (score >= 60) return 'text-highlight';
		if (score >= 40) return 'text-muted';
		return 'text-danger-ink';
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			className="bg-surface/50 border border-primary/10 hover:border-primary/40 rounded-xl overflow-hidden hover:shadow-xl hover:shadow-primary/10 transition-all"
		>
			{/* Image */}
			<div className="relative overflow-hidden aspect-video bg-surface">
				<img
					src={listing.images?.[0] || 'https://via.placeholder.com/400x300'}
					alt={listing.title}
					className="w-full h-full object-cover group-hover:scale-110 transition-transform"
				/>
				<div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
			</div>

			{/* Content */}
			<div className="p-6 space-y-4">
				{/* Title */}
				<div>
					<h3 className="font-serif text-xl font-bold text-text line-clamp-2 mb-1">
						{listing.title}
					</h3>
					<p className="text-sm text-muted">
						{listing.area || 'N/A'}, Ibadan
					</p>
				</div>

				{/* Score & Match */}
				<div className="flex items-center justify-between">
					<motion.div
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.2 }}
						className="space-y-1"
					>
						<div className="text-2xl font-bold text-primary-ink">
							{score}
							<span className="text-sm text-muted">/100</span>
						</div>
						<div className="text-xs text-muted">
							{matchPercentage}% Match
						</div>
					</motion.div>

					{/* Risk Badge */}
					<motion.div
						className={`text-center font-bold text-sm px-3 py-2 rounded-lg bg-surface/50 border border-primary/20 ${getRiskColor(score)}`}
					>
						{score >= 80 ? 'Low Risk' : score >= 60 ? 'Moderate Risk' : score >= 40 ? 'Elevated Risk' : 'High Risk'}
					</motion.div>
				</div>

				{/* Price */}
				<div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-center">
					<div className="text-lg font-bold text-primary-ink">
						{listing.price ? formatPrice(listing) : 'N/A'}
					</div>
					<div className="text-xs text-muted">Monthly</div>
				</div>

				{/* Action Button */}
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => navigate(`/listing/${listing._id}`)}
					className="w-full bg-primary text-text font-bold py-3 rounded-lg transition-all hover:bg-primary/90 text-sm"
				>
					Choose This One
				</motion.button>
			</div>
		</motion.div>
	);
}

