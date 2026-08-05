import Payment from '../models/Payment.js';
import Booking from '../models/Booking.js';
import Listing from '../models/Listing.js';
import PaymentSettings from '../models/PaymentSettings.js';
import axios from 'axios';

const POPULATE = [
    { path: 'booking', select: 'listing student landlord moveInDate moveOutDate cost status' },
    { path: 'student', select: 'fullName email phone' },
];

export const submitPayment = async (req, res) => {
    try {
        const {
            bookingId, amount, senderName, transactionReference, paymentDate,
            paymentMethod, transactionHash, network, walletAddress,
        } = req.body;

        const booking = await Booking.findById(bookingId).catch(() => null);
        if (!booking) return res.status(404).json({ message: 'Booking not found' });
        if (String(booking.student) !== String(req.user.id)) return res.status(403).json({ message: 'Not your booking.' });
        if (booking.status !== 'pendingPayment') return res.status(400).json({ message: 'This booking is not awaiting payment.' });

        const file = req.file; // optional receipt / screenshot upload handled by upload middleware

        const method = String(paymentMethod || 'bank_transfer');

        const base = {
            booking: booking._id,
            student: req.user.id,
            amount,
            paymentMethod: method,
            status: 'pending',
        };

        let data = {};
        if (method === 'usdt') {
            // require transactionHash
            if (!transactionHash) return res.status(400).json({ message: 'transactionHash is required for USDT payments' });

            // compute expected USDT amount using PaymentSettings exchange rate or manual override
            const settings = await PaymentSettings.findOne().sort({ updatedAt: -1 }).lean().catch(() => null);
            let rate = null;
            if (settings) {
                const src = (settings.exchangeRateSource || '').trim();
                try {
                    if (!src || src.toLowerCase() === 'coingecko') {
                        const r = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=ngn', { timeout: 4000 });
                        rate = r?.data?.tether?.ngn;
                    } else if (src.startsWith('http')) {
                        const r = await axios.get(src, { timeout: 4000 });
                        if (typeof r.data === 'number') rate = Number(r.data);
                        else if (r.data?.rate) rate = Number(r.data.rate);
                        else if (r.data?.price) rate = Number(r.data.price);
                        else if (r.data?.tether?.ngn) rate = Number(r.data.tether.ngn);
                        else {
                            const asString = JSON.stringify(r.data).replace(/[^0-9.]/g, '');
                            const parsed = parseFloat(asString);
                            if (!Number.isNaN(parsed)) rate = parsed;
                        }
                    }
                } catch (e) {
                    // ignore
                }
                if (!rate && settings.manualOverrideRate) rate = Number(settings.manualOverrideRate);
            }

            const bookingAmount = booking.cost?.total || 0;
            const expectedUsdtAmount = rate ? Number((Number(bookingAmount) / Number(rate)).toFixed(6)) : undefined;

            data = {
                transactionHash: String(transactionHash).trim(),
                network: String(network || 'TRC20').trim(),
                walletAddress: String(walletAddress || '').trim(),
                blockchainScreenshot: file ? file.filename : undefined,
                expectedUsdtAmount,
            };
        } else {
            data = {
                senderName: String(senderName || '').trim(),
                transactionReference: String(transactionReference || '').trim(),
                paymentDate: paymentDate ? new Date(paymentDate) : undefined,
                receipt: file ? file.filename : undefined,
            };
        }

        const payment = await Payment.create({ ...base, ...data });

        res.status(201).json({ message: 'Payment submitted for verification', payment: await payment.populate(POPULATE) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const adminListPayments = async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.method) filter.paymentMethod = req.query.method;

        // Search across student name, booking id, transactionReference, transactionHash
        const q = String(req.query.q || '').trim();
        let paymentsQuery = Payment.find(filter);
        if (q) {
            const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const Student = (await import('../models/Student.js')).default;
            const matchedStudents = await Student.find({ fullName: regex }).select('_id').lean().catch(() => []);
            const studentIds = matchedStudents.map(s => s._id.toString());

            const orClauses = [
                { transactionReference: regex },
                { transactionHash: regex },
                { walletAddress: regex },
                { booking: q },
            ];
            if (studentIds.length) orClauses.push({ student: { $in: studentIds } });

            paymentsQuery = paymentsQuery.or(orClauses);
        }

        const payments = await paymentsQuery.populate(POPULATE).sort({ createdAt: -1 }).limit(500).lean();
        res.status(200).json({ payments, total: payments.length });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).populate(POPULATE).lean().catch(() => null);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        res.status(200).json({ payment });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const approvePayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).catch(() => null);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        if (payment.status === 'approved') return res.status(200).json({ message: 'Already approved', payment });

        payment.status = 'approved';
        payment.verifiedBy = req.user.id;
        payment.verifiedAt = new Date();
        await payment.save();

        // Update booking and listing
        const booking = await Booking.findById(payment.booking).catch(() => null);
        if (booking) {
            booking.status = 'confirmed';
            await booking.save();
            await Listing.findByIdAndUpdate(booking.listing, { available: false });
        }

        res.status(200).json({ message: 'Payment approved', payment: await payment.populate(POPULATE) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const rejectPayment = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.id).catch(() => null);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });
        const reason = String(req.body.reason || '').trim().slice(0, 300) || 'Rejected by administrator';

        payment.status = 'rejected';
        payment.rejectionReason = reason;
        payment.verifiedBy = req.user.id;
        payment.verifiedAt = new Date();
        await payment.save();

        // Keep booking in pendingPayment so student can submit again
        res.status(200).json({ message: 'Payment rejected', payment: await payment.populate(POPULATE) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
