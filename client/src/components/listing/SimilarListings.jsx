import { useState, useEffect } from 'react';
import ListingGrid from './ListingGrid';
import api from '../../services/api';

export default function SimilarListings({ listing }) {
	const [similar, setSimilar] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!listing) return;
		setLoading(true);
		api.get('/listings/search', { params: { city: listing.city, roomType: listing.roomType, limit: 4 } })
			.then(({ data }) => {
				setSimilar((data.listings || []).filter((l) => l._id !== listing._id).slice(0, 3));
			})
			.catch(() => setSimilar([]))
			.finally(() => setLoading(false));
	}, [listing]);

	if (!loading && similar.length === 0) return null;

	return (
		<div>
			<h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight">Similar Listings in {listing.city}</h2>
			<ListingGrid listings={similar} loading={loading} />
		</div>
	);
}
