import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

/**
 * NestFinder Compare Context - Smart Comparison System
 * Manages comparison state, preferences, budget, and history
 */

const CompareContext = createContext(null);
const getListingId = (listing) => listing?._id || listing?.id;

const adaptComparison = (doc) => ({
	id: doc._id,
	name: doc.name,
	timestamp: doc.createdAt,
	listings: doc.listings || [],
	preferences: doc.preferences || {},
	budget: doc.budget,
	school: doc.school,
});

export const CompareProvider = ({ children }) => {
	const { user, isAuthenticated } = useAuth();

	// Selected listings (max 3)
	const [compareList, setCompareList] = useState([]);

	// Student preferences
	const [studentPreferences, setStudentPreferences] = useState({
		lowestPrice: false,
		security: true,
		electricity: true,
		water: false,
		wifi: false,
		parking: false,
		kitchen: false,
		verifiedLandlord: true,
		closeToSchool: true,
		largeRoom: false,
		available: true,
		quietEnvironment: false,
		fastInternet: false,
	});

	// Student budget (monthly)
	const [monthlyBudget, setMonthlyBudget] = useState(150000);

	// Selected school
	const [selectedSchool, setSelectedSchool] = useState('University of Ibadan');

	// Comparison history (last 10) + saved comparisons — synced from the backend
	const [comparisonHistory, setComparisonHistory] = useState([]);
	const [savedComparisons, setSavedComparisons] = useState([]);

	// Load this student's comparison history + saved comparisons from the backend
	useEffect(() => {
		if (!isAuthenticated || user?.role !== 'student') {
			setComparisonHistory([]);
			setSavedComparisons([]);
			return;
		}

		let cancelled = false;

		api.get('/comparisons')
			.then(({ data }) => {
				if (cancelled) return;
				setComparisonHistory((data.history || []).map(adaptComparison));
				setSavedComparisons((data.saved || []).map(adaptComparison));
			})
			.catch(() => {
				if (!cancelled) {
					setComparisonHistory([]);
					setSavedComparisons([]);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [isAuthenticated, user?.role]);

	/**
	 * Add listing to compare
	 */
	const addToCompare = useCallback((listing) => {
		setCompareList((prev) => {
			const listingId = getListingId(listing);
			if (!listingId) return prev;
			if (prev.length >= 3) return prev;
			if (prev.find((l) => getListingId(l) === listingId)) return prev;
			return [...prev, listing];
		});
	}, []);

	/**
	 * Remove listing from compare
	 */
	const removeFromCompare = useCallback((listingId) => {
		setCompareList((prev) => prev.filter((l) => getListingId(l) !== listingId));
	}, []);

	/**
	 * Check if listing is in compare
	 */
	const isInCompare = useCallback((listingId) => {
		return compareList.some((l) => getListingId(l) === listingId);
	}, [compareList]);

	/**
	 * Clear all compare listings
	 */
	const clearCompare = useCallback(() => {
		setCompareList([]);
	}, []);

	/**
	 * Update student preferences
	 */
	const updatePreferences = useCallback((preferences) => {
		setStudentPreferences((prev) => ({
			...prev,
			...preferences,
		}));
	}, []);

	/**
	 * Reset preferences to defaults
	 */
	const resetPreferences = useCallback(() => {
		setStudentPreferences({
			lowestPrice: false,
			security: true,
			electricity: true,
			water: false,
			wifi: false,
			parking: false,
			kitchen: false,
			verifiedLandlord: true,
			closeToSchool: true,
			largeRoom: false,
			available: true,
			quietEnvironment: false,
			fastInternet: false,
		});
	}, []);

	/**
	 * Update budget
	 */
	const updateBudget = useCallback((budget) => {
		if (budget > 0) setMonthlyBudget(budget);
	}, []);

	/**
	 * Update school
	 */
	const updateSchool = useCallback((school) => {
		setSelectedSchool(school);
	}, []);

	/**
	 * Record a comparison view in history (auto-tracked, not named).
	 * Fire-and-forget — history tracking should never block the UI.
	 */
	const addToHistory = useCallback(async (comparison) => {
		const listingIds = (comparison.listings || []).map(getListingId).filter(Boolean);
		if (listingIds.length < 2) return;

		try {
			const { data } = await api.post('/comparisons', {
				listings: listingIds,
				preferences: comparison.preferences,
				budget: comparison.budget,
				school: comparison.school,
				saved: false,
			});
			setComparisonHistory((prev) => [adaptComparison(data.comparison), ...prev].slice(0, 10));
		} catch {
			/* background tracking only — ignore failures */
		}
	}, []);

	/**
	 * Save comparison
	 */
	const saveComparison = useCallback(async (name, extra = {}) => {
		if (compareList.length === 0 || !name) return null;

		const listingIds = compareList.map(getListingId).filter(Boolean);

		try {
			const { data } = await api.post('/comparisons', {
				listings: listingIds,
				preferences: extra.preferences ?? studentPreferences,
				budget: extra.budget ?? monthlyBudget,
				school: extra.school ?? selectedSchool,
				name,
				saved: true,
			});
			const newSavedComparison = adaptComparison(data.comparison);
			setSavedComparisons((prev) => [...prev, newSavedComparison]);
			return newSavedComparison;
		} catch {
			return null;
		}
	}, [compareList, studentPreferences, monthlyBudget, selectedSchool]);

	/**
	 * Load saved comparison
	 */
	const loadSavedComparison = useCallback((comparisonId) => {
		const saved = savedComparisons.find(c => c.id === comparisonId);

		if (saved) {
			setCompareList(saved.listings);
			if (saved.preferences && typeof saved.preferences === 'object') {
				setStudentPreferences((prev) => ({ ...prev, ...saved.preferences }));
			}
			if (saved.budget) setMonthlyBudget(saved.budget);
			if (saved.school) setSelectedSchool(saved.school);
		}

		return saved;
	}, [savedComparisons]);

	/**
	 * Delete saved comparison
	 */
	const deleteSavedComparison = useCallback(async (comparisonId) => {
		const previous = savedComparisons;
		setSavedComparisons((prev) => prev.filter(c => c.id !== comparisonId));

		try {
			await api.delete(`/comparisons/${comparisonId}`);
		} catch {
			setSavedComparisons(previous);
		}
	}, [savedComparisons]);

	return (
		<CompareContext.Provider
			value={{
				// Listings
				compareList,
				addToCompare,
				removeFromCompare,
				isInCompare,
				clearCompare,
				selectedCount: compareList.length,
				canAddMore: compareList.length < 3,

				// Preferences
				studentPreferences,
				updatePreferences,
				resetPreferences,

				// Budget
				monthlyBudget,
				updateBudget,

				// School
				selectedSchool,
				updateSchool,

				// History
				comparisonHistory,
				addToHistory,

				// Saved comparisons
				savedComparisons,
				saveComparison,
				loadSavedComparison,
				deleteSavedComparison,
			}}
		>
			{children}
		</CompareContext.Provider>
	);
};

export const useCompare = () => {
	const context = useContext(CompareContext);
	if (!context) throw new Error('useCompare must be used within CompareProvider');
	return context;
};

export default CompareContext;
