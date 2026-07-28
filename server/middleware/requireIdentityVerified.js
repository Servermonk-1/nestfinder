import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';

// Gate for actions that require an ADMIN-APPROVED identity (KYC `verified`):
// landlords listing rooms, students opening listing details. Runs after `protect`.
// (This is stricter than requireVerified.js, which only checks emailVerified.)
const requireIdentityVerified = async (req, res, next) => {
	try {
		const Model = req.user.role === 'student' ? Student
			: req.user.role === 'landlord' ? Landlord
			: null;

		if (!Model) return next(); // admin / unknown — not gated here

		const account = await Model.findById(req.user.id).select('verified');
		if (!account) return res.status(401).json({ message: 'Account not found.' });

		if (!account.verified) {
			return res.status(403).json({
				message: 'Please verify your identity to continue.',
				needsIdentityVerification: true,
			});
		}
		next();
	} catch (err) {
		next(err);
	}
};

export default requireIdentityVerified;
