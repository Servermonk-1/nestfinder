import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import {
	ArrowLeft, Share2, MapPin, Phone, Mail, MessageCircle, Heart, GitCompare,
	CheckCircle2, ShieldCheck, ShieldAlert, Home, Flag, X, ChevronRight,
	Zap, Droplets, Shield, Wifi, Car, Flame, Lock, Eye, CalendarDays, DoorOpen,
	AlertTriangle, Sparkles, Compass, ExternalLink, Info, Briefcase, CalendarCheck,
} from 'lucide-react';
import StudentNavbar from '../../components/common/StudentNavbar';
import Seo from '../../components/common/Seo';
import ShareViewing from '../../components/listing/ShareViewing';
import TrustSignal from '../../components/listing/TrustSignal';
import ImageLightbox from '../../components/listing/ImageLightbox';
import ScoreBar from '../../components/listing/ScoreBar';
import StarRating from '../../components/listing/StarRating';
import ReviewsSection from '../../components/listing/ReviewsSection';
import SimilarListings from '../../components/listing/SimilarListings';
import HelpTip from '../../components/common/HelpTip';
import ListingMap from '../../components/map/ListingMap';
import BookingModal from '../../components/booking/BookingModal';
import { useAuth } from '../../context/AuthContext';
import { useSaved } from '../../context/SavedContext';
import { useCompare } from '../../context/CompareContext';
import { getImageUrl } from '../../utils/urlHelper';
import { formatPrice, formatConverted, naira, unitOf, unitSuffix } from '../../utils/price';
import { leaseFitsPlacement } from '../../utils/commute';
import useModalA11y from '../../hooks/useModalA11y';
import {
	generatePropertyInsight, estimateDetailPageCost, calculatePropertyScore,
	calculateSuitabilityIndex, generateWhyStudentsChooseThis, generateSuitableFor,
	generateStudentTip,
} from '../../utils/listingInsights';
import api from '../../services/api';

const AMENITY_ICONS = {
	electricity: Zap, water: Droplets, security: Shield, wifi: Wifi,
	parking: Car, kitchen: Flame, 'private bath': Lock,
};
const ALL_AMENITIES = ['electricity', 'water', 'security', 'wifi', 'parking', 'kitchen', 'private bath'];

const REPORT_REASONS = [
	{ value: 'fake', label: 'Fake or fraudulent listing' },
	{ value: 'overpriced', label: 'Overpriced for what is offered' },
	{ value: 'misleading', label: 'Misleading information or photos' },
	{ value: 'other', label: 'Other' },
];

function WhatsAppIcon({ className }) {
	return (
		<svg viewBox="0 0 24 24" fill="currentColor" className={className}>
			<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.55 3.7-8.25 8.25-8.25 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.24-8.25 8.24Zm4.52-6.17c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.73-.66-1.23-1.46-1.37-1.71-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
		</svg>
	);
}

// A section in the continuous left-column flow — divided from its neighbor
// by a hairline rather than boxed, so sections don't compete visually.
function FlowSection({ title, icon: Icon, children }) {
	return (
		<section className="border-t border-muted/10 pt-10 first:border-t-0 first:pt-0">
			{title && (
				<h2 className="mb-6 flex items-center gap-2.5 font-serif text-2xl font-semibold tracking-tight text-text">
					{Icon && <Icon className="h-5 w-5 text-primary-ink" />} {title}
				</h2>
			)}
			{children}
		</section>
	);
}

// A boxed, elevated "hero" section for the two data points that should win the eye.
function SpotlightCard({ title, icon: Icon, subtitle, children }) {
	return (
		<section className="rounded-3xl border border-line bg-surface p-7 shadow-card sm:p-9">
			<div className="mb-7">
				<h2 className="flex items-center gap-2.5 font-serif text-2xl font-semibold tracking-tight text-text">
					{Icon && <Icon className="h-5 w-5 text-primary-ink" />} {title}
				</h2>
				{subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
			</div>
			{children}
		</section>
	);
}

// Animated circular meter used for the two "hero" scores.
function ScoreRing({ value, size = 156, stroke = 12 }) {
	const radius = (size - stroke) / 2;
	const circumference = 2 * Math.PI * radius;
	const colorClass = value >= 80 ? 'stroke-success' : value >= 60 ? 'stroke-primary' : value >= 40 ? 'stroke-highlight' : 'stroke-danger';
	return (
		<div className="relative shrink-0" style={{ width: size, height: size }}>
			<svg width={size} height={size} className="-rotate-90">
				<circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-line" />
				<motion.circle
					cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} strokeLinecap="round"
					className={`fill-none ${colorClass}`}
					style={{ strokeDasharray: circumference }}
					initial={{ strokeDashoffset: circumference }}
					whileInView={{ strokeDashoffset: circumference * (1 - value / 100) }}
					viewport={{ once: true }}
					transition={{ duration: 1.3, ease: 'easeOut' }}
				/>
			</svg>
			<div className="absolute inset-0 flex flex-col items-center justify-center">
				<span className="font-serif text-5xl font-bold tracking-tight text-text">{value}</span>
				<span className="text-[11px] font-semibold uppercase tracking-widest text-muted">/ 100</span>
			</div>
		</div>
	);
}

function FactRow({ label, value }) {
	return (
		<div className="flex items-center justify-between border-b border-muted/10 py-3 text-base last:border-0">
			<span className="text-muted">{label}</span>
			<span className="font-semibold capitalize text-text">{value}</span>
		</div>
	);
}

export default function ListingDetailPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const { isSaved, toggleSaved } = useSaved();
	const { isInCompare, addToCompare, removeFromCompare, compareList } = useCompare();

	const [listing, setListing] = useState(null);
	// Distance from this room to the student's confirmed SIWES placement, sent by
	// the server (it alone knows where the student is training).
	const [placement, setPlacement] = useState(null);
	const [bookingOpen, setBookingOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [notFound, setNotFound] = useState(false);
	const [needsVerify, setNeedsVerify] = useState(false);
	const [activeImage, setActiveImage] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [messaging, setMessaging] = useState(false);
	const [reportOpen, setReportOpen] = useState(false);
	const [reportReason, setReportReason] = useState('');
	const [reportDetails, setReportDetails] = useState('');
	const [submittingReport, setSubmittingReport] = useState(false);
	const [landlordStats, setLandlordStats] = useState({ listings: [], total: 0, rating: 0, totalReviews: 0, responseLabel: 'Normal' });
	const [showLandlordListings, setShowLandlordListings] = useState(false);
	const reportRef = useModalA11y(reportOpen, () => setReportOpen(false));

	useEffect(() => {
		setLoading(true);
		setNotFound(false);
		setNeedsVerify(false);
		api.get(`/listings/${id}`)
			.then(({ data }) => { setListing(data.listing); setPlacement(data.placement || null); })
			.catch((err) => {
				if (err.response?.status === 403 && err.response.data?.needsIdentityVerification) {
					setNeedsVerify(true);
				} else {
					setNotFound(true);
				}
			})
			.finally(() => setLoading(false));
		setActiveImage(0);
		window.scrollTo(0, 0);
	}, [id]);

	// Track a view once per page load
	useEffect(() => {
		if (!id) return;
		api.patch(`/listings/${id}/view`)
			.then(({ data }) => setListing((prev) => (prev ? { ...prev, views: data.views } : prev)))
			.catch(() => {});
	}, [id]);

	// Landlord stats (member since, active listings, aggregate rating)
	useEffect(() => {
		const landlordId = listing?.landlord?._id;
		if (!landlordId) return;
		api.get(`/listings/landlord/${landlordId}/public`)
			.then(({ data }) => setLandlordStats(data))
			.catch(() => {});
	}, [listing?.landlord?._id]);

	const requireAuth = (action) => {
		if (!user) {
			toast(`Sign in to ${action}`, { icon: '🔒' });
			navigate('/student/login');
			return false;
		}
		return true;
	};

	const handleSave = () => {
		if (!requireAuth('save homes')) return;
		toggleSaved(listing);
	};

	const handleCompareToggle = () => {
		if (!requireAuth('compare homes')) return;
		if (isInCompare(listing._id)) removeFromCompare(listing._id);
		else if (compareList.length < 3) addToCompare(listing);
		else toast.error('You can only compare up to 3 homes at once');
	};

	const handleMessage = useCallback(async () => {
		if (!requireAuth('message the landlord')) return;
		if (!listing.landlord?._id || messaging) return;
		setMessaging(true);
		try {
			const { data } = await api.post('/messages/conversations', {
				landlordId: listing.landlord._id,
				listingId: listing._id,
			});
			navigate(`/messages?conversation=${data.conversation._id}`);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not start conversation');
		} finally {
			setMessaging(false);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [listing, messaging]);

	const openReport = () => {
		if (!requireAuth('report a listing')) return;
		setReportOpen(true);
	};

	const submitReport = async () => {
		if (!reportReason || submittingReport) return;
		setSubmittingReport(true);
		try {
			const { data } = await api.post('/reports', {
				listingId: listing._id,
				reason: reportReason,
				details: reportDetails,
			});
			toast.success(data.message || 'Report submitted');
			setReportOpen(false);
			setReportReason('');
			setReportDetails('');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not submit report');
		} finally {
			setSubmittingReport(false);
		}
	};

	const handleShare = async () => {
		const url = window.location.href;
		if (navigator.share) {
			try {
				await navigator.share({ title: listing.title, url });
			} catch {
				/* user cancelled — no-op */
			}
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Link copied to clipboard');
		} catch {
			toast.error('Could not copy link');
		}
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-base text-text">
				<StudentNavbar />
				<div className="flex min-h-screen items-center justify-center pt-20">
					<div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
				</div>
			</div>
		);
	}

	if (needsVerify) {
		return (
			<div className="min-h-screen bg-base text-text">
				<StudentNavbar />
				<div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center">
					<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
						<ShieldCheck className="h-8 w-8 text-primary-ink" />
					</div>
					<h1 className="font-serif text-3xl font-bold tracking-tight">Verify your identity to view this</h1>
					<p className="mt-2 max-w-sm text-sm text-muted">
						To keep the community safe, full listing details are only available to verified students. Upload your ID from your account — it's quick.
					</p>
					<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
						<button onClick={() => navigate('/account')} className="rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow">
							Get verified
						</button>
						<button onClick={() => navigate('/dashboard')} className="rounded-xl border border-muted/20 px-6 py-3 text-sm font-bold text-muted transition hover:text-text">
							Back to browse
						</button>
					</div>
				</div>
			</div>
		);
	}

	if (notFound || !listing) {
		return (
			<div className="min-h-screen bg-base text-text">
				<StudentNavbar />
				<div className="flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center">
					<Home className="mb-4 h-12 w-12 text-muted" />
					<h1 className="font-serif text-3xl font-bold tracking-tight">Listing not found</h1>
					<p className="mt-2 max-w-xs text-sm text-muted">This listing may have been removed or the link is incorrect.</p>
					<button onClick={() => navigate('/dashboard')} className="mt-6 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white">
						Browse Homes
					</button>
				</div>
			</div>
		);
	}

	const images = listing.images?.length ? listing.images : [];
	const inCompare = isInCompare(listing._id);
	const saved = isSaved(listing._id);
	const verified = listing.landlord?.verified;
	const phone = listing.landlord?.phone || listing.contactPhone;
	const email = listing.landlord?.email || listing.contactEmail;
	const notIncluded = ALL_AMENITIES.filter((a) => !listing.amenities?.some((la) => la.toLowerCase() === a));
	const cost = estimateDetailPageCost(listing, placement);
	const propertyScore = calculatePropertyScore(listing);
	const suitability = calculateSuitabilityIndex(listing, placement);
	// Does the minimum stay outlast the training period?
	const leaseFit = leaseFitsPlacement(listing, placement);
	const whyChoose = generateWhyStudentsChooseThis(listing);
	const suitableFor = generateSuitableFor(listing);
	const mapQuery = encodeURIComponent([listing.address, listing.area, listing.city, listing.state].filter(Boolean).join(', '));
	const whatsappLink = phone
		? `https://wa.me/234${phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
				`Hi, I found your listing on NestFinder. I am a SIWES student interested in your ${listing.roomType} at ${listing.area}, ${listing.city}. Is it still available?`
			)}`
		: null;

	// Every row here must reflect something the system actually checked.
	// "Phone number" is deliberately NOT called "verified": nothing sends an SMS
	// code, so claiming verification would be telling students a comforting lie
	// on the one panel where they are deciding whether to trust a stranger.
	const safetyChecks = [
		{ label: 'Identity verified by our team', ok: !!verified },
		{ label: 'Email address confirmed', ok: !!listing.landlord?.emailVerified },
		{
			label: listing.landlord?.phone ? 'Phone number provided (not verified)' : 'No phone number provided',
			ok: false,
			neutral: !!listing.landlord?.phone,
		},
		{ label: 'No admin flags on this listing', ok: !listing.flagged },
		{ label: 'No fraud reports', ok: (listing.reportCount || 0) === 0 },
	];

	return (
		<div className="min-h-screen bg-base text-text">
			<StudentNavbar />

			<Seo
				title={listing.title}
				description={`${listing.roomType} for rent in ${listing.area}, ${listing.city} — ${formatPrice(listing)}.${listing.amenities?.length ? ` Amenities: ${listing.amenities.slice(0, 4).join(', ')}.` : ''}`}
				image={images[0] ? getImageUrl(images[0]) : undefined}
				type="article"
			/>

			<div className="px-4 pb-28 pt-24 md:px-8 md:pb-20">
				<div className="mx-auto max-w-[1280px]">
					{/* Breadcrumb */}
					<div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted">
						<Link to="/" className="hover:text-primary-ink">Home</Link>
						<ChevronRight className="h-3 w-3" />
						<Link to="/dashboard" className="hover:text-primary-ink">Browse</Link>
						<ChevronRight className="h-3 w-3" />
						<span className="text-text">{listing.city}</span>
						<ChevronRight className="h-3 w-3" />
						<span className="truncate text-text">{listing.title}</span>
					</div>

					{/* Hero title row */}
					<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<button onClick={() => navigate(-1)} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-primary-ink">
								<ArrowLeft className="h-4 w-4" /> Back
							</button>
							<div>
								<span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${listing.available ? 'border border-success/30 bg-success/10 text-success' : 'border border-danger/30 bg-danger/10 text-danger-ink'}`}>
									{listing.available ? 'Available' : 'Unavailable'}
								</span>
							</div>
							<h1 className="mt-3 font-serif text-4xl font-bold leading-tight tracking-tight sm:text-5xl">{listing.title}</h1>
							<div className="mt-2.5 flex items-start gap-1.5 text-base text-muted">
								<MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
								<span>{[listing.address, listing.area, listing.city, listing.state].filter(Boolean).join(', ')}</span>
							</div>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<button
								onClick={handleSave}
								aria-label={saved ? 'Remove from saved homes' : 'Save this home'}
								className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${saved ? 'border-danger bg-danger text-text' : 'border-muted/15 text-muted hover:border-danger/50 hover:text-danger-ink'}`}
							>
								<Heart className={`h-4.5 w-4.5 ${saved ? 'fill-current' : ''}`} />
							</button>
							<button onClick={handleShare} className="inline-flex h-11 items-center gap-2 rounded-full border border-muted/15 px-4 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink">
								<Share2 className="h-4 w-4" /> Share
							</button>
						</div>
					</div>

					{/* Gallery — full width */}
					<div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl" style={{ height: '520px' }}>
						{images.length === 0 ? (
							<div className="col-span-4 row-span-2 flex items-center justify-center bg-surface-alt">
								<Home className="h-16 w-16 text-muted" />
							</div>
						) : (
							<>
								<button onClick={() => { setActiveImage(0); setLightboxOpen(true); }} className="col-span-4 row-span-2 sm:col-span-2 sm:row-span-2">
									<img src={getImageUrl(images[0])} alt={listing.title} className="h-full w-full object-cover transition hover:brightness-90" />
								</button>
								{images.slice(1, 4).map((img, i) => {
									const isLastVisible = i === 2 && images.length > 4;
									return (
										<button
											key={img}
											onClick={() => { setActiveImage(i + 1); setLightboxOpen(true); }}
											className="relative col-span-2 hidden sm:block"
										>
											<img src={getImageUrl(img)} alt="" className="h-full w-full object-cover transition hover:brightness-90" />
											{isLastVisible && (
												<div className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-bold text-white">
													+{images.length - 4} more
												</div>
											)}
										</button>
									);
								})}
							</>
						)}
					</div>
					{images.length > 0 && (
						<p className="mt-2 text-xs text-muted">{images.length} photo{images.length !== 1 ? 's' : ''} · tap to view full screen</p>
					)}

					{/* Two-column split */}
					<div className="mt-14 grid gap-12 lg:grid-cols-[1fr_400px]">
						{/* LEFT — content flow */}
						<div className="min-w-0 space-y-12">
							{/* Property Insights */}
							<FlowSection title="Property Insights" icon={Sparkles}>
								<p className="text-base leading-relaxed text-muted">{generatePropertyInsight(listing)}</p>
							</FlowSection>

							{/* Quick Facts */}
							<FlowSection title="Quick Facts">
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
									{[
										{ label: 'Property Type', value: listing.roomType },
										{ label: 'Available Rooms', value: listing.rooms },
										{ label: 'Move-in', value: listing.available ? 'Immediate' : 'Not Available' },
										{ label: 'Minimum Stay', value: listing.minimumStay },
										{ label: 'Furnishing', value: listing.furnished ? 'Furnished' : 'Unfurnished' },
										{ label: 'Listed', value: formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true }) },
									].map((fact) => (
										<div key={fact.label} className="rounded-xl border border-muted/10 bg-surface-alt/40 p-4">
											<p className="text-xs font-bold uppercase tracking-wide text-muted">{fact.label}</p>
											<p className="mt-1.5 truncate text-lg font-bold capitalize text-text">{fact.value}</p>
										</div>
									))}
								</div>
							</FlowSection>

							{/* Amenities */}
							<FlowSection title={`Amenities (${listing.amenities?.length || 0} included)`}>
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
									{listing.amenities?.map((a) => {
										const key = a.toLowerCase();
										const Icon = AMENITY_ICONS[key] || CheckCircle2;
										return (
											<div key={a} className="rounded-xl border border-success/15 bg-success/5 px-4 py-3">
												<div className="flex items-center gap-2 text-base font-bold text-text">
													<Icon className="h-4 w-4 shrink-0 text-primary-ink" /> <span className="capitalize">{a}</span>
												</div>
												<p className="mt-1 text-xs text-muted">Included</p>
											</div>
										);
									})}
								</div>

								{notIncluded.length > 0 && (
									<div className="mt-6 border-t border-muted/10 pt-5">
										<p className="mb-2.5 text-xs font-bold uppercase tracking-widest text-danger-ink/80">Not Included in This Listing</p>
										<div className="flex flex-wrap gap-2">
											{notIncluded.map((a) => (
												<span key={a} className="inline-flex items-center gap-1 rounded-full border border-danger/20 bg-danger/5 px-2.5 py-1 text-xs capitalize text-danger-ink/80">
													<X className="h-3 w-3" /> {a}
												</span>
											))}
										</div>
									</div>
								)}
							</FlowSection>

							{/* Student Suitability Index — spotlight */}
							<SpotlightCard title="Student Suitability Index" icon={Sparkles} subtitle="Evaluated specifically for SIWES students">
								<div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
									<div className="flex flex-col items-center gap-3 text-center">
										<ScoreRing value={suitability.overall} />
										<p className="text-sm font-semibold text-success">
											{suitability.overall >= 85 ? 'Highly Recommended for SIWES' : suitability.overall >= 65 ? 'Recommended for SIWES' : 'Consider Carefully'}
										</p>
									</div>
									<div className="w-full space-y-3.5">
										<ScoreBar label="Academic Environment" value={suitability.academicEnvironment} />
										<ScoreBar label="Internet Reliability" value={suitability.internetReliability} />
										<ScoreBar label="Transportation" value={suitability.transportation} />
										<ScoreBar label="Security" value={suitability.security} />
										<ScoreBar label="Affordability" value={suitability.affordability} />
										<ScoreBar label="Comfort & Rest" value={suitability.comfort} />
									</div>
								</div>
							</SpotlightCard>

							{/* Why Students Choose This */}
							{whyChoose.length > 0 && (
								<FlowSection title="Why Students Choose This">
									<div className="grid gap-3 sm:grid-cols-2">
										{whyChoose.map((reason) => (
											<div key={reason} className="flex items-center gap-2 text-base text-text">
												<CheckCircle2 className="h-4 w-4 shrink-0 text-success" /> {reason}
											</div>
										))}
									</div>
								</FlowSection>
							)}

							{/* Suitable For */}
							<FlowSection title="Suitable For">
								<div className="flex flex-wrap gap-2">
									{suitableFor.map((s) => (
										<span key={s} className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-2 text-sm font-semibold text-primary-ink">
											<CheckCircle2 className="h-3.5 w-3.5" /> {s}
										</span>
									))}
								</div>
							</FlowSection>

							{/* Safety & Verification */}
							<FlowSection title="Safety & Verification" icon={ShieldCheck}>
								<div className="space-y-3">
									{safetyChecks.map((c) => (
										<div key={c.label} className="flex items-center gap-2 text-base">
											{c.ok
												? <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
												: c.neutral
													? <Info className="h-4 w-4 shrink-0 text-muted" />
													: <AlertTriangle className="h-4 w-4 shrink-0 text-highlight" />}
											<span className={c.ok ? 'text-text' : c.neutral ? 'text-muted' : 'text-highlight'}>{c.label}</span>
										</div>
									))}
								</div>
								<div className="mt-5 flex items-center justify-between text-xs text-muted">
									<span>Last updated {formatDistanceToNow(new Date(listing.updatedAt), { addSuffix: true })}</span>
									<span>Listing ID: #{listing._id.slice(-8)}</span>
								</div>
							</FlowSection>

							{/* Availability Timeline */}
							<FlowSection title="Availability" icon={CalendarDays}>
								<FactRow label="Status" value={listing.available ? 'Available Now' : 'Unavailable'} />
								<FactRow label="Move-in" value={listing.available ? 'Immediate' : 'Not available'} />
								<FactRow label="Lease Duration" value={listing.leaseDuration} />
								<FactRow label="Inspection" value="Available Daily" />
								<FactRow label="Viewing Hours" value={listing.viewingHours} />
							</FlowSection>

							{/* Environment */}
							<FlowSection title="Environment" icon={Compass}>
								<FactRow label="Noise Level" value={listing.environment?.noiseLevel} />
								<FactRow label="Privacy Level" value={listing.environment?.privacyLevel} />
								<FactRow label="Ventilation" value={listing.environment?.ventilation} />
								<FactRow label="Natural Lighting" value={listing.environment?.naturalLighting} />
								<FactRow label="Surroundings" value={listing.environment?.surroundings} />
							</FlowSection>

							{/* Internet & Utilities */}
							<FlowSection title="Internet & Utilities">
								<FactRow label="Internet" value={listing.utilities?.internetType} />
								<FactRow label="Electricity" value={`Est. ${listing.utilities?.electricityHours ?? 18} hours/day`} />
								<FactRow label="Water" value={listing.utilities?.waterSource} />
								<FactRow label="Waste Disposal" value={listing.utilities?.wasteDisposal} />
								<FactRow label="Generator" value={listing.utilities?.generator ? 'Available (backup)' : 'Not available'} />
							</FlowSection>

							{/* Property Score — spotlight */}
							<SpotlightCard title="Property Score" icon={Sparkles}>
								<div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center sm:gap-10">
									<div className="flex flex-col items-center gap-3 text-center">
										<ScoreRing value={propertyScore.overall} />
										<StarRating value={propertyScore.overall / 20} />
										<p className="text-sm font-semibold text-primary-ink">
											{propertyScore.overall >= 80 ? 'Excellent Choice' : propertyScore.overall >= 60 ? 'Good Choice' : 'Fair Choice'}
										</p>
									</div>
									<div className="w-full space-y-3.5">
										<ScoreBar label="Affordability" value={propertyScore.affordability} />
										<ScoreBar label="Security" value={propertyScore.security} />
										<ScoreBar label="Comfort" value={propertyScore.comfort} />
										<ScoreBar label="Amenities" value={propertyScore.amenities} />
										<ScoreBar label="Landlord Trust" value={propertyScore.landlordTrust} />
									</div>
								</div>
							</SpotlightCard>

							{/* Monthly Living Cost */}
							<FlowSection title="Estimated Monthly Living Cost">
								<FactRow label="Rent" value={`₦${cost.rent.toLocaleString()}`} />
								<FactRow label="Electricity (est.)" value={`₦${cost.electricity.toLocaleString()}`} />
								<FactRow label="Water (est.)" value={`₦${cost.water.toLocaleString()}`} />
								<FactRow label="Internet" value={cost.internetIncluded ? 'Included in rent' : `₦${cost.internet.toLocaleString()}`} />
								<FactRow
								label={cost.commute ? `Transport to ${placement.company}` : 'Transport (generic est.)'}
								value={`₦${cost.transport.toLocaleString()}`}
							/>

							{/* The one cost that genuinely varies by location — so when we
							    know where the student trains, show the actual journey
							    rather than the same flat figure for every listing. */}
							{cost.commute ? (
								<div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
									<p className="flex items-center gap-2 text-sm font-bold text-text">
										<Briefcase className="h-4 w-4 text-primary-ink" />
										About {cost.commute.minutes} minutes to {placement.company}
									</p>
									<p className="mt-1.5 text-sm text-muted">
										Roughly {cost.commute.roadKm}km by road ·{' '}
										{cost.commute.mode === 'walk'
											? 'walkable'
											: `${cost.commute.label} at about ₦${cost.commute.farePerTrip} each way`}
										{cost.commute.mode !== 'walk' && ' · 2 trips a day, 22 days a month'}
									</p>
									<p className="mt-2 text-xs text-muted">
										Estimated from straight-line distance with an allowance for real roads. Fares vary
										by route and time of day.
									</p>
								</div>
							) : (
								<p className="mt-3 flex items-start gap-2 text-xs text-muted">
									<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
									<span>
										Transport is a generic average.{' '}
										<Link to="/account" className="font-bold text-primary-ink hover:underline">
											Add your SIWES placement
										</Link>{' '}
										and we'll price the actual journey from this room.
									</span>
								</p>
							)}
								<div className="mt-3 flex items-center justify-between border-t border-primary/10 pt-4">
									<span className="flex items-center text-base font-bold text-text">
										Estimated Total
										<HelpTip title="About this estimate" description="These figures are estimates based on average costs for the area. Actual costs may vary by usage and provider." />
									</span>
									<span className="font-serif text-2xl font-bold tracking-tight text-primary-ink">₦{cost.total.toLocaleString()}/month</span>
								</div>
							</FlowSection>

							{/* SIWES lease fit — the specific trap: the attachment runs
							    ~6 months, but landlords routinely want a full year. */}
							{leaseFit && !leaseFit.fits && (
								<FlowSection title="Lease vs your SIWES period" icon={CalendarDays}>
									<div className="rounded-xl border border-highlight/40 bg-highlight/10 p-5">
										<p className="flex items-start gap-2 font-bold text-text">
											<AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
											This room asks for {leaseFit.requiredMonths} months, but your training runs
											about {leaseFit.placementMonths}.
										</p>
										<p className="mt-2 text-base text-muted">
											That's roughly <span className="font-bold text-ink">{leaseFit.extraMonths} extra
											month{leaseFit.extraMonths === 1 ? '' : 's'}</span> you'd be paying for after your
											SIWES ends. Many landlords will negotiate a shorter let — ask before you pay
											anything.
										</p>
									</div>
								</FlowSection>
							)}

							{leaseFit?.fits && (
								<FlowSection title="Lease vs your SIWES period" icon={CalendarDays}>
									<p className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/8 p-5 text-base text-text">
										<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
										<span>
											The {leaseFit.requiredMonths}-month minimum stay fits inside your{' '}
											{leaseFit.placementMonths}-month training period.
										</span>
									</p>
								</FlowSection>
							)}

							{/* Location */}
							<FlowSection title="Location" icon={MapPin}>
								<p className="mb-4 text-base text-muted">{[listing.address, listing.area, listing.city, listing.state].filter(Boolean).join(', ')}</p>
								{/* A real pinned map when we've geocoded the address; the search
								    embed only as a fallback, since it can't show a pin. */}
								{listing.location?.coordinates?.length === 2 ? (
									<ListingMap listing={listing} />
								) : (
									<div className="overflow-hidden rounded-xl border border-muted/10" style={{ height: '320px' }}>
										<iframe
											title="Listing location"
											src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
											width="100%"
											height="100%"
											style={{ border: 0 }}
											loading="lazy"
										/>
									</div>
								)}
								<a
									href={`https://www.google.com/maps/dir/?api=1&destination=${mapQuery}`}
									target="_blank"
									rel="noreferrer"
									className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-primary-ink hover:underline"
								>
									Get Directions <ExternalLink className="h-3.5 w-3.5" />
								</a>
							</FlowSection>

							{/* Listing Activity */}
							<FlowSection title="Listing Activity" icon={Eye}>
								<div className="space-y-2.5 text-base text-muted">
									<p>● Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}</p>
									<p>● {listing.views || 0} student{listing.views === 1 ? '' : 's'} viewed this listing</p>
									{listing.reportCount > 0 && <p>● {listing.reportCount} fraud report{listing.reportCount !== 1 ? 's' : ''} submitted</p>}
									<p>● Last updated {formatDistanceToNow(new Date(listing.updatedAt), { addSuffix: true })}</p>
								</div>
							</FlowSection>

							{/* Student Tip */}
							<FlowSection title="Student Tip">
								<div className="rounded-2xl border border-highlight/25 bg-highlight/5 p-6">
									<p className="text-base leading-relaxed text-muted">{generateStudentTip(listing)}</p>
								</div>
							</FlowSection>

							{/* Reviews */}
							<FlowSection title="">
								<ReviewsSection listingId={listing._id} />
							</FlowSection>
						</div>

						{/* RIGHT — sticky commanding card */}
						<div className="min-w-0">
							<motion.div
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								className="space-y-6 rounded-3xl border border-line bg-surface p-7 shadow-card lg:sticky lg:top-24"
							>
								<div>
									<div className="flex items-baseline gap-2">
										<span className="font-serif text-5xl font-bold tracking-tight text-primary-ink">{naira(listing.price)}</span>
										<span className="text-base font-medium text-muted">{unitSuffix(unitOf(listing))}</span>
									</div>
									<p className="mt-1.5 text-xs text-muted">{formatConverted(listing)} · about {naira(cost.total)}/month with utilities & transport</p>
								</div>

								<div className="flex flex-wrap gap-2">
									<span className="rounded-full border border-muted/15 bg-surface-alt/50 px-3 py-1.5 text-xs font-semibold capitalize">{listing.roomType}</span>
									<span className="rounded-full border border-muted/15 bg-surface-alt/50 px-3 py-1.5 text-xs font-semibold">{listing.rooms} room{listing.rooms !== 1 ? 's' : ''}</span>
									<span className="rounded-full border border-muted/15 bg-surface-alt/50 px-3 py-1.5 text-xs font-semibold">{listing.furnished ? 'Furnished' : 'Unfurnished'}</span>
								</div>

								{/* Stats grid */}
								<div className="grid grid-cols-2 gap-3 border-y border-muted/10 py-4 text-xs text-muted">
									<span className="flex items-center gap-1.5"><Eye className="h-3.5 w-3.5 text-primary-ink" /> {listing.views || 0} Views</span>
									<span className="flex items-center gap-1.5"><DoorOpen className="h-3.5 w-3.5 text-primary-ink" /> {listing.rooms} Room{listing.rooms !== 1 ? 's' : ''}</span>
									<span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary-ink" /> Listed {formatDistanceToNow(new Date(listing.createdAt), { addSuffix: true })}</span>
									<span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-primary-ink" /> {landlordStats.responseLabel}</span>
								</div>

								{/* The primary action once a student has decided. Students only,
								    and only while the room is actually available. */}
								{user?.role === 'student' && listing.available && !listing.flagged && (
									<button
										onClick={() => setBookingOpen(true)}
										className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:shadow-xl hover:shadow-primary/30"
									>
										<CalendarCheck className="h-4 w-4" /> Apply to book
									</button>
								)}

								<button
									onClick={handleCompareToggle}
									className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition ${inCompare ? 'border-primary bg-brand-gradient text-white' : 'border-primary/30 text-primary-ink hover:bg-primary/5'}`}
								>
									<GitCompare className="h-4 w-4" /> {inCompare ? 'Remove from Compare' : 'Add to Compare'}
								</button>

								{/* Landlord card */}
								<div className="border-t border-muted/10 pt-6">
									<div className="mb-4 flex items-center justify-between">
										<p className="text-xs font-bold uppercase tracking-widest text-primary-ink">Landlord</p>
										{verified ? (
											<span className="flex items-center gap-1 text-xs font-bold text-success"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
										) : (
											<span className="flex items-center gap-1 text-xs font-bold text-highlight"><ShieldAlert className="h-3.5 w-3.5" /> Unverified</span>
										)}
									</div>

									<div className="flex items-center gap-3">
										<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-gradient font-serif text-xl font-bold text-white">
											{listing.landlord?.fullName?.charAt(0).toUpperCase() || '?'}
										</div>
										<div className="min-w-0">
											<p className="truncate text-base font-semibold text-text">{listing.landlord?.fullName || 'Not provided'}</p>
											{listing.landlord?.createdAt && (
												<p className="text-xs text-muted">Member since {format(new Date(listing.landlord.createdAt), 'MMMM yyyy')}</p>
											)}
											<p className="text-xs text-muted">{landlordStats.total} active listing{landlordStats.total !== 1 ? 's' : ''}</p>
										</div>
									</div>

									{landlordStats.totalReviews > 0 ? (
										<div className="mt-3.5 flex items-center gap-2">
											<StarRating value={landlordStats.rating} size="h-3.5 w-3.5" />
											<span className="text-sm font-bold text-text">{landlordStats.rating}</span>
											<span className="text-xs text-muted">({landlordStats.totalReviews} review{landlordStats.totalReviews !== 1 ? 's' : ''})</span>
										</div>
									) : (
										<p className="mt-3.5 text-xs text-muted">No reviews yet</p>
									)}

									<TrustSignal score={listing.landlord?.trustScore} verified={verified} />

									<div className="mb-1 mt-4 space-y-2 text-sm">
										{phone ? (
											<a href={`tel:${phone}`} className="flex items-center gap-2 text-primary-ink hover:underline"><Phone className="h-3.5 w-3.5" /> {phone}</a>
										) : (
											<p className="flex items-center gap-2 text-muted"><Phone className="h-3.5 w-3.5" /> Not provided</p>
										)}
										{email ? (
											<a href={`mailto:${email}`} className="flex items-center gap-2 text-primary-ink hover:underline"><Mail className="h-3.5 w-3.5" /> {email}</a>
										) : (
											<p className="flex items-center gap-2 text-muted"><Mail className="h-3.5 w-3.5" /> Not provided</p>
										)}
									</div>

									<div className="mt-4 space-y-2">
										{listing.landlord?._id && (
											<button
												onClick={handleMessage}
												disabled={messaging}
												className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-50"
											>
												<MessageCircle className="h-4 w-4" /> {messaging ? 'Starting…' : 'Message Landlord'}
											</button>
										)}
										{whatsappLink && (
											<a
												href={whatsappLink}
												target="_blank"
												rel="noreferrer"
												className="flex w-full items-center justify-center gap-2 rounded-xl border border-success/30 bg-success/10 py-3 text-sm font-bold text-success transition hover:bg-success/20"
											>
												<WhatsAppIcon className="h-4 w-4" /> Chat on WhatsApp
											</a>
										)}
										<ShareViewing listing={listing} />
											{landlordStats.total > 0 && (
											<button
												onClick={() => setShowLandlordListings((v) => !v)}
												className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/20 py-3 text-sm font-bold text-primary-ink transition hover:bg-primary/5"
											>
												{showLandlordListings ? 'Hide' : 'View All'} Their Listings ({landlordStats.total})
											</button>
										)}
									</div>

									<AnimatePresence>
										{showLandlordListings && (
											<motion.div
												initial={{ opacity: 0, height: 0 }}
												animate={{ opacity: 1, height: 'auto' }}
												exit={{ opacity: 0, height: 0 }}
												className="mt-3 space-y-2 overflow-hidden"
											>
												{landlordStats.listings.filter((l) => l._id !== listing._id).map((l) => (
													<Link
														key={l._id}
														to={`/listings/${l._id}`}
														className="flex items-center justify-between rounded-xl border border-muted/10 bg-surface-alt/40 px-3 py-2.5 text-sm transition hover:border-primary/30"
													>
														<span className="truncate font-semibold text-text">{l.title}</span>
														<span className="shrink-0 text-xs text-muted">{formatPrice(l)}</span>
													</Link>
												))}
											</motion.div>
										)}
									</AnimatePresence>
								</div>

								<button
									onClick={openReport}
									className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-danger-ink/80 transition hover:text-danger-ink"
								>
									<Flag className="h-3.5 w-3.5" /> Report this listing
								</button>
							</motion.div>
						</div>
					</div>

					{/* Full-width: Similar Listings */}
					<div className="mt-16 border-t border-muted/10 pt-12">
						<SimilarListings listing={listing} />
					</div>

					{/* Full-width: Compare CTA banner */}
					<div className="mt-12 flex flex-col items-start justify-between gap-5 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 sm:flex-row sm:items-center sm:p-10">
						<div>
							<h2 className="font-serif text-2xl font-semibold tracking-tight">Not sure yet?</h2>
							<p className="mt-1.5 max-w-md text-base text-muted">Compare this property with up to 2 other listings side by side. Our system scores each one and recommends the best match.</p>
						</div>
						<button
							onClick={handleCompareToggle}
							className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3.5 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
						>
							<GitCompare className="h-4 w-4" /> {inCompare ? 'Remove from Compare' : 'Add to Compare'}
						</button>
					</div>
				</div>
			</div>

			{/* Mobile sticky bar */}
			<div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-primary/15 bg-surface/95 px-4 py-3 backdrop-blur-md md:hidden">
				<div>
					<p className="font-serif text-xl font-bold tracking-tight text-primary-ink">{naira(listing.price)}<span className="text-xs font-normal text-muted">{unitSuffix(unitOf(listing))}</span></p>
				</div>
				<div className="flex gap-2">
					<button onClick={handleCompareToggle} className="rounded-xl border border-primary/30 px-4 py-2.5 text-xs font-bold text-primary-ink">
						{inCompare ? 'Remove' : '+ Compare'}
					</button>
					<button onClick={handleMessage} disabled={messaging} className="rounded-xl bg-brand-gradient px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50">
						Contact Now
					</button>
				</div>
			</div>

			{/* Lightbox */}
			{lightboxOpen && (
				<ImageLightbox
					images={images}
					index={activeImage}
					onIndexChange={setActiveImage}
					onClose={() => setLightboxOpen(false)}
				/>
			)}

			<BookingModal
				listing={listing}
				placement={placement}
				open={bookingOpen}
				onClose={() => setBookingOpen(false)}
			/>

			{/* Report modal */}
			<AnimatePresence>
				{reportOpen && (
					<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
						<div className="fixed inset-0" onClick={() => setReportOpen(false)} />
						<motion.div
							ref={reportRef}
							tabIndex={-1}
							role="dialog"
							aria-modal="true"
							aria-labelledby="report-listing-title"
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="relative w-full max-w-sm rounded-2xl border border-primary/20 bg-surface p-6"
						>
							<button onClick={() => setReportOpen(false)} aria-label="Close" className="absolute right-4 top-4 text-muted hover:text-text">
								<X className="h-4 w-4" />
							</button>
							<h3 id="report-listing-title" className="pr-6 font-serif text-xl font-semibold tracking-tight">Report this listing</h3>
							<p className="mt-1 text-xs text-muted">Our admin team reviews reports within 24 hours.</p>

							<div className="mt-4 space-y-2">
								{REPORT_REASONS.map((r) => (
									<label
										key={r.value}
										className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${reportReason === r.value ? 'border-primary/50 bg-primary/5' : 'border-muted/15'}`}
									>
										<input
											type="radio"
											name="reason"
											value={r.value}
											checked={reportReason === r.value}
											onChange={() => setReportReason(r.value)}
											className="accent-primary"
										/>
										{r.label}
									</label>
								))}
							</div>

							<textarea
								value={reportDetails}
								onChange={(e) => setReportDetails(e.target.value)}
								rows={3}
								maxLength={500}
								placeholder="Additional details (optional)"
								className="mt-4 w-full resize-none rounded-xl border border-muted/15 bg-surface-alt/50 p-3 text-sm outline-none focus:border-primary/50"
							/>

							<button
								onClick={submitReport}
								disabled={!reportReason || submittingReport}
								className="mt-4 w-full rounded-xl bg-danger py-2.5 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-50"
							>
								{submittingReport ? 'Submitting…' : 'Submit Report'}
							</button>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}
