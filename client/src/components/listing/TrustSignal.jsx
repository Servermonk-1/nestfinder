import { ShieldCheck, ShieldAlert, Info } from 'lucide-react';
import HelpTip from '../common/HelpTip';

/**
 * The student-facing face of Fraud Shield.
 *
 * Students see a POSITIVE trust signal about the landlord — never the internal
 * fraud score of a listing. Two reasons: a raw "fraud score" would alarm people
 * about listings a human hasn't reviewed yet, and publishing the detection
 * thresholds would tell scammers exactly what to avoid. If a listing is bad
 * enough, it gets flagged and pulled by an admin instead.
 */

const BANDS = [
	{ min: 75, label: 'Highly trusted', tone: 'success', blurb: 'Identity verified, established on NestFinder, and no safety issues on record.' },
	{ min: 55, label: 'Trusted', tone: 'success', blurb: 'Identity verified with a clean record so far.' },
	{ min: 35, label: 'Newer landlord', tone: 'muted', blurb: 'Nothing wrong on record — just not much history yet. View in person before paying.' },
	{ min: 0, label: 'Use extra caution', tone: 'warn', blurb: 'Limited verification or past issues on record. Always view in person and never pay upfront.' },
];

const TONES = {
	success: { pill: 'border-success/30 bg-success/10 text-success-ink', bar: 'bg-success', Icon: ShieldCheck },
	muted: { pill: 'border-line bg-surface-alt text-muted', bar: 'bg-muted', Icon: Info },
	warn: { pill: 'border-highlight/40 bg-highlight/15 text-highlight-ink', bar: 'bg-highlight', Icon: ShieldAlert },
};

export default function TrustSignal({ score, verified }) {
	if (typeof score !== 'number') return null;
	const band = BANDS.find((b) => score >= b.min) || BANDS[BANDS.length - 1];
	const tone = TONES[band.tone];
	const { Icon } = tone;

	return (
		<div className="mt-4 rounded-xl border border-line bg-surface-alt/50 p-3.5">
			<div className="flex items-center justify-between gap-2">
				<span className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-muted">
					Landlord trust
					<HelpTip
						title="How trust is calculated"
						description="Based on identity verification, how long they've been on NestFinder, student reviews, and whether any of their listings have been flagged or reported. It is not a guarantee — always view a property in person before paying."
					/>
				</span>
				<span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px] font-bold ${tone.pill}`}>
					<Icon className="h-3 w-3" /> {band.label}
				</span>
			</div>

			<div className="mt-2 flex items-center gap-2">
				<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" role="img" aria-label={`Trust score ${score} out of 100`}>
					<div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${Math.max(4, score)}%` }} />
				</div>
				<span className="shrink-0 text-xs font-bold text-text">{score}<span className="text-muted">/100</span></span>
			</div>

			<p className="mt-2 text-[13px] leading-relaxed text-muted">{band.blurb}</p>

			{!verified && (
				<p className="mt-1.5 flex items-start gap-1.5 text-[13px] font-medium leading-relaxed text-highlight-ink">
					<ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
					This landlord hasn't completed identity verification.
				</p>
			)}
		</div>
	);
}
