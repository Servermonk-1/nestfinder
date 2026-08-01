import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import BrandMark from '../components/common/Logo';

export default function NotFound() {
	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper p-4 text-text">
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				<div className="absolute inset-0 bg-grid opacity-60" />
				<div className="absolute -left-40 -top-32 h-[26rem] w-[26rem] rounded-full bg-primary/20 blur-[120px] animate-aurora" />
				<div className="absolute -right-40 bottom-0 h-[24rem] w-[24rem] rounded-full bg-highlight/20 blur-[120px] animate-float-slow" />
			</div>

			<motion.div
				initial={{ opacity: 0, y: 16 }}
				animate={{ opacity: 1, y: 0 }}
				className="relative text-center"
			>
				<Link to="/" className="mb-8 inline-flex items-center gap-2.5">
					<BrandMark size={38} className="text-primary" />
					<span className="font-serif text-xl font-extrabold text-text">NestFinder</span>
				</Link>

				<p className="font-serif text-[7rem] font-extrabold leading-none text-gradient sm:text-[9rem]">404</p>
				<h1 className="mt-1 font-serif text-3xl font-extrabold">Page not found</h1>
				<p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
					The page you're looking for doesn't exist or may have moved. Let's get you back on track.
				</p>

				<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
					<Link
						to="/"
						className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
					>
						<ArrowLeft className="h-4 w-4" /> Back home
					</Link>
				</div>
			</motion.div>
		</div>
	);
}
