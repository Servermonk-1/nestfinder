import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * GlassCard - Glassmorphic card component
 * Reusable glass-effect container
 */
export function GlassCard({
	children,
	className = '',
	hover = true,
	...props
}) {
	return (
		<motion.div
			className={`
				relative backdrop-blur-xl bg-surface/10 border border-[#8B95A1]/20
				rounded-2xl p-6 overflow-hidden
				transition-all duration-300
				${hover ? 'hover:bg-surface/15 hover:border-white/30' : ''}
				${className}
			`}
			whileHover={hover ? { y: -4, boxShadow: '0 20px 40px rgba(0, 212, 255, 0.1)' } : {}}
			{...props}
		>
			{/* Glass shine effect */}
			<div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />
			<div className="relative z-10">
				{children}
			</div>
		</motion.div>
	);
}

/**
 * GlassIcons - Glassmorphic icon display component
 * Icons in glass containers with hover effects
 */
export function GlassIcons({
	icons = [],
	size = 'md',
	className = '',
}) {
	const sizeMap = {
		sm: { container: 'w-12 h-12', icon: 'w-6 h-6' },
		md: { container: 'w-16 h-16', icon: 'w-8 h-8' },
		lg: { container: 'w-20 h-20', icon: 'w-10 h-10' },
	};

	const sizes = sizeMap[size] || sizeMap.md;

	return (
		<div className={`flex gap-4 flex-wrap ${className}`}>
			{icons.map((item, i) => {
				const Icon = item.icon;
				return (
					<motion.div
						key={i}
						className={`
							relative backdrop-blur-xl bg-surface/10 border border-[#8B95A1]/20
							rounded-2xl flex items-center justify-center
							cursor-pointer group
							${sizes.container}
						`}
						whileHover={{
							backgroundColor: 'rgba(255, 255, 255, 0.15)',
							borderColor: 'rgba(255, 255, 255, 0.3)',
							scale: 1.05,
						}}
						whileTap={{ scale: 0.95 }}
						transition={{ type: 'spring', stiffness: 400, damping: 15 }}
						onClick={item.onClick}
						title={item.label}
					>
						{/* Glow effect on hover */}
						<motion.div
							className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/0 to-pink-600/0 group-hover:from-cyan-400/20 group-hover:to-pink-600/20 blur-xl transition-all"
							initial={{ opacity: 0 }}
							whileHover={{ opacity: 1 }}
						/>

						{/* Icon */}
						<Icon className={`${sizes.icon} text-white relative z-10`} />
					</motion.div>
				);
			})}
		</div>
	);
}

/**
 * BubbleMenu - Floating bubble menu with animated items
 * Items appear in bubbles around main button
 */
export function BubbleMenu({
	icon: MainIcon,
	items = [],
	color = 'from-cyan-400 to-pink-600',
}) {
	const [isOpen, setIsOpen] = useState(false);
	const itemCount = items.length;
	const radius = 100;

	const angleSlice = (360 / itemCount) * (Math.PI / 180);

	return (
		<div className="fixed bottom-8 right-8 w-24 h-24">
			{/* Menu items */}
			<AnimatePresence>
				{isOpen && items.map((item, i) => {
					const angle = i * angleSlice;
					const x = Math.cos(angle) * radius;
					const y = Math.sin(angle) * radius;
					const Icon = item.icon;

					return (
						<motion.button
							key={i}
							className="absolute w-12 h-12 rounded-full bg-gradient-to-r backdrop-blur-xl border border-[#8B95A1]/20 flex items-center justify-center"
							style={{
								background: `linear-gradient(135deg, rgba(0, 212, 255, 0.2), rgba(255, 0, 110, 0.2))`,
							}}
							initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
							animate={{ x, y, scale: 1, opacity: 1 }}
							exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
							transition={{
								type: 'spring',
								stiffness: 200,
								damping: 20,
								delay: i * 0.05,
							}}
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => {
								item.onClick?.();
								setIsOpen(false);
							}}
							title={item.label}
						>
							<Icon className="w-5 h-5 text-white" />
						</motion.button>
					);
				})}
			</AnimatePresence>

			{/* Main button */}
			<motion.button
				className={`absolute bottom-0 right-0 w-16 h-16 rounded-full bg-gradient-to-r ${color} shadow-2xl flex items-center justify-center text-white font-bold text-xl`}
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.95 }}
				onClick={() => setIsOpen(!isOpen)}
			>
				<AnimatePresence mode="wait">
					{isOpen ? (
						<motion.div
							key="close"
							initial={{ rotate: -180, opacity: 0 }}
							animate={{ rotate: 0, opacity: 1 }}
							exit={{ rotate: 180, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							<X className="w-6 h-6" />
						</motion.div>
					) : (
						<motion.div
							key="menu"
							initial={{ rotate: 180, opacity: 0 }}
							animate={{ rotate: 0, opacity: 1 }}
							exit={{ rotate: -180, opacity: 0 }}
							transition={{ duration: 0.2 }}
						>
							{MainIcon ? <MainIcon className="w-6 h-6" /> : '☰'}
						</motion.div>
					)}
				</AnimatePresence>
			</motion.button>
		</div>
	);
}

/**
 * GlassButton - Glassmorphic button component
 */
export function GlassButton({
	children,
	className = '',
	size = 'md',
	...props
}) {
	const sizeClasses = {
		sm: 'px-3 py-1.5 text-sm',
		md: 'px-6 py-2.5 text-base',
		lg: 'px-8 py-3.5 text-lg',
	};

	return (
		<motion.button
			className={`
				backdrop-blur-xl bg-surface/10 border border-[#8B95A1]/20
				rounded-xl text-white font-semibold
				hover:bg-surface/15 hover:border-white/30
				transition-all duration-300
				${sizeClasses[size] || sizeClasses.md}
				${className}
			`}
			whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(0, 212, 255, 0.2)' }}
			whileTap={{ scale: 0.95 }}
			{...props}
		>
			{children}
		</motion.button>
	);
}

/**
 * GlassBadge - Glassmorphic badge component
 */
export function GlassBadge({
	children,
	className = '',
	icon: Icon = null,
}) {
	return (
		<span className={`
			inline-flex items-center gap-2
			backdrop-blur-xl bg-surface/10 border border-[#8B95A1]/20
			rounded-full px-3 py-1
			text-xs font-semibold text-white
			${className}
		`}>
			{Icon && <Icon className="w-3 h-3" />}
			{children}
		</span>
	);
}

export default {
	GlassCard,
	GlassIcons,
	BubbleMenu,
	GlassButton,
	GlassBadge,
};

