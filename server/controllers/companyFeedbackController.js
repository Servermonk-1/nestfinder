import CompanyFeedback from '../models/CompanyFeedback.js';
import Company from '../models/Company.js';
import Student from '../models/Student.js';

/**
 * Only a student who actually had this placement may rate it.
 *
 * Unverifiable praise or complaint attached to a named real employer is worse
 * than none at all — it invites both astroturfing and defamation. The proxy is
 * the strongest one we hold: their CONFIRMED placement points at this company.
 */
const hadPlacementHere = async (studentId, companyId) => {
	const me = await Student.findById(studentId).select('placement department').lean();
	const matches = String(me?.placement?.company || '') === String(companyId)
		&& me?.placement?.status === 'confirmed';
	return { allowed: matches, department: me?.department || '' };
};

// GET /api/companies/:id/feedback  (public)
export const getCompanyFeedback = async (req, res) => {
	try {
		const companyId = req.params.id;

		const rows = await CompanyFeedback.find({ company: companyId })
			.populate('student', 'fullName verified')
			.sort({ createdAt: -1 })
			.limit(50)
			.lean();

		const mine = req.user?.role === 'student'
			? rows.find((r) => String(r.student?._id) === String(req.user.id)) || null
			: null;

		const count = rows.length;
		const average = count ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
		const said = (key) => rows.filter((r) => r[key] === true).length;
		const answered = (key) => rows.filter((r) => r[key] !== null && r[key] !== undefined).length;

		// Show the reviewer as "Ada B." — enough to feel like a person, not
		// enough to identify a student to an employer they may still work for.
		const shape = (r) => {
			const [first = '', last = ''] = String(r.student?.fullName || '').split(' ');
			return {
				_id: r._id,
				rating: r.rating,
				comment: r.comment,
				stipendPaid: r.stipendPaid,
				wouldRecommend: r.wouldRecommend,
				department: r.department,
				createdAt: r.createdAt,
				reviewer: last ? `${first} ${last[0]}.` : first || 'A student',
				verified: !!r.student?.verified,
				isMine: String(r.student?._id) === String(req.user?.id || ''),
			};
		};

		let canReview = false;
		if (req.user?.role === 'student' && !mine) {
			canReview = (await hadPlacementHere(req.user.id, companyId)).allowed;
		}

		res.status(200).json({
			feedback: rows.filter((r) => String(r.student?._id) !== String(req.user?.id || '')).map(shape),
			myFeedback: mine ? shape(mine) : null,
			count,
			average,
			stipendPaidCount: said('stipendPaid'),
			stipendAnswered: answered('stipendPaid'),
			recommendCount: said('wouldRecommend'),
			recommendAnswered: answered('wouldRecommend'),
			canReview,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// POST /api/companies/:id/feedback  (student, must have trained there)
export const createCompanyFeedback = async (req, res) => {
	try {
		const companyId = req.params.id;
		const company = await Company.findById(companyId).lean().catch(() => null);
		if (!company) return res.status(404).json({ message: 'Placement centre not found' });

		const { allowed, department } = await hadPlacementHere(req.user.id, companyId);
		if (!allowed) {
			return res.status(403).json({
				message: 'Only students who trained here can leave feedback. Set this as your confirmed placement first.',
				needsPlacement: true,
			});
		}

		const rating = Number(req.body.rating);
		if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
			return res.status(400).json({ message: 'Give a rating between 1 and 5.' });
		}

		const doc = {
			company: companyId,
			student: req.user.id,
			rating: Math.round(rating),
			comment: String(req.body.comment || '').trim().slice(0, 1000),
			stipendPaid: typeof req.body.stipendPaid === 'boolean' ? req.body.stipendPaid : null,
			wouldRecommend: typeof req.body.wouldRecommend === 'boolean' ? req.body.wouldRecommend : null,
			department,
		};

		try {
			const created = await CompanyFeedback.create(doc);
			return res.status(201).json({ message: 'Thanks — this helps the next student.', feedback: created });
		} catch (err) {
			// The unique index is the real guard against double-posting.
			if (err.code === 11000) {
				return res.status(400).json({ message: 'You have already reviewed this placement centre.' });
			}
			throw err;
		}
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// PATCH /api/companies/feedback/:feedbackId  (author only)
export const updateCompanyFeedback = async (req, res) => {
	try {
		const row = await CompanyFeedback.findById(req.params.feedbackId);
		if (!row) return res.status(404).json({ message: 'Feedback not found' });
		if (String(row.student) !== String(req.user.id)) {
			return res.status(403).json({ message: 'You can only edit your own feedback.' });
		}

		if (req.body.rating !== undefined) {
			const rating = Number(req.body.rating);
			if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
				return res.status(400).json({ message: 'Give a rating between 1 and 5.' });
			}
			row.rating = Math.round(rating);
		}
		if (req.body.comment !== undefined) row.comment = String(req.body.comment).trim().slice(0, 1000);
		if (typeof req.body.stipendPaid === 'boolean') row.stipendPaid = req.body.stipendPaid;
		if (typeof req.body.wouldRecommend === 'boolean') row.wouldRecommend = req.body.wouldRecommend;

		await row.save();
		res.status(200).json({ message: 'Feedback updated', feedback: row });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// DELETE /api/companies/feedback/:feedbackId  (author, or an admin moderating)
export const deleteCompanyFeedback = async (req, res) => {
	try {
		const row = await CompanyFeedback.findById(req.params.feedbackId);
		if (!row) return res.status(404).json({ message: 'Feedback not found' });

		const isAuthor = String(row.student) === String(req.user.id);
		if (!isAuthor && req.user.role !== 'admin') {
			return res.status(403).json({ message: 'You can only delete your own feedback.' });
		}

		await row.deleteOne();
		res.status(200).json({ message: 'Feedback removed' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
