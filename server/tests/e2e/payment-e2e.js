import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { MongoMemoryServer } from 'mongodb-memory-server';

import bookingRoutes from '../../routes/bookings.js';
import paymentRoutes from '../../routes/payments.js';
import paymentSettingsRoutes from '../../routes/paymentSettings.js';

import Admin from '../../models/Admin.js';
import Student from '../../models/Student.js';
import Landlord from '../../models/Landlord.js';
import Listing from '../../models/Listing.js';
import Booking from '../../models/Booking.js';
import Payment from '../../models/Payment.js';
import PaymentSettings from '../../models/PaymentSettings.js';

const SECRET = process.env.JWT_SECRET || 'testsecret';

const log = (ok, name) => console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);

async function runE2E() {
  // Ensure the server auth middleware uses the same secret we sign test tokens with.
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: 'e2e' });

  const app = express();
  app.use(express.json());
  app.use('/api/bookings', bookingRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/payments-settings', paymentSettingsRoutes);

  // Create users and tokens
  const admin = await Admin.create({ fullName: 'Admin', email: `a-${Math.random()}@x.io`, password: await bcrypt.hash('pw',10) });
  const landlord = await Landlord.create({ fullName: 'LL', email: `l-${Math.random()}@x.io`, password: await bcrypt.hash('pw',10), phone: '0801', verified: true });
  const student = await Student.create({ fullName: 'Stu', email: `s-${Math.random()}@x.io`, password: await bcrypt.hash('pw',10), phone: '0802', institution: 'Uni', verified: true });

  const aToken = jwt.sign({ id: admin._id, role: 'admin' }, SECRET);
  const lToken = jwt.sign({ id: landlord._id, role: 'landlord' }, SECRET);
  const sToken = jwt.sign({ id: student._id, role: 'student' }, SECRET);

  // Create listing
  const listing = await Listing.create({ title: 'E2E Room', description: 'Test', address: '1 St', area: 'X', city: 'Y', state: 'Z', price: 240000, priceUnit: 'annual', roomType: 'single', rooms:1, contactPhone:'0800', contactEmail:'x@x.io', landlord: landlord._id, cautionDeposit:50000, agentFee:20000, legalFee:10000 });

  let failures = 0;

  // Helper to attach token
  const as = (r, token) => r.set('Authorization', `Bearer ${token}`);

  // 1-2 Student books accommodation
  try {
    const applyRes = await as(request(app).post('/api/bookings'), sToken).send({ listingId: listing._id, moveIn: new Date(Date.now()+7*864e5).toISOString().slice(0,10), moveOut: new Date(Date.now()+189*864e5).toISOString().slice(0,10) });
    if (applyRes.status !== 201) { log(false, 'Student apply'); console.error('applyRes status', applyRes.status, 'body', applyRes.body); failures++; }
    else { log(true, 'Student apply'); }
    const bookingId = applyRes.body?.booking?._id;

    // 3. Landlord accepts
    const acceptRes = await as(request(app).patch(`/api/bookings/${bookingId}/respond`), lToken).send({ accept: true });
    if (acceptRes.status !== 200 || acceptRes.body.booking.status !== 'pendingPayment') { log(false, 'Landlord accepts -> pendingPayment'); failures++; }
    else { log(true, 'Landlord accepts -> pendingPayment'); }

    // 5. Student submits bank transfer
    const payRes = await as(request(app).post('/api/payments').send({
      bookingId,
      paymentMethod: 'bank_transfer',
      amount: 200000,
      senderName: 'Test Student',
      transactionReference: 'REF-BANK-1',
      paymentDate: new Date().toISOString().slice(0,10),
    }), sToken);
    if (payRes.status !== 201 || payRes.body.payment.status !== 'pending') { log(false, 'Student submits bank transfer'); failures++; }
    else { log(true, 'Student submits bank transfer'); }
    const paymentId = payRes.body.payment._id;

    // 7. Admin approves
    const approveRes = await as(request(app).patch(`/api/payments/${paymentId}/approve`), aToken);
    if (approveRes.status !== 200 || approveRes.body.payment.status !== 'approved') { log(false, 'Admin approves bank transfer'); failures++; }
    else { log(true, 'Admin approves bank transfer'); }

    // 9-10 Booking confirmed and listing unavailable
    const bookingAfter = await Booking.findById(bookingId).lean();
    const listingAfter = await Listing.findById(listing._id).lean();
    if (bookingAfter.status !== 'confirmed') { log(false, 'Booking is confirmed after approval'); failures++; } else { log(true, 'Booking is confirmed after approval'); }
    if (listingAfter.available === false) { log(true, 'Listing unavailable after confirmation'); } else { log(false, 'Listing unavailable after confirmation'); failures++; }

    // USDT scenario: new booking
    const applyRes2 = await as(request(app).post('/api/bookings'), sToken).send({ listingId: listing._id, moveIn: new Date(Date.now()+10*864e5).toISOString().slice(0,10), moveOut: new Date(Date.now()+199*864e5).toISOString().slice(0,10) });
    const bookingId2 = applyRes2.body.booking._id;
    await as(request(app).patch(`/api/bookings/${bookingId2}/respond`), lToken).send({ accept: true });

    // Create PaymentSettings for USDT rate
    await PaymentSettings.create({ accountName: 'NestFinder', bankName: 'GTB', accountNumber: '123', manualOverrideRate: 500 });

    const payResUsdt = await as(request(app).post('/api/payments').send({
      bookingId: bookingId2,
      paymentMethod: 'usdt',
      amount: 200000,
      transactionHash: '0xdeadbeef',
      network: 'TRC20',
      walletAddress: 'TXaddr',
      paymentDate: new Date().toISOString().slice(0,10),
    }), sToken);
    if (payResUsdt.status !== 201 || payResUsdt.body.payment.paymentMethod !== 'usdt') { log(false, 'Student submits USDT payment'); failures++; } else { log(true, 'Student submits USDT payment'); }
    const payUsdtId = payResUsdt.body.payment._id;

    const approveUsdt = await as(request(app).patch(`/api/payments/${payUsdtId}/approve`), aToken);
    if (approveUsdt.status !== 200) { log(false, 'Admin approves USDT'); failures++; } else { log(true, 'Admin approves USDT'); }

    // Rejection and resubmit scenario
    const applyRes3 = await as(request(app).post('/api/bookings'), sToken).send({ listingId: listing._id, moveIn: new Date(Date.now()+20*864e5).toISOString().slice(0,10), moveOut: new Date(Date.now()+220*864e5).toISOString().slice(0,10) });
    const bookingId3 = applyRes3.body.booking._id;
    await as(request(app).patch(`/api/bookings/${bookingId3}/respond`), lToken).send({ accept: true });

    const payFirst = await as(request(app).post('/api/payments').send({
      bookingId: bookingId3,
      paymentMethod: 'bank_transfer',
      amount: 200000,
      senderName: 'Test Student',
      transactionReference: 'REF-BAD',
      paymentDate: new Date().toISOString().slice(0,10),
    }), sToken);
    const payFirstId = payFirst.body.payment._id;

    const reject = await as(request(app).patch(`/api/payments/${payFirstId}/reject`), aToken).send({ reason: 'Bad image' });
    if (reject.status !== 200 || reject.body.payment.status !== 'rejected') { log(false, 'Admin rejects payment'); failures++; } else { log(true, 'Admin rejects payment'); }

    // Student resubmits
    const paySecond = await as(request(app).post('/api/payments').send({
      bookingId: bookingId3,
      paymentMethod: 'bank_transfer',
      amount: 200000,
      senderName: 'Test Student',
      transactionReference: 'REF-GOOD',
      paymentDate: new Date().toISOString().slice(0,10),
    }), sToken);
    if (paySecond.status !== 201) { log(false, 'Student resubmits after rejection'); failures++; } else { log(true, 'Student resubmits after rejection'); }

  } catch (err) {
    console.error('E2E script error', err);
    failures++;
  } finally {
    await mongoose.disconnect();
    await mongod.stop();
  }

  if (failures > 0) {
    console.error(`E2E completed with ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('E2E completed with 0 failures');
  process.exit(0);
}

runE2E();
