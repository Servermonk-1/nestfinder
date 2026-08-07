import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, BadgeCheck, ShieldAlert, LogOut, Home, Eye, Flag } from 'lucide-react';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import AvatarUpload from '../../components/common/AvatarUpload';
import ProfileEditCard from '../../components/common/ProfileEditCard';
import ChangePasswordCard from '../../components/common/ChangePasswordCard';
import PayoutAccountCard from '../../components/landlord/PayoutAccountCard';
import DeleteAccountCard from '../../components/common/DeleteAccountCard';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function LandlordAccountPage() {
	const navigate = useNavigate();
	const { user, logout, refreshUser } = useAuth();
	const [stats, setStats] = useState({ listings: 0, views: 0, flagged: 0 });

	// Summarise their own listings — the numbers a landlord actually cares about.
	useEffect(() => {
		api.get('/listings/landlord/mine')
			.then(({ data }) => {
				const listings = data.listings || [];
				setStats({
					listings: listings.length,
					views: listings.reduce((sum, l) => sum + (l.views || 0), 0),
					flagged: listings.filter((l) => l.flagged).length,
				});
			})
			.catch(() => { /* the cards simply stay at zero */ });
	}, []);

	const handleSignOut = () => { logout(); navigate('/for-landlords'); };

	return (
		<div className="min-h-screen bg-paper text-text">
			<LandlordNavbar />

			<div className="border-b border-line bg-surface/70 px-4 pt-28 pb-8 sm:px-6">
				<div className="mx-auto max-w-3xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> Your account
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
						{user?.fullName || 'Your Profile'}
					</motion.h1>
				</div>
			</div>

			<div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
				{/* Identity */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-2xl border border-line bg-surface p-6 shadow-card"
				>
					<div className="flex items-center gap-4">
						<AvatarUpload size="md" />
						<div className="min-w-0">
							<p className="truncate font-serif text-lg font-bold text-text">{user?.fullName || 'Landlord'}</p>
							<p className="text-xs font-bold uppercase tracking-widest text-primary-ink">Landlord</p>
							<p className="mt-1 text-[13px] text-muted">Tap your photo to upload — students see it on your listings.</p>
						</div>
					</div>

					<div className="mt-6 space-y-3 text-sm">
						<div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
							<Mail className="h-4 w-4 flex-shrink-0 text-primary-ink" />
							<span className="truncate text-text">{user?.email || 'Not available'}</span>
						</div>
						<div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
							{user?.verified ? (
								<>
									<BadgeCheck className="h-4 w-4 flex-shrink-0 text-success-ink" />
									<span className="text-text">Identity verified — your listings show a verified badge</span>
								</>
							) : (
								<>
									<ShieldAlert className="h-4 w-4 flex-shrink-0 text-highlight-ink" />
									<span className="text-muted">
										Not verified yet — <button onClick={() => navigate('/landlord/dashboard')} className="font-semibold text-primary-ink hover:underline">verify from your dashboard</button> to publish listings
									</span>
								</>
							)}
						</div>
					</div>
				</motion.div>

				{/* Editable details */}
				<ProfileEditCard />

				{/* Where escrow is paid out to. Sits above the password card because
				    a landlord with no account on file cannot be paid at all. */}
				<PayoutAccountCard payout={user?.payout} onSaved={refreshUser} />

				{/* Password */}
				<ChangePasswordCard />

				{/* Their listings at a glance */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="grid grid-cols-3 gap-3 sm:gap-4"
				>
					<button
						onClick={() => navigate('/landlord/dashboard')}
						className="rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 sm:p-5"
					>
						<Home className="h-5 w-5 text-primary-ink" />
						<p className="mt-3 font-serif text-xl font-bold text-text sm:text-2xl">{stats.listings}</p>
						<p className="text-xs text-muted">Listings</p>
					</button>
					<div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
						<Eye className="h-5 w-5 text-primary-ink" />
						<p className="mt-3 font-serif text-xl font-bold text-text sm:text-2xl">{stats.views}</p>
						<p className="text-xs text-muted">Total views</p>
					</div>
					<div className={`rounded-2xl border p-4 shadow-card sm:p-5 ${stats.flagged ? 'border-danger/30 bg-danger/5' : 'border-line bg-surface'}`}>
						<Flag className={`h-5 w-5 ${stats.flagged ? 'text-danger-ink' : 'text-muted'}`} />
						<p className="mt-3 font-serif text-xl font-bold text-text sm:text-2xl">{stats.flagged}</p>
						<p className="text-xs text-muted">Flagged</p>
					</div>
				</motion.div>

				{/* Sign out */}
				<motion.button
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					onClick={handleSignOut}
					className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/5 py-3.5 text-sm font-bold text-danger-ink transition hover:bg-danger/10"
				>
					<LogOut className="h-4 w-4" /> Sign Out
				</motion.button>

				{/* Danger zone */}
				<DeleteAccountCard />
			</div>
		</div>
	);
}
