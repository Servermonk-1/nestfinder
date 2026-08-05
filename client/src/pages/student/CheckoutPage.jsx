import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Info, Copy, Building2, Coins, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import StudentNavbar from '../../components/common/StudentNavbar';
import api from '../../services/api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

export default function CheckoutPage() {
	const { id } = useParams();
	const navigate = useNavigate();

	const [booking, setBooking] = useState(null);
	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState(null);
	const [submitting, setSubmitting] = useState(false);

	const [paymentMethod, setPaymentMethod] = useState('bank_transfer');

	// Bank transfer
	const [senderName, setSenderName] = useState('');
	const [transactionReference, setTransactionReference] = useState('');
	const [amountPaid, setAmountPaid] = useState('');
	const [paymentDate, setPaymentDate] = useState('');
	const [receiptFile, setReceiptFile] = useState(null);

	// USDT
	const [walletUsed, setWalletUsed] = useState('');
	const [transactionHash, setTransactionHash] = useState('');
	const [amountUSDT, setAmountUSDT] = useState('');
	const [usdtRate, setUsdtRate] = useState(null);
	const [usdtError, setUsdtError] = useState(null);
	const [usdtDate, setUsdtDate] = useState('');
	const [screenshotFile, setScreenshotFile] = useState(null);

	useEffect(() => {
		let live = true;
		(async () => {
			try {
				const { data } = await api.get(`/bookings/${id}`);
				if (!live) return;
				setBooking(data.booking);
				try {
					const ps = await api.get('/payments-settings/settings');
					if (live) setSettings(ps.data.settings);
				} catch (e) {
					// Payment settings missing - will show error on submit
				}
			} catch (err) {
				if (live) toast.error(err.response?.data?.message || 'Could not open payment page');
			} finally {
				if (live) setLoading(false);
			}
		})();
		return () => { live = false; };
	}, [id]);

	useEffect(() => {
		let live = true;
		if (paymentMethod !== 'usdt') return () => { live = false; };
		(async () => {
			try {
				setUsdtError(null);
				const { data } = await api.get(`/payments-settings/quote?bookingId=${id}`);
				if (!live) return;
				setUsdtRate(data.rate);
				setAmountUSDT(String(data.usdtAmount));
			} catch (err) {
				if (!live) return;
				setUsdtRate(null);
				setUsdtError(err.response?.data?.message || 'Exchange rate unavailable');
			}
		})();
		return () => { live = false; };
	}, [paymentMethod, id]);

	if (loading) return (
		<div className="min-h-screen bg-paper">
			<StudentNavbar />
			<div className="flex justify-center py-32"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
		</div>
	);

	if (!booking) return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />
			<div className="mx-auto max-w-lg px-6 pt-32 text-center">
				<p className="font-serif text-xl font-bold">Booking not found</p>
				<Link to="/bookings" className="mt-4 inline-block bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark">
					Back to bookings
				</Link>
			</div>
		</div>
	);

	if (booking.status !== 'pendingPayment') {
		return (
			<div className="min-h-screen bg-paper text-text">
				<StudentNavbar />
				<div className="mx-auto max-w-lg px-6 pt-32 text-center">
					<p className="font-serif text-xl font-bold">This booking is not awaiting payment</p>
					<p className="mt-2 text-sm text-muted">Its status is <span className="font-semibold text-text">{booking.status}</span>.</p>
					<Link to={`/bookings/${id}`} className="mt-5 inline-block bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-dark">
						Back to the booking
					</Link>
				</div>
			</div>
		);
	}

	const submit = async (e) => {
		e.preventDefault();
		if (!settings) return toast.error('Payment settings not configured');
		setSubmitting(true);
		try {
			const fd = new FormData();
			fd.append('bookingId', booking._id);
			fd.append('paymentMethod', paymentMethod);
			if (paymentMethod === 'usdt') {
				fd.append('amount', amountUSDT || '');
				fd.append('transactionHash', transactionHash);
				fd.append('network', settings.usdtNetwork || 'TRC20');
				fd.append('walletAddress', walletUsed || '');
				if (usdtDate) fd.append('paymentDate', usdtDate);
				if (screenshotFile) fd.append('receipt', screenshotFile);
			} else {
				fd.append('amount', amountPaid || booking.cost.total);
				fd.append('senderName', senderName);
				fd.append('transactionReference', transactionReference);
				if (paymentDate) fd.append('paymentDate', paymentDate);
				if (receiptFile) fd.append('receipt', receiptFile);
			}

			await api.post('/payments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success('Payment submitted successfully');
			navigate(`/bookings/${id}`);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not submit payment');
		} finally {
			setSubmitting(false);
		}
	};

	const copy = (text) => {
		navigator.clipboard?.writeText(text);
		toast.success('Copied to clipboard');
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />
			<div className="mx-auto max-w-4xl px-6 pb-20 pt-28">
				<Link
					to={`/bookings/${id}`}
					className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
				>
					<ArrowLeft className="h-4 w-4" /> Back to the booking
				</Link>

				<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
					<p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> Complete your payment
					</p>
					<h1 className="font-serif text-3xl font-extrabold text-ink">{booking.listing?.title}</h1>
					<p className="mt-1 text-sm text-muted">Transfer the total amount, then submit proof below</p>
				</motion.div>

				<div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.2fr]">
					{/* Payment details */}
					<motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
						<div className="sticky top-28">
							<div className="border border-line bg-surface p-6 shadow-card">
								<p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
									<Building2 className="h-4 w-4" /> Payment method
								</p>

								<div className="space-y-2">
									<label className="flex cursor-pointer items-center gap-3 border border-line bg-surface-alt p-3 transition hover:border-primary/30">
										<input
											type="radio"
											name="method"
											value="bank_transfer"
											checked={paymentMethod === 'bank_transfer'}
											onChange={() => setPaymentMethod('bank_transfer')}
											className="h-4 w-4 accent-primary"
										/>
										<div className="flex-1">
											<span className="block text-sm font-bold text-text">Bank transfer</span>
											<span className="text-xs text-muted">Recommended — settle in 10 minutes</span>
										</div>
									</label>
									<label className="flex cursor-pointer items-center gap-3 border border-line bg-surface-alt p-3 transition hover:border-primary/30">
										<input
											type="radio"
											name="method"
											value="usdt"
											checked={paymentMethod === 'usdt'}
											onChange={() => setPaymentMethod('usdt')}
											className="h-4 w-4 accent-primary"
										/>
										<div className="flex-1">
											<span className="block text-sm font-bold text-text">USDT (TRC20)</span>
											<span className="text-xs text-muted">Crypto — live exchange rate</span>
										</div>
									</label>
								</div>

								{!settings ? (
									<p className="mt-4 flex items-start gap-2 border border-danger/30 bg-danger/8 p-3 text-xs text-text">
										<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
										Payment details not configured. Contact support.
									</p>
								) : (
									<div className="mt-5 space-y-4 border-t border-line pt-5">
										{paymentMethod === 'bank_transfer' && (
											<>
												<Detail label="Bank name" value={settings.bankName} />
												<Detail label="Account name" value={settings.accountName} />
												<Detail label="Account number" value={settings.accountNumber} mono copyable onCopy={() => copy(settings.accountNumber)} />
											</>
										)}

										{paymentMethod === 'usdt' && (
											<>
												{settings.usdtAddress ? (
													<>
														<div className="flex items-start gap-3">
															<img
																src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(settings.usdtAddress)}`}
																alt="QR code"
																className="h-24 w-24 shrink-0 border border-line"
															/>
															<div className="min-w-0 flex-1">
																<p className="label-meta mb-1">Wallet address</p>
																<p className="break-all font-mono text-xs text-text">{settings.usdtAddress}</p>
																<button
																	onClick={() => copy(settings.usdtAddress)}
																	className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary-ink transition hover:text-primary-dark"
																>
																	<Copy className="h-3.5 w-3.5" /> Copy
																</button>
															</div>
														</div>
														<Detail label="Network" value={settings.usdtNetwork || 'TRC20'} />
														{settings.usdtWalletLabel && <Detail label="Label" value={settings.usdtWalletLabel} muted />}
													</>
												) : (
													<p className="text-sm text-muted">USDT wallet not configured.</p>
												)}
											</>
										)}

										{settings.instructions && (
											<div className="border-t border-line pt-4">
												<p className="label-meta mb-1.5">Instructions</p>
												<p className="text-sm text-muted">{settings.instructions}</p>
											</div>
										)}
									</div>
								)}

								<div className="mt-6 border-t border-primary/15 pt-4">
									<p className="label-meta mb-1.5">Amount to pay</p>
									<div className="font-serif text-2xl font-bold tabular-nums text-primary-ink font-mono">
										{naira(booking.cost.total)}
									</div>
									{paymentMethod === 'usdt' && usdtRate && amountUSDT && (
										<p className="mt-1.5 text-xs text-muted">
											≈ <span className="font-mono font-semibold text-text">{amountUSDT} USDT</span> at ₦{Number(usdtRate).toLocaleString()}/USDT
										</p>
									)}
								</div>
							</div>

							<p className="mt-4 flex items-start gap-2 border border-success/30 bg-success/8 p-3 text-xs text-text">
								<Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success-ink" />
								<span>
									Your money is held by NestFinder until you confirm you've moved in. If the room isn't as advertised, you aren't left chasing a refund.
								</span>
							</p>
						</div>
					</motion.div>

					{/* Submit form */}
					<motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
						<div className="border border-line bg-surface p-6 shadow-card">
							<p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted">
								<Coins className="h-4 w-4" /> Submit your transfer
							</p>

							<form onSubmit={submit} className="space-y-4">
								{paymentMethod === 'bank_transfer' && (
									<>
										<Field label="Sender's name" required>
											<input
												value={senderName}
												onChange={(e) => setSenderName(e.target.value)}
												placeholder="Full name on the bank account"
												className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm text-text transition placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<Field label="Transaction reference" required>
											<input
												value={transactionReference}
												onChange={(e) => setTransactionReference(e.target.value)}
												placeholder="Bank reference or confirmation number"
												className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm text-text transition placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<Field label="Amount paid">
											<input
												value={amountPaid}
												onChange={(e) => setAmountPaid(e.target.value)}
												placeholder={String(booking.cost.total)}
												className="w-full border border-line bg-surface-alt px-3 py-2.5 font-mono text-sm text-text transition placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<Field label="Payment date">
											<input
												type="date"
												value={paymentDate}
												onChange={(e) => setPaymentDate(e.target.value)}
												className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm text-text transition focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<FileField
											label="Receipt (image or PDF)"
											file={receiptFile}
											onChange={setReceiptFile}
											accept="image/*,.pdf"
										/>
									</>
								)}

								{paymentMethod === 'usdt' && (
									<>
										{usdtError && (
											<div className="flex items-start gap-2 border border-danger/30 bg-danger/8 p-3 text-xs text-text">
												<AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger-ink" />
												{usdtError}
											</div>
										)}
										<Field label="Wallet address used (optional)">
											<input
												value={walletUsed}
												onChange={(e) => setWalletUsed(e.target.value)}
												placeholder="Your wallet address"
												className="w-full border border-line bg-surface-alt px-3 py-2.5 font-mono text-sm text-text transition placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<Field label="Transaction hash (TxID)" required>
											<input
												value={transactionHash}
												onChange={(e) => setTransactionHash(e.target.value)}
												placeholder="On-chain transaction ID"
												className="w-full border border-line bg-surface-alt px-3 py-2.5 font-mono text-sm text-text transition placeholder:text-muted/60 focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<Field label="Date">
											<input
												type="date"
												value={usdtDate}
												onChange={(e) => setUsdtDate(e.target.value)}
												className="w-full border border-line bg-surface-alt px-3 py-2.5 text-sm text-text transition focus:border-primary/50 focus:outline-none"
											/>
										</Field>
										<FileField
											label="Screenshot (image or PDF)"
											file={screenshotFile}
											onChange={setScreenshotFile}
											accept="image/*,.pdf"
										/>
									</>
								)}

								<button
									type="submit"
									disabled={submitting || (paymentMethod === 'usdt' && (!amountUSDT || usdtError))}
									className="flex w-full items-center justify-center gap-2 bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-dark disabled:opacity-50"
								>
									{submitting ? (
										<><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
									) : (
										<><CheckCircle2 className="h-4 w-4" /> Submit payment</>
									)}
								</button>

								<p className="flex items-start gap-2 text-xs text-muted">
									<Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
									After submitting, your payment will be marked Pending Verification. An admin will approve it within 24 hours.
								</p>
							</form>
						</div>
					</motion.div>
				</div>
			</div>
		</div>
	);
}

function Detail({ label, value, mono = false, muted = false, copyable = false, onCopy }) {
	return (
		<div>
			<p className="label-meta mb-1">{label}</p>
			<div className="flex items-center justify-between gap-3">
				<p className={`text-sm font-semibold ${mono ? 'font-mono' : ''} ${muted ? 'text-muted' : 'text-text'}`}>
					{value || '—'}
				</p>
				{copyable && value && (
					<button
						onClick={onCopy}
						className="flex items-center gap-1.5 text-xs font-semibold text-primary-ink transition hover:text-primary-dark"
					>
						<Copy className="h-3.5 w-3.5" /> Copy
					</button>
				)}
			</div>
		</div>
	);
}

function Field({ label, required, children }) {
	return (
		<label className="block">
			<span className="label-meta mb-1.5 block">
				{label}
				{required && <span className="ml-1 text-danger-ink">*</span>}
			</span>
			{children}
		</label>
	);
}

function FileField({ label, file, onChange, accept }) {
	return (
		<div>
			<p className="label-meta mb-1.5">
				{label}
			</p>
			<label className="flex cursor-pointer items-center gap-3 border border-line bg-surface-alt p-3 transition hover:border-primary/30">
				<Upload className="h-5 w-5 shrink-0 text-muted" />
				<div className="min-w-0 flex-1">
					{file ? (
						<>
							<p className="truncate text-sm font-semibold text-text">{file.name}</p>
							<p className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</p>
						</>
					) : (
						<>
							<p className="text-sm font-semibold text-text">Choose file</p>
							<p className="text-xs text-muted">Click to browse</p>
						</>
					)}
				</div>
				<input
					type="file"
					accept={accept}
					onChange={(e) => onChange(e.target.files?.[0] || null)}
					className="hidden"
				/>
			</label>
		</div>
	);
}
