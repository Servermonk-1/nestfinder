import SavedSearch from '../models/SavedSearch.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import { buildListingFilter, describeCriteria } from '../utils/listingFilter.js';

const EARTH_RADIUS_KM = 6378.1;
const MAX_PER_STUDENT = 20;

/** Keep only the fields the live search understands; ignore anything else sent. */
const cleanCriteria = (c = {}) => ({
	q: String(c.q || '').trim() || undefined,
	city: String(c.city || '').trim() || undefined,
	area: String(c.area || '').trim() || undefined,
	roomType: ['single', 'shared', 'self-contained'].includes(c.roomType) ? c.roomType : undefined,
	minPrice: Number.isFinite(Number(c.minPrice)) && c.minPrice !== '' ? Number(c.minPrice) : undefined,
	maxPrice: Number.isFinite(Number(c.maxPrice)) && c.maxPrice !== '' ? Number(c.maxPrice) : undefined,
	amenities: Array.isArray(c.amenities)
		? c.amenities.filter(Boolean).slice(0, 10)
		: String(c.amenities || '').split(',').map((a) => a.trim()).filter(Boolean).slice(0, 10),
	nearPlacement: Boolean(c.nearPlacement),
	radiusKm: Number.isFinite(Number(c.radiusKm)) ? Math.min(50, Math.max(1, Number(c.radiusKm))) : undefined,
});

/** Add the placement anchor to a filter, if the search asked for it. */
async function withAnchor(filter, search) {
	if (!search.criteria?.nearPlacement) return filter;
	const me = await Student.findById(search.student)
		.select('placement').populate('placement.company', 'location').lean();
	const c = me?.placement?.company?.location?.coordinates;
	if (me?.placement?.status !== 'confirmed' || !c) return null; // anchor unusable
	const radiusKm = Math.min(50, Math.max(1, search.criteria.radiusKm || 15));
	return {
		...filter,
		location: { $geoWithin: { $centerSphere: [[c[0], c[1]], radiusKm / EARTH_RADIUS_KM] } },
	};
}

// GET /api/saved-searches
export const listSavedSearches = async (req, res) => {
	try {
		const searches = await SavedSearch.find({ student: req.user.id }).sort({ createdAt: -1 }).lean();

		// Show a live count so the list is useful even between emails.
		const withCounts = await Promise.all(searches.map(async (s) => {
			const base = buildListingFilter(s.criteria || {});
			const filter = await withAnchor(base, s);
			const total = filter ? await Listing.countDocuments(filter) : 0;
			return {
				...s,
				description: describeCriteria(s.criteria),
				total,
				anchorUnavailable: filter === null,
			};
		}));

		res.status(200).json({ searches: withCounts, total: withCounts.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// POST /api/saved-searches
export const createSavedSearch = async (req, res) => {
	try {
		const name = String(req.body.name || '').trim().slice(0, 60);
		if (!name) return res.status(400).json({ message: 'Give this search a name you will recognise.' });

		const count = await SavedSearch.countDocuments({ student: req.user.id });
		if (count >= MAX_PER_STUDENT) {
			return res.status(400).json({ message: `You can keep up to ${MAX_PER_STUDENT} saved searches.` });
		}

		try {
			const search = await SavedSearch.create({
				student: req.user.id,
				name,
				criteria: cleanCriteria(req.body.criteria),
				alertsEnabled: req.body.alertsEnabled !== false,
			});
			return res.status(201).json({
				message: 'Search saved. We\'ll tell you when something new matches.',
				search: { ...search.toObject(), description: describeCriteria(search.criteria) },
			});
		} catch (err) {
			if (err.code === 11000) {
				return res.status(400).json({ message: 'You already have a saved search with that name.' });
			}
			throw err;
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// PATCH /api/saved-searches/:id — rename, or turn alerts on/off
export const updateSavedSearch = async (req, res) => {
	try {
		const search = await SavedSearch.findById(req.params.id).catch(() => null);
		if (!search) return res.status(404).json({ message: 'Saved search not found' });
		if (String(search.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your saved search.' });
		}

		if (req.body.name !== undefined) {
			const name = String(req.body.name).trim().slice(0, 60);
			if (!name) return res.status(400).json({ message: 'Name cannot be empty.' });
			search.name = name;
		}
		if (typeof req.body.alertsEnabled === 'boolean') search.alertsEnabled = req.body.alertsEnabled;

		await search.save();
		res.status(200).json({ message: 'Saved search updated', search });
	} catch (error) {
		if (error.code === 11000) {
			return res.status(400).json({ message: 'You already have a saved search with that name.' });
		}
		res.status(500).json({ message: error.message });
	}
};

// PATCH /api/saved-searches/:id/seen — clear the "new since you saved this" badge
export const markSavedSearchSeen = async (req, res) => {
	try {
		const search = await SavedSearch.findById(req.params.id).catch(() => null);
		if (!search) return res.status(404).json({ message: 'Saved search not found' });
		if (String(search.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your saved search.' });
		}
		search.newMatchCount = 0;
		search.lastCheckedAt = new Date();
		await search.save();
		res.status(200).json({ message: 'Marked as seen' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// DELETE /api/saved-searches/:id
export const deleteSavedSearch = async (req, res) => {
	try {
		const search = await SavedSearch.findById(req.params.id).catch(() => null);
		if (!search) return res.status(404).json({ message: 'Saved search not found' });
		if (String(search.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'Not your saved search.' });
		}
		await search.deleteOne();
		res.status(200).json({ message: 'Saved search removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
