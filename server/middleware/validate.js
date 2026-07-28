import { validationResult } from 'express-validator';

// This middleware runs AFTER validation rules
// If there are errors, it returns them — otherwise continues
const validate = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return res.status(400).json({
			message: 'Validation failed',
			errors: errors.array().map(err => ({
				field: err.path,
				message: err.msg,
			})),
		});
	}
	next();
};

export default validate;