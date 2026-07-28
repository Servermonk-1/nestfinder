/**
 * Animation & Component Library Index
 * Central export for all premium animations and components
 */

// Text Animations
export {
	BlurText,
	DecryptedText,
	ScrambledText,
} from './TextAnimations';

// Motion Animations
export {
	OrbitImages,
	Antigravity,
	LaserFlow,
	Crosshair,
} from './MotionAnimations';

// Background Animations
export {
	HyperSpeed,
	RippleGrid,
	AnimatedBackground,
} from './BackgroundAnimations';

// Glass Components
export {
	GlassCard,
	GlassIcons,
	BubbleMenu,
	GlassButton,
	GlassBadge,
} from './GlassComponents';

/**
 * Usage Examples:
 * 
 * // Text Animations
 * <BlurText text="Welcome to NestFinder" duration={1} blur={15} />
 * <DecryptedText text="Find Your Perfect Home" speed={50} />
 * <ScrambledText text="Best Accommodation" duration={1.5} />
 * 
 * // Motion Animations
 * <OrbitImages images={[img1, img2, img3]} radius={150} duration={20} />
 * <Antigravity duration={3} distance={50}><Card /></Antigravity>
 * <LaserFlow duration={2} pathD="M0 150 Q250 0, 500 150" />
 * <Crosshair size={120} color="#ff006e"><YourContent /></Crosshair>
 * 
 * // Backgrounds
 * <HyperSpeed starCount={150} speed={50} className="absolute inset-0" />
 * <RippleGrid cellSize={50} duration={2} className="absolute inset-0" />
 * <AnimatedBackground type="hyperspeed" />
 * 
 * // Glass Components
 * <GlassCard className="p-8">Content</GlassCard>
 * <GlassIcons icons={[{icon: HomeIcon, label: 'Home', onClick: fn}]} />
 * <BubbleMenu icon={MenuIcon} items={menuItems} />
 * <GlassButton>Click Me</GlassButton>
 * <GlassBadge icon={StarIcon}>Verified</GlassBadge>
 */
