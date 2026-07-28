import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { MapPinOff, Star } from 'lucide-react';
import { monthlyRent } from '../../utils/price';
import { getImageUrl } from '../../utils/urlHelper';
import { TILE_URL, TILE_ATTRIBUTION, priceMarker, coordsOf } from './mapSetup';
import './map.css';

// Compact rent for a marker: ₦45,000 becomes "₦45k" so pills stay readable at
// map scale, where a dozen may overlap.
const shortNaira = (n) => {
	const v = Math.round(Number(n) || 0);
	if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}m`;
	if (v >= 1000) return `₦${Math.round(v / 1000)}k`;
	return `₦${v}`;
};

/**
 * Refit the viewport whenever the visible set changes — filtering down to two
 * listings should zoom to those two, not leave the student staring at the
 * previous, wider frame.
 */
function FitToMarkers({ points }) {
	const map = useMap();
	// Join the coordinates so the effect re-runs on a genuinely different set,
	// not on every re-render (the array is rebuilt each time).
	const key = points.map((p) => p.join(',')).join('|');

	useEffect(() => {
		if (!points.length) return;
		if (points.length === 1) {
			map.setView(points[0], 15);
		} else {
			map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
		}
	}, [key]); // eslint-disable-line react-hooks/exhaustive-deps

	return null;
}

/**
 * Browse listings by where they are rather than by row position — the question
 * "is this near my placement?" is spatial, and a list can't answer it.
 */
export default function ListingsMap({ listings = [], height = 620, anchor = null }) {
	const placed = useMemo(
		() => listings.map((l) => ({ listing: l, position: coordsOf(l) })).filter((m) => m.position),
		[listings]
	);
	// Keep the workplace in frame too, or a student can end up looking at rooms
	// with no idea where they sit relative to the place they have to reach.
	const points = useMemo(() => {
		const p = placed.map((m) => m.position);
		if (anchor?.lat != null && anchor?.lng != null) p.push([anchor.lat, anchor.lng]);
		return p;
	}, [placed, anchor]);
	const missing = listings.length - placed.length;

	if (!placed.length) {
		return (
			<div
				className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-muted/15 bg-surface px-6 text-center"
				style={{ height }}
			>
				<MapPinOff className="h-8 w-8 text-muted" />
				<p className="font-serif text-xl font-bold text-ink">Nothing to map yet</p>
				<p className="max-w-sm text-sm text-muted">
					{listings.length
						? "None of the listings matching your filters have been placed on the map yet. Switch back to the list to see them."
						: 'No listings match your filters. Try widening your search.'}
				</p>
			</div>
		);
	}

	return (
		<div>
			<div className="overflow-hidden rounded-2xl border border-muted/15" style={{ height }}>
				<MapContainer center={points[0]} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
					<TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
					<FitToMarkers points={points} />

					{/* The SIWES placement, when the search is anchored to one. */}
					{anchor?.lat != null && (
						<>
							<Circle
								center={[anchor.lat, anchor.lng]}
								radius={(anchor.radiusKm || 15) * 1000}
								pathOptions={{ color: '#C2603F', fillColor: '#C2603F', fillOpacity: 0.05, weight: 1.5, dashArray: '6 6' }}
							/>
							<Marker
								position={[anchor.lat, anchor.lng]}
								icon={L.divIcon({
									className: 'nf-work-marker',
									html: '<span class="nf-work"></span>',
									iconSize: [30, 30],
									iconAnchor: [15, 15],
								})}
							>
								<Popup>
									<div className="p-3">
										<p className="font-serif text-sm font-bold text-ink">{anchor.name}</p>
										<p className="mt-0.5 text-xs font-bold text-primary-ink">Your placement</p>
									</div>
								</Popup>
							</Marker>
						</>
					)}

					{placed.map(({ listing, position }) => (
						<Marker
							key={listing._id}
							position={position}
							icon={priceMarker(shortNaira(monthlyRent(listing)))}
						>
							<Popup>
								<Link to={`/listings/${listing._id}`} className="block no-underline">
									{listing.images?.[0] && (
										<img
											src={getImageUrl(listing.images[0])}
											alt=""
											className="h-24 w-full rounded-t-[14px] object-cover"
										/>
									)}
									<div className="space-y-1 p-3">
										<p className="font-serif text-sm font-bold leading-snug text-ink">{listing.title}</p>
										<p className="text-xs text-muted">
											{[listing.area, listing.city].filter(Boolean).join(', ')}
										</p>
										<div className="flex items-center justify-between pt-1">
											<span className="text-sm font-bold text-primary-ink">
												{shortNaira(monthlyRent(listing))}/mo
											</span>
											{listing.totalReviews > 0 && (
												<span className="flex items-center gap-1 text-xs font-bold text-muted">
													<Star className="h-3 w-3 fill-highlight text-highlight" />
													{listing.rating}
												</span>
											)}
										</div>
									</div>
								</Link>
							</Popup>
						</Marker>
					))}
				</MapContainer>
			</div>

			{missing > 0 && (
				<p className="mt-2 text-xs text-muted">
					{missing} of {listings.length} matching {missing === 1 ? 'listing has' : 'listings have'} no map
					location yet and {missing === 1 ? 'is' : 'are'} only visible in the list.
				</p>
			)}
		</div>
	);
}
