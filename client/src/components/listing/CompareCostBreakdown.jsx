import { Wallet, Briefcase } from 'lucide-react';
import { estimateMonthlyCost } from '../../utils/costEstimate';
import { distanceToPlacement, estimateCommute } from '../../utils/commute';

const ROWS = [
	{ key: 'rent', label: 'Rent' },
	{ key: 'electricity', label: 'Electricity' },
	{ key: 'water', label: 'Water' },
	{ key: 'internet', label: 'Internet' },
];

export default function CompareCostBreakdown({ listing, placementCompany = null }) {
	const cost = estimateMonthlyCost(listing);

	// Transport is the one line that genuinely differs between two rooms, so
	// when the placement is known it must be priced per room — comparing a flat
	// figure across all of them hides the very difference being compared.
	const commute = estimateCommute(distanceToPlacement(listing, placementCompany));
	const transport = commute ? commute.monthlyCost : cost.transport;
	const total = cost.total - cost.transport + transport;

	return (
		<div className="rounded-xl border border-primary/10 bg-surface-alt/50 p-4">
			<p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary-ink">
				<Wallet className="h-3.5 w-3.5" /> Monthly Cost Estimate
			</p>
			<div className="space-y-1.5 text-xs">
				{ROWS.map(({ key, label }) => (
					<div key={key} className="flex items-center justify-between text-muted">
						<span>{label}</span>
						<span className="text-text">₦{cost[key].toLocaleString()}</span>
					</div>
				))}
				<div className="flex items-center justify-between text-muted">
					<span className="flex items-center gap-1">
						Transport
						{commute && <Briefcase className="h-3 w-3 text-primary-ink" />}
					</span>
					<span className="text-text">₦{transport.toLocaleString()}</span>
				</div>
			</div>

			{commute && (
				<p className="mt-2 rounded-lg bg-primary/8 px-2 py-1.5 text-[12px] font-bold text-primary-ink">
					~{commute.minutes} min to {placementCompany?.name} · {commute.roadKm}km by road
				</p>
			)}

			<div className="mt-2 flex items-center justify-between border-t border-primary/10 pt-2">
				<span className="text-xs font-bold text-text">Total</span>
				<span className="font-serif text-sm font-bold text-primary-ink">₦{total.toLocaleString()}</span>
			</div>
			<p className="mt-2 text-[12px] leading-relaxed text-muted/70">
				{commute
					? 'Estimate only — electricity, water and internet vary by usage. Transport is priced from your SIWES placement.'
					: 'Estimate only — electricity, water, and internet vary by usage; transport depends on your training placement.'}
			</p>
		</div>
	);
}
