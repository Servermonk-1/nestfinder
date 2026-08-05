import PaymentSettings from '../models/PaymentSettings.js';
import axios from 'axios';

async function fetchRateFromSettings(settings) {
    // Try configured source; support 'coingecko' or a URL. Return NGN per USDT.
    if (!settings) return null;
    const src = (settings.exchangeRateSource || '').trim();
    try {
        if (!src || src.toLowerCase() === 'coingecko') {
            const r = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn', { timeout: 4000 });
            const rate = r?.data?.tether?.ngn;
            if (rate) return Number(rate);
        } else if (src.startsWith('http')) {
            const r = await axios.get(src, { timeout: 4000 });
            // Try common shapes
            if (typeof r.data === 'number') return Number(r.data);
            if (r.data?.rate) return Number(r.data.rate);
            if (r.data?.price) return Number(r.data.price);
            if (r.data?.tether?.ngn) return Number(r.data.tether.ngn);
            const asString = JSON.stringify(r.data).replace(/[^0-9.]/g, '');
            const parsed = parseFloat(asString);
            if (!Number.isNaN(parsed)) return parsed;
        }
    } catch (e) {
        // fallthrough to manual
    }
    if (settings.manualOverrideRate) return Number(settings.manualOverrideRate);
    return null;
}

export const getUSDTQuote = async (req, res) => {
    try {
        const bookingId = req.query.bookingId;
        let amountNGN = Number(req.query.amount || 0);
        if (bookingId) {
            // lazy-load booking to get amount
            const Booking = (await import('../models/Booking.js')).default;
            const booking = await Booking.findById(bookingId).catch(() => null);
            if (!booking) return res.status(404).json({ message: 'Booking not found' });
            amountNGN = booking.cost?.total || 0;
        }

        const settings = await PaymentSettings.findOne().sort({ updatedAt: -1 }).lean().catch(() => null);
        if (!settings) return res.status(404).json({ message: 'Payment settings not configured' });

        const rate = await fetchRateFromSettings(settings);
        if (!rate) return res.status(503).json({ message: 'Exchange rate unavailable' });

        const usdtAmount = Number((Number(amountNGN) / Number(rate)).toFixed(6));
        res.status(200).json({ rate, usdtAmount });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentSettingsPublic = async (req, res) => {
    try {
        const settings = await PaymentSettings.findOne().sort({ updatedAt: -1 }).lean().catch(() => null);
        if (!settings) return res.status(404).json({ message: 'Payment settings not configured' });
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPaymentSettingsAdmin = async (req, res) => {
    try {
        const settings = await PaymentSettings.find().sort({ updatedAt: -1 }).limit(50).lean();
        res.status(200).json({ settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const upsertPaymentSettings = async (req, res) => {
    try {
        // TEMP DEBUG: log entry to the POST /admin controller
        try { console.log('Entered upsertPaymentSettings (POST /api/payments-settings/admin)'); } catch (e) { }
        const {
            accountName, bankName, accountNumber, instructions,
            enableCrypto, usdtAddress, usdtNetwork, usdtWalletLabel,
            exchangeRateSource, manualOverrideRate,
        } = req.body;

        if (!accountName || !bankName || !accountNumber) return res.status(400).json({ message: 'accountName, bankName and accountNumber are required' });

        const settings = await PaymentSettings.create({
            accountName: String(accountName).trim(),
            bankName: String(bankName).trim(),
            accountNumber: String(accountNumber).trim(),
            instructions: String(instructions || '').trim(),
            enableCrypto: Boolean(enableCrypto),
            usdtAddress: String(usdtAddress || '').trim(),
            usdtNetwork: String(usdtNetwork || 'TRC20').trim(),
            usdtWalletLabel: String(usdtWalletLabel || '').trim(),
            exchangeRateSource: String(exchangeRateSource || '').trim(),
            manualOverrideRate: manualOverrideRate ? Number(manualOverrideRate) : undefined,
        });
        res.status(201).json({ message: 'Payment settings saved', settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
