import { Wallet, ShieldCheck, Info } from 'lucide-react';
import { naira } from '../../utils/price';

const ROWS = [
	{ key: 'rent', label: (c) => `Rent — ${c.months} month${c.months === 1 ? '' : 's'}` },
	{ key: 'cautionDeposit', label: () => 'Caution deposit', note: 'refundable' },
	{ key: 'agentFee', label: () => 'Agent fee' },
	{ key: 'legalFee', label: () => 'Legal / agreement fee' },
];

/**
 * Everything the student will actually pay, before they commit.
 *
 * Nigerian lettings routinely add 30–50% on top of the rent in caution, agent
 * and legal fees, and students traditionally discover this at the door. Showing
 * the true total up front is the point.
 */
export default function CostBreakdown({ cost, showSplit = false }) {
	if (!cost) return null;

	const rows = ROWS.map((r) => ({ ...r, amount: cost[r.key] || 0 })).filter((r) => r.amount > 0);

	return (
		<div className="rounded-2xl border border-primary/15 bg-surface p-5">
			<p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary-ink">
				<Wallet className="h-3.5 w-3.5" /> What you'll pay
			</p>

			<div className="space-y-2 text-sm">
				{rows.map((r) => (
					<div key={r.key} className="flex items-center justify-between gap-3">
						<span className="text-muted">
							{r.label(cost)}
							{r.note && (
								<span className="ml-1.5 rounded-full bg-success/12 px-1.5 py-0.5 text-[10px] font-bold text-success-ink">
									{r.note}
								</span>
							)}
						</span>
						<span className="shrink-0 font-semibold tabular-nums text-text">{naira(r.amount)}</span>
					</div>
				))}
			</div>

			<div className="mt-3 flex items-center justify-between border-t border-primary/10 pt-3">
				<span className="font-bold text-text">Total to move in</span>
				<span className="font-serif text-2xl font-bold tabular-nums text-primary-ink">{naira(cost.total)}</span>
			</div>

			{cost.refundableAtEnd > 0 && (
				<p className="mt-2 text-xs text-muted">
					<span className="font-bold text-ink">{naira(cost.refundableAtEnd)}</span> of this is a caution
					deposit and comes back to you at the end of the tenancy.
				</p>
			)}

			<p className="mt-3 flex items-start gap-2 rounded-xl bg-success/8 p-3 text-xs text-text">
				<ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" />
				<span>
					Your money is <span className="font-bold">held by NestFinder</span>, not sent to the landlord.
					It's only released once you confirm you've moved in — so if the room isn't what was advertised,
					you aren't left chasing a stranger for a refund.
				</span>
			</p>

			{/* Landlord/admin view of where the money goes. Students don't need it. */}
			{showSplit && cost.landlordShare !== undefined && (
				<div className="mt-4 border-t border-primary/10 pt-3">
					<p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted">
						<Info className="h-3.5 w-3.5" /> How it divides
					</p>
					<div className="space-y-1.5 text-sm">
						<Split label={`Landlord (${Math.round((cost.splitRates?.landlord ?? 0.7) * 100)}%)`} amount={cost.landlordShare} strong />
						<Split label={`Service charge (${Math.round((cost.splitRates?.service ?? 0.05) * 100)}%)`} amount={cost.serviceFee} />
						<Split label={`NestFinder (${Math.round((cost.splitRates?.platform ?? 0.25) * 100)}%)`} amount={cost.platformShare} />
						{cost.cautionDeposit > 0 && (
							<Split label="Caution deposit — held for the student" amount={cost.cautionDeposit} />
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function Split({ label, amount, strong = false }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<span className="text-muted">{label}</span>
			<span className={`shrink-0 tabular-nums ${strong ? 'font-bold text-ink' : 'font-semibold text-text'}`}>
				{naira(amount)}
			</span>
		</div>
	);
}
