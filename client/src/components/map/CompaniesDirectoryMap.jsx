import { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { MapPinOff } from 'lucide-react';
import { TILE_URL, TILE_ATTRIBUTION, coordsOf } from './mapSetup';
import './map.css';

const workplaceIcon = () =>
	L.divIcon({
		className: 'nf-work-marker',
		html: '<span class="nf-work"></span>',
		iconSize: [30, 30],
		iconAnchor: [15, 15],
	});

function FitAll({ points }) {
	const map = useMap();
	const key = points.map((p) => p.join(',')).join('|');
	useEffect(() => {
		if (!points.length) return;
		if (points.length === 1) map.setView(points[0], 14);
		else map.fitBounds(points, { padding: [50, 50], maxZoom: 14 });
	}, [key]); // eslint-disable-line react-hooks/exhaustive-deps
	return null;
}

/**
 * The whole directory on one map.
 *
 * Placement is a geographic decision as much as an academic one — two companies
 * that take the same department can sit on opposite sides of Ibadan, and that
 * difference decides where a student can afford to live.
 */
export default function CompaniesDirectoryMap({ companies = [], height = 620 }) {
	const placed = useMemo(
		() => companies.map((c) => ({ company: c, position: coordsOf(c) })).filter((m) => m.position),
		[companies]
	);
	const points = useMemo(() => placed.map((m) => m.position), [placed]);
	const missing = companies.length - placed.length;

	if (!placed.length) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-muted/15 bg-surface px-6 text-center" style={{ height }}>
				<MapPinOff className="h-8 w-8 text-muted" />
				<p className="font-serif text-xl font-bold text-ink">Nothing to map</p>
				<p className="max-w-sm text-sm text-muted">None of these placement centres have been located yet.</p>
			</div>
		);
	}

	return (
		<div>
			<div className="overflow-hidden rounded-2xl border border-muted/15" style={{ height }}>
				<MapContainer center={points[0]} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
					<TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
					<FitAll points={points} />
					{placed.map(({ company, position }) => (
						<Marker key={company._id} position={position} icon={workplaceIcon()}>
							<Popup>
								<Link to={`/companies/${company._id}`} className="block no-underline">
									<div className="space-y-1 p-3">
										<p className="font-serif text-sm font-bold leading-snug text-ink">{company.name}</p>
										<p className="text-xs text-muted">{company.industry}</p>
										<p className="text-xs text-muted">{[company.area, company.city].filter(Boolean).join(', ')}</p>
										<p className="pt-1 text-xs font-bold text-primary-ink">View and find housing →</p>
									</div>
								</Link>
							</Popup>
						</Marker>
					))}
				</MapContainer>
			</div>

			{missing > 0 && (
				<p className="mt-2 text-xs text-muted">
					{missing} of {companies.length} centres {missing === 1 ? 'has' : 'have'} no map location yet.
				</p>
			)}
		</div>
	);
}
