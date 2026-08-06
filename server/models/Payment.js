import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['bank_transfer', 'usdt'], default: 'bank_transfer' },

    // Bank transfer fields
    senderName: { type: String, trim: true },
    transactionReference: { type: String, trim: true, index: true },
    paymentDate: { type: Date },
    receipt: { type: String }, // Cloudinary secure_url

    // Crypto / USDT fields
    transactionHash: { type: String, trim: true, index: true },
    network: { type: String, trim: true },
    walletAddress: { type: String, trim: true },
    blockchainScreenshot: { type: String }, // Cloudinary secure_url
    expectedUsdtAmount: { type: Number },

    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    verifiedAt: { type: Date },
    rejectionReason: { type: String, trim: true, maxlength: 300 },
}, { timestamps: true });

export default mongoose.model('Payment', paymentSchema);
