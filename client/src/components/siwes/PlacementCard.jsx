import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, MapPin, Check, Loader2, X, Search, Info, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Where the student is doing their industrial training.
 *
 * This is the anchor for the whole SIWES experience: once a placement is
 * CONFIRMED, housing search, distances and commute costs are all measured from
 * this company's address rather than from a generic city centre.
 */
export default function PlacementCard({ onChange }) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [placement, setPlacement] = useState(null);
	const [department, setDepartment] = useState(null);
	const [notice, setNotice] = useState(null);

	const [editing, setEditing] = useState(false);
	const [companies, setCompanies] = useState([]);
	const [q, setQ] = useState('');
	const [form, setForm] = useState({ companyId: '', role: '', startDate: '', endDate: '', status: 'confirmed' });

	const load = () => {
		setLoading(true);
		api.get('/companies/placement/me')
			.then(({ data }) => {
				setPlacement(data.placement);
				setDepartment(data.department);
				setNotice(data.notice || null);
				onChange?.(data.placement);
			})
			.catch(() => setPlacement(null))
			.finally(() => setLoading(false));
	};

	useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

	const dismissNotice = async () => {
		setNotice(null);
		api.delete('/companies/placement/notice').catch(() => {});
	};

	// Load the directory once the student actually opens the picker.
	useEffect(() => {
		if (!editing) return;
		api.get('/companies').then(({ data }) => setCompanies(data.companies || [])).catch(() => setCompanies([]));
	}, [editing]);

	// ── Adding a centre we don't list ──
	// No directory of a Nigerian city can ever be complete, and a student whose
	// centre is missing would otherwise lose the entire SIWES feature. They add
	// it, we geocode it, and their search anchors to it immediately — it just
	// stays out of the public directory until an admin has checked it.
	const [addingOwn, setAddingOwn] = useState(false);
	const [own, setOwn] = useState({ name: '', industry: '', area: '', address: '' });

	const saveOwn = async (e) => {
		e.preventDefault();
		if (!own.name.trim()) return toast.error('Enter the name of your placement centre.');
		if (!own.area.trim()) return toast.error('Enter the area so we can find housing nearby.');
		setSaving(true);
		try {
			const { data } = await api.post('/companies/suggest', { ...own, city: 'Ibadan', state: 'Oyo' });
			if (!data.located) {
				toast('Added, but we could not place it on the map — try a better-known nearby area.', { icon: '📍' });
			}
			await api.put('/companies/placement', { companyId: data.company._id, status: 'confirmed', role: form.role });
			toast.success('Placement saved');
			setAddingOwn(false);
			setEditing(false);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not add your placement centre');
		} finally {
			setSaving(false);
		}
	};

	const save = async (e) => {
		e.preventDefault();
		if (!form.companyId) return toast.error('Pick the company you are training with.');
		setSaving(true);
		try {
			await api.put('/companies/placement', form);
			toast.success('Placement saved');
			setEditing(false);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save your placement');
		} finally {
			setSaving(false);
		}
	};

	const clear = async () => {
		setSaving(true);
		try {
			await api.delete('/companies/placement');
			toast.success('Placement removed');
			load();
		} catch {
			toast.error('Could not remove your placement');
		} finally {
			setSaving(false);
		}
	};

	const visible = q.trim()
		? companies.filter((c) => `${c.name} ${c.industry} ${c.area}`.toLowerCase().includes(q.trim().toLowerCase()))
		: companies;

	if (loading) {
		return (
			<div className="flex items-center justify-center rounded-2xl border border-muted/15 bg-surface p-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted" />
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-muted/15 bg-surface p-6">
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 className="flex items-center gap-2 font-serif text-lg font-bold text-text">
						<Briefcase className="h-4 w-4 text-primary-ink" /> My SIWES placement
					</h2>
					<p className="mt-1 text-sm text-muted">
						Tell us where you're training and we'll measure every room's real commute from there.
					</p>
				</div>
			</div>

			{/* Something happened to their placement that they didn't do. Say so
			    plainly — otherwise the search just quietly stops being anchored. */}
			{notice && (
				<div className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-highlight/40 bg-highlight/10 p-4">
					<p className="flex items-start gap-2 text-sm text-text">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
						<span>
							<span className="font-bold">{notice.companyName}</span> was removed from our directory, so it's
							no longer set as your placement. This doesn't affect your actual training — pick another
							centre below to get commute estimates again.
						</span>
					</p>
					<button
						onClick={dismissNotice}
						aria-label="Dismiss this notice"
						className="shrink-0 text-muted transition hover:text-text"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			)}

			{/* ── Current placement ── */}
			{placement && !editing && (
				<div className="space-y-3">
					<div className="rounded-xl border border-muted/10 bg-surface-alt/50 p-4">
						<div className="flex flex-wrap items-center gap-2">
							<p className="font-serif text-base font-bold text-text">{placement.company?.name}</p>
							{placement.status === 'confirmed' ? (
								<span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success">
									<Check className="h-3 w-3" /> Confirmed
								</span>
							) : (
								<span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[11px] font-bold text-primary-ink">
									Applied — not confirmed
								</span>
							)}
						</div>
						{placement.role && <p className="mt-1 text-sm text-muted">{placement.role}</p>}
						<p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
							<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
							{[placement.company?.area, placement.company?.city].filter(Boolean).join(', ')}
						</p>
					</div>

					{placement.status === 'confirmed' ? (
						<Link
							to="/dashboard?nearPlacement=1"
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-base transition hover:shadow-lg hover:shadow-primary/25"
						>
							<Search className="h-4 w-4" /> Find housing near here
						</Link>
					) : (
						<p className="flex items-start gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-3 text-xs text-text">
							<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
							Mark this placement as confirmed to search for housing around it — we don't want to point
							your whole accommodation hunt at a company you haven't secured yet.
						</p>
					)}

					<div className="flex gap-2 pt-1">
						<button onClick={() => setEditing(true)} className="text-sm font-bold text-primary-ink hover:underline">
							Change
						</button>
						<span className="text-muted">·</span>
						<button onClick={clear} disabled={saving} className="text-sm font-bold text-danger-ink hover:underline disabled:opacity-50">
							Remove
						</button>
					</div>
				</div>
			)}

			{/* ── Nothing set yet ── */}
			{!placement && !editing && (
				<div className="space-y-3">
					<p className="text-sm text-muted">
						You haven't added a placement yet, so we're showing a generic transport estimate on every listing.
					</p>
					<button
						onClick={() => setEditing(true)}
						className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-base transition hover:shadow-lg hover:shadow-primary/25"
					>
						<Briefcase className="h-4 w-4" /> Add my placement
					</button>
					{!department && (
						<p className="text-xs text-muted">
							Tip: add your department above to see{' '}
							<Link to="/companies" className="font-bold text-primary-ink hover:underline">
								companies that take your course
							</Link>.
						</p>
					)}
				</div>
			)}

			{/* ── My centre isn't listed ── */}
			{editing && addingOwn && (
				<form onSubmit={saveOwn} className="space-y-4">
					<p className="rounded-xl border border-muted/15 bg-surface-alt/40 p-3 text-xs text-muted">
						Add the organisation you're training with. We'll place it on the map and search for housing
						around it. It stays private to you until our team has checked it.
					</p>

					<div>
						<label htmlFor="own-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
							Name of your placement centre
						</label>
						<input
							id="own-name" type="text" value={own.name}
							onChange={(e) => setOwn((o) => ({ ...o, name: e.target.value }))}
							placeholder="e.g. Adebayo Engineering Services"
							className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
						/>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="own-area" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
								Area in Ibadan
							</label>
							<input
								id="own-area" type="text" value={own.area}
								onChange={(e) => setOwn((o) => ({ ...o, area: e.target.value }))}
								placeholder="e.g. Oluyole, Bodija, Agodi"
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							/>
						</div>
						<div>
							<label htmlFor="own-industry" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
								Industry <span className="font-normal normal-case">(optional)</span>
							</label>
							<input
								id="own-industry" type="text" value={own.industry}
								onChange={(e) => setOwn((o) => ({ ...o, industry: e.target.value }))}
								placeholder="e.g. Construction"
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							/>
						</div>
					</div>

					<div>
						<label htmlFor="own-address" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
							Street address <span className="font-normal normal-case">(optional — improves accuracy)</span>
						</label>
						<input
							id="own-address" type="text" value={own.address}
							onChange={(e) => setOwn((o) => ({ ...o, address: e.target.value }))}
							placeholder="e.g. 12 Alaafin Avenue"
							className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
						/>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="submit" disabled={saving}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-base transition hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
							Save my placement
						</button>
						<button
							type="button" onClick={() => setAddingOwn(false)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted transition hover:text-text"
						>
							Back to the directory
						</button>
					</div>
				</form>
			)}

			{/* ── Picker ── */}
			{editing && !addingOwn && (
				<form onSubmit={save} className="space-y-4">
					<div>
						<label htmlFor="placement-search" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
							Company
						</label>
						<div className="relative mb-2">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
							<input
								id="placement-search"
								type="search"
								value={q}
								onChange={(e) => setQ(e.target.value)}
								placeholder="Search the directory…"
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-primary/50"
							/>
						</div>
						<div className="max-h-56 space-y-1.5 overflow-y-auto rounded-xl border border-muted/10 p-1.5">
							{visible.length === 0 && <p className="p-3 text-sm text-muted">No companies match that search.</p>}
							{visible.map((c) => (
								<button
									type="button"
									key={c._id}
									onClick={() => setForm((f) => ({ ...f, companyId: c._id }))}
									className={`block w-full rounded-lg px-3 py-2 text-left transition ${
										form.companyId === c._id ? 'bg-primary/12 ring-1 ring-primary/40' : 'hover:bg-surface-alt/60'
									}`}
								>
									<span className="block text-sm font-bold text-text">{c.name}</span>
									<span className="block text-xs text-muted">{c.industry} · {c.area}, {c.city}</span>
								</button>
							))}
						</div>
					</div>

					<div className="grid gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="placement-role" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
								Your role <span className="font-normal normal-case">(optional)</span>
							</label>
							<input
								id="placement-role"
								type="text"
								value={form.role}
								onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
								placeholder="e.g. Network support intern"
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							/>
						</div>
						<div>
							<label htmlFor="placement-status" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
								Status
							</label>
							<select
								id="placement-status"
								value={form.status}
								onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
								className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50"
							>
								<option value="confirmed">Confirmed — I have the place</option>
								<option value="applied">Applied — waiting to hear</option>
							</select>
						</div>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-base transition hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
							Save placement
						</button>
						<button
							type="button"
							onClick={() => setEditing(false)}
							className="inline-flex items-center gap-1.5 rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted transition hover:text-text"
						>
							<X className="h-4 w-4" /> Cancel
						</button>
					</div>

					<p className="border-t border-muted/10 pt-3 text-sm text-muted">
						Training somewhere not on this list?{' '}
						<button
							type="button"
							onClick={() => setAddingOwn(true)}
							className="inline-flex items-center gap-1 font-bold text-primary-ink hover:underline"
						>
							<Plus className="h-3.5 w-3.5" /> Add your own centre
						</button>{' '}
						— we'll still find housing around it.
					</p>
				</form>
			)}
		</div>
	);
}
