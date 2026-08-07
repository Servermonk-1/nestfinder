import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, TrendingUp, ChevronDown, Search, Map, LayoutGrid, Briefcase, MapPinned } from 'lucide-react';
import FilterPanel from '../../components/search/FilterPanel';
import ListingGrid from '../../components/listing/ListingGrid';
import ListingsMap from '../../components/map/ListingsMap';
import { mapFrameHeight } from '../../components/map/mapSetup';
import SaveSearchButton from '../../components/search/SaveSearchButton';
import CompareBar from '../../components/listing/CompareBar';
import StudentNavbar from '../../components/common/StudentNavbar';
import CompareGuideBanner from '../../components/common/CompareGuideBanner';
import TourWelcomeCard from '../../components/common/TourWelcomeCard';
import TourSpotlight from '../../components/common/TourSpotlight';
import TourCompletionCard from '../../components/common/TourCompletionCard';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCompare } from '../../context/CompareContext';
import { useTour, shouldStartTour } from '../../hooks/useTour';
import { STUDENT_TOUR_STEPS } from '../../utils/tourSteps';

const TOUR_DEMO_LISTING_ID = '__tour_demo_listing__';

export default function Dashboard() {
	const [searchParams, setSearchParams] = useSearchParams();
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [totalPages, setTotalPages] = useState(1);
	const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
	const [cities, setCities] = useState([]);
	// Anchored search: results measured from the student's confirmed placement.
	const [nearPlacement, setNearPlacement] = useState(searchParams.get('nearPlacement') === '1');
	const [anchor, setAnchor] = useState(null);
	const [needsPlacement, setNeedsPlacement] = useState(false);
	const [radiusKm, setRadiusKm] = useState(15);
	// Deep link from a company page: anchor on THAT centre, not the student's own.
	const nearCompany = searchParams.get('nearCompany') || '';

	const { user } = useAuth();
	const { compareList, addToCompare, removeFromCompare } = useCompare();
	const tour = useTour(STUDENT_TOUR_STEPS, user);

	// Auto-start the tour on first-ever login, or when explicitly requested via ?tour=1 (Help Center).
	// Re-checks once `user` has loaded so a fresh account reliably gets the walkthrough.
	useEffect(() => {
		if (searchParams.get('tour') === '1') {
			setSearchParams((prev) => {
				const next = new URLSearchParams(prev);
				next.delete('tour');
				return next;
			}, { replace: true });
			const timeout = setTimeout(() => tour.start(), 300);
			return () => clearTimeout(timeout);
		}

		if (tour.phase === 'idle' && shouldStartTour(user)) {
			const timeout = setTimeout(() => tour.start(), 1200);
			return () => clearTimeout(timeout);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [user?.id]);

	// Step 4 spotlights the compare bar, which only renders when something is selected —
	// inject a throwaway demo listing for that one step, then remove it immediately after.
	useEffect(() => {
		const onCompareBarStep = tour.phase === 'active' && tour.currentStep?.target === '#tour-compare-bar';
		const hasDemo = compareList.some((l) => l._id === TOUR_DEMO_LISTING_ID);

		if (onCompareBarStep && !hasDemo) {
			addToCompare({ _id: TOUR_DEMO_LISTING_ID, title: 'Sample Listing', price: 0, amenities: [] });
		} else if (!onCompareBarStep && hasDemo) {
			removeFromCompare(TOUR_DEMO_LISTING_ID);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tour.phase, tour.stepIndex]);

	const [filters, setFilters] = useState({
		q: searchParams.get('q') || '',
		city: searchParams.get('city') || '',
		roomType: searchParams.get('roomType') || '',
		minPrice: '',
		maxPrice: '',
		amenities: [],
		sort: 'recommended',
	});

	// List vs map. Remembered, because a student who thinks spatially will want
	// the map every time they come back.
	const [view, setView] = useState(() => localStorage.getItem('nf_browse_view') || 'list');
	useEffect(() => localStorage.setItem('nf_browse_view', view), [view]);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setLoading(true);
			// A paginated map would be misleading — panning to an empty area that
			// actually has listings on "page 2". So the map loads the whole result set.
			const params = { page: view === 'map' ? 1 : page, limit: view === 'map' ? 100 : 6, sort: filters.sort };
			if (filters.q) params.q = filters.q;
			if (filters.city) params.city = filters.city;
			if (filters.roomType) params.roomType = filters.roomType;
			if (filters.minPrice) params.minPrice = filters.minPrice;
			if (filters.maxPrice) params.maxPrice = filters.maxPrice;
			if (filters.amenities?.length) params.amenities = filters.amenities.join(',');
			if (nearCompany) { params.nearCompany = nearCompany; params.radiusKm = radiusKm; }
			else if (nearPlacement) { params.nearPlacement = '1'; params.radiusKm = radiusKm; }

			api.get('/listings/search', { params })
				.then(({ data }) => {
					setListings(data.listings);
					setTotal(data.total);
					setTotalPages(data.pages);
					setAnchor(data.anchor || null);
					setNeedsPlacement(!!data.needsPlacement);
				})
				.catch(() => {
					setListings([]);
					setTotal(0);
					setTotalPages(1);
				})
				.finally(() => setLoading(false));
		}, 300);

		return () => clearTimeout(timeout);
	}, [filters, page, view, nearPlacement, radiusKm, nearCompany]);

	// The city filter only ever offers places that actually have listings.
	useEffect(() => {
		api.get('/listings/cities')
			.then(({ data }) => setCities(data.cities || []))
			.catch(() => setCities([]));
	}, []);

	const handleFilterChange = (updates) => {
		setFilters(prev => ({ ...prev, ...updates }));
		setPage(1);
	};

	const handleReset = () => {
		setFilters({
			q: '', city: '', roomType: '', minPrice: '',
			maxPrice: '', amenities: [], sort: 'recommended',
		});
		setPage(1);
		setSearchParams({});
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar onRestartTour={tour.start} />

			{/* ── Page Header ── */}
			<div className="border-b border-line bg-surface/70 px-4 pt-24 pb-5 sm:px-6 sm:pt-28 sm:pb-8">
				<div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-3 sm:gap-4">
					<div>
						<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
							<span className="h-px w-6 bg-primary/50" /> Student dashboard
						</motion.p>
						<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
							Browse homes
						</motion.h1>
						<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 text-sm text-muted">
							{/* Only claim "near your placement" when the search is actually
							    anchored to one — otherwise it's the same empty promise as
							    the old "Phone Number Verified" tick. */}
							{loading
								? 'Finding homes…'
								: `${total} verified home${total === 1 ? '' : 's'}${anchor ? ` within ${anchor.radiusKm}km of ${anchor.name}` : ''}`}
						</motion.p>
					</div>

					<motion.form
						onSubmit={(e) => e.preventDefault()}
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						role="search"
						className="order-last w-full lg:order-none lg:max-w-md"
					>
						<label htmlFor="tour-search-input" className="sr-only">Search homes</label>
						<div className="group relative">
							<Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary-ink" />
							<input
								id="tour-search-input"
								type="search"
								value={filters.q}
								onChange={(e) => handleFilterChange({ q: e.target.value })}
								placeholder="Try “self contained Bodija” or “quiet room Agbowo”"
								className="w-full rounded-xl border border-line bg-surface py-3 pl-11 pr-10 text-sm text-text shadow-card outline-none transition focus:border-primary/50 focus:bg-white"
							/>
							{filters.q && (
								<button
									type="button"
									onClick={() => handleFilterChange({ q: '' })}
									aria-label="Clear search"
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-text"
								>
									<X className="h-4 w-4" />
								</button>
							)}
						</div>
					</motion.form>

					<motion.button
						whileTap={{ scale: 0.95 }}
						onClick={() => setMobileFilterOpen(true)}
						className="flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-text lg:hidden"
					>
						<SlidersHorizontal className="h-4 w-4" /> Filters
					</motion.button>
				</div>
			</div>

			{/* ── Main Layout ── */}
			<div className="w-full max-w-full px-4 py-6 sm:px-6 sm:py-10">
				<div className="flex gap-6 xl:gap-10">

					{/* ── Sidebar Filter (Desktop) ── */}
					<aside id="tour-filters" className="hidden lg:block w-72 flex-shrink-0">
						<FilterPanel
							filters={filters}
							onChange={handleFilterChange}
							onReset={handleReset}
							totalResults={total}
							cities={cities}
						/>
					</aside>

					{/* ── Main Content ── */}
					<div className="flex-1 min-w-0">

						<CompareGuideBanner />

						{/* Sort bar */}
						<div className="flex items-center justify-between mb-6">
							<div className="flex items-center gap-2 flex-wrap">
								{/* Active filter chips */}
								{filters.q && (
									<span className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary-ink">
										“{filters.q}”
										<button onClick={() => handleFilterChange({ q: '' })} aria-label={`Remove search for ${filters.q}`}>
											<X className="w-3 h-3" />
										</button>
									</span>
								)}
								{filters.city && (
									<span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary-ink text-xs font-semibold px-3 py-1.5 rounded-full">
										{filters.city}
										<button onClick={() => handleFilterChange({ city: '' })} aria-label={`Remove ${filters.city} location filter`}>
											<X className="w-3 h-3" />
										</button>
									</span>
								)}
								{filters.roomType && (
									<span className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary-ink text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
										{filters.roomType}
										<button onClick={() => handleFilterChange({ roomType: '' })} aria-label={`Remove ${filters.roomType} room type filter`}>
											<X className="w-3 h-3" />
										</button>
									</span>
								)}
								{filters.amenities?.map(a => (
									<span key={a} className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary-ink text-xs font-semibold px-3 py-1.5 rounded-full capitalize">
										{a}
										<button onClick={() => handleFilterChange({ amenities: filters.amenities.filter(x => x !== a) })} aria-label={`Remove ${a} filter`}>
											<X className="w-3 h-3" />
										</button>
									</span>
								))}
							</div>

							<div className="flex items-center gap-3 text-muted text-xs flex-shrink-0">
								{/* List / map */}
								<div className="flex items-center rounded-full border border-muted/15 bg-surface-alt/60 p-0.5" role="group" aria-label="Browse view">
									{[
										{ id: 'list', label: 'List', Icon: LayoutGrid },
										{ id: 'map', label: 'Map', Icon: Map },
									].map(({ id, label, Icon }) => (
										<button
											key={id}
											onClick={() => setView(id)}
											aria-pressed={view === id}
											className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
												view === id ? 'bg-primary text-white' : 'text-muted hover:text-text'
											}`}
										>
											<Icon className="h-3.5 w-3.5" />
											{label}
										</button>
									))}
								</div>

								<TrendingUp className="w-3.5 h-3.5" />
								<span className="hidden sm:block">Sorted by:</span>
								<div className="relative">
									<select
										aria-label="Sort listings"
										value={filters.sort}
										onChange={e => handleFilterChange({ sort: e.target.value })}
										className="appearance-none bg-surface-alt/60 border border-muted/15 text-text text-xs font-semibold rounded-full pl-3.5 pr-8 py-2 outline-none cursor-pointer transition-colors hover:border-primary/30 focus:border-primary/50"
									>
										<option className="bg-surface" value="recommended">Recommended</option>
										<option className="bg-surface" value="newest">Newest</option>
										<option className="bg-surface" value="price_asc">Price: Low to High</option>
										<option className="bg-surface" value="price_desc">Price: High to Low</option>
									</select>
									<ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
								</div>
							</div>
						</div>

						{/* ── Near my placement ── */}
						<div className="mb-5">
							<div className="flex flex-wrap items-center gap-3">
							<button
								onClick={() => { setNearPlacement((v) => !v); setPage(1); }}
								aria-pressed={nearPlacement}
								className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
									nearPlacement
										? 'bg-primary text-white shadow-lg shadow-primary/20'
										: 'border border-primary/25 bg-surface text-primary-ink hover:border-primary/50'
								}`}
							>
								<Briefcase className="h-4 w-4" />
								{nearPlacement ? 'Showing homes near my placement' : 'Show homes near my placement'}
							</button>

							<SaveSearchButton filters={filters} nearPlacement={nearPlacement} radiusKm={radiusKm} />

							{/* Only useful once a search is actually anchored. */}
							{anchor && (
								<div className="flex items-center gap-2">
									<label htmlFor="radius-km" className="text-xs font-bold uppercase tracking-wide text-muted">
										Within
									</label>
									<select
										id="radius-km"
										value={radiusKm}
										onChange={(e) => { setRadiusKm(Number(e.target.value)); setPage(1); }}
										className="rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text outline-none transition focus:border-primary/50"
									>
										{[3, 5, 10, 15, 25, 40].map((r) => <option key={r} value={r}>{r} km</option>)}
									</select>
								</div>
							)}
							</div>

							{anchor && (
								<p className="mt-2 flex items-start gap-2 text-sm text-muted">
									<MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
									<span>
										Within <span className="font-bold text-ink">{anchor.radiusKm}km</span> of{' '}
										<span className="font-bold text-ink">{anchor.name}</span>, nearest first.
									</span>
								</p>
							)}

							{nearPlacement && needsPlacement && (
								<p className="mt-2 flex items-start gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-3 text-sm text-text">
									<Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
									<span>
										Add a <span className="font-bold">confirmed</span> SIWES placement on your{' '}
										<Link to="/account" className="font-bold text-primary-ink hover:underline">account page</Link>{' '}
										and we'll search around it.
									</span>
								</p>
							)}
						</div>

						{/* Results */}
						{view === 'map' ? (
							loading ? (
								<div className="flex items-center justify-center rounded-2xl border border-muted/15 bg-surface" style={{ height: mapFrameHeight(620) }}>
									<span className="text-sm text-muted">Loading map…</span>
								</div>
							) : (
								<ListingsMap listings={listings} anchor={anchor} />
							)
						) : (
							<ListingGrid listings={listings} loading={loading} />
						)}

						{/* Pagination — the map already shows every match, so it has no pages */}
						{view === 'list' && totalPages > 1 && (
							<div className="flex items-center justify-center gap-2 mt-10">
								<button
									onClick={() => setPage(p => Math.max(1, p - 1))}
									disabled={page === 1}
									className="px-4 py-2 bg-surface border border-muted/10 text-muted rounded-xl text-sm hover:border-primary/10 hover:text-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
								>
									Previous
								</button>
								{[...Array(totalPages)].map((_, i) => (
									<button
										key={i}
										onClick={() => setPage(i + 1)}
										className={`w-10 h-10 rounded-xl text-sm font-bold transition-all
                      ${page === i + 1
												? 'bg-primary text-white'
												: 'bg-surface border border-muted/10 text-muted hover:border-primary/10 hover:text-text'
											}`}
									>
										{i + 1}
									</button>
								))}
								<button
									onClick={() => setPage(p => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
									className="px-4 py-2 bg-surface border border-muted/10 text-muted rounded-xl text-sm hover:border-primary/10 hover:text-text transition-all disabled:opacity-40 disabled:cursor-not-allowed"
								>
									Next
								</button>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* ── Mobile Filter Drawer ── */}
			<AnimatePresence>
				{mobileFilterOpen && (
					<>
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							onClick={() => setMobileFilterOpen(false)}
							className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
						/>
						<motion.div
							initial={{ x: '-100%' }}
							animate={{ x: 0 }}
							exit={{ x: '-100%' }}
							transition={{ type: 'spring', stiffness: 300, damping: 30 }}
							className="fixed inset-y-0 left-0 w-80 bg-surface z-50 lg:hidden overflow-y-auto"
						>
							<div className="flex items-center justify-between p-5 border-b border-muted/10">
								<span className="text-text font-bold">Filters</span>
								<button
									onClick={() => setMobileFilterOpen(false)}
									aria-label="Close filters"
									className="text-muted hover:text-text"
								>
									<X className="w-5 h-5" />
								</button>
							</div>
							<div className="p-4">
								<FilterPanel
									filters={filters}
									onChange={(updates) => { handleFilterChange(updates); }}
									onReset={handleReset}
									totalResults={total}
							cities={cities}
								/>
							</div>
						</motion.div>
					</>
				)}
			</AnimatePresence>

			{/* ── Compare Bar ── */}
			<CompareBar />

			{/* ── Onboarding Tour ── */}
			{tour.phase === 'welcome' && (
				<TourWelcomeCard totalSteps={tour.totalSteps} onSkip={tour.skip} onStart={tour.begin} />
			)}
			{tour.phase === 'active' && (
				<TourSpotlight
					step={tour.currentStep}
					stepIndex={tour.stepIndex}
					totalSteps={tour.totalSteps}
					onNext={tour.next}
					onPrev={tour.prev}
					onSkip={tour.skip}
				/>
			)}
			{tour.phase === 'completing' && <TourCompletionCard onClose={tour.finish} />}
		</div>
	);
}

