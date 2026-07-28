import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useModalA11y from './useModalA11y';

/**
 * Regression guard for the "can't type in a modal" bug.
 *
 * The hook used to depend on `onClose`, which every call site passes as a fresh
 * inline arrow. That made the effect tear down and re-run on EVERY render — so
 * each keystroke re-focused the first element and typing was impossible.
 */
function Modal({ onClose }) {
	const [text, setText] = useState('');
	// Deliberately an inline arrow, exactly how the real call sites use it.
	const ref = useModalA11y(true, () => onClose?.());
	return (
		<div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Test dialog">
			<button>Close</button>
			<textarea aria-label="details" value={text} onChange={(e) => setText(e.target.value)} />
		</div>
	);
}

describe('useModalA11y', () => {
	it('lets the user type a whole sentence without losing focus', async () => {
		const user = userEvent.setup();
		render(<Modal />);
		const box = screen.getByLabelText('details');
		const sentence = 'He asked me to send money before showing me the house';

		await user.click(box);
		await user.keyboard(sentence);

		expect(box).toHaveValue(sentence);
		expect(document.activeElement).toBe(box);
	});

	it('still closes on Escape', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<Modal onClose={onClose} />);
		await user.keyboard('{Escape}');
		expect(onClose).toHaveBeenCalled();
	});

	it('moves focus into the dialog when it opens', () => {
		render(<Modal />);
		expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
	});
});
