import multer from 'multer';

/**
 * Multer configured for MEMORY storage, not disk.
 *
 * Files used to be written to `uploads/` on the server. Render's filesystem is
 * ephemeral — the container is replaced on every deploy and can be recycled at
 * any time — so every uploaded photo vanished while the listing row that
 * referenced it stayed in MongoDB, leaving broken images across the site.
 *
 * With memoryStorage the file arrives as `file.buffer` and is streamed straight
 * to Cloudinary (see config/cloudinary.js). Nothing is ever written to disk, so
 * there is no local state to lose.
 *
 * The 5MB limit and the MIME allow-list are unchanged from the disk version.
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
	const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
	if (allowed.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(new Error('Only image or PDF files are allowed (jpeg, jpg, png, webp, pdf)'), false);
	}
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

export default upload;
