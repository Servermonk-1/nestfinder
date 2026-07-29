import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '../../utils/urlHelper';

export default function ImageLightbox({ images, index, onClose, onIndexChange }) {
	const goNext = useCallback(() => {
		onIndexChange((index + 1) % images.length);
	}, [index, images.length, onIndexChange]);

	const goPrev = useCallback(() => {
		onIndexChange((index - 1 + images.length) % images.length);
	}, [index, images.length, onIndexChange]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'Escape') onClose();
			else if (e.key === 'ArrowRight') goNext();
			else if (e.key === 'ArrowLeft') goPrev();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onClose, goNext, goPrev]);

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-[200] flex items-center justify-center bg-paper/95 backdrop-blur-sm"
			>
				<button
					onClick={onClose}
					aria-label="Close gallery"
					className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-muted/20 text-text transition hover:border-primary/50 hover:text-primary-ink"
				>
					<X className="h-5 w-5" />
				</button>

				<p className="absolute top-6 left-1/2 -translate-x-1/2 text-sm font-semibold text-muted">
					{index + 1} / {images.length}
				</p>

				{images.length > 1 && (
					<button
						onClick={goPrev}
						aria-label="Previous photo"
						className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full border border-muted/20 text-text transition hover:border-primary/50 hover:text-primary-ink md:left-8"
					>
						<ChevronLeft className="h-5 w-5" />
					</button>
				)}

				<motion.img
					key={index}
					initial={{ opacity: 0, scale: 0.97 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ duration: 0.2 }}
					src={getImageUrl(images[index])}
					alt=""
					className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
				/>

				{images.length > 1 && (
					<button
						onClick={goNext}
						aria-label="Next photo"
						className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full border border-muted/20 text-text transition hover:border-primary/50 hover:text-primary-ink md:right-8"
					>
						<ChevronRight className="h-5 w-5" />
					</button>
				)}
			</motion.div>
		</AnimatePresence>
	);
}
