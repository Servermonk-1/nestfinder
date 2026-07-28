import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function HelpTip({ title, description }) {
	const [open, setOpen] = useState(false);

	return (
		<span className="relative inline-block">
			<button
				type="button"
				onClick={() => setOpen((v) => !v)}
				aria-label={`Help: ${title}`}
				className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-muted/20 bg-surface-alt text-[10px] text-muted transition hover:border-primary/50 hover:bg-primary hover:text-base"
			>
				?
			</button>

			<AnimatePresence>
				{open && (
					<>
						<div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 5 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 5 }}
							className="absolute bottom-6 left-0 z-50 w-64 rounded-2xl border border-primary/20 bg-surface p-4 text-left shadow-2xl shadow-black/30"
						>
							<p className="mb-1.5 text-sm font-bold text-text">{title}</p>
							<p className="text-xs leading-relaxed text-muted">{description}</p>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</span>
	);
}
