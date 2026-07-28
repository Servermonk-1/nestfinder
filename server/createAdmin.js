import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Admin from './models/Admin.js';

dotenv.config();

const createAdmin = async () => {
	await mongoose.connect(process.env.MONGO_URI);

	const salt = await bcrypt.genSalt(10);
	const password = await bcrypt.hash('admin123', salt);

	const admin = await Admin.create({
		fullName: 'Super Admin',
		email: 'admin@nestfinder.com',
		password,
	});

	console.log('✅ Admin created:', admin.email);
	process.exit();
};

createAdmin();