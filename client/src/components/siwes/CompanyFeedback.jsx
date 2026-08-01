import { useState, useEffect, useCallback } from 'react';
import { Star, Loader2, Check, X, Pencil, Trash2, BadgeCheck, Info, Wallet, ThumbsUp } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const Stars = ({ value, onChange = null, size = 'h-4 w-4' }) => (
	<span className="inline-flex items-center gap-0.5">
		{[1, 2, 3, 4, 5].map((n) => {
			const filled = n <= value;
			const star = <Star className={`${size} ${filled ? 'fill-highlight text-highlight-ink' : 'text-muted/40'}`} />;
			return onChange ? (
				<button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
					{star}
				</button>
			) : (
				<span key={n}>{star}</span>
			);
		})}
	</span>
);

const Tri = ({ label, value, onChange, Icon }) => (
	<div className="flex flex-wrap items-center gap-2">
		<span className="flex items-center gap-1.5 text-sm text-muted">
			<Icon className="h-3.5 w-3.5 text-primary-ink" /> {label}
		</span>
		{[['Yes', true], ['No', false]].map(([text, v]) => (
			<button
				key={text}
				type="button"
				onClick={() => onChange(value === v ? null : v)}
				aria-pressed={value === v}
				className={`rounded-full px-3 py-1 text-xs font-bold transition ${
					value === v ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
				}`}
			>
				{text}
			</button>
		))}
	</div>
);

/**
 * What a placement was actually like, from students who did it.
 *
 * The directory can say a company takes Civil Engineering; only a past student
 * can say whether the training was real and whether they were paid. Writing is
 * gated on having genuinely had the placement — unverifiable claims attached to
 * a named employer would be worse than no reviews at all.
 */
export default function CompanyFeedback({ companyId, companyName }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [writing, setWriting] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({ rating: 0, comment: '', stipendPaid: null, wouldRecommend: null });

	const load = useCallback(() => {
		setLoading(true);
		api.get(`/companies/${companyId}/feedback`)
			.then(({ data }) => setData(data))
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	}, [companyId]);

	useEffect(load, [load]);

	const startEdit = () => {
		const m = data?.myFeedback;
		setForm(m
			? { rating: m.rating, comment: m.comment || '', stipendPaid: m.stipendPaid, wouldRecommend: m.wouldRecommend }
			: { rating: 0, comment: '', stipendPaid: null, wouldRecommend: null });
		setWriting(true);
	};

	const submit = async (e) => {
		e.preventDefault();
		if (!form.rating) return toast.error('Pick a rating from 1 to 5.');
		setSaving(true);
		try {
			if (data?.myFeedback) await api.patch(`/companies/feedback/${data.myFeedback._id}`, form);
			else await api.post(`/companies/${companyId}/feedback`, form);
			toast.success('Thanks — this helps the next student.');
			setWriting(false);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save your feedback');
		} finally {
			setSaving(false);
		}
	};

	const remove = async () => {
		if (!window.confirm('Delete your feedback about this placement?')) return;
		try {
			await api.delete(`/companies/feedback/${data.myFeedback._id}`);
			toast.success('Feedback removed');
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not remove');
		}
	};

	if (loading) {
		return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>;
	}
	if (!data) return null;

	const pct = (n, of) => (of ? Math.round((n / of) * 100) : 0);

	return (
		<div>
			<div className="mb-4 flex flex-wrap items-end justify-between gap-3">
				<h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-text">
					<Star className="h-5 w-5 text-primary-ink" /> What past students say
				</h2>
				{data.count > 0 && (
					<span className="flex items-center gap-2 text-sm text-muted">
						<Stars value={Math.round(data.average)} />
						<span className="font-bold text-ink">{data.average}</span> · {data.count} review{data.count === 1 ? '' : 's'}
					</span>
				)}
			</div>

			{/* Aggregates — the two questions students actually ask each other. */}
			{data.count > 0 && (data.stipendAnswered > 0 || data.recommendAnswered > 0) && (
				<div className="mb-5 grid gap-3 sm:grid-cols-2">
					{data.stipendAnswered > 0 && (
						<div className="rounded-xl border border-muted/15 bg-surface-alt/40 p-4">
							<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
								<Wallet className="h-3.5 w-3.5" /> Paid a stipend
							</p>
							<p className="mt-1 font-serif text-xl font-bold text-ink">
								{pct(data.stipendPaidCount, data.stipendAnswered)}%
								<span className="ml-1 text-sm font-normal text-muted">of {data.stipendAnswered} who answered</span>
							</p>
						</div>
					)}
					{data.recommendAnswered > 0 && (
						<div className="rounded-xl border border-muted/15 bg-surface-alt/40 p-4">
							<p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
								<ThumbsUp className="h-3.5 w-3.5" /> Would recommend
							</p>
							<p className="mt-1 font-serif text-xl font-bold text-ink">
								{pct(data.recommendCount, data.recommendAnswered)}%
								<span className="ml-1 text-sm font-normal text-muted">of {data.recommendAnswered} who answered</span>
							</p>
						</div>
					)}
				</div>
			)}

			{/* Write / edit */}
			{writing ? (
				<form onSubmit={submit} className="mb-5 space-y-4 rounded-2xl border border-primary/20 bg-surface p-5">
					<div>
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">Your rating</span>
						<Stars value={form.rating} onChange={(n) => setForm((s) => ({ ...s, rating: n }))} size="h-6 w-6" />
					</div>
					<Tri label="Were you paid a stipend?" Icon={Wallet} value={form.stipendPaid}
						onChange={(v) => setForm((s) => ({ ...s, stipendPaid: v }))} />
					<Tri label="Would you recommend it?" Icon={ThumbsUp} value={form.wouldRecommend}
						onChange={(v) => setForm((s) => ({ ...s, wouldRecommend: v }))} />
					<div>
						<label htmlFor="cf-comment" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
							What was the training actually like? <span className="font-normal normal-case">(optional)</span>
						</label>
						<textarea
							id="cf-comment"
							rows={3}
							maxLength={1000}
							value={form.comment}
							onChange={(e) => setForm((s) => ({ ...s, comment: e.target.value }))}
							placeholder="Did you get real work? Was your supervisor around? Anything the next student should know."
							className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
						/>
					</div>
					<div className="flex gap-2">
						<button type="submit" disabled={saving}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Post
						</button>
						<button type="button" onClick={() => setWriting(false)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted">
							<X className="h-4 w-4" /> Cancel
						</button>
					</div>
				</form>
			) : data.myFeedback ? (
				<div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span className="flex items-center gap-2">
							<Stars value={data.myFeedback.rating} />
							<span className="text-xs font-bold uppercase tracking-wide text-primary-ink">Your review</span>
						</span>
						<span className="flex gap-2">
							<button onClick={startEdit} className="inline-flex items-center gap-1 text-xs font-bold text-primary-ink hover:underline">
								<Pencil className="h-3 w-3" /> Edit
							</button>
							<button onClick={remove} className="inline-flex items-center gap-1 text-xs font-bold text-danger-ink hover:underline">
								<Trash2 className="h-3 w-3" /> Delete
							</button>
						</span>
					</div>
					{data.myFeedback.comment && <p className="mt-2 text-sm text-text">{data.myFeedback.comment}</p>}
				</div>
			) : data.canReview ? (
				<button onClick={startEdit}
					className="mb-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-primary/25">
					<Star className="h-4 w-4" /> Review this placement
				</button>
			) : (
				<p className="mb-5 flex items-start gap-2 text-sm text-muted">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
					Only students who trained at {companyName} can review it — set it as your confirmed placement first.
				</p>
			)}

			{/* Everyone else's */}
			{data.feedback.length === 0 && !data.myFeedback ? (
				<p className="rounded-2xl border border-muted/15 bg-surface p-8 text-center text-sm text-muted">
					No reviews yet. If you trained here, you'd be the first.
				</p>
			) : (
				<div className="space-y-3">
					{data.feedback.map((f) => (
						<div key={f._id} className="rounded-2xl border border-muted/15 bg-surface p-5">
							<div className="flex flex-wrap items-center gap-2">
								<Stars value={f.rating} />
								<span className="text-sm font-bold text-text">{f.reviewer}</span>
								{f.verified && (
									<span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[13px] font-bold text-success-ink">
										<BadgeCheck className="h-3 w-3" /> Verified student
									</span>
								)}
								{f.department && (
									<span className="rounded-full bg-surface-alt px-2 py-0.5 text-[13px] font-semibold capitalize text-muted">
										{f.department}
									</span>
								)}
							</div>
							{f.comment && <p className="mt-2 text-sm text-text">{f.comment}</p>}
							<div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
								{f.stipendPaid !== null && <span>{f.stipendPaid ? 'Was paid a stipend' : 'No stipend'}</span>}
								{f.wouldRecommend !== null && <span>{f.wouldRecommend ? 'Would recommend' : 'Would not recommend'}</span>}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
