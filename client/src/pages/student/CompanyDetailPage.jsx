import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
	ArrowLeft, Building2, MapPin, Users, ExternalLink, Loader2, Search,
	Briefcase, Check, GraduationCap, Info, Home, Phone, Mail, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import StudentNavbar from '../../components/common/StudentNavbar';
import Seo from '../../components/common/Seo';
import ListingCard from '../../components/listing/ListingCard';
import CompanyMap from '../../components/map/CompanyMap';
import CompanyFeedback from '../../components/siwes/CompanyFeedback';
import { commuteSummary } from '../../utils/commute';
import api from '../../services/api';

/**
 * One placement centre, and the housing within reach of it.
 *
 * Deliberately usable BEFORE a student has accepted anything: someone weighing
 * two offers needs to see what living near each would actually cost and take.
 */
export default function CompanyDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [company, setCompany] = useState(null);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [nearby, setNearby] = useState([]);
	const [loadingNearby, setLoadingNearby] = useState(true);
	const [radiusKm, setRadiusKm] = useState(10);
	const [isMyPlacement, setIsMyPlacement] = useState(false);
	const [setting, setSetting] = useState(false);
	// True when this is the caller's own centre, still awaiting admin review.
	const [awaitingReview, setAwaitingReview] = useState(false);
	const [isOwner, setIsOwner] = useState(false);

	useEffect(() => {
		setLoading(true);
		api.get(`/companies/${id}`)
			.then(({ data }) => { setCompany(data.company); setAwaitingReview(!!data.awaitingReview); setIsOwner(!!data.isOwner); })
			.catch(() => setNotFound(true))
			.finally(() => setLoading(false));

		api.get('/companies/placement/me')
			.then(({ data }) => setIsMyPlacement(String(data.placement?.company?._id || '') === String(id)))
			.catch(() => setIsMyPlacement(false));
	}, [id]);

	useEffect(() => {
		setLoadingNearby(true);
		api.get('/listings/search', { params: { nearCompany: id, radiusKm, limit: 6 } })
			.then(({ data }) => setNearby(data.listings || []))
			.catch(() => setNearby([]))
			.finally(() => setLoadingNearby(false));
	}, [id, radiusKm]);

	const [ownEdit, setOwnEdit] = useState({ name: '', area: '', address: '' });
	const [savingOwn, setSavingOwn] = useState(false);

	// Seed the correction form from whatever is currently stored.
	useEffect(() => {
		if (company) setOwnEdit({ name: company.name || '', area: company.area || '', address: company.address || '' });
	}, [company?._id]); // eslint-disable-line react-hooks/exhaustive-deps

	const saveOwnEdit = async () => {
		setSavingOwn(true);
		try {
			const { data } = await api.put(`/companies/mine/${id}`, ownEdit);
			setCompany(data.company);
			toast.success('Updated — we\'ve re-checked the map location');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not update');
		} finally {
			setSavingOwn(false);
		}
	};

	const removeOwn = async () => {
		if (!window.confirm('Remove this placement centre? It will also be cleared from your profile.')) return;
		setSavingOwn(true);
		try {
			await api.delete(`/companies/mine/${id}`);
			toast.success('Removed');
			navigate('/account');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not remove');
		} finally {
			setSavingOwn(false);
		}
	};

	const makeMyPlacement = async () => {
		setSetting(true);
		try {
			await api.put('/companies/placement', { companyId: id, status: 'confirmed' });
			toast.success('Set as your placement');
			setIsMyPlacement(true);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not set your placement');
		} finally {
			setSetting(false);
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-paper">
				<StudentNavbar />
				<div className="flex justify-center pt-40"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
			</div>
		);
	}

	if (notFound || !company) {
		return (
			<div className="min-h-screen bg-paper text-text">
				<StudentNavbar />
				<div className="mx-auto max-w-2xl px-6 pt-40 text-center">
					<Building2 className="mx-auto mb-3 h-10 w-10 text-muted" />
					<h1 className="font-serif text-2xl font-bold">Placement centre not found</h1>
					<Link to="/companies" className="mt-4 inline-block font-bold text-primary-ink hover:underline">
						Back to the directory
					</Link>
				</div>
			</div>
		);
	}

	const located = company.location?.coordinates?.length === 2;

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />

			{/* Unpublished centres are private, so they must not be indexed. */}
			{!awaitingReview && (
				<Seo
					title={`${company.name} — SIWES placement in ${company.city}`}
					description={`${company.industry} in ${[company.area, company.city].filter(Boolean).join(", ")}. ${(company.acceptedDepartments || []).length ? `Takes SIWES students from ${company.acceptedDepartments.slice(0, 4).join(", ")}.` : ""} Find student housing within reach of it.`}
					type="article"
				/>
			)}

			<div className="mx-auto max-w-5xl px-6 pb-16 pt-28">
				<button
					onClick={() => navigate('/companies')}
					className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
				>
					<ArrowLeft className="h-4 w-4" /> Back to the directory
				</button>

				{/* ── Header ── */}
				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
					<span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-surface-alt/70 px-2.5 py-1 text-[13px] font-bold uppercase tracking-wide text-muted">
						<Building2 className="h-3 w-3" /> {company.industry}
					</span>
					<h1 className="font-serif text-3xl font-extrabold text-text md:text-4xl">{company.name}</h1>
					<p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
						<MapPin className="h-4 w-4 shrink-0 text-primary-ink" />
						{[company.address, company.area, company.city, company.state].filter(Boolean).join(', ')}
					</p>
				</motion.div>

				{company.description && <p className="mt-4 max-w-3xl text-base text-muted">{company.description}</p>}

				{/* ── Facts ── */}
				<div className="mt-6 flex flex-wrap gap-2">
					{(company.faculties || []).map((f) => (
						<span key={f} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary-ink">
							<GraduationCap className="h-3.5 w-3.5" /> {f}
						</span>
					))}
					{company.siwesSlots ? (
						<span className="inline-flex items-center gap-1.5 rounded-full bg-surface-alt px-3 py-1.5 text-xs font-bold text-muted">
							<Users className="h-3.5 w-3.5" /> ~{company.siwesSlots} places per cycle
						</span>
					) : null}
					{company.website && (
						<a
							href={company.website} target="_blank" rel="noreferrer"
							className="inline-flex items-center gap-1.5 rounded-full border border-muted/20 px-3 py-1.5 text-xs font-bold text-primary-ink hover:border-primary/40"
						>
							Website <ExternalLink className="h-3 w-3" />
						</a>
					)}
				</div>

				{(company.acceptedDepartments || []).length > 0 && (
					<div className="mt-5">
						<h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Departments they take</h2>
						<div className="flex flex-wrap gap-1.5">
							{company.acceptedDepartments.map((d) => (
								<span key={d} className="rounded-full bg-surface-alt/70 px-2.5 py-1 text-xs font-semibold capitalize text-text">
									{d}
								</span>
							))}
						</div>
					</div>
				)}

				{/* ── How to reach them ──
				    These fields were on the model but shown nowhere, so a student
				    who found a centre had no way to actually apply to it. */}
				{(company.contactEmail || company.contactPhone) && (
					<div className="mt-6">
						<h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Contact</h2>
						<div className="flex flex-wrap gap-3">
							{company.contactPhone && (
								<a href={`tel:${company.contactPhone}`} className="inline-flex items-center gap-2 rounded-xl border border-muted/20 px-3.5 py-2 text-sm font-bold text-primary-ink hover:border-primary/40">
									<Phone className="h-3.5 w-3.5" /> {company.contactPhone}
								</a>
							)}
							{company.contactEmail && (
								<a href={`mailto:${company.contactEmail}`} className="inline-flex items-center gap-2 rounded-xl border border-muted/20 px-3.5 py-2 text-sm font-bold text-primary-ink hover:border-primary/40">
									<Mail className="h-3.5 w-3.5" /> {company.contactEmail}
								</a>
							)}
						</div>
					</div>
				)}

				{/* Their own unpublished entry — say so plainly rather than letting
				    them wonder why nobody else can see it. */}
				{awaitingReview && (
					<p className="mt-6 flex items-start gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-4 text-sm text-text">
						<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
						<span>
							You added this centre, so only you can see it while our team checks it. It still works as
							your placement — your housing search is already measured from here.
						</span>
					</p>
				)}

				{/* ── Actions ── */}
				<div className="mt-7 flex flex-wrap gap-3">
					{isMyPlacement ? (
						<span className="inline-flex items-center gap-2 rounded-xl bg-success/12 px-4 py-2.5 text-sm font-bold text-success-ink">
							<Check className="h-4 w-4" /> This is your placement
						</span>
					) : (
						<button
							onClick={makeMyPlacement}
							disabled={setting}
							className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-lg hover:shadow-primary/25 disabled:opacity-60"
						>
							{setting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
							Set as my placement
						</button>
					)}
					<Link
						to={`/dashboard?nearCompany=${company._id}`}
						className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-surface px-4 py-2.5 text-sm font-bold text-primary-ink transition hover:border-primary/50"
					>
						<Search className="h-4 w-4" /> Browse all housing near here
					</Link>
				</div>

				{/* Their own entry: let them fix a typo or withdraw it. Without
				    this, a wrong area is permanent — the pin stays wrong, the
				    commute stays wrong, and a bogus row sits in the admin queue. */}
				{isOwner && awaitingReview && (
					<div className="mt-4 rounded-xl border border-muted/15 bg-surface p-4">
						<h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Correct your entry</h3>
						<div className="grid gap-3 sm:grid-cols-3">
							<input
								value={ownEdit.name}
								onChange={(e) => setOwnEdit((s) => ({ ...s, name: e.target.value }))}
								placeholder="Name"
								aria-label="Centre name"
								className="rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
							/>
							<input
								value={ownEdit.area}
								onChange={(e) => setOwnEdit((s) => ({ ...s, area: e.target.value }))}
								placeholder="Area in Ibadan"
								aria-label="Area"
								className="rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
							/>
							<input
								value={ownEdit.address}
								onChange={(e) => setOwnEdit((s) => ({ ...s, address: e.target.value }))}
								placeholder="Street address (optional)"
								aria-label="Street address"
								className="rounded-xl border border-muted/20 bg-surface-alt/40 px-3 py-2 text-sm text-text outline-none focus:border-primary/50"
							/>
						</div>
						<div className="mt-3 flex flex-wrap gap-2">
							<button
								onClick={saveOwnEdit}
								disabled={savingOwn}
								className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
							>
								{savingOwn ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
								Save and re-locate
							</button>
							<button
								onClick={removeOwn}
								disabled={savingOwn}
								className="inline-flex items-center gap-2 rounded-xl border border-danger/30 px-4 py-2 text-sm font-bold text-danger-ink disabled:opacity-60"
							>
								<Trash2 className="h-3.5 w-3.5" /> Remove this centre
							</button>
						</div>
					</div>
				)}

				<p className="mt-3 flex items-start gap-2 text-xs text-muted">
					<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
					NestFinder doesn't run the placement process — apply through your school's SIWES coordinator.
					Setting it here is only so we can measure your commute.
				</p>

				{/* ── Map ── */}
				<div className="mt-9">
					<h2 className="mb-3 flex items-center gap-2 font-serif text-2xl font-semibold text-text">
						<MapPin className="h-5 w-5 text-primary-ink" /> Where it is
					</h2>
					{located ? (
						<CompanyMap company={company} listings={nearby} radiusKm={radiusKm} />
					) : (
						<p className="rounded-xl border border-highlight/30 bg-highlight/10 p-4 text-sm text-text">
							We haven't been able to place this centre on the map yet, so we can't measure commutes from it.
						</p>
					)}
				</div>

				{/* ── Housing nearby ── */}
				<div className="mt-10">
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<h2 className="flex items-center gap-2 font-serif text-2xl font-semibold text-text">
							<Home className="h-5 w-5 text-primary-ink" /> Housing near here
						</h2>
						<div className="flex items-center gap-2">
							<label htmlFor="radius" className="text-xs font-bold uppercase tracking-wide text-muted">Within</label>
							<select
								id="radius"
								value={radiusKm}
								onChange={(e) => setRadiusKm(Number(e.target.value))}
								className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary/50"
							>
								{[3, 5, 10, 15, 25].map((r) => <option key={r} value={r}>{r} km</option>)}
							</select>
						</div>
					</div>

					{loadingNearby ? (
						<div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted" /></div>
					) : nearby.length === 0 ? (
						<p className="rounded-2xl border border-muted/15 bg-surface p-8 text-center text-sm text-muted">
							No listings within {radiusKm}km yet. Try widening the radius.
						</p>
					) : (
						<>
							<p className="mb-4 text-sm text-muted">
								{nearby.length} home{nearby.length === 1 ? '' : 's'} within {radiusKm}km
								{nearby[0]?.distanceKm != null && ` · nearest is ${commuteSummary(nearby[0].distanceKm)}`}
							</p>
							<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
								{nearby.map((l) => <ListingCard key={l._id} listing={l} />)}
							</div>
						</>
					)}
				</div>

				{/* ── What past students say ── */}
				{!awaitingReview && (
					<div className="mt-10 border-t border-muted/10 pt-8">
						<CompanyFeedback companyId={company._id} companyName={company.name} />
					</div>
				)}
			</div>
		</div>
	);
}
