import Student from '../models/Student.js';
import Landlord from '../models/Landlord.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const MODELS = { student: Student, landlord: Landlord };
const VALID_TYPES = {
	student: ['NIN', 'Student ID', 'Voters Card', 'Drivers Licence', 'Passport'],
	landlord: ['NIN', 'Voters Card', 'Drivers Licence', 'Passport'],
};

// ── SUBMIT ID FOR VERIFICATION (generic over role) ────────
// multipart fields: idFront (required), idBack (optional), documentType
const makeSubmit = (role) => async (req, res) => {
	try {
		if (req.user.role !== role) {
			return res.status(403).json({ message: `Only ${role}s can use this.` });
		}

		const { documentType } = req.body;
		if (!VALID_TYPES[role].includes(documentType)) {
			return res.status(400).json({ message: 'Please choose a valid document type.' });
		}

		const front = req.files?.idFront?.[0];
		if (!front) {
			return res.status(400).json({ message: 'The front image of your ID is required.' });
		}
		const back = req.files?.idBack?.[0];

		const account = await MODELS[role].findById(req.user.id);
		if (!account) return res.status(404).json({ message: 'Account not found.' });

		if (account.idDocument?.status === 'approved') {
			return res.status(400).json({ message: 'Your identity is already verified.' });
		}

		// A profile photo is required so the admin can match your face to the ID.
		if (!account.profilePicture) {
			return res.status(400).json({ message: 'Please add a profile photo before submitting your ID — it is compared against the photo on your document.' });
		}

		// ID scans go to their own folder so they can be access-controlled
		// separately from public listing photos — these are government documents,
		// not marketing images.
		const [frontUpload, backUpload] = await Promise.all([
			uploadToCloudinary(front.buffer, {
				folder: 'nestfinder/kyc',
				resource_type: front.mimetype === 'application/pdf' ? 'raw' : 'image',
			}),
			back
				? uploadToCloudinary(back.buffer, {
					folder: 'nestfinder/kyc',
					resource_type: back.mimetype === 'application/pdf' ? 'raw' : 'image',
				})
				: Promise.resolve(null),
		]);

		account.idDocument = {
			documentType,
			frontImage: frontUpload.secure_url,
			backImage: backUpload ? backUpload.secure_url : undefined,
			submittedAt: new Date(),
			status: 'pending',
			rejectionReason: undefined,
		};
		await account.save();

		res.status(200).json({
			message: 'ID submitted. An admin will review it shortly.',
			verification: {
				status: account.idDocument.status,
				documentType: account.idDocument.documentType,
				submittedAt: account.idDocument.submittedAt,
			},
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// ── GET MY VERIFICATION STATUS (generic over role) ────────
const makeGet = (role) => async (req, res) => {
	try {
		const account = await MODELS[role].findById(req.user.id).select('verified idDocument profilePicture');
		if (!account) return res.status(404).json({ message: 'Account not found.' });

		res.status(200).json({
			verified: account.verified,
			idDocument: account.idDocument || { status: 'none' },
			profilePicture: account.profilePicture || null,
		});
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
};

// Student (existing names kept so student routes don't change)
export const submitStudentId = makeSubmit('student');
export const getMyVerification = makeGet('student');

// Landlord
export const submitLandlordId = makeSubmit('landlord');
export const getLandlordVerification = makeGet('landlord');
