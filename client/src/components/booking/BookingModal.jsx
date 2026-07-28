import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, CalendarDays, Send, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import CostBreakdown from './CostBreakdown';
import useModalA11y from '../../hooks/useModalA11y';
import api from '../../services/api';

const iso = (d) => d.toISOString().slice(0, 10);

/**
 * Apply to live somewhere.
 *
 * Dates first, because the total depends on how long they stay — and the total
 * is quoted from the SERVER before they commit, so what they agree to is what
 * they are held to.
 */
export default function BookingModal({ listing, placement, open, onClose }) {
	const navigate = useNavigate();
	const ref = useModalA11y(open, onClose);

	// Default to the SIWES period when we know it — it's almost always what the
	// student wants, and it saves them working out the dates twice.
	const defaults = () => {
		const start = placement?.startDate ? new Date(placement.startDate) : new Date(Date.now() + 7 * 864e5);
		const end = placement?.endDate ? new Date(placement.endDate) : new Date(start.getTime() + 182 * 864e5);
		return { moveIn: iso(start), moveOut: iso(end) };
	};

	const [form, setForm] = useState(defaults);
	const [message, setMessage] = useState('');
	const [quote, setQuote] = useState(null);
	const [quoting, setQuoting] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => { if (open) setForm(defaults()); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

	// Re-quote whenever the dates change — never show a stale total.
	useEffect(() => {
		if (!open || !form.moveIn || !form.moveOut) return;
		setQuoting(true);
		setError('');
		const t = setTimeout(() => {
			api.get('/bookings/quote', { params: { listingId: listing._id, moveIn: form.moveIn, moveOut: form.moveOut } })
				.then(({ data }) => setQuote(data.cost))
				.catch((err) => { setQuote(null); setError(err.response?.data?.message || 'Could not price those dates.'); })
				.finally(() => setQuoting(false));
		}, 250);
		return () => clearTimeout(t);
	}, [open, form.moveIn, form.moveOut, listing._id]);

	const submit = async (e) => {
		e.preventDefault();
		setSubmitting(true);
		try {
			const { data } = await api.post('/bookings', {
				listingId: listing._id,
				moveIn: form.moveIn,
				moveOut: form.moveOut,
				message,
			});
			toast.success('Application sent');
			onClose();
			navigate(`/bookings/${data.booking._id}`);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not send your application');
		} finally {
			setSubmitting(false);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 py-10">
			<div ref={ref} role="dialog" aria-modal="true" aria-label="Apply to book this home"
				className="w-full max-w-lg rounded-2xl border border-muted/15 bg-surface p-6">
				<div className="mb-4 flex items-start justify-between gap-3">
					<div>
						<h2 className="font-serif text-xl font-bold text-text">Apply to book</h2>
						<p className="mt-0.5 text-sm text-muted">{listing.title}</p>
					</div>
					<button onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-muted" /></button>
				</div>

				<form onSubmit={submit} className="space-y-4">
					<div className="grid gap-3 sm:grid-cols-2">
						<label className="block">
							<span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
								<CalendarDays className="h-3.5 w-3.5" /> Move in
							</span>
							<input
								type="date" required value={form.moveIn}
								min={iso(new Date())}
								onChange={(e) => setForm((s) => ({ ...s, moveIn: e.target.value }))}
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							/>
						</label>
						<label className="block">
							<span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
								<CalendarDays className="h-3.5 w-3.5" /> Move out
							</span>
							<input
								type="date" required value={form.moveOut}
								min={form.moveIn}
								onChange={(e) => setForm((s) => ({ ...s, moveOut: e.target.value }))}
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							/>
						</label>
					</div>

					{placement?.startDate && (
						<p className="flex items-start gap-2 text-xs text-muted">
							<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
							Pre-filled from your SIWES placement at {placement.company}.
						</p>
					)}

					<label className="block">
						<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
							Message to the landlord <span className="font-normal normal-case">(optional)</span>
						</span>
						<textarea
							rows={2} maxLength={500} value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder="Tell them a little about yourself and when you'd like to view it."
							className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
						/>
					</label>

					{error && <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger-ink">{error}</p>}

					{quoting ? (
						<div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
					) : quote ? (
						<CostBreakdown cost={quote} />
					) : null}

					<button
						type="submit"
						disabled={submitting || !quote}
						className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60"
					>
						{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						Send application
					</button>
					<p className="text-center text-xs text-muted">
						You won't be charged yet — payment only opens once the landlord accepts.
					</p>
				</form>
			</div>
		</div>
	);
}
