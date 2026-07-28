import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, MapPin, Users, Search, Loader2, Info, ExternalLink, GraduationCap, LayoutGrid, Map as MapIcon } from 'lucide-react';
import StudentNavbar from '../../components/common/StudentNavbar';
import CompaniesDirectoryMap from '../../components/map/CompaniesDirectoryMap';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * "Which companies take my course?" — the other half of SIWES matching.
 *
 * A student's first problem isn't housing, it's securing a placement. Once they
 * know where they'll be training, the housing search has something to anchor to.
 */
export default function CompaniesPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const { user } = useAuth();

	const [companies, setCompanies] = useState([]);
	const [departments, setDepartments] = useState([]);
	const [faculties, setFaculties] = useState([]);
	const [loading, setLoading] = useState(true);
	const [needsDepartment, setNeedsDepartment] = useState(false);
	const [q, setQ] = useState('');
	const [view, setView] = useState('list');

	const department = searchParams.get('department') || '';
	const faculty = searchParams.get('faculty') || '';
	const mine = searchParams.get('mine') === '1';

	useEffect(() => {
		api.get('/companies/departments')
			.then(({ data }) => setDepartments(data.departments || []))
			.catch(() => setDepartments([]));
		api.get('/companies/faculties')
			.then(({ data }) => setFaculties(data.faculties || []))
			.catch(() => setFaculties([]));
	}, []);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setLoading(true);
			const params = {};
			if (mine) params.mine = '1';
			else if (department) params.department = department;
			if (faculty) params.faculty = faculty;
			if (q.trim()) params.q = q.trim();

			api.get('/companies', { params })
				.then(({ data }) => {
					setCompanies(data.companies || []);
					setNeedsDepartment(!!data.needsDepartment);
				})
				.catch(() => setCompanies([]))
				.finally(() => setLoading(false));
		}, 300);
		return () => clearTimeout(timeout);
	}, [department, mine, q, faculty]);

	const setFilter = (updates) => {
		const next = new URLSearchParams(searchParams);
		Object.entries(updates).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
		setSearchParams(next);
	};

	const title = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

	return (
		<div className="min-h-screen bg-base text-text">
			<StudentNavbar />

			<div className="border-b border-line bg-surface/70 px-6 pt-28 pb-8">
				<div className="mx-auto max-w-6xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> SIWES directory
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
						Companies that take students
					</motion.h1>
					<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 max-w-2xl text-sm text-muted">
						Organisations in and around Ibadan that host industrial-training students, and the courses each
						one accepts. Set one as your placement and we'll find housing within reach of it.
					</motion.p>
				</div>
			</div>

			<div className="mx-auto max-w-6xl px-6 py-8">
				{/* ── Controls ── */}
				<div className="mb-6 flex flex-wrap items-center gap-3">
					<div className="relative min-w-[240px] flex-1">
						<label htmlFor="company-search" className="sr-only">Search companies</label>
						<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
						<input
							id="company-search"
							type="search"
							value={q}
							onChange={(e) => setQ(e.target.value)}
							placeholder="Search by name, industry or area"
							className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-4 text-sm text-text outline-none transition focus:border-primary/50"
						/>
					</div>

					{user?.role === 'student' && (
						<button
							onClick={() => setFilter({ mine: mine ? '' : '1', department: '' })}
							aria-pressed={mine}
							className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
								mine ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
							}`}
						>
							<GraduationCap className="h-4 w-4" /> My department
						</button>
					)}

					<div>
						<label htmlFor="department-filter" className="sr-only">Filter by department</label>
						<select
							id="department-filter"
							value={mine ? '' : department}
							disabled={mine}
							onChange={(e) => setFilter({ department: e.target.value, mine: '' })}
							className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text outline-none transition focus:border-primary/50 disabled:opacity-50"
						>
							<option value="">All departments</option>
							{departments.map((d) => (
								<option key={d.department} value={d.department}>
									{title(d.department)} ({d.count})
								</option>
							))}
						</select>
					</div>
				</div>

				{/* ── Faculty chips — how AATU students actually think about this ── */}
				{faculties.length > 0 && (
					<div className="mb-6 flex flex-wrap gap-2">
						<button
							onClick={() => setFilter({ faculty: '' })}
							aria-pressed={!faculty}
							className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
								!faculty ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
							}`}
						>
							All faculties
						</button>
						{faculties.map((f) => (
							<button
								key={f.faculty}
								onClick={() => setFilter({ faculty: faculty === f.faculty ? '' : f.faculty })}
								aria-pressed={faculty === f.faculty}
								className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
									faculty === f.faculty ? 'bg-primary text-white' : 'border border-muted/20 text-muted hover:text-text'
								}`}
							>
								{f.faculty} ({f.count})
							</button>
						))}
					</div>
				)}

				{/* ── List / map ── */}
				<div className="mb-5 flex items-center rounded-full border border-muted/15 bg-surface-alt/60 p-0.5" role="group" aria-label="Directory view">
					{[{ id: 'list', label: 'List', Icon: LayoutGrid }, { id: 'map', label: 'Map', Icon: MapIcon }].map(({ id, label, Icon }) => (
						<button
							key={id}
							onClick={() => setView(id)}
							aria-pressed={view === id}
							className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
								view === id ? 'bg-primary text-white' : 'text-muted hover:text-text'
							}`}
						>
							<Icon className="h-3.5 w-3.5" /> {label}
						</button>
					))}
				</div>

				{/* ── Results ── */}
				{!loading && !needsDepartment && view === 'map' && companies.length > 0 ? (
					<CompaniesDirectoryMap companies={companies} />
				) : loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : needsDepartment ? (
					<div className="rounded-2xl border border-highlight/30 bg-highlight/10 p-6">
						<p className="flex items-start gap-2 text-sm text-text">
							<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
							<span>
								Add your department on your{' '}
								<Link to="/account" className="font-bold text-primary-ink hover:underline">account page</Link>{' '}
								and we'll show only the companies that take your course.
							</span>
						</p>
					</div>
				) : companies.length === 0 ? (
					<div className="rounded-2xl border border-muted/15 bg-surface p-10 text-center">
						<Building2 className="mx-auto mb-3 h-8 w-8 text-muted" />
						<p className="font-serif text-xl font-bold text-text">No companies found</p>
						<p className="mt-1 text-sm text-muted">
							{department || mine
								? 'No company in the directory currently lists this department. Try “All departments”.'
								: 'Try a different search.'}
						</p>
					</div>
				) : (
					<>
						<p className="mb-4 text-sm text-muted">
							{companies.length} compan{companies.length === 1 ? 'y' : 'ies'}
							{mine ? ' that take your department' : department ? ` that take ${title(department)}` : ''}
						</p>
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{companies.map((c, i) => (
								<motion.article
									key={c._id}
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: Math.min(i * 0.04, 0.3) }}
									className="flex flex-col rounded-2xl border border-muted/15 bg-surface p-5 transition hover:border-primary/25"
								>
									<span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-alt/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted">
										<Building2 className="h-3 w-3" /> {c.industry}
									</span>
									<Link to={`/companies/${c._id}`} className="font-serif text-base font-bold leading-snug text-text hover:text-primary-ink hover:underline">{c.name}</Link>
									<p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
										<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
										{[c.area, c.city].filter(Boolean).join(', ')}
									</p>
									{c.description && <p className="mt-3 line-clamp-3 text-sm text-muted">{c.description}</p>}

									<div className="mt-3 flex flex-wrap gap-1.5">
										{(c.acceptedDepartments || []).slice(0, 4).map((d) => (
											<span key={d} className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold capitalize text-primary-ink">
												{d}
											</span>
										))}
										{(c.acceptedDepartments || []).length > 4 && (
											<span className="rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-semibold text-muted">
												+{c.acceptedDepartments.length - 4} more
											</span>
										)}
									</div>

									<div className="mt-auto flex items-center justify-between gap-2 pt-4">
										{c.siwesSlots ? (
											<span className="flex items-center gap-1.5 text-xs text-muted">
												<Users className="h-3.5 w-3.5" /> ~{c.siwesSlots} places
											</span>
										) : <span />}
										{c.website && (
											<a
												href={c.website}
												target="_blank"
												rel="noreferrer"
												className="inline-flex items-center gap-1 text-xs font-bold text-primary-ink hover:underline"
											>
												Website <ExternalLink className="h-3 w-3" />
											</a>
										)}
									</div>
								</motion.article>
							))}
						</div>

						<p className="mt-6 flex items-start gap-2 text-xs text-muted">
							<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
							Place counts are indicative. NestFinder doesn't run the placement process — apply through
							your school's SIWES coordinator, then set your placement here to find housing near it.
						</p>
					</>
				)}
			</div>
		</div>
	);
}
