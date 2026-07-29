import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

dotenv.config();

// The admin credential is read from the environment, never written down here.
// This file is public, so a literal password in it would be the published
// default for every deployment that ever runs the script.
const MIN_LENGTH = 12;

const createAdmin = async () => {
	const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
	const password = process.env.ADMIN_PASSWORD || '';

	if (!email || !password) {
		console.error(
			'Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env before running this.\n' +
			'  ADMIN_EMAIL=you@example.com\n' +
			'  ADMIN_PASSWORD=<a long, unique password>'
		);
		process.exit(1);
	}

	if (password.length < MIN_LENGTH) {
		console.error(`ADMIN_PASSWORD must be at least ${MIN_LENGTH} characters.`);
		process.exit(1);
	}

	await mongoose.connect(process.env.MONGO_URI);

	// Running this twice should not quietly leave two admins behind, nor crash
	// on the unique index — update the existing one instead.
	const existing = await Admin.findOne({ email });
	const hashed = await bcrypt.hash(password, await bcrypt.genSalt(10));

	if (existing) {
		existing.password = hashed;
		await existing.save();
		console.log('Password updated for existing admin:', email);
	} else {
		await Admin.create({ fullName: 'Super Admin', email, password: hashed });
		console.log('Admin created:', email);
	}

	await mongoose.disconnect();
	process.exit(0);
};

createAdmin();
