import Feedback from '../models/Feedback.js';

// ── SUBMIT FEEDBACK / PROBLEM REPORT ──────────────────────
export const submitFeedback = async (req, res) => {
	try {
		const { type = 'feedback', message } = req.body;

		if (!message || !message.trim()) {
			return res.status(400).json({ message: 'Please describe the issue or feedback' });
		}

		await Feedback.create({
			userId: req.user.id,
			role: req.user.role,
			type: type === 'problem' ? 'problem' : 'feedback',
			message: message.trim(),
		});

		res.status(201).json({ message: 'Thank you — your message has been received' });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};
