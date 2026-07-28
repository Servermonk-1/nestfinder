import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, ChevronDown, DollarSign, Layers, ShieldCheck, CalendarCheck, RotateCcw } from 'lucide-react';
import { DEFAULT_WEIGHTS } from '../../utils/compareScore';

const SLIDERS = [
	{ key: 'price', label: 'Price Matters', icon: DollarSign },
	{ key: 'amenities', label: 'Amenities Matter', icon: Layers },
	{ key: 'trust', label: 'Trust Matters', icon: ShieldCheck },
	{ key: 'availability', label: 'Availability Matters', icon: CalendarCheck },
];

export default function ComparePrioritySliders({ weights, onChange }) {
	const [open, setOpen] = useState(true);

	const handleSlide = (key, value) => {
		onChange({ ...weights, [key]: Number(value) });
	};

	const reset = () => onChange(DEFAULT_WEIGHTS);

	return (
		<div className="mb-8 rounded-2xl border border-primary/15 bg-surface p-5">
			<button
				onClick={() => setOpen((v) => !v)}
				className="flex w-full items-center justify-between text-left"
			>
				<div className="flex items-center gap-2.5">
					<SlidersHorizontal className="h-4 w-4 text-primary-ink" />
					<div>
						<p className="text-sm font-bold text-text">Personalize Your Priorities</p>
						<p className="text-xs text-muted">Drag to tell us what matters most — scores update instantly</p>
					</div>
				</div>
				<ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.25 }}
						className="overflow-hidden"
					>
						<div className="mt-5 grid gap-5 sm:grid-cols-2">
							{SLIDERS.map(({ key, label, icon: Icon }) => (
								<div key={key}>
									<div className="mb-2 flex items-center justify-between">
										<span className="flex items-center gap-1.5 text-xs font-semibold text-text">
											<Icon className="h-3.5 w-3.5 text-primary-ink" /> {label}
										</span>
										<span className="text-xs font-bold text-primary-ink">{weights[key]}%</span>
									</div>
									<input
										type="range"
										min={0}
										max={100}
										value={weights[key]}
										onChange={(e) => handleSlide(key, e.target.value)}
										className="h-2 w-full cursor-pointer rounded-full bg-surface-alt accent-primary"
									/>
								</div>
							))}
						</div>
						<button
							onClick={reset}
							className="mt-5 flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-primary-ink"
						>
							<RotateCcw className="h-3 w-3" /> Reset to defaults
						</button>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
