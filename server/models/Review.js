import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
	listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
	landlord: { type: mongoose.Schema.Types.ObjectId, ref: 'Landlord', required: true },
	student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
	rating: { type: Number, required: true, min: 1, max: 5 },
	comment: { type: String, trim: true, maxlength: 500 },
}, { timestamps: true });

// One review per student per listing.
reviewSchema.index({ listing: 1, student: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
