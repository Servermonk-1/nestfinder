import { motion } from 'framer-motion';
import { formatPrice } from '../../utils/price';
import { Maximize2, Bed, MapPin, Phone, Mail, Shield, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import CompareScoreBadge from './CompareScoreBadge';

/**
 * CompareColumn - Single listing column in comparison table
 */
export default function CompareColumn({ listing, index, totalListings, score, isWinner, onRemove, matchPercentage }) {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);

	const images = listing.images || ['https://via.placeholder.com/400x300'];

	const nextImage = () => {
		setCurrentImageIndex((prev) => (prev + 1) % images.length);
	};

	const prevImage = () => {
		setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
	};

	return (
		<motion.div
			initial={{ y: 40, opacity: 0 }}
			animate={{ y: 0, opacity: 1 }}
			transition={{ duration: 0.5, delay: index * 0.1 }}
			className={`relative bg-surface/50 rounded-xl overflow-hidden border-2 transition-all ${
				isWinner
					? 'border-primary shadow-2xl shadow-primary/20'
					: 'border-primary/10 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10'
			}`}
		>
			{/* Remove Button */}
			{totalListings > 1 && (
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.95 }}
					onClick={onRemove}
					className="absolute top-3 right-3 z-10 bg-primary/80 hover:bg-primary text-white p-2 rounded-lg transition-colors"
				>
					<X className="h-4 w-4" />
				</motion.button>
			)}

			{/* Image Gallery */}
			<div className="relative overflow-hidden aspect-video bg-surface">
				<motion.img
					key={currentImageIndex}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.3 }}
					src={images[currentImageIndex]}
					alt={listing.title}
					className="w-full h-full object-cover"
				/>

				{/* Image Counter */}
				<div className="absolute bottom-3 right-3 bg-surface/80 backdrop-blur text-muted text-xs px-2 py-1 rounded">
					{currentImageIndex + 1} / {images.length}
				</div>

				{/* Image Navigation */}
				{images.length > 1 && (
					<div className="absolute inset-0 flex items-center justify-between px-2">
						<motion.button
							whileHover={{ scale: 1.1 }}
							onClick={prevImage}
							className="bg-surface/70 hover:bg-surface/90 text-primary-ink p-2 rounded-full transition-colors"
						>
							<ChevronLeft className="h-4 w-4" />
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.1 }}
							onClick={nextImage}
							className="bg-surface/70 hover:bg-surface/90 text-primary-ink p-2 rounded-full transition-colors"
						>
							<ChevronRight className="h-4 w-4" />
						</motion.button>
					</div>
				)}
			</div>

			{/* Content */}
			<div className="p-6 space-y-6">
				{/* Title & Location */}
				<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
					<h3 className="font-serif text-lg font-bold text-text mb-2 line-clamp-2">
						{listing.title}
					</h3>
					<div className="flex items-center gap-2 text-muted text-sm">
						<MapPin className="h-4 w-4 flex-shrink-0" />
						<span>{listing.area || 'N/A'}, {listing.location || 'Ibadan'}</span>
					</div>
				</motion.div>

				{/* Price Section */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="bg-primary/10 border border-primary/20 rounded-lg p-4"
				>
					<div className="text-2xl font-bold text-primary-ink mb-1">
						{listing.price ? formatPrice(listing) : 'N/A'}
					</div>
					<div className="text-xs text-muted">Monthly Rent</div>
				</motion.div>

				{/* Room Details */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					className="grid grid-cols-2 gap-3"
				>
					<div>
						<div className="flex items-center gap-2 text-muted text-xs mb-1">
							<Bed className="h-3 w-3" />
							Beds
						</div>
						<div className="text-sm font-bold text-text">
							{listing.beds || 'N/A'}
						</div>
					</div>
					<div>
						<div className="flex items-center gap-2 text-muted text-xs mb-1">
							<Maximize2 className="h-3 w-3" />
							Size
						</div>
						<div className="text-sm font-bold text-text">
							{listing.size ? `${listing.size} sqft` : 'N/A'}
						</div>
					</div>
				</motion.div>

				{/* Score Badge */}
				<CompareScoreBadge score={score} matchPercentage={matchPercentage} isWinner={isWinner} />

				{/* Landlord Info */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="bg-surface/50 rounded-lg p-4 space-y-3 border border-primary/10"
				>
					<div className="flex items-center justify-between">
						<div className="text-xs uppercase tracking-wide text-primary-ink font-bold">
							Landlord
						</div>
						{listing.landlord?.verified && (
							<div className="flex items-center gap-1 text-xs text-primary-ink bg-primary/10 px-2 py-1 rounded">
								<Shield className="h-3 w-3" />
								Verified
							</div>
						)}
					</div>

					<div className="space-y-2 text-sm">
						<div>
							<div className="text-muted text-xs">Name</div>
							<div className="text-text font-medium">
								{listing.landlord?.name || 'Not Provided'}
							</div>
						</div>

						<div className="flex items-center gap-2 text-muted text-xs">
							<Phone className="h-3 w-3 flex-shrink-0" />
							<span className="truncate">{listing.landlord?.phone || 'N/A'}</span>
						</div>

						<div className="flex items-center gap-2 text-muted text-xs">
							<Mail className="h-3 w-3 flex-shrink-0" />
							<span className="truncate">{listing.landlord?.email || 'N/A'}</span>
						</div>
					</div>
				</motion.div>

				{/* Action Buttons */}
				<div className="space-y-2 pt-2">
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full bg-primary text-text font-bold py-2.5 rounded-lg transition-all hover:bg-primary/90 text-sm"
					>
						Contact Landlord
					</motion.button>
					<motion.button
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						className="w-full border border-primary/30 text-primary-ink font-bold py-2.5 rounded-lg transition-all hover:bg-primary/5 text-sm"
					>
						View Details
					</motion.button>
				</div>
			</div>
		</motion.div>
	);
}

