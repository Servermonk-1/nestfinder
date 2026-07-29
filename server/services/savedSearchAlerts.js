import SavedSearch from '../models/SavedSearch.js';
import Listing from '../models/Listing.js';
import Student from '../models/Student.js';
import Company from '../models/Company.js';
import { buildListingFilter, describeCriteria } from '../utils/listingFilter.js';
import { sendSavedSearchAlertEmail } from '../config/email.js';

// A student may hear about one saved search at most once every six hours. The
// alert exists to stop them missing a room, not to fill their inbox — and a
// landlord uploading five listings in a row must not send five emails.
const THROTTLE_MS = 6 * 60 * 60 * 1000;

const EARTH_RADIUS_KM = 6378.1;

/**
 * Does one listing satisfy one saved search?
 *
 * Runs the SAME filter builder as the live search, against a single id, so an
 * alert can never describe a home the student's own search wouldn't return.
 */
async function listingMatches(listing, search) {
	const filter = buildListingFilter(search.criteria || {});
	filter._id = listing._id;

	// An anchored search also has to be within range of the student's placement.
	if (search.criteria?.nearPlacement) {
		const me = await Student.findById(search.student)
			.select('placement')
			.populate('placement.company', 'location')
			.lean();
		const c = me?.placement?.company?.location?.coordinates;
		// No confirmed placement means the anchor is meaningless — say no rather
		// than quietly widening the search to the whole city.
		if (me?.placement?.status !== 'confirmed' || !c) return false;

		const radiusKm = Math.min(50, Math.max(1, search.criteria.radiusKm || 15));
		filter.location = {
			$geoWithin: { $centerSphere: [[c[0], c[1]], radiusKm / EARTH_RADIUS_KM] },
		};
	}

	return Boolean(await Listing.exists(filter));
}

/**
 * A new listing has appeared. Tell whoever was waiting for it.
 *
 * Fire-and-forget from the caller: a slow mail server must never delay a
 * landlord's upload.
 */
export async function notifyMatchingSearches(listingId) {
	const listing = await Listing.findById(listingId).lean();
	if (!listing || !listing.available || listing.flagged) return { notified: 0 };

	const searches = await SavedSearch.find({ alertsEnabled: true }).lean();
	let notified = 0;

	for (const search of searches) {
		try {
			if (!(await listingMatches(listing, search))) continue;

			// Count it regardless — the badge should be accurate even when the
			// email is throttled.
			await SavedSearch.updateOne({ _id: search._id }, { $inc: { newMatchCount: 1 } });

			const throttled = search.lastNotifiedAt
				&& Date.now() - new Date(search.lastNotifiedAt).getTime() < THROTTLE_MS;
			if (throttled) continue;

			const student = await Student.findById(search.student).select('fullName email').lean();
			if (!student?.email) continue;

			const url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/listings/${listing._id}`;
			await sendSavedSearchAlertEmail(student.email, student.fullName, {
				searchName: search.name,
				criteria: describeCriteria(search.criteria),
				title: listing.title,
				area: [listing.area, listing.city].filter(Boolean).join(', '),
				url,
			});

			await SavedSearch.updateOne({ _id: search._id }, { lastNotifiedAt: new Date() });
			notified++;
		} catch (err) {
			// One broken saved search must not stop the rest from being told.
			console.error('Saved-search alert failed:', err.message);
		}
	}

	return { notified };
}
