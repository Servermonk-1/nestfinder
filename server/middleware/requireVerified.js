import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';

// Gate for actions that unverified accounts must NOT perform (e.g. contacting
// landlords). Runs AFTER `protect`, which populates req.user. Admins pass through.
const requireVerified = async (req, res, next) => {
	try {
		const Model = req.user.role === 'student' ? Student
			: req.user.role === 'landlord' ? Landlord
			: null;

		if (!Model) return next(); // admin or unknown role — not gated here

		const user = await Model.findById(req.user.id).select('emailVerified');
		if (!user) return res.status(401).json({ message: 'Account not found.' });

		if (!user.emailVerified) {
			return res.status(403).json({
				message: 'Please verify your email address before contacting landlords.',
				needsVerification: true,
			});
		}
		next();
	} catch (err) {
		next(err);
	}
};

export default requireVerified;
