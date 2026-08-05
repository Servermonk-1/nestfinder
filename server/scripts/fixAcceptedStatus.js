import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Narrow one-off: rename the legacy `accepted` booking status to `pendingPayment`.
 *
 * Deliberately smaller than migrateBookingPayments.js, which also collapses
 * movedIn/completed into confirmed — lossy for anyone who has already moved in,
 * and unnecessary here since both are valid in the current enum.
 */
const run = async () => {
	await mongoose.connect(process.env.MONGO_URI);
	const bookings = mongoose.connection.db.collection('bookings');

	const before = await bookings
		.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
		.toArray();
	console.log('Before:');
	before.forEach((r) => console.log(`  ${r._id}: ${r.n}`));

	const { modifiedCount } = await bookings.updateMany(
		{ status: 'accepted' },
		{ $set: { status: 'pendingPayment' } },
	);
	console.log(`\nUpdated ${modifiedCount} booking(s): accepted -> pendingPayment`);

	const after = await bookings
		.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }])
		.toArray();
	console.log('\nAfter:');
	after.forEach((r) => console.log(`  ${r._id}: ${r.n}`));

	await mongoose.disconnect();
};

run().catch((error) => {
	console.error('Failed:', error);
	process.exit(1);
});
