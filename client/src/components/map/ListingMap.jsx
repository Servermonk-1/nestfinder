import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import { Info, BadgeCheck } from 'lucide-react';
import { TILE_URL, TILE_ATTRIBUTION, pinMarker, PRECISION_COPY, coordsOf } from './mapSetup';
import './map.css';

/**
 * Where one property is, on a real map.
 *
 * If the address could only be resolved to an area or city, this draws a circle
 * instead of implying the pin is the doorstep — a student travelling across
 * Ibadan to a wrong address is a real cost.
 */
export default function ListingMap({ listing, height = 320 }) {
	const center = coordsOf(listing);
	if (!center) return null;

	// A landlord-placed pin beats any precision we derived ourselves.
	const key = listing.locationSource === 'landlord' ? 'landlord' : listing.geocodePrecision;
	const precision = PRECISION_COPY[key] || PRECISION_COPY.area;
	const approximate = precision.radiusM > 0;
	// Zoom out as confidence drops, so the circle stays in frame.
	const zoom = precision.radiusM === 0 ? 16 : listing.geocodePrecision === 'city' ? 12 : 14;

	return (
		<div>
			<div className="overflow-hidden rounded-xl border border-muted/10" style={{ height }}>
				<MapContainer
					center={center}
					zoom={zoom}
					scrollWheelZoom={false}
					style={{ height: '100%', width: '100%' }}
				>
					<TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
					{approximate && (
						<Circle
							center={center}
							radius={precision.radiusM}
							pathOptions={{ color: '#C2603F', fillColor: '#C2603F', fillOpacity: 0.12, weight: 1.5 }}
						/>
					)}
					<Marker position={center} icon={pinMarker()} />
				</MapContainer>
			</div>

			<p className="mt-3 flex items-start gap-2 text-sm text-muted">
				{key === 'landlord' ? (
					<BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success-ink" />
				) : (
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
				)}
				<span>
					<span className="font-bold text-ink">{precision.label}.</span> {precision.note}
				</span>
			</p>
		</div>
	);
}
