import { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Crosshair, Loader2, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { TILE_URL, TILE_ATTRIBUTION, pinMarker } from './mapSetup';
import './map.css';

// Ibadan — where the platform's listings are. Only a starting frame; the
// landlord always ends up moving the pin or pressing "Find my address".
const FALLBACK_CENTRE = [7.3775, 3.947];

/** Drop the pin wherever the landlord clicks, not just where they drag it. */
function ClickToPlace({ onPlace }) {
	useMapEvents({ click: (e) => onPlace([e.latlng.lat, e.latlng.lng]) });
	return null;
}

/** Recentre when a lookup returns a new suggestion. */
function Recentre({ position, zoom }) {
	const map = useMap();
	const key = position ? position.join(',') : '';
	useEffect(() => {
		if (position) map.setView(position, zoom ?? map.getZoom());
	}, [key]); // eslint-disable-line react-hooks/exhaustive-deps
	return null;
}

/**
 * Lets a landlord place their property exactly.
 *
 * Automatic geocoding gets Nigerian addresses to the right neighbourhood far
 * more often than the right street — OpenStreetMap simply doesn't have most of
 * them. The landlord does. So we suggest a pin, then hand them the pin.
 */
// `subject` keeps the copy honest on both screens: a landlord is placing THEIR
// property, an admin is placing someone else's workplace.
export default function LocationPicker({ address, area, city, state, value, onChange, subject = 'your property' }) {
	const [position, setPosition] = useState(value ? [value.lat, value.lng] : null);
	const [looking, setLooking] = useState(false);
	const [suggestion, setSuggestion] = useState(null);
	const markerRef = useRef(null);

	const place = useCallback((next, { fromLandlord = true } = {}) => {
		setPosition(next);
		if (fromLandlord) setSuggestion(null);
		onChange?.({ lat: next[0], lng: next[1] });
	}, [onChange]);

	const findAddress = async () => {
		if (!city?.trim() && !area?.trim()) {
			toast.error('Fill in the area or city first.');
			return;
		}
		setLooking(true);
		try {
			const { data } = await api.post('/listings/geocode-preview', { address, area, city, state });
			if (!data.found) {
				toast('We could not find that address — drop the pin yourself.', { icon: '📍' });
				setPosition((p) => p || FALLBACK_CENTRE);
				return;
			}
			setSuggestion(data.precision);
			setPosition([data.lat, data.lng]);
			onChange?.({ lat: data.lat, lng: data.lng });
		} catch (err) {
			toast.error(err.response?.data?.message || 'Address lookup failed — drop the pin yourself.');
			setPosition((p) => p || FALLBACK_CENTRE);
		} finally {
			setLooking(false);
		}
	};

	const centre = position || FALLBACK_CENTRE;
	// A suggestion we know is only neighbourhood-accurate deserves a warning; a
	// pin the landlord has moved does not.
	const vague = suggestion && suggestion !== 'address';

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted">
					{position
						? `Drag the pin — or click the map — to sit exactly on ${subject}.`
						: `Show students exactly where ${subject} is.`}
				</p>
				<button
					type="button"
					onClick={findAddress}
					disabled={looking}
					className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-primary/25 bg-surface-alt/60 px-3.5 py-2 text-xs font-bold text-primary-ink transition hover:border-primary/50 disabled:opacity-60"
				>
					{looking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
					{looking ? 'Looking…' : 'Find my address'}
				</button>
			</div>

			<div className="overflow-hidden rounded-xl border border-muted/15" style={{ height: 300 }}>
				<MapContainer center={centre} zoom={position ? 16 : 12} style={{ height: '100%', width: '100%' }}>
					<TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
					<Recentre position={position} zoom={suggestion === 'address' ? 17 : position ? 16 : 12} />
					<ClickToPlace onPlace={place} />
					{position && (
						<Marker
							position={position}
							icon={pinMarker()}
							draggable
							ref={markerRef}
							eventHandlers={{
								dragend: () => {
									const { lat, lng } = markerRef.current.getLatLng();
									place([lat, lng]);
								},
							}}
						/>
					)}
				</MapContainer>
			</div>

			{!position && (
				<p className="flex items-start gap-2 text-xs text-muted">
					<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
					Press <span className="font-bold">Find my address</span>, or click the map to drop a pin. If you skip
					this, we'll estimate the location from your address — which is often only accurate to the
					neighbourhood.
				</p>
			)}

			{vague && (
				<p className="flex items-start gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-3 text-xs text-text">
					<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
					<span>
						We could only find the {suggestion === 'city' ? 'city' : 'neighbourhood'}, so this pin is a rough
						guess. <span className="font-bold">Please drag it onto the building</span> — students use it to
						decide whether to travel.
					</span>
				</p>
			)}

			{position && !suggestion && (
				<p className="flex items-center gap-2 text-xs font-bold text-success-ink">
					<Check className="h-3.5 w-3.5" /> Pin set by you — students will see this exact spot.
				</p>
			)}

			{position && (
				<p className="flex items-center gap-1.5 text-[11px] text-muted">
					<MapPin className="h-3 w-3" />
					<span className="tabular-nums font-mono">{position[0].toFixed(5)}, {position[1].toFixed(5)}</span>
				</p>
			)}
		</div>
	);
}
