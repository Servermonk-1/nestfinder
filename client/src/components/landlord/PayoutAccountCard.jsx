import { useState } from 'react';
import { Banknote, Loader2, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Where a landlord's money goes.
 *
 * NestFinder holds a student's rent in escrow and, once the stay is confirmed,
 * owes it to the landlord. Until this was added there was nowhere on record to
 * send it — escrow was being "released" to an account that did not exist.
 *
 * Deliberately all-or-nothing: a half-filled account cannot receive a transfer,
 * and storing one would make a landlord look payable on the payouts screen when
 * they are not.
 */
export default function PayoutAccountCard({ payout, onSaved }) {
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [form, setForm] = useState({ bankName: '', accountNumber: '', accountName: '' });

	const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			const { data } = await api.patch('/profile', { payout: form });
			toast.success('Payout account saved');
			setOpen(false);
			setForm({ bankName: '', accountNumber: '', accountName: '' });
			onSaved?.(data.user);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save the account');
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="border border-line bg-surface p-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<Banknote className="mt-0.5 h-5 w-5 shrink-0 text-primary-ink" strokeWidth={1.75} />
					<div>
						<p className="font-serif text-base font-bold text-text">Payout account</p>
						<p className="mt-0.5 text-sm text-muted">
							Where NestFinder sends your money once a student confirms they have moved in.
						</p>
					</div>
				</div>
				{!open && (
					<button
						onClick={() => setOpen(true)}
						className="shrink-0 border border-line px-3.5 py-2 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary-ink"
					>
						{payout ? 'Change' : 'Add account'}
					</button>
				)}
			</div>

			{!open && (
				payout ? (
					<p className="mt-4 flex items-center gap-2 border border-line bg-surface-alt p-3 font-mono text-xs">
						<Check className="h-3.5 w-3.5 shrink-0 text-success-ink" />
						{payout.bankName} · ••••{payout.last4}
						<span className="text-muted">· {payout.accountName}</span>
					</p>
				) : (
					<p className="mt-4 flex items-start gap-2 border border-highlight/40 bg-highlight/10 p-3 text-xs">
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-highlight-ink" />
						<span>
							<span className="font-bold">No account on file.</span> You can list and take bookings,
							but nothing can be paid out to you until you add one.
						</span>
					</p>
				)
			)}

			{open && (
				<form onSubmit={submit} className="mt-4 space-y-3">
					<label className="block">
						<span className="label-meta mb-1.5 block">Bank</span>
						<input
							value={form.bankName} onChange={set('bankName')} autoFocus
							placeholder="e.g. Guaranty Trust Bank"
							className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm outline-none focus:border-primary"
						/>
					</label>
					<label className="block">
						<span className="label-meta mb-1.5 block">Account number</span>
						<input
							value={form.accountNumber}
							onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
							inputMode="numeric" placeholder="10 digits"
							className="w-full border border-line bg-surface-alt px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
						/>
					</label>
					<label className="block">
						<span className="label-meta mb-1.5 block">Account name</span>
						<input
							value={form.accountName} onChange={set('accountName')}
							placeholder="Exactly as it appears on the account"
							className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm outline-none focus:border-primary"
						/>
					</label>

					<div className="flex gap-2 pt-1">
						<button
							type="submit" disabled={saving}
							className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-60"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save account
						</button>
						<button type="button" onClick={() => setOpen(false)} className="px-3 py-2.5 text-sm font-semibold text-muted hover:text-text">
							Cancel
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
