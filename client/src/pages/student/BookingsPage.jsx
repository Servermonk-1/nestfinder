import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CalendarDays, MapPin, ClipboardList, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import StudentNavbar from '../../components/common/StudentNavbar';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import { statusMeta, TONE_CLASS } from '../../components/booking/bookingStatus';
import { useAuth } from '../../context/AuthContext';
import { naira } from '../../utils/price';
import api from '../../services/api';

const when = (d) => (d ? format(new Date(d), 'd MMM yyyy') : '—');

/** Every application, for whichever side is looking. */
export default function BookingsPage() {
	const { user } = useAuth();
	const isLandlord = user?.role === 'landlord';

	const [bookings, setBookings] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.get('/bookings/mine')
			.then(({ data }) => setBookings(data.bookings || []))
			.catch(() => setBookings([]))
			.finally(() => setLoading(false));
	}, []);

	// Things needing THIS person's action, first.
	const needsMe = (b) =>
		isLandlord ? b.status === 'pending' : ['accepted', 'paid'].includes(b.status);
	const sorted = [...bookings].sort((a, b) => Number(needsMe(b)) - Number(needsMe(a)));

	return (
		<div className="min-h-screen bg-base text-text">
			{isLandlord ? <LandlordNavbar /> : <StudentNavbar />}

			<div className="border-b border-line bg-surface/70 px-6 pt-28 pb-8">
				<div className="mx-auto max-w-5xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> {isLandlord ? 'Landlord portal' : 'Student dashboard'}
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
						{isLandlord ? 'Applications' : 'My bookings'}
					</motion.h1>
					<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mt-2 text-sm text-muted">
						{isLandlord
							? 'Students who have applied to your rooms, and where their payments stand.'
							: 'Rooms you have applied for. Payment is held safely until you confirm you moved in.'}
					</motion.p>
				</div>
			</div>

			<div className="mx-auto max-w-5xl px-6 py-8">
				{loading ? (
					<div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted" /></div>
				) : sorted.length === 0 ? (
					<div className="rounded-2xl border border-muted/15 bg-surface p-10 text-center">
						<ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted" />
						<p className="font-serif text-xl font-bold text-text">
							{isLandlord ? 'No applications yet' : 'No bookings yet'}
						</p>
						<p className="mt-1 text-sm text-muted">
							{isLandlord
								? 'Applications from students will appear here.'
								: 'When you find a room you like, apply from its page.'}
						</p>
						{!isLandlord && (
							<Link to="/dashboard" className="mt-4 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
								Browse homes
							</Link>
						)}
					</div>
				) : (
					<div className="space-y-3">
						{sorted.map((b, i) => {
							const meta = statusMeta(b.status);
							return (
								<motion.div
									key={b._id}
									initial={{ opacity: 0, y: 8 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: Math.min(i * 0.03, 0.25) }}
								>
									<Link
										to={`/bookings/${b._id}`}
										className={`block rounded-2xl border bg-surface p-5 transition hover:border-primary/30 ${
											needsMe(b) ? 'border-primary/40' : 'border-muted/15'
										}`}
									>
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<h2 className="font-serif text-base font-bold text-text">{b.listing?.title}</h2>
													<span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${TONE_CLASS[meta.tone]}`}>
														{meta.label}
													</span>
													{b.escrow?.state === 'held' && (
														<span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-bold text-success-ink">
															<ShieldCheck className="h-3 w-3" /> In escrow
														</span>
													)}
												</div>
												<p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
													<MapPin className="h-3.5 w-3.5 shrink-0 text-primary-ink" />
													{[b.listing?.area, b.listing?.city].filter(Boolean).join(', ')}
													{isLandlord && b.student?.fullName && <> · {b.student.fullName}</>}
												</p>
												<p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
													<CalendarDays className="h-3.5 w-3.5 shrink-0" />
													{when(b.moveInDate)} → {when(b.moveOutDate)} · {b.months} month{b.months === 1 ? '' : 's'}
												</p>
											</div>
											<span className="shrink-0 text-right">
												<span className="block font-serif text-lg font-bold tabular-nums text-primary-ink font-mono">
													{naira(isLandlord ? b.cost?.landlordReceives : b.cost?.total)}
												</span>
												<span className="text-[11px] text-muted">{isLandlord ? 'your payout' : 'total'}</span>
											</span>
										</div>
									</Link>
								</motion.div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
