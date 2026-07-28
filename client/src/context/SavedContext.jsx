import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SavedContext = createContext(null);
const getListingId = (listing) => listing?._id || listing?.id;

export const SavedProvider = ({ children }) => {
	const { user, isAuthenticated } = useAuth();
	const [savedListings, setSavedListings] = useState([]);
	const [loading, setLoading] = useState(false);

	// Load saved listings from the backend whenever a student is signed in
	useEffect(() => {
		if (!isAuthenticated || user?.role !== 'student') {
			setSavedListings([]);
			return;
		}

		let cancelled = false;
		setLoading(true);

		api.get('/saved')
			.then(({ data }) => {
				if (!cancelled) setSavedListings(data.savedListings || []);
			})
			.catch(() => {
				if (!cancelled) setSavedListings([]);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, user?.role]);

	const isSaved = useCallback((listingId) => {
		return savedListings.some((l) => getListingId(l) === listingId);
	}, [savedListings]);

	const saveListing = useCallback(async (listing) => {
		const id = getListingId(listing);
		if (!id) return;

		setSavedListings((prev) => (prev.some((l) => getListingId(l) === id) ? prev : [...prev, listing]));

		try {
			const { data } = await api.post(`/saved/${id}`);
			setSavedListings(data.savedListings || []);
		} catch {
			setSavedListings((prev) => prev.filter((l) => getListingId(l) !== id));
		}
	}, []);

	const unsaveListing = useCallback(async (listingId) => {
		setSavedListings((prev) => prev.filter((l) => getListingId(l) !== listingId));

		try {
			const { data } = await api.delete(`/saved/${listingId}`);
			setSavedListings(data.savedListings || []);
		} catch {
			// Re-fetch on failure so state stays truthful to the backend
			try {
				const { data } = await api.get('/saved');
				setSavedListings(data.savedListings || []);
			} catch {
				/* leave optimistic state as-is if the refetch also fails */
			}
		}
	}, []);

	const toggleSaved = useCallback((listing) => {
		const id = getListingId(listing);
		if (isSaved(id)) {
			unsaveListing(id);
		} else {
			saveListing(listing);
		}
	}, [isSaved, saveListing, unsaveListing]);

	return (
		<SavedContext.Provider value={{ savedListings, isSaved, saveListing, unsaveListing, toggleSaved, loading }}>
			{children}
		</SavedContext.Provider>
	);
};

export const useSaved = () => {
	const context = useContext(SavedContext);
	if (!context) throw new Error('useSaved must be used within SavedProvider');
	return context;
};

export default SavedContext;
