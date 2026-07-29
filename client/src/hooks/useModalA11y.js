import { useEffect, useRef } from 'react';

const FOCUSABLE =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibility plumbing every modal needs:
 *  • Escape closes it
 *  • focus moves into the dialog on open, and is trapped inside while it's open
 *  • focus returns to whatever opened it on close
 *
 * Usage:  const ref = useModalA11y(isOpen, onClose);  →  <div ref={ref} role="dialog" aria-modal="true">
 */
export default function useModalA11y(isOpen, onClose) {
	const ref = useRef(null);

	// Callers pass an inline arrow, so `onClose` is a new function every render.
	// Keep it in a ref and depend ONLY on `isOpen` — otherwise this effect tears
	// down and re-runs on every keystroke, stealing focus out of inputs.
	const onCloseRef = useRef(onClose);
	useEffect(() => { onCloseRef.current = onClose; });

	useEffect(() => {
		if (!isOpen) return;

		const previouslyFocused = document.activeElement;

		// Move focus into the dialog — but only if it isn't already there, so an
		// input marked `autoFocus` keeps the focus it just claimed.
		const node = ref.current;
		const focusables = () => Array.from(node?.querySelectorAll(FOCUSABLE) || []).filter((el) => el.offsetParent !== null);
		if (!node?.contains(document.activeElement)) {
			(focusables()[0] || node)?.focus?.();
		}

		const onKeyDown = (e) => {
			if (e.key === 'Escape') {
				e.stopPropagation();
				onCloseRef.current?.();
				return;
			}
			if (e.key !== 'Tab') return;

			// Keep Tab cycling inside the dialog.
			const items = focusables();
			if (!items.length) return;
			const firstEl = items[0];
			const lastEl = items[items.length - 1];
			if (e.shiftKey && document.activeElement === firstEl) {
				e.preventDefault();
				lastEl.focus();
			} else if (!e.shiftKey && document.activeElement === lastEl) {
				e.preventDefault();
				firstEl.focus();
			}
		};

		document.addEventListener('keydown', onKeyDown, true);
		return () => {
			document.removeEventListener('keydown', onKeyDown, true);
			previouslyFocused?.focus?.();
		};
		// `onClose` deliberately omitted — it lives in a ref (see above).
	}, [isOpen]);

	return ref;
}
