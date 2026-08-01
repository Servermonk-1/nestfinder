import { useId } from 'react';

/**
 * The NestFinder badge.
 *
 * Two cuts, because one does not survive both ends of the size range:
 *
 *   `mark` — rings and starburst only. Everything at or below ~48px: the nav
 *            pill, avatars, favicons, compact headers.
 *   `full` — the complete badge with NESTFINDER and COMMAND YOUR SPACE set on
 *            arcs. Only above ~96px, where the arched text is actually legible;
 *            below that it degrades into a grey smear around a circle.
 *
 * Drawn inline rather than loaded from /logo.svg so the artwork inherits
 * `currentColor` — the same component sits on paper and on navy without a
 * second file or an invert filter.
 */

const STAR_MARK =
	'M100.00,40.00 Q103.75,71.50 106.47,75.85 Q111.00,73.44 130.00,48.04 Q117.50,77.19 117.68,82.32 Q122.81,82.50 151.96,70.00 Q126.56,89.00 124.15,93.53 Q128.50,96.25 160.00,100.00 Q128.50,103.75 124.15,106.47 Q126.56,111.00 151.96,130.00 Q122.81,117.50 117.68,117.68 Q117.50,122.81 130.00,151.96 Q111.00,126.56 106.47,124.15 Q103.75,128.50 100.00,160.00 Q96.25,128.50 93.53,124.15 Q89.00,126.56 70.00,151.96 Q82.50,122.81 82.32,117.68 Q77.19,117.50 48.04,130.00 Q73.44,111.00 75.85,106.47 Q71.50,103.75 40.00,100.00 Q71.50,96.25 75.85,93.53 Q73.44,89.00 48.04,70.00 Q77.19,82.50 82.32,82.32 Q82.50,77.19 70.00,48.04 Q89.00,73.44 93.53,75.85 Q96.25,71.50 100.00,40.00 Z';

const STAR_FULL =
	'M100.00,52.00 Q103.00,77.20 105.18,80.68 Q108.80,78.75 124.00,58.43 Q114.00,81.75 114.14,85.86 Q118.25,86.00 141.57,76.00 Q121.25,91.20 119.32,94.82 Q122.80,97.00 148.00,100.00 Q122.80,103.00 119.32,105.18 Q121.25,108.80 141.57,124.00 Q118.25,114.00 114.14,114.14 Q114.00,118.25 124.00,141.57 Q108.80,121.25 105.18,119.32 Q103.00,122.80 100.00,148.00 Q97.00,122.80 94.82,119.32 Q91.20,121.25 76.00,141.57 Q86.00,118.25 85.86,114.14 Q81.75,114.00 58.43,124.00 Q78.75,108.80 80.68,105.18 Q77.20,103.00 52.00,100.00 Q77.20,97.00 80.68,94.82 Q78.75,91.20 58.43,76.00 Q81.75,86.00 85.86,85.86 Q86.00,81.75 76.00,58.43 Q91.20,78.75 94.82,80.68 Q97.00,77.20 100.00,52.00 Z';

export default function Logo({ variant = 'mark', size = 28, className = '', title = 'NestFinder' }) {
	// The text arcs live in <defs> and are referenced by id. Two full badges on one
	// page with hard-coded ids would emit duplicate DOM ids and both would resolve
	// to whichever rendered first, so the ids are scoped per instance.
	const uid = useId().replace(/:/g, '');
	const topArc = `nf-arc-top-${uid}`;
	const botArc = `nf-arc-bot-${uid}`;

	const common = {
		viewBox: '0 0 200 200',
		width: size,
		height: size,
		className: `shrink-0 ${className}`,
		role: 'img',
		'aria-label': title,
	};

	if (variant === 'full') {
		return (
			<svg {...common} xmlns="http://www.w3.org/2000/svg">
				<title>{title}</title>
				<defs>
					{/* Top text grows outward from its baseline and bottom text grows inward,
					    so the two arcs sit at different radii to land in the same band. */}
					<path id={topArc} d="M31,100 A69,69 0 0 1 169,100" fill="none" />
					<path id={botArc} d="M8,100 A92,92 0 0 0 192,100" fill="none" />
				</defs>
				<g fill="none" stroke="currentColor">
					<circle cx="100" cy="100" r="96" strokeWidth="2.5" />
					<circle cx="100" cy="100" r="66" strokeWidth="2" />
					<circle cx="100" cy="100" r="54" strokeWidth="1.5" />
				</g>
				<g fill="currentColor" fontFamily="Archivo, 'Helvetica Neue', Helvetica, Arial, sans-serif">
					<text fontSize="21" fontWeight="700" letterSpacing="2.4" textAnchor="middle">
						<textPath href={`#${topArc}`} startOffset="50%">NESTFINDER</textPath>
					</text>
					<text fontSize="9" fontWeight="500" letterSpacing="2.6" textAnchor="middle">
						<textPath href={`#${botArc}`} startOffset="50%">COMMAND YOUR SPACE</textPath>
					</text>
				</g>
				<g fill="currentColor">
					<circle cx="19" cy="100" r="2.4" />
					<circle cx="181" cy="100" r="2.4" />
				</g>
				<path fill="currentColor" d={STAR_FULL} />
			</svg>
		);
	}

	return (
		<svg {...common} xmlns="http://www.w3.org/2000/svg">
			<title>{title}</title>
			<g fill="none" stroke="currentColor">
				<circle cx="100" cy="100" r="93" strokeWidth="6" />
				<circle cx="100" cy="100" r="74" strokeWidth="3.5" />
			</g>
			<path fill="currentColor" d={STAR_MARK} />
		</svg>
	);
}

/**
 * Mark plus wordmark, set as one unit.
 *
 * Used wherever the brand needs to be named as well as shown — the nav pill,
 * login screens, email headers.
 */
export function LogoLockup({ size = 26, className = '', wordmark = 'NestFinder' }) {
	return (
		<span className={`inline-flex items-center gap-2 ${className}`}>
			<Logo size={size} />
			<span className="font-display text-[16px] font-extrabold tracking-tight">{wordmark}</span>
		</span>
	);
}
