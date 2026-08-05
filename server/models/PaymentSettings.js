import mongoose from 'mongoose';

const paymentSettingsSchema = new mongoose.Schema({
    accountName: { type: String, trim: true, required: true },
    bankName: { type: String, trim: true, required: true },
    accountNumber: { type: String, trim: true, required: true },
    instructions: { type: String, trim: true },

    // USDT / crypto settings
    enableCrypto: { type: Boolean, default: false },
    usdtAddress: { type: String, trim: true },
    usdtNetwork: { type: String, trim: true, default: 'TRC20' },
    usdtWalletLabel: { type: String, trim: true },
    // Exchange rate configuration
    exchangeRateSource: { type: String, trim: true }, // e.g. 'coingecko' or a URL
    manualOverrideRate: { type: Number }, // NGN per USDT
}, { timestamps: true });

export default mongoose.model('PaymentSettings', paymentSettingsSchema);
