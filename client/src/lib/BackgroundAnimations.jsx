import React from 'react';
import { motion } from 'framer-motion';

/**
 * HyperSpeed - Starfield traveling effect
 * Creates illusion of traveling through space
 */
export function HyperSpeed({
	speed = 50,
	starCount = 100,
	className = '',
}) {
	const stars = React.useMemo(() =>
		Array.from({ length: starCount }).map(() => ({
			x: Math.random() * 100,
			y: Math.random() * 100,
			size: Math.random() * 2 + 0.5,
			duration: Math.random() * 3 + 2,
			delay: Math.random() * 0.5,
		})), [starCount]
	);

	return (
		<div className={`absolute inset-0 overflow-hidden ${className}`}>
			{/* Background gradient */}
			<div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-blue-950/20 to-gray-950" />

			{/* Stars */}
			{stars.map((star, i) => (
				<motion.div
					key={i}
					className="absolute rounded-full bg-surface"
					style={{
						left: `${star.x}%`,
						top: `${star.y}%`,
						width: `${star.size}px`,
						height: `${star.size}px`,
						boxShadow: `0 0 ${star.size * 2}px rgba(255, 255, 255, 0.8)`,
					}}
					animate={{
						y: ['0%', '100%'],
						opacity: [0, 1, 0],
					}}
					transition={{
						duration: star.duration,
						delay: star.delay,
						repeat: Infinity,
						ease: 'linear',
					}}
				/>
			))}

			{/* Additional trailing effect */}
			<motion.div
				className="absolute inset-0"
				style={{
					background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.3) 100%)',
				}}
				animate={{
					opacity: [0.3, 0.5, 0.3],
				}}
				transition={{
					duration: 4,
					repeat: Infinity,
					ease: 'easeInOut',
				}}
			/>
		</div>
	);
}

/**
 * RippleGrid - Water ripple grid background
 * Creates rippling water effect with grid pattern
 */
export function RippleGrid({
	cellSize = 50,
	duration = 2,
	amplitude = 10,
	className = '',
}) {
	const cols = Math.ceil(typeof window !== 'undefined' ? window.innerWidth / cellSize : 20);
	const rows = Math.ceil(typeof window !== 'undefined' ? window.innerHeight / cellSize : 12);

	const handleMouseMove = (e) => {
		const cells = document.querySelectorAll('[data-ripple-cell]');
		const rect = e.currentTarget.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;

		cells.forEach((cell) => {
			const cellRect = cell.getBoundingClientRect();
			const cellX = cellRect.left - rect.left + cellSize / 2;
			const cellY = cellRect.top - rect.top + cellSize / 2;

			const distance = Math.sqrt((x - cellX) ** 2 + (y - cellY) ** 2);
			const delay = distance / 100;

			cell.style.animation = `ripple ${duration}s ease-out ${delay}s forwards`;
		});
	};

	return (
		<div
			className={`absolute inset-0 overflow-hidden ${className}`}
			onMouseMove={handleMouseMove}
			style={{
				background: 'rgba(0, 10, 30, 0.5)',
			}}
		>
			{/* Grid pattern */}
			<svg
				width="100%"
				height="100%"
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					opacity: 0.1,
				}}
			>
				{/* Vertical lines */}
				{Array.from({ length: cols }).map((_, i) => (
					<line
						key={`v-${i}`}
						x1={i * cellSize}
						y1="0"
						x2={i * cellSize}
						y2="100%"
						stroke="rgba(255, 255, 255, 0.2)"
						strokeWidth="1"
					/>
				))}
				{/* Horizontal lines */}
				{Array.from({ length: rows }).map((_, i) => (
					<line
						key={`h-${i}`}
						x1="0"
						y1={i * cellSize}
						x2="100%"
						y2={i * cellSize}
						stroke="rgba(255, 255, 255, 0.2)"
						strokeWidth="1"
					/>
				))}
			</svg>

			{/* Ripple cells */}
			{Array.from({ length: rows * cols }).map((_, i) => {
				const x = (i % cols) * cellSize;
				const y = Math.floor(i / cols) * cellSize;

				return (
					<motion.div
						key={i}
						data-ripple-cell
						className="absolute"
						style={{
							left: x,
							top: y,
							width: cellSize,
							height: cellSize,
							border: '1px solid rgba(0, 212, 255, 0.2)',
						}}
						whileHover={{
							boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
							borderColor: 'rgba(0, 212, 255, 0.6)',
						}}
						transition={{ duration: 0.3 }}
					/>
				);
			})}

			{/* Gradient overlay */}
			<div
				className="absolute inset-0"
				style={{
					background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.4) 100%)',
					pointerEvents: 'none',
				}}
			/>

			<style>{`
				@keyframes ripple {
					0% {
						transform: scale(1);
						opacity: 1;
						box-shadow: 0 0 0 0 rgba(0, 212, 255, 0.4);
					}
					100% {
						transform: scale(1.5);
						opacity: 0;
						box-shadow: 0 0 20px 0 rgba(0, 212, 255, 0);
					}
				}
			`}</style>
		</div>
	);
}

/**
 * AnimatedBackground - Combination background with gradient and particles
 */
export function AnimatedBackground({
	type = 'gradient',
	className = '',
}) {
	if (type === 'hyperspeed') {
		return <HyperSpeed className={className} />;
	}

	if (type === 'ripple') {
		return <RippleGrid className={className} />;
	}

	return (
		<div className={`absolute inset-0 ${className}`}>
			<div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/10 to-purple-950/20" />
		</div>
	);
}

export default {
	HyperSpeed,
	RippleGrid,
	AnimatedBackground,
};

