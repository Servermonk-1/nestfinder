import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function CompareRecommendation({ scored }) {
	if (scored.length < 2) return null;

	const winner = scored.reduce((best, l) => (l.score > best.score ? l : best), scored[0]);
	const minPrice = Math.min(...scored.map((l) => l.price ?? Infinity));
	const maxAmenities = Math.max(...scored.map((l) => l.amenities?.length || 0));

	let primaryReason = 'a strong overall balance of price, features, and trust';
	if (winner.price === minPrice) primaryReason = 'the lowest price';
	else if ((winner.amenities?.length || 0) === maxAmenities && maxAmenities > 0) primaryReason = 'the most amenities';
	else if (winner.landlord?.verified) primaryReason = 'the most trusted landlord';

	return (
		<motion.div
			initial={{ opacity: 0, y: 12 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true }}
			transition={{ duration: 0.4 }}
			className="mb-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5"
		>
			<Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" />
			<p className="text-sm leading-relaxed text-text">
				Based on your priorities, <strong className="text-primary-ink">{winner.title}</strong> is your best match.
				{' '}It offers {primaryReason} among your selections.
				{winner.available && ' It is currently available.'}
				{winner.landlord?.verified && ' The landlord is verified by NestFinder.'}
			</p>
		</motion.div>
	);
}
