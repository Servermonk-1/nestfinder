import Report from '../models/Report.js';
import Listing from '../models/Listing.js';

export const submitReport = async (req, res) => {
	try {
		const { listingId, reason, details } = req.body;

		// Check listing exists
		const listing = await Listing.findById(listingId);
		if (!listing) {
			return res.status(404).json({ message: 'Listing not found' });
		}

		// Check student hasn't already reported this listing
		const alreadyReported = await Report.findOne({
			listing: listingId,
			reporter: req.user.id,
		});
		if (alreadyReported) {
			return res.status(400).json({ message: 'You have already reported this listing' });
		}

		// Create the report
		await Report.create({
			listing: listingId,
			reporter: req.user.id,
			reason,
			details,
		});

		// Increment report count on listing
		listing.reportCount += 1;

		// Auto-flag if 3 or more reports
		if (listing.reportCount >= 3) {
			listing.flagged = true;
		}

		await listing.save();

		res.status(201).json({
			message: 'Report submitted successfully. Our team will review it.',
			flagged: listing.flagged,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};