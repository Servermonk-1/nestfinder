import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	ArrowLeft, MapPin, CheckCircle2, XCircle, Phone, Mail, Plus, X, Home,
	Zap, Droplets, Shield, Wifi, Car, Flame, Lock, Trophy, Medal, Award,
	ShieldCheck, ShieldAlert, Crown, MessageCircle, BookmarkPlus,
} from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { formatPrice } from '../../utils/price';
import { calculateWeightedScore, DEFAULT_WEIGHTS } from '../../utils/compareScore';
import { getImageUrl } from '../../utils/urlHelper';
import api from '../../services/api';
import ComparePrioritySliders from '../../components/listing/ComparePrioritySliders';
import CompareRadarChart from '../../components/listing/CompareRadarChart';
import CompareCostBreakdown from '../../components/listing/CompareCostBreakdown';
import CompareRecommendation from '../../components/listing/CompareRecommendation';
import ComparisonHistory from '../../components/listing/ComparisonHistory';
import HelpTip from '../../components/common/HelpTip';

const AMENITIES = [
	{ key: 'electricity', label: 'Electricity', icon: Zap },
	{ key: 'water', label: 'Water', icon: Droplets },
	{ key: 'security', label: 'Security', icon: Shield },
	{ key: 'wifi', label: 'WiFi', icon: Wifi },
	{ key: 'parking', label: 'Parking', icon: Car },
	{ key: 'kitchen', label: 'Kitchen', icon: Flame },
	{ key: 'private bath', label: 'Private Bath', icon: Lock },
];

const ROOM_TYPE_STYLES = {
	single: 'border-primary/20 bg-primary/10 text-primary-ink',
	shared: 'border-royal/25 bg-royal/10 text-royal',
	'self-contained': 'border-success/25 bg-success/10 text-success-ink',
};

const RANK_LABELS = ['#1 Best', '#2', '#3'];

const getId = (listing) => listing._id || listing.id;
const hasAmenity = (listing, key) => listing.amenities?.some((a) => a.toLowerCase() === key);

function getMatchTier(score) {
	if (score >= 80) return { label: 'Excellent Match', caption: 'This home checks almost every box.', icon: Trophy, bar: 'bg-primary', chip: 'border-primary/30 bg-primary/10 text-primary-ink' };
	if (score >= 60) return { label: 'Good Match', caption: 'A solid choice with only a few trade-offs.', icon: Medal, bar: 'bg-success', chip: 'border-success/30 bg-success/10 text-success-ink' };
	if (score >= 40) return { label: 'Fair Match', caption: 'Okay, but a few things could be better.', icon: Award, bar: 'bg-highlight', chip: 'border-highlight/30 bg-highlight/10 text-highlight-ink' };
	return { label: 'Limited Match', caption: 'This one falls short on several fronts.', icon: ShieldAlert, bar: 'bg-muted', chip: 'border-muted/30 bg-muted/10 text-muted' };
}

function useCountUp(target, duration = 900) {
	const [value, setValue] = useState(target);
	const prevTarget = useRef(0);

	useEffect(() => {
		const start = prevTarget.current;
		const change = target - start;
		if (change === 0) {
			setValue(target);
			return;
		}
		let frame;
		let startTime = null;
		const tick = (timestamp) => {
			if (startTime === null) startTime = timestamp;
			const progress = Math.min((timestamp - startTime) / duration, 1);
			setValue(Math.round(start + change * progress));
			if (progress < 1) {
				frame = requestAnimationFrame(tick);
			} else {
				prevTarget.current = target;
			}
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [target, duration]);

	return value;
}

function EmptyState({ title, subtitle, children }) {
	return (
		<div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
			<div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
				<Home className="h-9 w-9 text-primary-ink" />
			</div>
			<h1 className="font-serif text-2xl font-semibold text-text md:text-3xl">{title}</h1>
			<p className="mt-3 max-w-sm text-muted">{subtitle}</p>
			{children}
		</div>
	);
}

function MatchScore({ score, rank, isWinner, tier, TierIcon }) {
	const animatedScore = useCountUp(score);

	return (
		<div>
			<div className="flex items-center justify-between">
				<p className="flex items-center text-xs font-bold uppercase tracking-widest text-primary-ink">
					Match Score
					<HelpTip
						title="What is Match Score?"
						description="A score out of 100 calculated from price, amenities, landlord trust, and availability. Higher is better."
					/>
				</p>
				{isWinner && (
					<motion.div
						animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
						transition={{ duration: 1.6, repeat: Infinity }}
					>
						<Crown className="h-4 w-4 text-primary-ink" />
					</motion.div>
				)}
			</div>

			<div className="mt-2 flex items-end gap-2">
				<span className="font-serif text-4xl font-bold text-text">{animatedScore}</span>
				<span className="mb-1 text-sm text-muted">/ 100</span>
			</div>

			<div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-alt">
				<motion.div
					initial={{ width: 0 }}
					animate={{ width: `${score}%` }}
					transition={{ duration: 1.2, ease: 'easeOut' }}
					className={`h-full rounded-full ${tier.bar}`}
				/>
			</div>

			<div className="mt-3 flex flex-wrap items-center gap-2">
				<div className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tier.chip}`}>
					<TierIcon className="h-3 w-3" /> {tier.label}
				</div>
				<span className="text-[11px] font-bold text-muted">{RANK_LABELS[rank] || `#${rank + 1}`}</span>
			</div>
			<p className="mt-2 text-xs leading-relaxed text-muted">{tier.caption}</p>
		</div>
	);
}

function SaveComparisonForm({ onSave }) {
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);

	const handleSave = async () => {
		if (!name.trim() || saving) return;
		setSaving(true);
		const result = await onSave(name.trim());
		setSaving(false);
		if (result) {
			toast.success('Comparison saved');
			setName('');
			setOpen(false);
		} else {
			toast.error('Could not save this comparison');
		}
	};

	if (!open) {
		return (
			<button
				onClick={() => setOpen(true)}
				className="mx-auto mt-6 inline-flex items-center gap-2 rounded-xl border border-primary/30 px-5 py-2.5 text-sm font-bold text-primary-ink transition hover:border-primary/60 hover:bg-primary/5"
			>
				<BookmarkPlus className="h-4 w-4" /> Save This Comparison
			</button>
		);
	}

	return (
		<div className="mx-auto mt-6 flex w-full max-w-sm items-center gap-2">
			<input
				autoFocus
				type="text"
				value={name}
				onChange={(e) => setName(e.target.value)}
				onKeyDown={(e) => e.key === 'Enter' && handleSave()}
				placeholder="Name this comparison…"
				className="min-w-0 flex-1 rounded-xl border border-primary/20 bg-surface px-4 py-2.5 text-sm text-text outline-none focus:border-primary/50"
			/>
			<button
				onClick={handleSave}
				disabled={!name.trim() || saving}
				className="shrink-0 rounded-xl bg-brand-gradient px-4 py-2.5 text-sm font-bold text-white transition hover:shadow-glow disabled:opacity-50"
			>
				{saving ? 'Saving…' : 'Save'}
			</button>
		</div>
	);
}

export default function ComparePage() {
	const navigate = useNavigate();
	const { compareList, removeFromCompare, addToHistory, saveComparison, monthlyBudget, selectedSchool } = useCompare();

	// The student's confirmed placement, so the comparison can price the actual
	// commute from each room instead of the same flat guess for all of them.
	const [placementCompany, setPlacementCompany] = useState(null);
	useEffect(() => {
		api.get('/companies/placement/me')
			.then(({ data }) => {
				setPlacementCompany(data.placement?.status === 'confirmed' ? data.placement.company : null);
			})
			.catch(() => setPlacementCompany(null));
	}, []);
	const [messagingId, setMessagingId] = useState(null);
	const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
	const recordedKeyRef = useRef(null);

	// Auto-track this comparison in history once per unique set of listings
	useEffect(() => {
		if (compareList.length < 2) return;
		const key = compareList.map(getId).sort().join(',');
		if (recordedKeyRef.current === key) return;
		recordedKeyRef.current = key;
		addToHistory({ listings: compareList, preferences: weights, budget: monthlyBudget, school: selectedSchool });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [compareList]);

	const handleMessageLandlord = async (listing, id) => {
		if (!listing.landlord?._id || messagingId) return;
		setMessagingId(id);
		try {
			const { data } = await api.post('/messages/conversations', {
				landlordId: listing.landlord._id,
				listingId: id,
			});
			navigate(`/messages?conversation=${data.conversation._id}`);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not start conversation');
		} finally {
			setMessagingId(null);
		}
	};

	if (compareList.length === 0) {
		return (
			<div className="min-h-screen bg-paper text-text">
				<EmptyState
					title="Nothing to compare yet"
					subtitle="Go back to the dashboard and pick 2 or 3 homes you like — we'll line them up side by side so you can see what's different."
				>
					<button
						onClick={() => navigate('/dashboard')}
						className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
					>
						<Home className="h-4 w-4" /> Browse Homes
					</button>
				</EmptyState>
			</div>
		);
	}

	if (compareList.length === 1) {
		const listing = compareList[0];
		const image = getImageUrl(listing.images?.[0]);
		return (
			<div className="min-h-screen bg-paper text-text">
				<EmptyState
					title="Add one more home to compare"
					subtitle="Pick at least one more listing from the dashboard, then come back here to see them side by side."
				>
					<div className="mt-8 flex w-full max-w-xs items-center gap-4 rounded-xl border border-primary/15 bg-surface p-4 text-left">
						<div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-alt">
							{image ? (
								<img src={image} alt={listing.title} className="h-full w-full object-cover" />
							) : (
								<div className="flex h-full w-full items-center justify-center"><Home className="h-6 w-6 text-muted" /></div>
							)}
						</div>
						<div className="min-w-0">
							<p className="truncate text-sm font-bold text-text">{listing.title}</p>
							<p className="text-xs text-muted">{formatPrice(listing)}</p>
						</div>
					</div>
					<button
						onClick={() => navigate('/dashboard')}
						className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-6 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
					>
						<Plus className="h-4 w-4" /> Add More Homes
					</button>
				</EmptyState>
			</div>
		);
	}

	const scored = compareList
		.map((listing) => ({ ...listing, score: calculateWeightedScore(listing, compareList, weights) }))
		.sort((a, b) => b.score - a.score);

	const maxScore = scored[0].score;
	const minPrice = Math.min(...compareList.map((l) => l.price ?? Infinity));
	const maxPrice = Math.max(...compareList.map((l) => l.price ?? -Infinity));
	const amenityCounts = compareList.map((l) => l.amenities?.length || 0);
	const maxAmenities = Math.max(...amenityCounts);
	const secondBestAmenities = Math.max(0, ...amenityCounts.filter((c) => c !== maxAmenities), 0);
	const tiedForMostAmenities = amenityCounts.filter((c) => c === maxAmenities).length > 1;
	const allVerified = compareList.every((l) => l.landlord?.verified);
	const noneVerified = compareList.every((l) => !l.landlord?.verified);

	const amenityDifferentiators = new Set(
		AMENITIES.filter(({ key }) => {
			const states = compareList.map((l) => hasAmenity(l, key));
			return !states.every((s) => s === states[0]);
		}).map((a) => a.key)
	);

	return (
		<div className="min-h-screen bg-paper text-text">
			<div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
				{/* Header */}
				<motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<button
								onClick={() => navigate('/dashboard')}
								className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-surface text-text transition hover:border-primary/40 hover:text-primary-ink"
								aria-label="Back to dashboard"
							>
								<ArrowLeft className="h-5 w-5" />
							</button>
							<div>
								<h1 className="font-serif text-2xl font-bold text-text md:text-3xl">Compare Homes</h1>
								<p className="mt-1 text-sm text-muted">
									Comparing {compareList.length} of 3 homes — photos, price, and features, side by side.
								</p>
							</div>
						</div>
						{compareList.length < 3 && (
							<button
								onClick={() => navigate('/dashboard')}
								className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-surface px-5 py-2.5 text-sm font-bold text-primary-ink transition hover:border-primary/50 hover:bg-primary/5"
							>
								<Plus className="h-4 w-4" /> Add Another
							</button>
						)}
					</div>
					<div className="mt-6 h-px w-full bg-gradient-to-r from-primary/60 via-primary/10 to-transparent" />
				</motion.div>

				<div className="mt-6">
					<ComparePrioritySliders weights={weights} onChange={setWeights} />
				</div>

				<p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted md:hidden">
					Swipe sideways to compare →
				</p>

				{/* Comparison cards */}
				<div className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-6">
					<AnimatePresence>
						{scored.map((listing, rank) => {
							const id = getId(listing);
							const isWinner = listing.score === maxScore;
							const isLowestPrice = listing.price === minPrice && minPrice !== maxPrice;
							const hasMostAmenities = (listing.amenities?.length || 0) === maxAmenities && maxAmenities > 0;
							const amenitiesLead = hasMostAmenities ? maxAmenities - secondBestAmenities : 0;
							const isTopLandlord = listing.landlord?.verified && !allVerified && !noneVerified;
							const tier = getMatchTier(listing.score);
							const TierIcon = tier.icon;
							const image = getImageUrl(listing.images?.[0]);
							const verified = listing.landlord?.verified;
							const phone = listing.landlord?.phone || listing.contactPhone;
							const email = listing.landlord?.email || listing.contactEmail;

							return (
								<motion.div
									key={id}
									layout
									initial={{ opacity: 0, y: 24 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, scale: 0.95 }}
									transition={{ duration: 0.5, delay: rank * 0.1 }}
									className={`relative min-w-[280px] flex-1 snap-center rounded-2xl border bg-surface ${
										isWinner ? 'border-primary/60 shadow-xl shadow-primary/20' : 'border-primary/10'
									}`}
								>
									{isWinner && (
										<motion.div
											animate={{ opacity: [0.5, 1, 0.5] }}
											transition={{ duration: 2.2, repeat: Infinity }}
											className="pointer-events-none absolute -inset-px rounded-2xl border-2 border-primary/50"
										/>
									)}

									{/* Photo */}
									<div className="relative h-52 overflow-hidden rounded-t-2xl bg-surface-alt">
										{image ? (
											<img src={image} alt={listing.title} className="h-full w-full object-cover" />
										) : (
											<div className="flex h-full w-full items-center justify-center">
												<Home className="h-10 w-10 text-muted" />
											</div>
										)}
										<div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />

										<button
											onClick={() => removeFromCompare(id)}
											className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-danger"
											aria-label={`Remove ${listing.title} from comparison`}
										>
											<X className="h-4 w-4" />
										</button>

										{isWinner && (
											<motion.div
												initial={{ opacity: 0, y: -8, scale: 0.8 }}
												animate={{ opacity: 1, y: 0, scale: 1 }}
												transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.3 }}
												className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-brand-gradient px-3 py-1.5 text-xs font-black text-white shadow-lg"
											>
												<Crown className="h-3.5 w-3.5" /> Best Match
											</motion.div>
										)}
									</div>

									<div className="space-y-6 p-5">
										{/* Basic info */}
										<div>
											<h3 className="truncate font-serif text-lg font-bold text-text">{listing.title || 'Untitled Home'}</h3>
											<div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
												<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
												<span className="truncate">{[listing.area, listing.city].filter(Boolean).join(', ') || 'Location not set'}</span>
											</div>

											<div className="mt-3 flex flex-wrap gap-1.5">
												{hasMostAmenities && (
													<span className="inline-block rounded-full border border-highlight/30 bg-highlight/10 px-2.5 py-1 text-[11px] font-bold text-highlight-ink">
														Most Equipped
													</span>
												)}
												{isTopLandlord && (
													<span className="inline-block rounded-full border border-primary-dark/40 bg-primary-dark/10 px-2.5 py-1 text-[11px] font-bold text-primary-dark">
														Top Landlord
													</span>
												)}
											</div>
											{amenitiesLead > 0 && !tiedForMostAmenities && (
												<p className="mt-1.5 text-[11px] text-muted">+{amenitiesLead} more amenities than the rest</p>
											)}
										</div>

										{/* Price */}
										<div>
											<div className="flex items-baseline gap-2">
												<span className="font-serif text-2xl font-bold text-text">₦{(listing.price || 0).toLocaleString()}</span>
												<span className="text-xs text-muted">/month</span>
											</div>
											{isLowestPrice && (
												<>
													<span className="mt-2 inline-block rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[11px] font-bold text-success-ink">
														Best Price
													</span>
													<p className="mt-1.5 text-[11px] text-muted">You save ₦{(maxPrice - minPrice).toLocaleString()}/month vs the priciest option</p>
												</>
											)}
										</div>

										<CompareCostBreakdown listing={listing} placementCompany={placementCompany} />

										{/* Type + availability */}
										<div className="flex flex-wrap gap-2">
											<span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${ROOM_TYPE_STYLES[listing.roomType] || 'border-muted/20 bg-surface-alt text-muted'}`}>
												{listing.roomType || 'Room'}
											</span>
											<span className={`rounded-full border px-3 py-1 text-xs font-bold ${listing.available ? 'border-success/30 bg-success/10 text-success-ink' : 'border-danger/30 bg-danger/10 text-danger-ink'}`}>
												{listing.available ? 'Available' : 'Unavailable'}
											</span>
										</div>

										{/* Amenities */}
										<div>
											<div className="mb-3 flex items-center justify-between">
												<p className="text-xs font-bold uppercase tracking-widest text-primary-ink">What's Included</p>
												{amenityDifferentiators.size > 0 && (
													<span className="text-[10px] font-semibold text-highlight-ink">Highlighted = key difference</span>
												)}
											</div>
											<div className="grid grid-cols-2 gap-2">
												{AMENITIES.map((amenity, i) => {
													const has = hasAmenity(listing, amenity.key);
													const isDifferentiator = amenityDifferentiators.has(amenity.key);
													const AmenityIcon = amenity.icon;
													return (
														<motion.div
															key={amenity.key}
															initial={has ? { opacity: 0, scale: 0.5 } : { opacity: 0 }}
															whileInView={has ? { opacity: 1, scale: 1 } : { opacity: isDifferentiator ? 0.85 : 0.5 }}
															viewport={{ once: true }}
															transition={has
																? { type: 'spring', stiffness: 300, damping: 15, delay: i * 0.05 }
																: { duration: 0.3, delay: i * 0.05 }
															}
															className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all ${
																has ? 'bg-success/10 text-success-ink' : 'bg-surface-alt/60 text-muted'
															} ${isDifferentiator ? 'ring-1 ring-highlight/60' : ''}`}
														>
															{has ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
															<AmenityIcon className={`h-3 w-3 shrink-0 ${has ? '' : 'opacity-40'}`} />
															<span className="truncate">{amenity.label}</span>
														</motion.div>
													);
												})}
											</div>
										</div>

										{/* Landlord */}
										<div className="rounded-xl border border-primary/10 bg-surface-alt/50 p-4">
											<div className="flex items-center justify-between gap-2">
												<p className="text-xs font-bold uppercase tracking-widest text-primary-ink">Landlord</p>
												{verified ? (
													<span className="flex items-center gap-1 text-[11px] font-bold text-success-ink"><ShieldCheck className="h-3.5 w-3.5" /> Verified</span>
												) : (
													<span className="flex items-center gap-1 text-[11px] font-bold text-highlight-ink"><ShieldAlert className="h-3.5 w-3.5" /> Unverified</span>
												)}
											</div>
											<p className="mt-2 text-sm font-semibold text-text">{listing.landlord?.name || listing.landlord?.fullName || 'Not provided'}</p>
											<div className="mt-2 space-y-1.5 text-xs">
												{phone ? (
													<a href={`tel:${phone}`} className="flex items-center gap-1.5 text-primary-ink hover:underline"><Phone className="h-3 w-3" /> {phone}</a>
												) : (
													<p className="flex items-center gap-1.5 text-muted"><Phone className="h-3 w-3" /> Not provided</p>
												)}
												{email ? (
													<a href={`mailto:${email}`} className="flex items-center gap-1.5 text-primary-ink hover:underline"><Mail className="h-3 w-3" /> {email}</a>
												) : (
													<p className="flex items-center gap-1.5 text-muted"><Mail className="h-3 w-3" /> Not provided</p>
												)}
											</div>
										</div>

										{/* Match score */}
										<MatchScore score={listing.score} rank={rank} isWinner={isWinner} tier={tier} TierIcon={TierIcon} />

										{/* Actions */}
										<div className="space-y-2 pt-1">
											<Link
												to={`/listings/${id}`}
												className="block w-full rounded-xl border border-primary/30 py-2.5 text-center text-sm font-bold text-primary-ink transition hover:border-primary/60 hover:bg-primary/5"
											>
												View Full Listing
											</Link>
											{listing.landlord?._id && (
												<button
													onClick={() => handleMessageLandlord(listing, id)}
													disabled={messagingId === id}
													className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 py-2.5 text-sm font-bold text-primary-ink transition hover:border-primary/60 hover:bg-primary/5 disabled:opacity-50"
												>
													<MessageCircle className="h-4 w-4" /> Message Landlord
												</button>
											)}
											{phone ? (
												<a
													href={`tel:${phone}`}
													className="block w-full rounded-xl bg-brand-gradient py-2.5 text-center text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
												>
													Contact Landlord
												</a>
											) : (
												<button disabled className="block w-full cursor-not-allowed rounded-xl bg-line py-2.5 text-center text-sm font-bold text-muted">
													No Contact Info
												</button>
											)}
											<button
												onClick={() => removeFromCompare(id)}
												className="block w-full py-1 text-center text-[11px] font-semibold text-danger-ink/80 transition hover:text-danger-ink"
											>
												Remove from compare
											</button>
										</div>
									</div>
								</motion.div>
							);
						})}
					</AnimatePresence>
				</div>

				<div className="mt-8">
					<CompareRadarChart listings={compareList} />
				</div>

				<div className="mt-8">
					<CompareRecommendation scored={scored} />
				</div>

				<div className="mt-8">
					<ComparisonHistory />
				</div>

				{/* Decision section */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mt-4 rounded-2xl border border-primary/20 bg-surface-alt/40 p-8 text-center md:p-12"
				>
					<h2 className="font-serif text-2xl font-bold text-text md:text-3xl">Ready to make your decision?</h2>
					<p className="mx-auto mt-2 max-w-md text-sm text-muted">Here's a quick recap of everything you compared.</p>

					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{scored.map((listing) => {
							const id = getId(listing);
							const tier = getMatchTier(listing.score);
							const TierIcon = tier.icon;
							const isWinner = listing.score === maxScore;
							return (
								<motion.div
									key={id}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: isWinner ? -6 : 0 }}
									viewport={{ once: true }}
									transition={{ duration: 0.4 }}
									className={`rounded-xl border bg-surface p-5 text-left ${isWinner ? 'border-primary/50 shadow-lg shadow-primary/10' : 'border-primary/10'}`}
								>
									<p className="truncate font-serif text-base font-bold text-text">{listing.title}</p>
									<p className="mt-1 text-sm text-muted">{formatPrice(listing)}</p>
									<div className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${tier.chip}`}>
										<TierIcon className="h-3 w-3" /> {listing.score} · {tier.label}
									</div>
									<Link
										to={`/listings/${id}`}
										className="mt-4 block w-full rounded-lg bg-brand-gradient py-2 text-center text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
									>
										Choose This Listing
									</Link>
								</motion.div>
							);
						})}
					</div>

					<SaveComparisonForm
						onSave={(name) => saveComparison(name, { preferences: weights, budget: monthlyBudget, school: selectedSchool })}
					/>
				</motion.div>
			</div>
		</div>
	);
}
