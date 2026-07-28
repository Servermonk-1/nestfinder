import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Landlord from './models/Landlord.js';
import Listing from './models/Listing.js';

dotenv.config();

const DEMO_LANDLORD_EMAIL = 'demo.landlord@nestfinder.com';

const LISTINGS = [
	{
		title: 'Cozy Self-Contained Near Campus Gate',
		description: 'A bright, fully self-contained room five minutes from the main campus gate. Perfect for students on industrial training who want a quiet, secure place close to everything.',
		address: '14 Ogunlana Close',
		city: 'Ibadan',
		area: 'Agbowo',
		state: 'Oyo',
		price: 180000,
		roomType: 'self-contained',
		rooms: 1,
		amenities: ['Electricity', 'Water', 'Security', 'WiFi', 'Kitchen', 'Private Bath'],
		images: [
			'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80',
		],
		available: true,
		contactPhone: '+2348031234567',
		contactEmail: 'demo.landlord@nestfinder.com',
	},
	{
		title: 'Shared Room With Steady Power & Water',
		description: 'Affordable shared room in a friendly compound with 24/7 electricity and running water. Great for students who want to save on rent without sacrificing comfort.',
		address: '9 Adekunle Street',
		city: 'Ibadan',
		area: 'Sango',
		state: 'Oyo',
		price: 85000,
		roomType: 'shared',
		rooms: 2,
		amenities: ['Electricity', 'Water', 'Security', 'Parking'],
		images: [
			'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
		],
		available: true,
		contactPhone: '+2348032345678',
		contactEmail: 'demo.landlord@nestfinder.com',
	},
	{
		title: 'Modern Single Room, Fully Furnished',
		description: 'A modern, fully furnished single room in a gated estate with fast WiFi and dedicated parking. Ideal for a student who wants privacy and reliable internet for coursework.',
		address: '22 Awolowo Avenue',
		city: 'Ibadan',
		area: 'Bodija',
		state: 'Oyo',
		price: 140000,
		roomType: 'single',
		rooms: 1,
		amenities: ['Electricity', 'Water', 'WiFi', 'Parking', 'Kitchen'],
		images: [
			'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1615873968403-89e068629265?auto=format&fit=crop&w=1200&q=80',
			'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
		],
		available: true,
		contactPhone: '+2348033456789',
		contactEmail: 'demo.landlord@nestfinder.com',
	},
];

const seed = async () => {
	await mongoose.connect(process.env.MONGO_URI);

	let landlord = await Landlord.findOne({ email: DEMO_LANDLORD_EMAIL });
	if (!landlord) {
		const salt = await bcrypt.genSalt(10);
		const password = await bcrypt.hash('demoLandlord123', salt);
		landlord = await Landlord.create({
			fullName: 'Demo Landlord',
			email: DEMO_LANDLORD_EMAIL,
			password,
			phone: '+2348031234567',
			verified: true,
		});
		console.log('Created demo landlord:', landlord.email);
	} else {
		console.log('Using existing demo landlord:', landlord.email);
	}

	const created = [];
	for (const data of LISTINGS) {
		const listing = await Listing.create({ ...data, landlord: landlord._id });
		created.push(listing);
	}

	console.log(`Seeded ${created.length} listings:`);
	created.forEach((l) => console.log(`  - ${l.title} (${l._id})`));

	const totalAvailable = await Listing.countDocuments({ available: true, flagged: false });
	console.log(`Total available listings in DB: ${totalAvailable}`);

	process.exit();
};

seed().catch((err) => {
	console.error('Seeding failed:', err);
	process.exit(1);
});
