import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * BlurText - Animated blur text reveal effect
 * Text starts blurred and sharpens on enter
 */
export function BlurText({
	text,
	className = '',
	delay = 0,
	duration = 0.8,
	blur = 10,
}) {
	return (
		<motion.div
			initial={{ filter: `blur(${blur}px)`, opacity: 0 }}
			animate={{ filter: 'blur(0px)', opacity: 1 }}
			transition={{ delay, duration, ease: 'easeOut' }}
			className={className}
		>
			{text}
		</motion.div>
	);
}

/**
 * DecryptedText - Text appears to "decrypt" from random characters
 * Creates a hacking/revelation effect
 */
export function DecryptedText({
	text = 'Decrypting text...',
	speed = 45,
	maxIterations = 16,
	characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
	className = '',
	encryptedClassName = '',
	replayOnView = true,
}) {
	const ref = useRef(null);
	const isInView = useInView(ref, { amount: 0.65 });
	const shouldAnimate = !replayOnView || isInView;

	const createEncryptedDisplay = useCallback(() => text.split('').map((char) => ({
		char: char === ' ' ? ' ' : characters[Math.floor(Math.random() * characters.length)],
		isRevealed: char === ' ',
	})), [text, characters]);

	const [displayText, setDisplayText] = useState(() => createEncryptedDisplay());
	const [iteration, setIteration] = useState(0);

	useEffect(() => {
		setDisplayText(createEncryptedDisplay());
		setIteration(0);
	}, [createEncryptedDisplay]);

	useEffect(() => {
		if (!replayOnView || !isInView) return;

		setDisplayText(createEncryptedDisplay());
		setIteration(0);
	}, [createEncryptedDisplay, isInView, replayOnView]);

	useEffect(() => {
		if (!shouldAnimate) return undefined;
		if (iteration >= maxIterations + text.length) return undefined;

		const interval = setInterval(() => {
			setDisplayText((currentDisplay) => currentDisplay.map((item, idx) => {
				if (text[idx] === ' ') return { char: ' ', isRevealed: true };
				if (iteration >= maxIterations + text.length - 1 || idx <= iteration - maxIterations) {
					return { char: text[idx], isRevealed: true };
				}

				return {
					char: characters[Math.floor(Math.random() * characters.length)],
					isRevealed: item.isRevealed,
				};
			}));
			setIteration((currentIteration) => currentIteration + 1);
		}, speed);

		return () => clearInterval(interval);
	}, [characters, iteration, maxIterations, shouldAnimate, speed, text]);

	return (
		<span ref={ref} className={className} aria-label={text}>
			{displayText.map((item, i) => (
				<motion.span
					key={`${text}-${i}`}
					aria-hidden="true"
					animate={{ opacity: item.isRevealed ? 1 : 0.48 }}
					transition={{ duration: 0.18 }}
					className={item.isRevealed ? '' : encryptedClassName}
				>
					{item.char}
				</motion.span>
			))}
		</span>
	);
}

/**
 * LegacyDecryptedText - older decrypt effect retained for compatibility notes.
 */
export function LegacyDecryptedText({
	text = 'Decrypting text...',
	speed = 50,
	maxIterations = 10,
	className = '',
}) {
	const characters = '!@#$%^&*()_+-=[]{}|;:,.<>?';
	const [displayText, setDisplayText] = useState(text.split('').map(() => ({
		char: '',
		isRevealed: false,
	})));
	const [iteration, setIteration] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setIteration(i => {
				if (i >= maxIterations + text.length) return i;

				const newDisplay = displayText.map((item, idx) => {
					const charIndex = i - (text.length - idx);
					if (charIndex < 0) {
						return {
							char: characters[Math.floor(Math.random() * characters.length)],
							isRevealed: false,
						};
					} else if (charIndex === 0) {
						return {
							char: text[idx],
							isRevealed: true,
						};
					} else {
						return item;
					}
				});
				setDisplayText(newDisplay);
				return i + 1;
			});
		}, speed);

		return () => clearInterval(interval);
	}, []);

	return (
		<span className={className}>
			{displayText.map((item, i) => (
				<motion.span
					key={i}
					animate={{ opacity: item.isRevealed ? 1 : 0.5 }}
					className={item.isRevealed ? '' : 'text-muted'}
				>
					{item.char}
				</motion.span>
			))}
		</span>
	);
}

/**
 * ScrambledText - Text letters are scrambled and unscramble on enter
 * Creates a wave-like reveal effect
 */
export function ScrambledText({
	text = 'Unscrambling text',
	duration = 1,
	delay = 0,
	stagger = 0.05,
	className = '',
}) {
	const letters = text.split('');

	const variants = {
		hidden: { opacity: 0, y: 10 },
		visible: (i) => ({
			opacity: 1,
			y: 0,
			transition: {
				delay: delay + i * stagger,
				duration: duration * 0.5,
			},
		}),
	};

	return (
		<div className={className}>
			{letters.map((letter, i) => (
				<motion.span
					key={i}
					initial="hidden"
					animate="visible"
					variants={variants}
					custom={i}
					className="inline-block"
				>
					{letter === ' ' ? '\u00A0' : letter}
				</motion.span>
			))}
		</div>
	);
}

export default {
	BlurText,
	DecryptedText,
	ScrambledText,
};

