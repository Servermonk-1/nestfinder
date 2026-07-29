import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Bell, BellOff, Trash2, Search, Info, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentNavbar from '../../components/common/StudentNavbar';
import api from '../../services/api';

/**
 * Searches a student has kept, and whether they want to hear about them.
 *
 * Rooms near the big placement centres go within days of the SIWES intake, so
 * the point of this page is to stop someone missing one simply because they
 * were not looking that morning.
 */
export default function SavedSearchesPage() {
	const [searches, setSearches] = useState([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState('');
	const [renaming, setRenaming] = useState(null);
	const [draftName, setDraftName] = useState('');

	const load = useCallback(() => {
		setLoading(true);
		api.get('/saved-searches')
			.then(({ data }) => setSearches(data.searches || []))
			.catch(() => setSearches([]))
			.finally(() => setLoading(false));
	}, []);

	useEffect(load, [load]);

	const act = async (id, fn, msg) => {
		setBusy(id);
		try { await fn(); if (msg) toast.success(msg); load(); }
		catch (err) { toast.error(err.response?.data?.message || 'Something went wrong'); }
		finally { setBusy(''); }
	};

	const toQuery = (c = {}) => {
		const p = new URLSearchParams();
		if (c.q) p.set('q', c.q);
		if (c.city) p.set('city', c.city);
		if (c.roomType) p.set('roomType', c.roomType);
		if (c.nearPlacement) p.set('nearPlacement', '1');
		return p.toString();
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />

			<div className="border-b border-line bg-surface/70 px-6 pt-28 pb-8">
				<div className="mx-auto max-w-4xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="label-meta mb-2 inline-flex items-center gap-2">
						<span className="h-px w-6 bg-primary/50" /> Student dashboard
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold md:text-4xl">
						Saved searches
					</motion.h1>
					<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 max-w-2xl text-sm text-muted">
						We'll email you when a new home matches — at most once every few hours per search,
						however many appear.
					</motion.p>
				</div>
			</div>

			<div className="mx-auto max-w-4xl px-6 py-8">
				{loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : searches.length === 0 ? (
					<div className="border border-line bg-surface p-10 text-center">
						<Search className="mx-auto mb-3 h-8 w-8 text-muted" />
						<p className="font-serif text-xl font-bold">No saved searches yet</p>
						<p className="mx-auto mt-1 max-w-md text-sm text-muted">
							Set your filters on the browse page, then use <span className="font-semibold text-text">Save this search</span> to
							be told when something new matches.
						</p>
						<Link to="/dashboard" className="mt-5 inline-block bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">
							Browse homes
						</Link>
					</div>
				) : (
					<div className="space-y-3">
						{searches.map((s, i) => (
							<motion.div
								key={s._id}
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: Math.min(i * 0.04, 0.3) }}
								className="card p-5"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div className="min-w-0 flex-1">
										{renaming === s._id ? (
											<div className="flex flex-wrap items-center gap-2">
												<input
													value={draftName}
													onChange={(e) => setDraftName(e.target.value)}
													aria-label="Search name"
													className="border border-line bg-surface-alt px-3 py-1.5 text-sm outline-none focus:border-primary"
												/>
												<button
													onClick={() => act(s._id, () => api.patch(`/saved-searches/${s._id}`, { name: draftName }), 'Renamed')
														.then(() => setRenaming(null))}
													className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline"
												>
													<Check className="h-3.5 w-3.5" /> Save
												</button>
												<button onClick={() => setRenaming(null)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
													<X className="h-3.5 w-3.5" /> Cancel
												</button>
											</div>
										) : (
											<div className="flex flex-wrap items-center gap-2">
												<h2 className="font-serif text-base font-bold">{s.name}</h2>
												{s.newMatchCount > 0 && (
													<span className="bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
														{s.newMatchCount} NEW
													</span>
												)}
												{!s.alertsEnabled && (
													<span className="label-meta">alerts off</span>
												)}
											</div>
										)}

										<p className="mt-1 text-sm text-muted">{s.description}</p>

										<p className="mt-2 font-mono text-xs text-muted">
											{s.total} match{s.total === 1 ? '' : 'es'} right now
										</p>

										{s.anchorUnavailable && (
											<p className="mt-2 flex items-start gap-2 border border-highlight/40 bg-highlight/10 p-3 text-xs">
												<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-highlight-ink" />
												This search is anchored to your placement, but you don't have a confirmed one right now —
												so it can't match anything until you set one.
											</p>
										)}
									</div>

									<div className="flex shrink-0 flex-wrap items-center gap-2">
										<Link
											to={`/dashboard?${toQuery(s.criteria)}`}
											onClick={() => api.patch(`/saved-searches/${s._id}/seen`).catch(() => {})}
											className="border border-line px-3 py-2 text-xs font-semibold transition hover:border-primary/50 hover:text-primary-ink"
										>
											Run search
										</Link>
										<button
											onClick={() => act(s._id, () => api.patch(`/saved-searches/${s._id}`, { alertsEnabled: !s.alertsEnabled }),
												s.alertsEnabled ? 'Alerts off' : 'Alerts on')}
											disabled={busy === s._id}
											aria-label={s.alertsEnabled ? 'Turn alerts off' : 'Turn alerts on'}
											className="border border-line p-2 text-muted transition hover:text-text disabled:opacity-50"
										>
											{s.alertsEnabled ? <Bell className="h-4 w-4" strokeWidth={1.75} /> : <BellOff className="h-4 w-4" strokeWidth={1.75} />}
										</button>
										<button
											onClick={() => { setRenaming(s._id); setDraftName(s.name); }}
											aria-label="Rename"
											className="border border-line p-2 text-muted transition hover:text-text"
										>
											<Pencil className="h-4 w-4" strokeWidth={1.75} />
										</button>
										<button
											onClick={() => {
												if (!window.confirm(`Delete “${s.name}”?`)) return;
												act(s._id, () => api.delete(`/saved-searches/${s._id}`), 'Removed');
											}}
											disabled={busy === s._id}
											aria-label="Delete"
											className="border border-danger/30 p-2 text-danger-ink transition hover:border-danger/60 disabled:opacity-50"
										>
											<Trash2 className="h-4 w-4" strokeWidth={1.75} />
										</button>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
