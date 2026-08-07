import { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PADDING = 8;
// Below this the tooltip is nearly as wide as the screen, so there is no room
// beside a target for a left/right placement — see resolvePlacement.
const NARROW = 640;
// 18rem — so 288px on desktop, but 270px below `sm` where index.css drops the
// root to 15px. Both estimates here are deliberately the larger desktop value:
// over-estimating only insets the card further from the edge, which is safe,
// whereas under-estimating would let it hang off.
const TIP_W = 288;
const TIP_H = 280;   // approx. rendered card height, incl. the 16px gap
const MARGIN = 12;   // keeps the card off the very edge of the screen

function measure(selector) {
	const el = document.querySelector(selector);
	if (!el) return null;
	const rect = el.getBoundingClientRect();
	if (rect.width === 0 || rect.height === 0) return null;
	return rect;
}

/**
 * On a phone a 288px tooltip cannot sit beside a target that already spans the
 * screen — `left`/`right` pushed it almost entirely out of view. Collapse those
 * to a vertical placement, then make sure the vertical side actually has room;
 * otherwise a target near the bottom of the screen pushes the card off it.
 */
function resolvePlacement(rect, placement) {
	if (window.innerWidth >= NARROW) return placement;
	const spaceAbove = rect.top;
	const spaceBelow = window.innerHeight - rect.bottom;
	const roomier = spaceBelow >= spaceAbove ? 'bottom' : 'top';

	if (placement === 'left' || placement === 'right') return roomier;
	// Keep the authored side when it fits, else flip to the roomier one.
	if (placement === 'bottom' && spaceBelow < TIP_H) return roomier;
	if (placement === 'top' && spaceAbove < TIP_H) return roomier;
	return placement;
}

/** Tooltip position + arrow direction, anchored via CSS transform so we never need the tooltip's own size. */
function tooltipStyle(rect, placement) {
	const gap = 16;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	// The tooltip is centred on these coordinates, so the centre has to stay at
	// least half a tooltip away from each edge or the card hangs off the screen.
	// On a 360px phone the old fixed 170px inset left a 20px window and still
	// overflowed; half the real width is the value that actually fits.
	const halfTip = Math.min(TIP_W, vw - MARGIN * 2) / 2;
	const clampX = (x) => Math.min(Math.max(x, halfTip + MARGIN), vw - halfTip - MARGIN);
	const clampY = (y) => Math.min(Math.max(y, 130), vh - 130);

	switch (placement) {
		case 'right':
			return { left: rect.right + gap, top: clampY(rect.top + rect.height / 2), transform: 'translateY(-50%)' };
		case 'left':
			return { left: rect.left - gap, top: clampY(rect.top + rect.height / 2), transform: 'translate(-100%, -50%)' };
		case 'top':
			return { left: clampX(rect.left + rect.width / 2), top: rect.top - gap, transform: 'translate(-50%, -100%)' };
		case 'bottom':
		default:
			return { left: clampX(rect.left + rect.width / 2), top: rect.bottom + gap, transform: 'translateX(-50%)' };
	}
}

const ARROW_CLASSES = {
	top: 'bottom-[-6px] left-1/2 -translate-x-1/2',
	bottom: 'top-[-6px] left-1/2 -translate-x-1/2',
	left: 'right-[-6px] top-1/2 -translate-y-1/2',
	right: 'left-[-6px] top-1/2 -translate-y-1/2',
};

export default function TourSpotlight({ step, stepIndex, totalSteps, onNext, onPrev, onSkip }) {
	const [rect, setRect] = useState(null);

	const recompute = useCallback(() => {
		setRect(measure(step.target));
	}, [step.target]);

	useLayoutEffect(() => {
		const el = document.querySelector(step.target);
		el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		// Give scrollIntoView a beat to settle before measuring
		const t = setTimeout(recompute, 260);
		recompute();
		return () => clearTimeout(t);
	}, [step.target, recompute]);

	useEffect(() => {
		window.addEventListener('resize', recompute);
		window.addEventListener('scroll', recompute, true);
		return () => {
			window.removeEventListener('resize', recompute);
			window.removeEventListener('scroll', recompute, true);
		};
	}, [recompute]);

	// If the target isn't on screen (e.g. filters sidebar hidden on mobile), skip this step automatically
	useEffect(() => {
		if (rect === null) {
			const t = setTimeout(() => {
				if (measure(step.target) === null) onNext();
			}, 350);
			return () => clearTimeout(t);
		}
	}, [rect, step.target, onNext]);

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (e.key === 'ArrowRight') onNext();
			else if (e.key === 'ArrowLeft') onPrev();
			else if (e.key === 'Escape') e.preventDefault();
		};
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [onNext, onPrev]);

	if (!rect) return null;

	const cutout = {
		left: rect.left - PADDING,
		top: rect.top - PADDING,
		width: rect.width + PADDING * 2,
		height: rect.height + PADDING * 2,
	};
	const placement = resolvePlacement(rect, step.placement || 'bottom');
	const arrowPlacement = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }[placement];

	return (
		<div className="fixed inset-0 z-[200]" onClick={(e) => e.preventDefault()}>
			{/* Dark backdrop with a cutout over the spotlighted element */}
			<motion.div
				key={step.target}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				className="absolute rounded-2xl transition-all duration-300"
				style={{ ...cutout, boxShadow: '0 0 0 9999px rgba(29, 23, 18, 0.72)' }}
			/>
			<motion.div
				animate={{ opacity: [0.5, 1, 0.5] }}
				transition={{ duration: 2, repeat: Infinity }}
				className="pointer-events-none absolute rounded-2xl border-2 border-primary/70"
				style={cutout}
			/>

			{/* w-72 on anything but the narrowest phones; below that the card
			    takes the screen minus a small margin so it can never hang off. */}
			<div className="fixed w-[min(18rem,calc(100vw-24px))]" style={tooltipStyle(rect, placement)}>
				<AnimatePresence mode="wait">
					<motion.div
						key={stepIndex}
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						transition={{ duration: 0.2 }}
						role="dialog"
						aria-live="polite"
						aria-labelledby="tour-step-title"
						className="relative rounded-2xl border border-line bg-surface p-5 shadow-card-lg"
					>
						<span className={`absolute h-3 w-3 rotate-45 bg-surface ${ARROW_CLASSES[arrowPlacement]}`} />

						<p className="text-[13px] font-bold uppercase tracking-widest text-primary-ink">
							Step {stepIndex + 1} of {totalSteps}
						</p>
						<h3 id="tour-step-title" className="mt-1.5 font-serif text-lg font-bold text-text">{step.title}</h3>
						<p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>

						<div className="mt-4 flex items-center gap-1.5">
							{Array.from({ length: totalSteps }).map((_, i) => (
								<span
									key={i}
									className={`h-1.5 w-1.5 rounded-full transition-colors ${i === stepIndex ? 'bg-primary' : 'bg-muted/30'}`}
								/>
							))}
						</div>

						<div className="mt-5 flex items-center justify-between">
							<button
								onClick={onPrev}
								disabled={stepIndex === 0}
								className="text-xs font-semibold text-muted transition hover:text-text disabled:opacity-30"
							>
								← Back
							</button>
							<button
								onClick={onNext}
								className="rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-glow-sm transition hover:shadow-glow"
							>
								{stepIndex + 1 === totalSteps ? 'Finish →' : 'Next →'}
							</button>
						</div>
						<button
							onClick={onSkip}
							className="mt-3 block w-full text-center text-[13px] font-semibold text-muted/70 transition hover:text-muted"
						>
							Skip Tour
						</button>
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
