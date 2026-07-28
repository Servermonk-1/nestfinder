import { motion } from 'framer-motion';
import { SearchX } from 'lucide-react';
import ListingCard from './ListingCard';

// Skeleton card while loading
const SkeletonCard = () => (
	<div className="bg-surface border border-muted/10 rounded-2xl overflow-hidden animate-pulse">
		<div className="h-48 bg-surface-alt" />
		<div className="p-4 space-y-3">
			<div className="h-4 bg-surface-alt rounded-lg w-3/4" />
			<div className="h-3 bg-surface-alt rounded-lg w-1/2" />
			<div className="flex gap-2">
				<div className="h-6 bg-surface-alt rounded-full w-16" />
				<div className="h-6 bg-surface-alt rounded-full w-16" />
				<div className="h-6 bg-surface-alt rounded-full w-16" />
			</div>
			<div className="h-px bg-surface-alt" />
			<div className="flex justify-between">
				<div className="h-5 bg-surface-alt rounded w-24" />
				<div className="h-8 bg-surface-alt rounded-xl w-24" />
			</div>
		</div>
	</div>
);

export default function ListingGrid({ listings, loading }) {
	if (loading) {
		return (
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
				{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
			</div>
		);
	}

	if (!listings?.length) {
		return (
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex flex-col items-center justify-center py-24 text-center"
			>
				<div className="w-20 h-20 bg-surface border border-muted/10 rounded-2xl flex items-center justify-center mb-6">
					<SearchX className="w-8 h-8 text-muted" />
				</div>
				<h3 className="font-serif text-text font-bold text-xl mb-2">No listings found</h3>
				<p className="text-muted text-sm max-w-xs">
					Try adjusting your filters or search in a different city to find more options.
				</p>
			</motion.div>
		);
	}

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
			{listings.map((listing, i) => (
				<motion.div
					key={listing._id}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: i * 0.05 }}
				>
					<ListingCard listing={listing} isFirst={i === 0} />
				</motion.div>
			))}
		</div>
	);
}
