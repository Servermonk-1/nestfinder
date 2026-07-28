const studentOnly = (req, res, next) => {
	if (req.user && req.user.role === 'student') {
		next();
	} else {
		res.status(403).json({ message: 'Access denied. Students only.' });
	}
};

export default studentOnly;
