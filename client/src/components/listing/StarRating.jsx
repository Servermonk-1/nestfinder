import { useState } from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 'h-4 w-4' }) {
	const [hovered, setHovered] = useState(0);
	const interactive = typeof onChange === 'function';
	const display = interactive ? (hovered || value) : Math.round(value);

	return (
		<div className="inline-flex items-center gap-0.5">
			{[1, 2, 3, 4, 5].map((star) => (
				<button
					key={star}
					type="button"
					disabled={!interactive}
					onClick={() => onChange?.(star)}
					onMouseEnter={() => interactive && setHovered(star)}
					onMouseLeave={() => interactive && setHovered(0)}
					className={interactive ? 'cursor-pointer' : 'cursor-default'}
					aria-label={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
				>
					<Star className={`${size} ${star <= display ? 'fill-highlight text-highlight' : 'text-muted/30'}`} />
				</button>
			))}
		</div>
	);
}
