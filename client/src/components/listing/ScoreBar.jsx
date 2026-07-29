import { motion } from 'framer-motion';

const BAR_COLOR = (value) => (value >= 80 ? 'bg-success' : value >= 60 ? 'bg-primary' : value >= 40 ? 'bg-highlight' : 'bg-danger');

export default function ScoreBar({ label, value }) {
	return (
		<div>
			<div className="mb-1.5 flex items-center justify-between text-sm">
				<span className="font-medium text-muted">{label}</span>
				<span className="font-bold text-text">{value}%</span>
			</div>
			<div className="h-3 w-full overflow-hidden rounded-full bg-paper/70 ring-1 ring-inset ring-white/5">
				<motion.div
					initial={{ width: 0 }}
					whileInView={{ width: `${value}%` }}
					viewport={{ once: true }}
					transition={{ duration: 1, ease: 'easeOut' }}
					className={`h-full rounded-full ${BAR_COLOR(value)}`}
				/>
			</div>
		</div>
	);
}
