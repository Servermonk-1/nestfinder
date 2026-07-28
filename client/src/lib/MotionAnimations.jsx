import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * OrbitImages - Images orbiting around a center point
 * Creates a circular carousel effect
 */
export function OrbitImages({
	images = [],
	radius = 150,
	duration = 20,
	size = 80,
	centerContent = null,
}) {
	const count = images.length;
	const angleSlice = (360 / count) * (Math.PI / 180);

	return (
		<div className="relative" style={{ width: radius * 2 + size, height: radius * 2 + size }}>
			{/* Center content */}
			{centerContent && (
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
					{centerContent}
				</div>
			)}

			{/* Orbiting images */}
			{images.map((image, i) => {
				const angle = i * angleSlice;
				const x = Math.cos(angle) * radius;
				const y = Math.sin(angle) * radius;

				return (
					<motion.div
						key={i}
						animate={{ rotate: 360 }}
						transition={{ duration, repeat: Infinity, ease: 'linear' }}
						style={{
							position: 'absolute',
							left: '50%',
							top: '50%',
							width: size,
							height: size,
							marginLeft: -size / 2,
							marginTop: -size / 2,
						}}
					>
						<motion.img
							src={image}
							alt={`orbit-${i}`}
							className="w-full h-full object-cover rounded-full"
							initial={{ x, y, rotate: -360 }}
							animate={{ x, y, rotate: 0 }}
							transition={{ duration: 1, type: 'spring' }}
						/>
					</motion.div>
				);
			})}
		</div>
	);
}

/**
 * Antigravity - Objects floating and bouncing with gravity effects
 * Creates floating animation with gentle bounce
 */
export function Antigravity({
	children,
	duration = 4,
	delay = 0,
	distance = 50,
	className = '',
}) {
	return (
		<motion.div
			className={className}
			animate={{
				y: [0, -distance, 0],
				x: [0, 15, 0],
			}}
			transition={{
				duration,
				delay,
				repeat: Infinity,
				ease: 'easeInOut',
			}}
		>
			{children}
		</motion.div>
	);
}

/**
 * LaserFlow - Animated lines flowing along paths
 * Uses SVG and stroke-dasharray for effect
 */
export function LaserFlow({
	width = 500,
	height = 300,
	color = '#00d4ff',
	duration = 3,
	pathD = 'M 0 150 Q 125 0, 250 150 T 500 150',
}) {
	return (
		<svg width={width} height={height} className="w-full">
			{/* Background path */}
			<path
				d={pathD}
				fill="none"
				stroke={color}
				strokeWidth="2"
				opacity="0.2"
			/>

			{/* Animated laser */}
			<motion.path
				d={pathD}
				fill="none"
				stroke={color}
				strokeWidth="3"
				strokeLinecap="round"
				initial={{ pathLength: 0, opacity: 0 }}
				animate={{ pathLength: 1, opacity: 1 }}
				transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
			/>

			{/* Glowing effect */}
			<motion.path
				d={pathD}
				fill="none"
				stroke={color}
				strokeWidth="8"
				opacity="0.2"
				filter="url(#glow)"
				initial={{ pathLength: 0 }}
				animate={{ pathLength: 1 }}
				transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
			/>

			{/* Glow filter */}
			<defs>
				<filter id="glow">
					<feGaussianBlur stdDeviation="3" result="coloredBlur" />
					<feMerge>
						<feMergeNode in="coloredBlur" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
		</svg>
	);
}

/**
 * Crosshair - Animated crosshair/target animation
 * Useful for CTAs or highlights
 */
export function Crosshair({
	size = 100,
	color = '#ff006e',
	className = '',
	children = null,
}) {
	return (
		<div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
			{/* Center dot */}
			<motion.div
				className="absolute w-3 h-3 rounded-full bg-gradient-to-r from-cyan-400 to-pink-600"
				animate={{ scale: [1, 1.2, 1] }}
				transition={{ duration: 2, repeat: Infinity }}
			/>

			{/* Outer ring */}
			<motion.div
				className="absolute border-2 rounded-full"
				style={{ borderColor: color, width: size * 0.6, height: size * 0.6 }}
				animate={{ rotate: 360, opacity: [1, 0.5, 1] }}
				transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
			/>

			{/* Inner ring */}
			<motion.div
				className="absolute border rounded-full"
				style={{ borderColor: color, width: size * 0.3, height: size * 0.3 }}
				animate={{ rotate: -360, scale: [1, 0.8, 1] }}
				transition={{ duration: 2, repeat: Infinity }}
			/>

			{/* Crosshair lines */}
			<motion.div
				className="absolute"
				style={{
					width: size,
					height: '1px',
					background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
				}}
				animate={{ opacity: [0.5, 1, 0.5] }}
				transition={{ duration: 2, repeat: Infinity }}
			/>
			<motion.div
				className="absolute"
				style={{
					width: '1px',
					height: size,
					background: `linear-gradient(180deg, transparent, ${color}, transparent)`,
				}}
				animate={{ opacity: [0.5, 1, 0.5] }}
				transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
			/>

			{/* Content in center */}
			{children && (
				<div className="absolute z-10">
					{children}
				</div>
			)}
		</div>
	);
}

export default {
	OrbitImages,
	Antigravity,
	LaserFlow,
	Crosshair,
};
