import { useState, useEffect } from 'react';
import { Briefcase, Loader2, Info, Users, MapPin } from 'lucide-react';
import { commuteSummary } from '../../utils/commute';
import api from '../../services/api';

/**
 * Which SIWES employers this room is actually within reach of.
 *
 * Landlords have no way of knowing why a student picked one street over
 * another. Showing them the placement centres nearby lets them describe the
 * room in the terms students are searching by — and see the size of the
 * audience it can realistically serve.
 */
export default function NearbyPlacements({ listingId }) {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [radiusKm, setRadiusKm] = useState(10);

	useEffect(() => {
		setLoading(true);
		api.get(`/companies/near-listing/${listingId}`, { params: { radiusKm } })
			.then(({ data }) => setData(data))
			.catch(() => setData(null))
			.finally(() => setLoading(false));
	}, [listingId, radiusKm]);

	if (loading) {
		return (
			<div className="flex items-center justify-center rounded-2xl border border-muted/15 bg-surface p-8">
				<Loader2 className="h-5 w-5 animate-spin text-muted" />
			</div>
		);
	}
	if (!data) return null;

	return (
		<div className="rounded-2xl border border-muted/15 bg-surface p-6">
			<div className="mb-4 flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="flex items-center gap-2 font-serif text-lg font-bold text-text">
						<Briefcase className="h-4 w-4 text-primary-ink" /> SIWES placements nearby
					</h2>
					<p className="mt-1 text-sm text-muted">
						Students training at these places are the ones most likely to want this room.
					</p>
				</div>
				{!data.needsLocation && (
					<div className="flex items-center gap-2">
						<label htmlFor="placement-radius" className="text-xs font-bold uppercase tracking-wide text-muted">Within</label>
						<select
							id="placement-radius"
							value={radiusKm}
							onChange={(e) => setRadiusKm(Number(e.target.value))}
							className="rounded-xl border border-line bg-surface-alt/40 px-3 py-2 text-sm font-semibold text-text outline-none focus:border-primary/50"
						>
							{[3, 5, 10, 20, 30].map((r) => <option key={r} value={r}>{r} km</option>)}
						</select>
					</div>
				)}
			</div>

			{data.needsLocation ? (
				<p className="flex items-start gap-2 rounded-xl border border-highlight/30 bg-highlight/10 p-4 text-sm text-text">
					<Info className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
					Place this listing on the map — edit it and drag the pin — and we'll show you which placement
					centres it's within reach of.
				</p>
			) : data.companies.length === 0 ? (
				<p className="text-sm text-muted">
					No placement centres within {radiusKm}km. Try a wider radius.
				</p>
			) : (
				<>
					<p className="mb-3 text-sm text-muted">
						<span className="font-bold text-ink">{data.companies.length}</span> centre
						{data.companies.length === 1 ? '' : 's'} within {radiusKm}km
						{data.totalSlots > 0 && <> · around <span className="font-bold text-ink">{data.totalSlots}</span> student places between them</>}
					</p>
					<ul className="space-y-2">
						{data.companies.slice(0, 8).map((c) => (
							<li key={c._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-muted/10 bg-surface-alt/40 px-4 py-2.5">
								<span className="min-w-0">
									<span className="block truncate text-sm font-bold text-text">{c.name}</span>
									<span className="flex items-center gap-1 text-xs text-muted">
										<MapPin className="h-3 w-3 shrink-0 text-primary-ink" />{c.area} · {c.industry}
									</span>
								</span>
								<span className="flex shrink-0 items-center gap-3 text-xs">
									{c.siwesSlots ? (
										<span className="flex items-center gap-1 text-muted"><Users className="h-3 w-3" /> ~{c.siwesSlots}</span>
									) : null}
									<span className="font-bold text-primary-ink">{commuteSummary(c.distanceKm)}</span>
								</span>
							</li>
						))}
					</ul>
					{data.companies.length > 8 && (
						<p className="mt-2 text-xs text-muted">and {data.companies.length - 8} more</p>
					)}
					<p className="mt-4 flex items-start gap-2 text-xs text-muted">
						<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-ink" />
						Mentioning the nearest of these in your description helps students recognise the room is
						convenient for them.
					</p>
				</>
			)}
		</div>
	);
}
