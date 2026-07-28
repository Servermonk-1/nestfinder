import { motion } from 'framer-motion';
import CompareAmenityRow from './CompareAmenityRow';
import CompareColumn from './CompareColumn';
import { calculateScore } from '../../utils/compareScore';
import { calculateMatchPercentage } from '../../utils/compareScore';

/**
 * CompareTable - Main comparison table with sticky left column
 */
export default function CompareTable({ listings, onRemove, preferences }) {
	if (!listings || listings.length === 0) return null;

	// Get all unique amenities from all listings
	const allAmenities = Array.from(
		new Set(
			listings.flatMap(l => l.amenities || [])
		)
	).sort();

	// Calculate scores
	const scoredListings = listings.map((listing) => ({
		...listing,
		score: calculateScore(listing, listings),
		matchPercentage: calculateMatchPercentage(listing, preferences),
	}));

	// Find winner
	const maxScore = Math.max(...scoredListings.map(l => l.score));
	const winnerIndex = scoredListings.findIndex(l => l.score === maxScore);

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			transition={{ duration: 0.5, delay: 0.2 }}
			className="w-full overflow-x-auto rounded-xl border border-primary/10"
		>
			<div className="min-w-full">
				{/* Header */}
				<div className="sticky top-0 z-10 bg-surface/95 backdrop-blur border-b border-primary/10">
					<div className="grid grid-cols-[200px_repeat(3,1fr)] gap-4 p-6">
						<div className="text-xs font-bold uppercase tracking-widest text-primary-ink">
							Criteria
						</div>
						{listings.map((listing, index) => (
							<div key={listing._id} className="text-center">
								<div className="text-xs font-bold uppercase tracking-widest text-primary-ink mb-2">
									Option {index + 1}
								</div>
								<div className="text-sm font-semibold text-text line-clamp-2">
									{listing.title}
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Listings Columns */}
				<div className="bg-surface/50 p-6">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
						{scoredListings.map((listing, index) => (
							<CompareColumn
								key={listing._id}
								listing={listing}
								index={index}
								totalListings={listings.length}
								score={listing.score}
								isWinner={winnerIndex === index}
								onRemove={() => onRemove(listing._id)}
								matchPercentage={listing.matchPercentage}
							/>
						))}
					</div>
				</div>

				{/* Amenities Section */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="border-t border-primary/10 p-6"
				>
					<div className="mb-6">
						<h3 className="text-lg font-bold text-text mb-2">Amenities</h3>
						<p className="text-sm text-muted">{allAmenities.length} total amenities available</p>
					</div>

					<div className="grid grid-cols-[200px_repeat(3,1fr)] gap-4">
						<div className="font-bold text-primary-ink text-sm">Amenity</div>

						{allAmenities.map((amenity, index) => (
							<CompareAmenityRow
								key={amenity}
								amenity={amenity}
								listings={listings}
								index={index}
							/>
						))}
					</div>
				</motion.div>
			</div>
		</motion.div>
	);
}

