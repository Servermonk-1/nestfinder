import 'dotenv/config';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Payment from '../models/Payment.js';

const STATUS_REMAP = {
	paid: 'confirmed',
	movedIn: 'confirmed',
	completed: 'confirmed',
	accepted: 'pendingPayment',
	declined: 'cancelled',
	refunded: 'cancelled',
};

const ALLOWED_BOOKING_STATUSES = ['pending', 'pendingPayment', 'confirmed', 'cancelled'];

const staleBookingFields = [
	'escrow',
	'payout',
	'payment',
	'authorizationUrl',
	'authorization_url',
	'paymentReference',
	'paystack',
	'paymentGateway',
	'gateway',
	'checkoutUrl',
	'transactionId',
	'reference',
];

const stalePaymentFields = [
	'authorizationUrl',
	'authorization_url',
	'paymentReference',
	'paystack',
	'paymentGateway',
	'gateway',
	'checkoutUrl',
	'transactionId',
	'reference',
];

const run = async () => {
	await mongoose.connect(process.env.MONGO_URI);

	console.log('Connected to MongoDB');

	const bookingStatusCounts = await Booking.aggregate([
		{ $group: { _id: '$status', count: { $sum: 1 } } },
	]);
	console.log('Booking status distribution before migration:');
	bookingStatusCounts.forEach((row) => console.log(`  ${row._id}: ${row.count}`));

	let totalBookingUpdates = 0;
	for (const [legacyStatus, normalized] of Object.entries(STATUS_REMAP)) {
		const result = await Booking.updateMany(
			{ status: legacyStatus },
			{ $set: { status: normalized } },
		);
		console.log(`Updated ${result.modifiedCount} booking(s) status ${legacyStatus} → ${normalized}`);
		totalBookingUpdates += result.modifiedCount;
	}

	const unknownStatusFilter = {
		status: { $nin: ALLOWED_BOOKING_STATUSES.concat(Object.keys(STATUS_REMAP)) },
	};
	const unknownStatusCount = await Booking.countDocuments(unknownStatusFilter);
	if (unknownStatusCount > 0) {
		const unknownStatuses = await Booking.aggregate([
			{ $match: unknownStatusFilter },
			{ $group: { _id: '$status', count: { $sum: 1 } } },
		]);
		console.log('\nWARNING: Found bookings with unknown statuses. Normalizing to pending:');
		unknownStatuses.forEach((row) => console.log(`  ${row._id}: ${row.count}`));
		const result = await Booking.updateMany(unknownStatusFilter, { $set: { status: 'pending' } });
		console.log(`Updated ${result.modifiedCount} booking(s) with unknown status to pending.`);
		totalBookingUpdates += result.modifiedCount;
	}

	const fieldUnset = staleBookingFields.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
	const bookingFieldFilter = { $or: staleBookingFields.map((field) => ({ [field]: { $exists: true } })) };
	const bookingFieldResult = await Booking.updateMany(bookingFieldFilter, { $unset: fieldUnset });
	console.log(`Unset old booking fields in ${bookingFieldResult.modifiedCount} booking(s)`);

	const paymentFieldUnset = stalePaymentFields.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
	const paymentFieldFilter = { $or: stalePaymentFields.map((field) => ({ [field]: { $exists: true } })) };
	const paymentFieldResult = await Payment.updateMany(paymentFieldFilter, { $unset: paymentFieldUnset });
	console.log(`Unset old payment fields in ${paymentFieldResult.modifiedCount} payment(s)`);

	const bookingStatusCountsAfter = await Booking.aggregate([
		{ $group: { _id: '$status', count: { $sum: 1 } } },
	]);
	console.log('\nBooking status distribution after migration:');
	bookingStatusCountsAfter.forEach((row) => console.log(`  ${row._id}: ${row.count}`));

	console.log(`\nMigration complete. Total booking updates: ${totalBookingUpdates}.`);

	await mongoose.disconnect();
	console.log('Disconnected from MongoDB');
};

run().catch((error) => {
	console.error('Migration failed:', error);
	process.exit(1);
});
