import { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { monthlyRent } from '../../utils/price';
import { commuteSummary } from '../../utils/commute';
import { TILE_URL, TILE_ATTRIBUTION, priceMarker, coordsOf } from './mapSetup';
import './map.css';

// A distinct marker for the workplace, so it can't be mistaken for a room.
const workplaceIcon = () =>
	L.divIcon({
		className: 'nf-work-marker',
		html: '<span class="nf-work"></span>',
		iconSize: [30, 30],
		iconAnchor: [15, 15],
	});

const shortNaira = (n) => {
	const v = Math.round(Number(n) || 0);
	if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}m`;
	if (v >= 1000) return `₦${Math.round(v / 1000)}k`;
	return `₦${v}`;
};

/**
 * A workplace with the housing around it.
 *
 * The commute is the whole question here, so the map shows the radius the
 * student is searching within rather than leaving them to judge distance by eye.
 */
export default function CompanyMap({ company, listings = [], radiusKm = 10, height = 380 }) {
	const centre = coordsOf(company);
	const placed = useMemo(
		() => listings.map((l) => ({ listing: l, position: coordsOf(l) })).filter((m) => m.position),
		[listings]
	);
	if (!centre) return null;

	// Fit the circle in frame: each halving of the radius is one zoom level.
	const zoom = radiusKm <= 3 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 15 ? 11.5 : 11;

	return (
		<div className="overflow-hidden rounded-2xl border border-muted/15" style={{ height }}>
			<MapContainer center={centre} zoom={zoom} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
				<TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

				<Circle
					center={centre}
					radius={radiusKm * 1000}
					pathOptions={{ color: '#0B6BD8', fillColor: '#0B6BD8', fillOpacity: 0.07, weight: 1.5, dashArray: '6 6' }}
				/>

				<Marker position={centre} icon={workplaceIcon()}>
					<Popup>
						<div className="p-3">
							<p className="font-serif text-sm font-bold text-ink">{company.name}</p>
							<p className="mt-0.5 text-xs text-muted">{[company.area, company.city].filter(Boolean).join(', ')}</p>
							<p className="mt-1 text-xs font-bold text-primary-ink">Your workplace</p>
						</div>
					</Popup>
				</Marker>

				{placed.map(({ listing, position }) => (
					<Marker key={listing._id} position={position} icon={priceMarker(shortNaira(monthlyRent(listing)))}>
						<Popup>
							<Link to={`/listings/${listing._id}`} className="block no-underline">
								<div className="space-y-1 p-3">
									<p className="font-serif text-sm font-bold leading-snug text-ink">{listing.title}</p>
									<p className="text-xs text-muted">{[listing.area, listing.city].filter(Boolean).join(', ')}</p>
									{listing.distanceKm != null && (
										<p className="text-xs font-bold text-primary-ink">{commuteSummary(listing.distanceKm)}</p>
									)}
								</div>
							</Link>
						</Popup>
					</Marker>
				))}
			</MapContainer>
		</div>
	);
}
