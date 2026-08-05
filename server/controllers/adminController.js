import { recentErrors, errorStats } from '../utils/errorReporter.js';
import Listing from '../models/Listing.js';
import Landlord from '../models/Landlord.js';
import Student from '../models/Student.js';
import Report from '../models/Report.js';
import UserReport from '../models/UserReport.js';
import Message from '../models/Message.js';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';
import { runFraudShield, computeTrustScore } from '../services/fraudShield.js';

// ── DASHBOARD STATS ───────────────────────────────────────
export const getDashboardStats = async (req, res) => {
	try {
		const now = new Date();
		const startOfToday = new Date(now);
		startOfToday.setHours(0, 0, 0, 0);

		const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

		const [
			totalListings,
			flaggedListings,
			totalLandlords,
			pendingVerifications,
			totalStudents,
			unresolvedReports,
			pendingStudentVerifications,
			pendingLandlordVerifications,
			// Revenue & payments
			revenueToday,
			revenueThisMonth,
			platformFeesEarned,
			pendingPaymentsCount,
			completedBookingsCount,
		] = await Promise.all([
			Listing.countDocuments(),
			Listing.countDocuments({ flagged: true }),
			Landlord.countDocuments(),
			Landlord.countDocuments({ verified: false }),
			Student.countDocuments(),
			Report.countDocuments({ status: 'open' }),
			Student.countDocuments({ 'idDocument.status': 'pending' }),
			Landlord.countDocuments({ 'idDocument.status': 'pending' }),

			// Revenue today: sum booking cost.total for approved payments created today
			Payment.aggregate([
				{ $match: { status: 'approved', createdAt: { $gte: startOfToday } } },
				{ $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'bookingDoc' } },
				{ $unwind: '$bookingDoc' },
				{ $group: { _id: null, total: { $sum: '$bookingDoc.cost.total' } } },
			]).then((r) => r[0]?.total || 0),

			// Revenue this month
			Payment.aggregate([
				{ $match: { status: 'approved', createdAt: { $gte: startOfMonth } } },
				{ $lookup: { from: 'bookings', localField: 'booking', foreignField: '_id', as: 'bookingDoc' } },
				{ $unwind: '$bookingDoc' },
				{ $group: { _id: null, total: { $sum: '$bookingDoc.cost.total' } } },
			]).then((r) => r[0]?.total || 0),

			// Platform fees earned: sum of platformShare from confirmed bookings
			Booking.aggregate([
				{ $match: { status: { $in: ['confirmed', 'movedIn', 'completed'] } } },
				{ $group: { _id: null, total: { $sum: '$cost.platformShare' } } },
			]).then((r) => r[0]?.total || 0),

			// Pending payments
			Payment.countDocuments({ status: 'pending' }),

			// Completed bookings
			Booking.countDocuments({ status: { $in: ['movedIn', 'completed'] } }),
		]);

		res.status(200).json({
			totalListings,
			flaggedListings,
			totalLandlords,
			pendingVerifications,
			totalStudents,
			unresolvedReports,
			pendingStudentVerifications,
			pendingLandlordVerifications,
			// Analytics
			revenueToday,
			revenueThisMonth,
			platformFeesEarned,
			pendingPaymentsCount,
			completedBookingsCount,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET ALL REPORTS ───────────────────────────────────────
// Which model backs each report type.
const REPORT_MODELS = { listing: Report, user: UserReport };

// How many messages of a reported conversation the admin may read. Enough to
// judge a scam or harassment claim, without exposing the entire history.
const CONTEXT_MESSAGE_LIMIT = 20;

export const getAllReports = async (req, res) => {
	try {
		const type = ['listing', 'user'].includes(req.query.type) ? req.query.type : 'listing';
		const status = ['open', 'resolved', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
		const Model = REPORT_MODELS[type];

		let reports;
		if (type === 'listing') {
			reports = await Model.find({ status })
				.populate('listing', 'title city price images flagged')
				.populate('reporter', 'fullName email')
				.sort({ createdAt: -1 });
		} else {
			reports = await Model.find({ status })
				.populate('conversation', 'student landlord listing')
				.sort({ createdAt: -1 });

			// Resolve the two people by their role, since they live in different collections.
			reports = await Promise.all(reports.map(async (r) => {
				const ReporterModel = r.reporterRole === 'student' ? Student : Landlord;
				const ReportedModel = r.reportedRole === 'student' ? Student : Landlord;
				const [reporter, reported] = await Promise.all([
					ReporterModel.findById(r.reporter).select('fullName email verified suspended'),
					ReportedModel.findById(r.reported).select('fullName email verified suspended'),
				]);
				return { ...r.toObject(), reporterUser: reporter, reportedUser: reported };
			}));
		}

		const counts = {
			open: await Model.countDocuments({ status: 'open' }),
			resolved: await Model.countDocuments({ status: 'resolved' }),
			dismissed: await Model.countDocuments({ status: 'dismissed' }),
		};

		res.status(200).json({ reports, total: reports.length, counts, type, status });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── CONVERSATION CONTEXT FOR A CHAT REPORT ────────────────
// GET /api/admin/reports/user/:id/messages — the recent messages an admin needs
// to judge the claim. Read-only, and scoped to the reported conversation.
export const getReportContext = async (req, res) => {
	try {
		const report = await UserReport.findById(req.params.id);
		if (!report) return res.status(404).json({ message: 'Report not found' });

		const messages = await Message.find({ conversation: report.conversation })
			.sort({ createdAt: -1 })
			.limit(CONTEXT_MESSAGE_LIMIT)
			.select('senderRole text createdAt');

		res.status(200).json({ messages: messages.reverse(), limit: CONTEXT_MESSAGE_LIMIT });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── RESOLVE / DISMISS A REPORT ────────────────────────────
// PATCH /api/admin/reports/:type/:id  { status, adminNote }
export const reviewReport = async (req, res) => {
	try {
		const { type, id } = req.params;
		const Model = REPORT_MODELS[type];
		if (!Model) return res.status(400).json({ message: 'Unknown report type' });

		const { status, adminNote } = req.body;
		if (!['resolved', 'dismissed', 'open'].includes(status)) {
			return res.status(400).json({ message: 'status must be open, resolved or dismissed' });
		}

		const report = await Model.findById(id);
		if (!report) return res.status(404).json({ message: 'Report not found' });

		report.status = status;
		report.resolved = status === 'resolved'; // keep the legacy flag in sync
		report.reviewedBy = req.user.id;
		report.reviewedAt = new Date();
		if (adminNote !== undefined) report.adminNote = String(adminNote).trim().slice(0, 500);
		await report.save();

		res.status(200).json({ message: `Report marked as ${status}.`, report });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── TAKE ACTION ON A REPORT ───────────────────────────────
// POST /api/admin/reports/:type/:id/action  { action }
// Performs the sanction AND records it on the report, so there's an audit trail.
export const actOnReport = async (req, res) => {
	try {
		const { type, id } = req.params;
		const { action } = req.body;
		const Model = REPORT_MODELS[type];
		if (!Model) return res.status(400).json({ message: 'Unknown report type' });

		const report = await Model.findById(id);
		if (!report) return res.status(404).json({ message: 'Report not found' });

		let summary;

		if (type === 'listing') {
			if (action === 'remove-listing') {
				await Listing.findByIdAndDelete(report.listing);
				summary = 'Listing removed';
			} else if (action === 'flag-listing') {
				await Listing.findByIdAndUpdate(report.listing, { flagged: true });
				summary = 'Listing flagged for review';
			}
		} else if (type === 'user') {
			if (action === 'suspend') {
				const Target = report.reportedRole === 'student' ? Student : Landlord;
				await Target.findByIdAndUpdate(report.reported, { suspended: true });
				summary = `${report.reportedRole === 'student' ? 'Student' : 'Landlord'} suspended`;
			} else if (action === 'unsuspend') {
				const Target = report.reportedRole === 'student' ? Student : Landlord;
				await Target.findByIdAndUpdate(report.reported, { suspended: false });
				summary = `${report.reportedRole === 'student' ? 'Student' : 'Landlord'} unsuspended`;
			}
		}

		if (!summary) return res.status(400).json({ message: 'Unsupported action for this report type' });

		report.actionTaken = summary;
		report.status = 'resolved';
		report.resolved = true;
		report.reviewedBy = req.user.id;
		report.reviewedAt = new Date();
		await report.save();

		res.status(200).json({ message: `${summary}. Report resolved.`, report });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET ALL LANDLORDS ─────────────────────────────────────
export const getAllLandlords = async (req, res) => {
	try {
		const { q, status } = req.query;

		const filter = {};
		if (status === 'verified') filter.verified = true;
		if (status === 'unverified') filter.verified = false;
		if (status === 'suspended') filter.suspended = true;
		if (q?.trim()) {
			const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
			filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }];
		}

		const landlords = await Landlord.find(filter).select('-password').sort({ createdAt: -1 }).lean();

		// How many listings each one has — the number admins actually care about.
		const counts = await Listing.aggregate([
			{ $match: { landlord: { $in: landlords.map((l) => l._id) } } },
			{ $group: { _id: '$landlord', total: { $sum: 1 }, flagged: { $sum: { $cond: ['$flagged', 1, 0] } } } },
		]);
		const byId = Object.fromEntries(counts.map((c) => [String(c._id), c]));

		res.status(200).json({
			landlords: landlords.map((l) => ({
				...l,
				listingCount: byId[String(l._id)]?.total || 0,
				flaggedCount: byId[String(l._id)]?.flagged || 0,
			})),
			total: landlords.length,
			counts: {
				all: await Landlord.countDocuments(),
				verified: await Landlord.countDocuments({ verified: true }),
				unverified: await Landlord.countDocuments({ verified: false }),
				suspended: await Landlord.countDocuments({ suspended: true }),
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── ALL LISTINGS (admin view, with moderation filters) ────
// GET /api/admin/listings?filter=all|flagged|reported&q=
export const getAdminListings = async (req, res) => {
	try {
		const { q, filter } = req.query;

		const where = {};
		if (filter === 'flagged') where.flagged = true;
		if (filter === 'reported') where.reportCount = { $gt: 0 };
		if (filter === 'risky') where.fraudScore = { $gte: 40 }; // Fraud Shield threshold
		if (q?.trim()) {
			const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
			where.$or = [{ title: rx }, { city: rx }, { area: rx }];
		}

		const listings = await Listing.find(where)
			.populate('landlord', 'fullName email verified suspended trustScore')
			.sort({ fraudScore: -1, flagged: -1, reportCount: -1, createdAt: -1 })
			.limit(100);

		res.status(200).json({
			listings,
			total: listings.length,
			counts: {
				all: await Listing.countDocuments(),
				flagged: await Listing.countDocuments({ flagged: true }),
				reported: await Listing.countDocuments({ reportCount: { $gt: 0 } }),
				risky: await Listing.countDocuments({ fraudScore: { $gte: 40 } }),
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── RE-RUN FRAUD SHIELD ───────────────────────────────────
// POST /api/admin/listings/rescan        → screen every listing
// POST /api/admin/listings/:id/rescan    → screen one
export const rescanListings = async (req, res) => {
	try {
		const { id } = req.params;

		if (id) {
			const verdict = await runFraudShield(id);
			if (!verdict) return res.status(404).json({ message: 'Listing not found' });
			return res.status(200).json({ message: `Screened — risk ${verdict.score}/100 (${verdict.level}).`, verdict });
		}

		const listings = await Listing.find().select('_id landlord').lean();
		let flagged = 0;
		for (const l of listings) {
			const v = await runFraudShield(l._id);
			if (v?.shouldFlag) flagged++;
		}
		// Refresh trust for every landlord whose listings we just re-scored.
		const landlordIds = [...new Set(listings.map((l) => String(l.landlord)))];
		for (const lid of landlordIds) await computeTrustScore(lid);

		res.status(200).json({
			message: `Screened ${listings.length} listing(s) — ${flagged} flagged for review.`,
			scanned: listings.length, flagged,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── FLAG / UNFLAG A LISTING ───────────────────────────────
// PATCH /api/admin/listings/:id/flag  { flagged }
export const setListingFlag = async (req, res) => {
	try {
		const listing = await Listing.findByIdAndUpdate(
			req.params.id,
			{ flagged: Boolean(req.body.flagged) },
			{ new: true }
		);
		if (!listing) return res.status(404).json({ message: 'Listing not found' });
		res.status(200).json({
			message: listing.flagged ? 'Listing flagged.' : 'Flag removed.',
			flagged: listing.flagged,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── VERIFY LANDLORD ───────────────────────────────────────
export const verifyLandlord = async (req, res) => {
	try {
		const landlord = await Landlord.findByIdAndUpdate(
			req.params.id,
			{ verified: true },
			{ new: true }
		).select('-password');
		if (!landlord) return res.status(404).json({ message: 'Landlord not found' });
		res.status(200).json({ message: 'Landlord verified successfully', landlord });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SUSPEND LANDLORD ──────────────────────────────────────
export const suspendLandlord = async (req, res) => {
	try {
		const landlord = await Landlord.findById(req.params.id);
		if (!landlord) return res.status(404).json({ message: 'Landlord not found' });

		landlord.suspended = !landlord.suspended;
		await landlord.save();

		res.status(200).json({
			message: `Landlord ${landlord.suspended ? 'suspended' : 'unsuspended'} successfully`,
			suspended: landlord.suspended,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET FLAGGED LISTINGS ──────────────────────────────────
export const getFlaggedListings = async (req, res) => {
	try {
		const listings = await Listing.find({ flagged: true })
			.populate('landlord', 'fullName email phone')
			.sort({ reportCount: -1 });
		res.status(200).json({ listings, total: listings.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── STUDENT VERIFICATIONS — PENDING QUEUE ─────────────────
export const getPendingStudentVerifications = async (req, res) => {
	try {
		const students = await Student.find({ 'idDocument.status': 'pending' })
			.select('fullName email institution profilePicture idDocument createdAt')
			.sort({ 'idDocument.submittedAt': 1 });
		res.status(200).json({ students, total: students.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── APPROVE STUDENT ID ────────────────────────────────────
export const approveStudentId = async (req, res) => {
	try {
		const student = await Student.findById(req.params.id);
		if (!student) return res.status(404).json({ message: 'Student not found' });
		if (student.idDocument?.status !== 'pending') {
			return res.status(400).json({ message: 'This student has no pending verification.' });
		}

		student.verified = true;
		student.idDocument.status = 'approved';
		student.idDocument.reviewedAt = new Date();
		student.idDocument.rejectionReason = undefined;
		await student.save();

		res.status(200).json({ message: `${student.fullName} verified.`, verified: true });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── REJECT STUDENT ID ─────────────────────────────────────
export const rejectStudentId = async (req, res) => {
	try {
		const { reason } = req.body;
		if (!reason || !reason.trim()) {
			return res.status(400).json({ message: 'A rejection reason is required.' });
		}

		const student = await Student.findById(req.params.id);
		if (!student) return res.status(404).json({ message: 'Student not found' });
		if (student.idDocument?.status !== 'pending') {
			return res.status(400).json({ message: 'This student has no pending verification.' });
		}

		student.verified = false;
		student.idDocument.status = 'rejected';
		student.idDocument.reviewedAt = new Date();
		student.idDocument.rejectionReason = reason.trim();
		await student.save();

		res.status(200).json({ message: `${student.fullName}'s ID rejected.`, verified: false });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── LANDLORD VERIFICATIONS — PENDING QUEUE ────────────────
export const getPendingLandlordVerifications = async (req, res) => {
	try {
		const landlords = await Landlord.find({ 'idDocument.status': 'pending' })
			.select('fullName email phone profilePicture idDocument createdAt')
			.sort({ 'idDocument.submittedAt': 1 });
		res.status(200).json({ landlords, total: landlords.length });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── APPROVE LANDLORD ID ───────────────────────────────────
export const approveLandlordId = async (req, res) => {
	try {
		const landlord = await Landlord.findById(req.params.id);
		if (!landlord) return res.status(404).json({ message: 'Landlord not found' });
		if (landlord.idDocument?.status !== 'pending') {
			return res.status(400).json({ message: 'This landlord has no pending verification.' });
		}

		landlord.verified = true;
		landlord.idDocument.status = 'approved';
		landlord.idDocument.reviewedAt = new Date();
		landlord.idDocument.rejectionReason = undefined;
		await landlord.save();

		res.status(200).json({ message: `${landlord.fullName} verified.`, verified: true });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── REJECT LANDLORD ID ────────────────────────────────────
export const rejectLandlordId = async (req, res) => {
	try {
		const { reason } = req.body;
		if (!reason || !reason.trim()) {
			return res.status(400).json({ message: 'A rejection reason is required.' });
		}

		const landlord = await Landlord.findById(req.params.id);
		if (!landlord) return res.status(404).json({ message: 'Landlord not found' });
		if (landlord.idDocument?.status !== 'pending') {
			return res.status(400).json({ message: 'This landlord has no pending verification.' });
		}

		landlord.verified = false;
		landlord.idDocument.status = 'rejected';
		landlord.idDocument.reviewedAt = new Date();
		landlord.idDocument.rejectionReason = reason.trim();
		await landlord.save();

		res.status(200).json({ message: `${landlord.fullName}'s ID rejected.`, verified: false });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── REMOVE LISTING (ADMIN) ────────────────────────────────
export const removeListing = async (req, res) => {
	try {
		const listing = await Listing.findById(req.params.id);
		if (!listing) return res.status(404).json({ message: 'Listing not found' });

		await listing.deleteOne();
		res.status(200).json({ message: 'Listing removed by admin successfully' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── SYSTEM HEALTH ─────────────────────────────────────────
// GET /api/admin/health — recent server errors, so a fault in production is
// visible to someone who can act on it instead of scrolling past in a log.
export const getSystemHealth = async (req, res) => {
	try {
		res.status(200).json({
			stats: errorStats(),
			errors: recentErrors(50),
			uptimeSeconds: Math.round(process.uptime()),
			env: process.env.NODE_ENV || 'development',
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
