import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query from JS.
 *
 * Tailwind handles almost everything responsive on its own, so reach for this
 * only where a breakpoint has to be known in JavaScript — chiefly the
 * framer-motion panels on the auth screens, which animate `x` as an inline
 * style that no utility class can override.
 *
 * Starts false on the server / first paint and corrects in an effect, so the
 * mobile layout is what renders before hydration.
 */
export default function useMediaQuery(query) {
	const [matches, setMatches] = useState(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return false;
		return window.matchMedia(query).matches;
	});

	useEffect(() => {
		if (typeof window === 'undefined' || !window.matchMedia) return undefined;
		const list = window.matchMedia(query);
		const onChange = (event) => setMatches(event.matches);
		setMatches(list.matches);
		list.addEventListener('change', onChange);
		return () => list.removeEventListener('change', onChange);
	}, [query]);

	return matches;
}

/** Tailwind's `md` breakpoint — the point where the split-panel layouts fit. */
export const useIsDesktop = () => useMediaQuery('(min-width: 768px)');
