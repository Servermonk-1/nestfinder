import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
	Building2, Search, Loader2, Check, X, Trash2, Plus, MapPin,
	AlertTriangle, Pencil, Users, GraduationCap, Upload,
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminNavbar from '../../components/admin/AdminNavbar';
import LocationPicker from '../../components/map/LocationPicker';
import api from '../../services/api';

const FACULTIES = ['Engineering', 'Natural & Applied Sciences', 'Biological Sciences', 'Environmental Sciences'];

const EMPTY = {
	name: '', industry: '', address: '', area: '', city: 'Ibadan', state: 'Oyo',
	acceptedDepartments: '', faculties: [], siwesSlots: '', website: '', description: '',
	contactEmail: '', contactPhone: '',
};

/**
 * The SIWES directory, from the admin side.
 *
 * This page exists because students can add a placement centre we don't list.
 * Without somewhere to review those, every suggestion would sit unverified
 * forever — visible to nobody but the student who added it.
 */
export default function ManageCompanies() {
	const [companies, setCompanies] = useState([]);
	const [counts, setCounts] = useState({ all: 0, verified: 0, unverified: 0 });
	const [loading, setLoading] = useState(true);
	const [q, setQ] = useState('');
	const [status, setStatus] = useState('unverified'); // start on the review queue
	const [editing, setEditing] = useState(null);       // company object or 'new'
	const [form, setForm] = useState(EMPTY);
	const [saving, setSaving] = useState(false);
	// Only set once the admin drags/clicks/looks up — an untouched pin must not
	// be recorded as "an admin confirmed this".
	const [pin, setPin] = useState(null);
	// What the picker SHOWS at first: wherever the company currently sits.
	const [existingPin, setExistingPin] = useState(null);

	// Bulk import — typing 100 forms by hand is not a workflow.
	const [bulkOpen, setBulkOpen] = useState(false);
	const [bulkText, setBulkText] = useState('');
	const [bulkSaving, setBulkSaving] = useState(false);
	const [bulkResult, setBulkResult] = useState(null);

	const runBulkImport = async () => {
		let parsed;
		try {
			parsed = JSON.parse(bulkText);
		} catch {
			return toast.error('That is not valid JSON — check for a trailing comma.');
		}
		if (!Array.isArray(parsed)) return toast.error('Paste an ARRAY of companies, wrapped in [ ].');
		setBulkSaving(true);
		try {
			const { data } = await api.post('/companies/bulk', { companies: parsed });
			setBulkResult(data);
			toast.success(data.message);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Import failed');
		} finally {
			setBulkSaving(false);
		}
	};

	const load = useCallback(() => {
		setLoading(true);
		api.get('/companies/admin/all', { params: { q: q.trim() || undefined, status } })
			.then(({ data }) => { setCompanies(data.companies || []); setCounts(data.counts || {}); })
			.catch(() => toast.error('Could not load companies'))
			.finally(() => setLoading(false));
	}, [q, status]);

	// Debounced so typing doesn't fire a request per keystroke.
	useEffect(() => {
		const t = setTimeout(load, 350);
		return () => clearTimeout(t);
	}, [load]);

	const setVerified = async (company, verified) => {
		try {
			await api.put(`/companies/${company._id}`, { verified });
			toast.success(verified ? 'Company published to the directory' : 'Company hidden from students');
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not update');
		}
	};

	const remove = async (company) => {
		// Deleting also detaches any student anchored to it, so it's worth a beat.
		if (!window.confirm(`Delete "${company.name}"? Any student using it as their placement will lose that anchor.`)) return;
		try {
			await api.delete(`/companies/${company._id}`);
			toast.success('Company deleted');
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not delete');
		}
	};

	const openEditor = (company) => {
		setEditing(company || 'new');
		setPin(null);
		const c = company?.location?.coordinates;
		setExistingPin(Array.isArray(c) && c.length === 2 ? { lat: c[1], lng: c[0] } : null);
		setForm(company
			? {
				...EMPTY, ...company,
				acceptedDepartments: (company.acceptedDepartments || []).join(', '),
				faculties: company.faculties || [],
				siwesSlots: company.siwesSlots ?? '',
			}
			: EMPTY);
	};

	const save = async (e) => {
		e.preventDefault();
		if (!form.name.trim()) return toast.error('Name is required');
		if (!form.area.trim()) return toast.error('Area is required — it is how we place it on the map');
		setSaving(true);
		const payload = {
			...form,
			...(pin ? { lat: pin.lat, lng: pin.lng } : {}),
			siwesSlots: form.siwesSlots === '' ? undefined : Number(form.siwesSlots),
			acceptedDepartments: form.acceptedDepartments.split(',').map((d) => d.trim()).filter(Boolean),
		};
		try {
			if (editing === 'new') await api.post('/companies', { ...payload, verified: true });
			else await api.put(`/companies/${editing._id}`, payload);
			toast.success(editing === 'new' ? 'Company added' : 'Company updated');
			setEditing(null);
			load();
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save');
		} finally {
			setSaving(false);
		}
	};

	const toggleFaculty = (f) =>
		setForm((s) => ({
			...s,
			faculties: s.faculties.includes(f) ? s.faculties.filter((x) => x !== f) : [...s.faculties, f],
		}));

	const TABS = [
		{ id: 'unverified', label: 'Awaiting review', count: counts.unverified },
		{ id: 'verified', label: 'Published', count: counts.verified },
		{ id: 'all', label: 'All', count: counts.all },
	];

	return (
		<AdminNavbar>
			<div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="font-serif text-3xl font-extrabold text-text">SIWES directory</h1>
						<p className="mt-1 text-sm text-muted">
							Placement centres students can anchor their housing search to. Entries students added
							themselves stay hidden until you publish them.
						</p>
					</div>
					<div className="flex flex-wrap gap-2">
						<button
							onClick={() => setBulkOpen(true)}
							className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-surface px-4 py-2.5 text-sm font-bold text-primary-ink transition hover:border-primary/50"
						>
							<Upload className="h-4 w-4" /> Bulk import
						</button>
						<button
							onClick={() => openEditor(null)}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-primary/25"
						>
							<Plus className="h-4 w-4" /> Add company
						</button>
					</div>
				</div>

				{/* Tabs */}
				<div className="mb-4 flex flex-wrap gap-2">
					{TABS.map((t) => (
						<button
							key={t.id}
							onClick={() => setStatus(t.id)}
							aria-pressed={status === t.id}
							className={`rounded-full px-4 py-2 text-xs font-bold transition ${
								status === t.id ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
							}`}
						>
							{t.label} ({t.count ?? 0})
						</button>
					))}
				</div>

				<div className="relative mb-6">
					<label htmlFor="admin-company-search" className="sr-only">Search companies</label>
					<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
					<input
						id="admin-company-search"
						type="search"
						value={q}
						onChange={(e) => setQ(e.target.value)}
						placeholder="Search by name, industry, area or city"
						className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-text outline-none focus:border-primary/50"
					/>
				</div>

				{loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : companies.length === 0 ? (
					<div className="rounded-2xl border border-muted/15 bg-surface p-10 text-center">
						<Building2 className="mx-auto mb-3 h-8 w-8 text-muted" />
						<p className="font-serif text-xl font-bold text-text">
							{status === 'unverified' ? 'Nothing awaiting review' : 'No companies found'}
						</p>
						<p className="mt-1 text-sm text-muted">
							{status === 'unverified'
								? 'Centres students add themselves will appear here for checking.'
								: 'Try a different search or tab.'}
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{companies.map((c, i) => (
							<motion.div
								key={c._id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: Math.min(i * 0.02, 0.2) }}
								className="rounded-2xl border border-muted/15 bg-surface p-5"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<h2 className="font-serif text-base font-bold text-text">{c.name}</h2>
											{c.verified ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[13px] font-bold text-success-ink">
													<Check className="h-3 w-3" /> Published
												</span>
											) : (
												<span className="inline-flex items-center gap-1 rounded-full bg-highlight/15 px-2 py-0.5 text-[13px] font-bold text-primary-ink">
													<AlertTriangle className="h-3 w-3" /> Awaiting review
												</span>
											)}
											{c.suggestedBy && (
												<span className="rounded-full bg-surface-alt px-2 py-0.5 text-[13px] font-bold text-muted">
													Added by a student
												</span>
											)}
										</div>

										<p className="mt-1 text-sm text-muted">{c.industry}</p>
										<p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
											<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
											{[c.address, c.area, c.city].filter(Boolean).join(', ')}
											{c.location?.coordinates ? (
												<span className="ml-1 text-[13px]">· on the map ({c.geocodePrecision || 'area'})</span>
											) : (
												<span className="ml-1 text-[13px] font-bold text-danger-ink">· NOT on the map</span>
											)}
										</p>

										<div className="mt-2 flex flex-wrap gap-1.5">
											{(c.faculties || []).map((f) => (
												<span key={f} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[13px] font-semibold text-primary-ink">
													<GraduationCap className="h-3 w-3" /> {f}
												</span>
											))}
											{c.siwesSlots ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-[13px] font-semibold text-muted">
													<Users className="h-3 w-3" /> ~{c.siwesSlots} places
												</span>
											) : null}
										</div>

										{(c.acceptedDepartments || []).length > 0 && (
											<p className="mt-2 text-xs capitalize text-muted">
												{c.acceptedDepartments.slice(0, 6).join(' · ')}
												{c.acceptedDepartments.length > 6 && ` +${c.acceptedDepartments.length - 6}`}
											</p>
										)}
									</div>

									<div className="flex shrink-0 flex-wrap gap-2">
										{c.verified ? (
											<button
												onClick={() => setVerified(c, false)}
												className="rounded-xl border border-muted/20 px-3 py-2 text-xs font-bold text-muted transition hover:text-text"
											>
												Unpublish
											</button>
										) : (
											<button
												onClick={() => setVerified(c, true)}
												className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3 py-2 text-xs font-bold text-white transition hover:opacity-90"
											>
												<Check className="h-3.5 w-3.5" /> Publish
											</button>
										)}
										<button
											onClick={() => openEditor(c)}
											className="inline-flex items-center gap-1.5 rounded-xl border border-muted/20 px-3 py-2 text-xs font-bold text-muted transition hover:text-text"
										>
											<Pencil className="h-3.5 w-3.5" /> Edit
										</button>
										<button
											onClick={() => remove(c)}
											className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 px-3 py-2 text-xs font-bold text-danger-ink transition hover:border-danger/60"
										>
											<Trash2 className="h-3.5 w-3.5" /> Delete
										</button>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				)}
			</div>

			{/* ── Bulk import ── */}
			{bulkOpen && (
				<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 py-10">
					<div className="w-full max-w-2xl space-y-4 rounded-2xl border border-muted/15 bg-surface p-6">
						<div className="flex items-center justify-between">
							<h2 className="font-serif text-xl font-bold text-text">Bulk import placement centres</h2>
							<button onClick={() => { setBulkOpen(false); setBulkResult(null); }} aria-label="Close">
								<X className="h-5 w-5 text-muted" />
							</button>
						</div>

						<p className="text-sm text-muted">
							Paste a JSON array. <span className="font-bold text-ink">name</span> and{' '}
							<span className="font-bold text-ink">area</span> are required; everything else is optional.
							Existing names are skipped rather than duplicated.
						</p>

						<label htmlFor="bulk-json" className="sr-only">Companies JSON</label>
						<textarea
							id="bulk-json"
							rows={10}
							value={bulkText}
							onChange={(e) => setBulkText(e.target.value)}
							spellCheck={false}
							placeholder={'[\n  {\n    "name": "Example Engineering Ltd",\n    "industry": "Fabrication",\n    "area": "Oluyole",\n    "faculties": ["Engineering"],\n    "acceptedDepartments": "mechanical engineering, materials engineering",\n    "siwesSlots": 10\n  }\n]'}
							className="w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 font-mono text-xs text-text outline-none focus:border-primary/50"
						/>

						{bulkResult && (
							<div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-muted/15 bg-surface-alt/40 p-4 text-sm">
								<p className="font-bold text-ink">{bulkResult.message}</p>
								{bulkResult.geocoding && (
									<p className="text-xs text-muted">
										Locating the new entries on the map in the background — about a second each.
									</p>
								)}
								{bulkResult.skipped?.length > 0 && (
									<p className="text-xs text-muted">Skipped: {bulkResult.skipped.map((s) => s.name).join(', ')}</p>
								)}
								{bulkResult.failed?.length > 0 && (
									<ul className="space-y-0.5 text-xs text-danger-ink">
										{bulkResult.failed.map((f, i) => <li key={i}>{f.name} — {f.reason}</li>)}
									</ul>
								)}
							</div>
						)}

						<div className="flex gap-2">
							<button
								onClick={runBulkImport}
								disabled={bulkSaving}
								className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
							>
								{bulkSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import
							</button>
							<button
								onClick={() => { setBulkOpen(false); setBulkResult(null); }}
								className="rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}


		{/* ── Editor ── */}
		{editing && (
			<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 py-10">
				<form onSubmit={save} className="w-full max-w-2xl space-y-4 rounded-2xl border border-muted/15 bg-surface p-6">
					<div className="flex items-center justify-between">
						<h2 className="font-serif text-xl font-bold text-text">
							{editing === 'new' ? 'Add a placement centre' : 'Edit placement centre'}
						</h2>
						<button type="button" onClick={() => setEditing(null)} aria-label="Close">
							<X className="h-5 w-5 text-muted" />
						</button>
					</div>

					<Field label="Name" required>
						<input value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} className={inputCls} />
					</Field>
					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Industry">
							<input value={form.industry} onChange={(e) => setForm((s) => ({ ...s, industry: e.target.value }))} className={inputCls} />
						</Field>
						<Field label="Approx. SIWES places">
							<input type="number" min="0" value={form.siwesSlots} onChange={(e) => setForm((s) => ({ ...s, siwesSlots: e.target.value }))} className={inputCls} />
						</Field>
					</div>

					<Field label="Street address">
						<input value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} className={inputCls} />
					</Field>
					<div className="grid gap-3 sm:grid-cols-3">
						<Field label="Area" required>
							<input value={form.area} onChange={(e) => setForm((s) => ({ ...s, area: e.target.value }))} className={inputCls} />
						</Field>
						<Field label="City">
							<input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} className={inputCls} />
						</Field>
						<Field label="State">
							<input value={form.state} onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))} className={inputCls} />
						</Field>
					</div>

					<Field label="Faculties">
						<div className="flex flex-wrap gap-2">
							{FACULTIES.map((f) => (
								<button
									key={f}
									type="button"
									onClick={() => toggleFaculty(f)}
									aria-pressed={form.faculties.includes(f)}
									className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
										form.faculties.includes(f) ? 'bg-primary text-white' : 'border border-muted/20 text-muted'
									}`}
								>
									{f}
								</button>
							))}
						</div>
					</Field>

					<Field label="Accepted departments" hint="Comma-separated. Stored lowercase.">
						<textarea
							rows={2}
							value={form.acceptedDepartments}
							onChange={(e) => setForm((s) => ({ ...s, acceptedDepartments: e.target.value }))}
							className={inputCls}
						/>
					</Field>

					<Field label="Description">
						<textarea rows={2} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} className={inputCls} />
					</Field>
					<div className="grid gap-3 sm:grid-cols-2">
						<Field label="Contact email" hint="shown to students">
							<input type="email" value={form.contactEmail} onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))} className={inputCls} />
						</Field>
						<Field label="Contact phone" hint="shown to students">
							<input value={form.contactPhone} onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))} className={inputCls} />
						</Field>
					</div>
					<Field label="Website">
						<input value={form.website} onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))} className={inputCls} />
					</Field>

					<div className="border-t border-muted/10 pt-4">
						<h3 className="mb-1 text-sm font-bold text-text">Pin on the map</h3>
						<LocationPicker
							address={form.address}
							area={form.area}
							city={form.city}
							state={form.state}
							subject="this placement centre"
							value={existingPin}
							onChange={setPin}
						/>
					</div>

					<p className="text-xs text-muted">
						{pin
							? 'Your pin will be saved as the exact location.'
							: 'Leave the pin alone and we\'ll geocode the address automatically on save.'}
					</p>

					<div className="flex gap-2 pt-1">
						<button
							type="submit"
							disabled={saving}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
						>
							{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
						</button>
						<button
							type="button"
							onClick={() => setEditing(null)}
							className="rounded-xl border border-muted/20 px-4 py-2.5 text-sm font-bold text-muted"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		)}
	</AdminNavbar>
	);
}

const inputCls = 'w-full rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2.5 text-sm text-text outline-none focus:border-primary/50';

function Field({ label, required, hint, children }) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
				{label}{required && <span className="text-danger-ink"> *</span>}
				{hint && <span className="ml-1 font-normal normal-case">— {hint}</span>}
			</span>
			{children}
		</label>
	);
}
