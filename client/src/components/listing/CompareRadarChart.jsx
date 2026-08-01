import {
	Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
	ResponsiveContainer,
} from 'recharts';
import { getDimensionScores } from '../../utils/compareScore';

const SERIES_COLORS = ['#2A6F97', '#D9A441', '#0A8046'];
const GRID_COLOR = 'rgba(85, 103, 125, 0.22)';
const AXIS_COLOR = '#55677D';

const AXES = [
	{ key: 'affordability', label: 'Affordability' },
	{ key: 'amenities', label: 'Amenities' },
	{ key: 'security', label: 'Security' },
	{ key: 'trust', label: 'Trust' },
	{ key: 'availability', label: 'Availability' },
];

export default function CompareRadarChart({ listings }) {
	if (listings.length < 2) return null;

	const perListing = listings.map((listing, i) => {
		const d = getDimensionScores(listing, listings);
		const values = {
			affordability: Math.round(d.priceScore),
			amenities: Math.round(d.amenityScore),
			security: Math.round(d.securityScore),
			trust: Math.round(d.trustScore),
			availability: Math.round(d.availabilityScore),
		};
		return {
			title: listing.title,
			color: SERIES_COLORS[i % SERIES_COLORS.length],
			data: AXES.map(({ key, label }) => ({ axis: label, value: values[key] })),
			values,
		};
	});

	return (
		<div className="hidden rounded-2xl border border-primary/15 bg-surface p-6 md:block">
			<p className="mb-1 text-xs font-bold uppercase tracking-widest text-primary-ink">At a Glance</p>
			<h2 className="mb-5 font-serif text-xl font-bold text-text">How they stack up</h2>

			<div className={`grid gap-6 ${perListing.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
				{perListing.map((l) => (
					<div key={l.title} className="rounded-xl border border-primary/10 bg-surface-alt/40 p-4">
						<p className="mb-2 truncate text-center text-xs font-bold" style={{ color: l.color }}>{l.title}</p>
						<div className="h-52 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<RadarChart data={l.data} outerRadius="68%">
									<PolarGrid stroke={GRID_COLOR} />
									<PolarAngleAxis dataKey="axis" tick={{ fill: AXIS_COLOR, fontSize: 10 }} />
									<PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
									<Radar
										dataKey="value"
										stroke={l.color}
										fill={l.color}
										fillOpacity={0.35}
										strokeWidth={2}
										isAnimationActive
										animationDuration={800}
									/>
								</RadarChart>
							</ResponsiveContainer>
						</div>
						<div className="mt-2 grid grid-cols-5 gap-1 text-center">
							{AXES.map(({ key, label }) => (
								<div key={key}>
									<p className="text-[11px] uppercase text-muted">{label.slice(0, 4)}</p>
									<p className="text-xs font-bold text-text">{l.values[key]}</p>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
