import Company, { normaliseDepartment } from '../models/Company.js';
import Student from '../models/Student.js';
import Listing from '../models/Listing.js';
import { distanceKm } from '../utils/geocode.js';
import { geocodeCompany } from '../services/geocodeCompany.js';
import { sendPlacementRemovedEmail } from '../config/email.js';

const escape = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const coordsOf = (doc) => {
	const c = doc?.location?.coordinates;
	return Array.isArray(c) && c.length === 2 ? { lat: c[1], lng: c[0] } : null;
};

// ── BROWSE COMPANIES ──────────────────────────────────────
// GET /api/companies?department=&city=&q=&mine=1
// The "companies that take my department" journey.
export const getCompanies = async (req, res) => {
	try {
		const { department, city, q, mine, faculty } = req.query;

		// Students only ever see the curated directory.
		const filter = { verified: true };

		// `mine=1` means "use the department on my profile" — saves the student
		// retyping it, and guarantees it matches what we stored.
		let dept = department;
		if (mine === '1' && req.user?.role === 'student') {
			const me = await Student.findById(req.user.id).select('department').lean();
			dept = me?.department;
			if (!dept) {
				return res.status(200).json({
					companies: [], total: 0, needsDepartment: true,
					message: 'Add your department to your profile to see companies that take your course.',
				});
			}
		}
		if (dept) filter.acceptedDepartments = normaliseDepartment(dept);
		if (faculty) filter.faculties = faculty;
		if (city) filter.city = { $regex: escape(city), $options: 'i' };
		if (q?.trim()) {
			const rx = new RegExp(escape(q.trim()), 'i');
			filter.$or = [{ name: rx }, { industry: rx }, { area: rx }];
		}

		const companies = await Company.find(filter).sort({ name: 1 }).select('-__v').lean();

		res.status(200).json({ companies, total: companies.length, department: dept || null });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── DEPARTMENTS THAT ACTUALLY HAVE COMPANIES ──────────────
// GET /api/companies/departments — powers the picker, so a student can only
// choose a department that will return results.
export const getDepartments = async (req, res) => {
	try {
		const rows = await Company.aggregate([
			{ $match: { verified: true } },
			{ $unwind: '$acceptedDepartments' },
			{ $group: { _id: '$acceptedDepartments', count: { $sum: 1 } } },
			{ $sort: { _id: 1 } },
		]);
		res.status(200).json({
			departments: rows.filter((r) => r._id).map((r) => ({ department: r._id, count: r.count })),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// GET /api/companies/faculties — how AATU students actually think about
// placement, so the directory can be browsed by faculty as well as department.
export const getFaculties = async (req, res) => {
	try {
		const rows = await Company.aggregate([
			{ $match: { verified: true } },
			{ $unwind: '$faculties' },
			{ $group: { _id: '$faculties', count: { $sum: 1 } } },
			{ $sort: { count: -1 } },
		]);
		res.status(200).json({ faculties: rows.map((r) => ({ faculty: r._id, count: r.count })) });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SINGLE COMPANY ────────────────────────────────────────
export const getCompany = async (req, res) => {
	try {
		const company = await Company.findById(req.params.id).select('-__v').lean().catch(() => null);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		// A student who added their own centre must be able to open it — they can
		// already anchor their entire housing search to it, so hiding the page
		// was simply inconsistent. It stays invisible to everyone else.
		const isOwner = String(company.suggestedBy || '') === String(req.user?.id || '');
		if (!company.verified && !isOwner) {
			return res.status(404).json({ message: 'Company not found' });
		}

		res.status(200).json({ company, isOwner, awaitingReview: !company.verified });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── A STUDENT FIXING OR REMOVING THEIR OWN CENTRE ─────────
// Typing the wrong area shouldn't be permanent: without this the pin stays
// wrong, the commute stays wrong, and a bogus row sits in the admin queue
// forever with nobody able to correct it.
export const updateMySuggestion = async (req, res) => {
	try {
		const company = await Company.findById(req.params.id);
		if (!company) return res.status(404).json({ message: 'Placement centre not found' });

		if (String(company.suggestedBy || '') !== String(req.user.id)) {
			return res.status(403).json({ message: 'You can only edit a centre you added.' });
		}
		// Once an admin has published it, it belongs to the directory — a student
		// must not be able to rewrite an entry other people now rely on.
		if (company.verified) {
			return res.status(403).json({ message: 'This centre has been published and can no longer be edited here.' });
		}

		const { name, industry, address, area, city, state } = req.body;
		if (name !== undefined && !String(name).trim()) {
			return res.status(400).json({ message: 'Name cannot be empty.' });
		}
		if (name !== undefined) company.name = String(name).trim();
		if (industry !== undefined) company.industry = String(industry).trim() || 'Not specified';
		if (address !== undefined) company.address = String(address).trim();
		if (area !== undefined) company.area = String(area).trim();
		if (city !== undefined) company.city = String(city).trim() || 'Ibadan';
		if (state !== undefined) company.state = String(state).trim() || 'Oyo';
		if (!company.area && !company.address) {
			return res.status(400).json({ message: 'Enter the area or address so we can find housing nearby.' });
		}
		await company.save();

		// Re-locate inline — the point of the edit is usually to fix the pin.
		const hit = await geocodeCompany(company._id);

		res.status(200).json({
			company: await Company.findById(company._id).lean(),
			located: !!hit?.lat || !!hit?.skipped,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export const deleteMySuggestion = async (req, res) => {
	try {
		const company = await Company.findById(req.params.id);
		if (!company) return res.status(404).json({ message: 'Placement centre not found' });

		if (String(company.suggestedBy || '') !== String(req.user.id)) {
			return res.status(403).json({ message: 'You can only remove a centre you added.' });
		}
		if (company.verified) {
			return res.status(403).json({ message: 'This centre has been published and can no longer be removed here.' });
		}

		await company.deleteOne();
		// Their own placement pointed at it, so clear that too rather than leave
		// a dangling reference behind.
		await Student.updateOne({ _id: req.user.id, 'placement.company': company._id }, { $unset: { placement: '' } });

		res.status(200).json({ message: 'Placement centre removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── MY PLACEMENT ──────────────────────────────────────────
// GET /api/companies/placement/me — what the student's search is anchored to.
export const getMyPlacement = async (req, res) => {
	try {
		const student = await Student.findById(req.user.id)
			.select('department placement placementNotice')
			.populate('placement.company', 'name industry address area city state location geocodePrecision')
			.lean();

		res.status(200).json({
			department: student?.department || null,
			placement: student?.placement?.company ? student.placement : null,
			notice: student?.placementNotice?.reason ? student.placementNotice : null,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADD A CENTRE THAT ISN'T IN THE DIRECTORY ──────────────
// POST /api/companies/suggest — a student whose placement we don't list can
// enter it themselves. No directory can be complete, and a student with an
// unlisted centre would otherwise lose the entire SIWES feature.
//
// The centre is created UNVERIFIED, so it stays out of the public directory
// until an admin checks it — but the student can anchor their own search to it
// straight away. Their housing search must not wait on our moderation queue.
export const suggestCompany = async (req, res) => {
	try {
		const { name, industry, address, area, city, state, acceptedDepartments, faculties } = req.body;

		if (!name?.trim()) return res.status(400).json({ message: 'Enter the name of your placement centre.' });
		if (!area?.trim() && !address?.trim()) {
			return res.status(400).json({ message: 'Enter the area or address so we can find housing nearby.' });
		}

		// Reuse an existing entry rather than creating a near-duplicate.
		const existing = await Company.findOne({
			name: new RegExp(`^${escape(name.trim())}$`, 'i'),
		});
		if (existing) return res.status(200).json({ company: existing, existing: true });

		const company = await Company.create({
			name: name.trim(),
			industry: industry?.trim() || 'Not specified',
			address: address?.trim() || area.trim(),
			area: area?.trim() || address.trim(),
			city: city?.trim() || 'Ibadan',
			state: state?.trim() || 'Oyo',
			acceptedDepartments: Array.isArray(acceptedDepartments) ? acceptedDepartments : [],
			faculties: Array.isArray(faculties) ? faculties : [],
			verified: false,
			suggestedBy: req.user.id,
		});

		// Geocode inline, not in the background: the whole point is to search
		// housing around it, and without coordinates that can't happen. The
		// student is waiting on this one lookup, so it's worth the second.
		const hit = await geocodeCompany(company._id);

		res.status(201).json({
			company: await Company.findById(company._id).lean(),
			located: !!hit?.lat,
			message: hit?.lat
				? 'Placement centre added.'
				: 'Added, but we could not place it on the map — check the area name.',
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// PUT /api/companies/placement — set or update it.
export const setMyPlacement = async (req, res) => {
	try {
		const { companyId, role, startDate, endDate, status } = req.body;

		const company = await Company.findById(companyId).lean();
		// A student may anchor to a verified directory entry OR to a centre they
		// added themselves — but not to another student's unverified suggestion.
		const ownSuggestion = company && !company.verified
			&& String(company.suggestedBy || '') === String(req.user.id);
		if (!company || (!company.verified && !ownSuggestion)) {
			return res.status(400).json({ message: 'Choose a company from the directory.' });
		}

		const student = await Student.findById(req.user.id);
		if (!student) return res.status(404).json({ message: 'Account not found' });

		const nextStatus = status === 'confirmed' ? 'confirmed' : 'applied';
		student.placement = {
			company: company._id,
			role: role?.trim() || '',
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			status: nextStatus,
			// Only stamp this when the student says the placement is settled — it
			// is what unlocks anchoring their whole housing search to this address.
			confirmedAt: nextStatus === 'confirmed' ? new Date() : undefined,
		};
		await student.save();

		res.status(200).json({ message: 'Placement saved', placement: student.placement });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// DELETE /api/companies/placement
export const clearMyPlacement = async (req, res) => {
	try {
		await Student.findByIdAndUpdate(req.user.id, { $unset: { placement: '' } });
		res.status(200).json({ message: 'Placement removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ADMIN: CURATE THE DIRECTORY ───────────────────────────
export const adminListCompanies = async (req, res) => {
	try {
		const { q, status } = req.query;
		const filter = {};
		if (status === 'verified') filter.verified = true;
		if (status === 'unverified') filter.verified = false;
		if (q?.trim()) {
			const rx = new RegExp(escape(q.trim()), 'i');
			filter.$or = [{ name: rx }, { industry: rx }, { city: rx }, { area: rx }];
		}

		const [companies, total, verified] = await Promise.all([
			// The whole directory, not a page of it — an admin who can see
			// "Published (109)" but only 100 rows has no way to reach the rest.
			Company.find(filter).sort({ createdAt: -1 }).limit(500).lean(),
			Company.countDocuments({}),
			Company.countDocuments({ verified: true }),
		]);

		res.status(200).json({
			companies,
			counts: { all: total, verified, unverified: total - verified },
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

/**
 * Apply a pin an admin placed by hand.
 *
 * Nigerian addresses often resolve no better than the neighbourhood, so an
 * admin who knows the building must be able to correct it — and their pin then
 * outranks anything we derive, exactly as a landlord's does for a listing.
 * Returns true when a valid pin was applied.
 */
const applyAdminPin = (company, lat, lng) => {
	const latN = Number(lat), lngN = Number(lng);
	// Reject anything off the globe rather than storing a silently-wrong pin.
	if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return false;
	if (latN < -90 || latN > 90 || lngN < -180 || lngN > 180) return false;

	company.location = { type: 'Point', coordinates: [lngN, latN] };
	company.locationSource = 'admin';
	company.geocodePrecision = 'address'; // a human confirmed it
	// Stamp the address this pin belongs to, so the background geocoder treats
	// it as current and leaves it alone.
	company.geocodeQuery = [company.address, company.area, company.city, company.state].filter(Boolean).join('|');
	return true;
};

const parseDepartments = (value) =>
	Array.isArray(value) ? value : String(value || '').split(',').map((d) => d.trim()).filter(Boolean);

export const createCompany = async (req, res) => {
	try {
		const { lat, lng, ...body } = req.body;

		const company = await Company.create({
			...body,
			acceptedDepartments: parseDepartments(body.acceptedDepartments),
			addedBy: req.user.id,
		});

		// If the admin placed the pin while filling the form, save it BEFORE the
		// background geocoder runs so it sees an admin pin and skips.
		if (applyAdminPin(company, lat, lng)) {
			await company.save();
		}

		// Same fire-and-forget pattern as listings — a rate-limited external
		// service must never block an admin saving a record.
		geocodeCompany(company._id).catch((err) => console.error('Company geocoding failed:', err.message));

		res.status(201).json({ message: 'Company added', company });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export const updateCompany = async (req, res) => {
	try {
		const { lat, lng, ...body } = req.body;
		if (body.acceptedDepartments !== undefined) {
			body.acceptedDepartments = parseDepartments(body.acceptedDepartments);
		}

		const company = await Company.findById(req.params.id);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		Object.assign(company, body);
		applyAdminPin(company, lat, lng);
		await company.save();

		geocodeCompany(company._id).catch((err) => console.error('Company geocoding failed:', err.message));

		res.status(200).json({ message: 'Company updated', company });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export const deleteCompany = async (req, res) => {
	try {
		const company = await Company.findByIdAndDelete(req.params.id);
		if (!company) return res.status(404).json({ message: 'Company not found' });

		// Find them BEFORE clearing, so we know who to tell.
		const affected = await Student.find({ 'placement.company': company._id })
			.select('fullName email').lean();

		// Students anchored to it would otherwise keep a dangling reference —
		// and, worse, their search would silently stop being anchored with no
		// explanation. Clear it, then tell them.
		await Student.updateMany(
			{ 'placement.company': company._id },
			{
				$unset: { placement: '' },
				$set: { placementNotice: { companyName: company.name, reason: 'removed', at: new Date() } },
			}
		);

		const accountUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/account`;
		for (const s of affected) {
			// Fire-and-forget: a mail failure must not fail the admin's action.
			sendPlacementRemovedEmail(s.email, s.fullName, company.name, accountUrl)
				.catch((err) => console.error('Placement-removed email failed:', err.message));
		}

		res.status(200).json({ message: 'Company deleted', studentsNotified: affected.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── PLACEMENT CENTRES NEAR A LISTING ──────────────────────
// GET /api/companies/near-listing/:listingId — for the landlord who owns it.
// Tells them which SIWES employers their room is actually within reach of, so
// they can describe it in terms students search by.
export const getCompaniesNearListing = async (req, res) => {
	try {
		const listing = await Listing.findById(req.params.listingId)
			.select('landlord location area city').lean().catch(() => null);
		if (!listing) return res.status(404).json({ message: 'Listing not found' });

		// Own listings only — this is business intelligence about their property.
		if (String(listing.landlord) !== String(req.user.id) && req.user.role !== 'admin') {
			return res.status(403).json({ message: 'Not your listing.' });
		}

		const here = listing.location?.coordinates;
		if (!here) {
			return res.status(200).json({ companies: [], needsLocation: true,
				message: 'Add a map pin to this listing to see the placement centres near it.' });
		}

		const radiusKm = Math.min(30, Math.max(1, Number(req.query.radiusKm) || 10));
		const EARTH_RADIUS_KM = 6378.1;

		const companies = await Company.find({
			verified: true,
			location: { $geoWithin: { $centerSphere: [[here[0], here[1]], radiusKm / EARTH_RADIUS_KM] } },
		}).select('name industry area city location faculties siwesSlots').lean();

		const withDistance = companies
			.map((c) => ({
				...c,
				distanceKm: distanceKm(
					{ lat: here[1], lng: here[0] },
					{ lat: c.location.coordinates[1], lng: c.location.coordinates[0] }
				),
			}))
			.sort((a, b) => a.distanceKm - b.distanceKm);

		res.status(200).json({
			companies: withDistance,
			radiusKm,
			// A rough sense of the audience this room can serve.
			totalSlots: withDistance.reduce((s, c) => s + (c.siwesSlots || 0), 0),
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── BULK IMPORT ───────────────────────────────────────────
// POST /api/companies/bulk — paste many centres at once instead of typing 100
// forms. Reports per-row outcomes rather than failing the whole batch on one
// bad line, so an admin can fix the offenders and re-paste.
export const bulkImportCompanies = async (req, res) => {
	try {
		const rows = Array.isArray(req.body.companies) ? req.body.companies : null;
		if (!rows?.length) {
			return res.status(400).json({ message: 'Provide a non-empty array of companies.' });
		}
		if (rows.length > 200) {
			return res.status(400).json({ message: 'Import at most 200 at a time.' });
		}

		const results = { added: [], skipped: [], failed: [] };

		for (const raw of rows) {
			const name = String(raw?.name || '').trim();
			const area = String(raw?.area || '').trim();
			try {
				if (!name) { results.failed.push({ name: '(no name)', reason: 'Name is required' }); continue; }
				if (!area && !String(raw?.address || '').trim()) {
					results.failed.push({ name, reason: 'Area or address is required' }); continue;
				}

				const exists = await Company.findOne({ name: new RegExp(`^${escape(name)}$`, 'i') }).lean();
				if (exists) { results.skipped.push({ name, reason: 'Already in the directory' }); continue; }

				const company = await Company.create({
					name,
					industry: String(raw.industry || '').trim() || 'Not specified',
					description: String(raw.description || '').trim(),
					address: String(raw.address || '').trim() || area,
					area: area || String(raw.address || '').trim(),
					city: String(raw.city || '').trim() || 'Ibadan',
					state: String(raw.state || '').trim() || 'Oyo',
					acceptedDepartments: parseDepartments(raw.acceptedDepartments),
					faculties: Array.isArray(raw.faculties) ? raw.faculties : [],
					siwesSlots: Number.isFinite(Number(raw.siwesSlots)) ? Number(raw.siwesSlots) : undefined,
					website: String(raw.website || '').trim(),
					contactEmail: String(raw.contactEmail || '').trim(),
					contactPhone: String(raw.contactPhone || '').trim(),
					verified: true,
					addedBy: req.user.id,
				});
				results.added.push({ name, id: company._id });
			} catch (err) {
				results.failed.push({ name: name || '(no name)', reason: err.message });
			}
		}

		// Geocode the new rows in the background: at ~1 request/second this would
		// otherwise hold the request open for minutes on a large paste.
		if (results.added.length) {
			(async () => {
				for (const a of results.added) {
					await geocodeCompany(a.id).catch((err) => console.error('Bulk geocode failed:', err.message));
				}
			})();
		}

		res.status(200).json({
			message: `${results.added.length} added, ${results.skipped.length} skipped, ${results.failed.length} failed.`,
			...results,
			geocoding: results.added.length > 0,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// DELETE /api/companies/placement/notice — student dismisses the notice.
export const dismissPlacementNotice = async (req, res) => {
	try {
		await Student.findByIdAndUpdate(req.user.id, { $unset: { placementNotice: '' } });
		res.status(200).json({ message: 'Notice dismissed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

export { coordsOf, distanceKm };
