import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * CompareAmenityRow - Display single amenity with availability indicator
 */
export default function CompareAmenityRow({ amenity, listings, index }) {
	return (
		<motion.div
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			transition={{ duration: 0.3, delay: index * 0.05 }}
			className="border-b border-primary/10 last:border-b-0 py-4"
		>
			<div className="grid grid-cols-[1fr_repeat(3,1fr)] gap-4 items-center">
				{/* Amenity Label */}
				<div className="font-medium text-muted text-sm">
					{amenity}
				</div>

				{/* Availability for each listing */}
				{listings.map((listing, i) => {
					const hasAmenity = listing.amenities?.includes(amenity);

					return (
						<motion.div
							key={`${listing._id}-${amenity}`}
							initial={{ scale: 0 }}
							animate={{ scale: 1 }}
							transition={{ duration: 0.2, delay: (index * 0.05) + (i * 0.05) }}
							className="flex justify-center"
						>
							{hasAmenity ? (
								<motion.div
									animate={{ scale: [1, 1.2, 1] }}
									transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
									className="text-primary-ink"
									title="Available"
								>
									<Check className="h-5 w-5" />
								</motion.div>
							) : (
								<motion.div
									initial={{ opacity: 0.5 }}
									animate={{ opacity: 1 }}
									transition={{ duration: 0.8, repeat: Infinity }}
									className="text-muted opacity-80"
									title="Not available"
								>
									<X className="h-5 w-5" />
								</motion.div>
							)}
						</motion.div>
					);
				})}
			</div>
		</motion.div>
	);
}

