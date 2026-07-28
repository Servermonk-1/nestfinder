import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
	MapPin, Zap, Droplets, Shield, Wifi, Car, Flame, Lock,
	BadgeCheck, Home, Plus, Minus, Heart, MessageCircle, ArrowRight, Briefcase,
} from 'lucide-react';
import { useCompare } from '../../context/CompareContext';
import { commuteSummary } from '../../utils/commute';
import { useSaved } from '../../context/SavedContext';
import { getImageUrl } from '../../utils/urlHelper';
import { formatPrice } from '../../utils/price';
import api from '../../services/api';

const amenityIcons = {
	electricity: Zap, water: Droplets, security: Shield, wifi: Wifi,
	parking: Car, kitchen: Flame, 'private bath': Lock,
};

const roomLabel = { single: 'Single', shared: 'Shared', 'self-contained': 'Self-Contained' };

export default function ListingCard({ listing, isFirst = false }) {
	const navigate = useNavigate();
	const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
	const { isSaved, toggleSaved } = useSaved();
	const [imgError, setImgError] = useState(false);
	const [messaging, setMessaging] = useState(false);
	const listingId = listing._id || listing.id;
	const inCompare = isInCompare(listingId);
	const compareDisabled = compareList.length >= 3 && !inCompare;
	const saved = isSaved(listingId);

	const handleCompare = (e) => {
		e.preventDefault(); e.stopPropagation();
		if (inCompare) removeFromCompare(listing._id);
		else if (!compareDisabled) addToCompare(listing);
	};
	const handleSave = (e) => { e.preventDefault(); e.stopPropagation(); toggleSaved(listing); };
	const handleMessageLandlord = async (e) => {
		e.preventDefault(); e.stopPropagation();
		if (!listing.landlord?._id || messaging) return;
		setMessaging(true);
		try {
			const { data } = await api.post('/messages/conversations', { landlordId: listing.landlord._id, listingId });
			navigate(`/messages?conversation=${data.conversation._id}`);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not start conversation');
		} finally { setMessaging(false); }
	};

	return (
		<motion.div
			id={isFirst ? 'tour-first-card' : undefined}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			whileHover={{ y: -6 }}
			transition={{ duration: 0.3 }}
			className={`group relative overflow-hidden rounded-2xl border bg-surface shadow-card transition-all duration-300 hover:shadow-card-lg
        ${inCompare ? 'border-primary/60 ring-2 ring-primary/20' : 'border-line'}
        ${!listing.available ? 'opacity-80' : ''}`}
		>
			{/* ── Image ── */}
			<div className="relative h-52 overflow-hidden bg-surface-alt">
				{listing.images?.[0] && !imgError ? (
					<img src={getImageUrl(listing.images[0])} alt={listing.title} loading="lazy" decoding="async" onError={() => setImgError(true)} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
				) : (
					<div className="flex h-full w-full items-center justify-center"><Home className="h-12 w-12 text-muted" /></div>
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

				{!listing.available && (
					<div className="absolute inset-0 flex items-center justify-center bg-black/45">
						<span className="rotate-[-6deg] rounded-lg bg-danger px-4 py-1.5 text-sm font-black uppercase tracking-widest text-white shadow-lg">Taken</span>
					</div>
				)}

				{/* Top-left badges */}
				<div className="absolute left-3 top-3 flex items-center gap-2">
					{listing.landlord?.verified && (
						<span className="flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-success-ink shadow-sm">
							<BadgeCheck className="h-3.5 w-3.5" /> Verified
						</span>
					)}
					{listing.flagged && (
						<span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-highlight-ink shadow-sm">Under review</span>
					)}
				</div>

				{/* Save */}
				<motion.button
					onClick={handleSave} whileTap={{ scale: 0.85 }}
					aria-label={saved ? 'Remove from saved' : 'Save this home'}
					className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-sm transition ${saved ? 'bg-danger text-white' : 'bg-white/95 text-muted hover:text-danger-ink'}`}
				>
					<Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
				</motion.button>

				{/* Price */}
				<span className="absolute bottom-3 left-3 rounded-full bg-white/95 px-3 py-1 font-serif text-sm font-extrabold text-primary-ink shadow-sm">
					{formatPrice(listing)}
				</span>
			</div>

			{/* ── Content ── */}
			<div className="p-4">
				<div className="mb-1.5 flex items-center gap-2">
					<span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary-ink">{roomLabel[listing.roomType] || listing.roomType}</span>
					<span className="text-xs text-muted">· {listing.rooms} {listing.rooms > 1 ? 'rooms' : 'room'}</span>
				</div>

				<h3 className="truncate font-serif text-base font-bold text-text transition group-hover:text-primary-ink">{listing.title}</h3>
				<div className="mt-1 flex items-center gap-1 text-xs text-muted">
					<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
					<span className="truncate">{listing.area}, {listing.city}</span>
					{/* Present only on an anchored "near my placement" search. */}
					{listing.distanceKm !== undefined && listing.distanceKm !== null && (
						<span
							className="ml-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-primary/12 px-1.5 py-0.5 text-[10px] font-bold text-primary-ink"
							title="Estimated commute to your SIWES placement"
						>
							<Briefcase className="h-3 w-3" /> {commuteSummary(listing.distanceKm)}
						</span>
					)}
					{/* Only shown when the landlord placed the pin themselves — an
					    automatic guess must never wear a confirmation badge. */}
					{listing.locationSource === 'landlord' && (
						<span
							className="ml-0.5 inline-flex shrink-0 items-center gap-0.5 rounded-full bg-success/12 px-1.5 py-0.5 text-[10px] font-bold text-success-ink"
							title="The landlord placed this property's pin on the map themselves"
						>
							<BadgeCheck className="h-3 w-3" /> Pinned
						</span>
					)}
				</div>

				{/* Amenities */}
				<div className="mt-3 flex flex-wrap items-center gap-1.5">
					{listing.amenities?.slice(0, 3).map((amenity) => {
						const Icon = amenityIcons[amenity.toLowerCase()];
						return (
							<span key={amenity} className="flex items-center gap-1 rounded-full border border-line bg-surface-alt px-2 py-1 text-[11px] font-medium text-muted">
								{Icon && <Icon className="h-3 w-3 text-primary-ink" />} {amenity}
							</span>
						);
					})}
					{listing.amenities?.length > 3 && <span className="text-[11px] text-muted">+{listing.amenities.length - 3}</span>}
				</div>

				{/* Actions */}
				<div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-3">
					<motion.button
						id={isFirst ? 'tour-compare-btn' : undefined}
						onClick={handleCompare} whileTap={{ scale: 0.9 }} disabled={compareDisabled}
						className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition
              ${inCompare ? 'border-primary bg-primary/10 text-primary-ink' : compareDisabled ? 'cursor-not-allowed border-line text-muted/50' : 'border-line text-muted hover:border-primary/40 hover:text-primary-ink'}`}
					>
						{inCompare ? <><Minus className="h-3 w-3" /> Remove</> : <><Plus className="h-3 w-3" /> Compare</>}
					</motion.button>

					<div className="flex items-center gap-2">
						{listing.landlord?._id && (
							<button onClick={handleMessageLandlord} disabled={messaging} aria-label="Message landlord" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-primary/40 hover:text-primary-ink disabled:opacity-50">
								<MessageCircle className="h-4 w-4" />
							</button>
						)}
						<Link to={`/listings/${listingId}`} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-gradient px-3.5 py-2 text-xs font-bold text-white shadow-glow-sm transition hover:shadow-glow">
							Details <ArrowRight className="h-3.5 w-3.5" />
						</Link>
					</div>
				</div>
			</div>
		</motion.div>
	);
}
