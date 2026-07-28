import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import StudentNavbar from '../../components/common/StudentNavbar';
import ListingGrid from '../../components/listing/ListingGrid';
import { useSaved } from '../../context/SavedContext';

export default function SavedPage() {
	const { savedListings } = useSaved();

	return (
		<div className="min-h-screen bg-base text-text">
			<StudentNavbar />

			<div className="border-b border-line bg-surface/70 px-6 pt-28 pb-8">
				<div className="mx-auto max-w-7xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> Saved homes
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
						Your saved homes
					</motion.h1>
					<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 text-sm text-muted">
						{savedListings.length} home{savedListings.length !== 1 ? 's' : ''} you've bookmarked to revisit later.
					</motion.p>
				</div>
			</div>

			<div className="mx-auto max-w-7xl px-6 py-10">
				{savedListings.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-24 text-center">
						<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
							<Heart className="h-7 w-7 text-primary-ink" />
						</div>
						<h2 className="font-serif text-xl font-bold text-text">No saved homes yet</h2>
						<p className="mt-2 max-w-xs text-sm text-muted">
							Tap the heart icon on any listing to save it here and compare your favorites later.
						</p>
						<Link
							to="/dashboard"
							className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
						>
							Browse Homes
						</Link>
					</div>
				) : (
					<ListingGrid listings={savedListings} loading={false} />
				)}
			</div>
		</div>
	);
}
