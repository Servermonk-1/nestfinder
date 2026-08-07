import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, BadgeCheck, ShieldAlert, LogOut, Heart, GitCompare } from 'lucide-react';
import StudentNavbar from '../../components/common/StudentNavbar';
import VerificationCard from '../../components/common/VerificationCard';
import AvatarUpload from '../../components/common/AvatarUpload';
import ProfileEditCard from '../../components/common/ProfileEditCard';
import PlacementCard from '../../components/siwes/PlacementCard';
import ChangePasswordCard from '../../components/common/ChangePasswordCard';
import DeleteAccountCard from '../../components/common/DeleteAccountCard';
import { useAuth } from '../../context/AuthContext';
import { useSaved } from '../../context/SavedContext';
import { useCompare } from '../../context/CompareContext';

export default function AccountPage() {
	const navigate = useNavigate();
	const { user, logout } = useAuth();
	const { savedListings } = useSaved();
	const { compareList } = useCompare();

	const handleSignOut = () => {
		logout();
		navigate('/');
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<StudentNavbar />

			<div className="border-b border-line bg-surface/70 px-4 pt-24 pb-5 sm:px-6 sm:pt-28 sm:pb-8">
				<div className="mx-auto max-w-3xl">
					<motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> Your account
					</motion.p>
					<motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="font-serif text-3xl font-extrabold text-text md:text-4xl">
						{user?.fullName || 'Your Profile'}
					</motion.h1>
				</div>
			</div>

			<div className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-10">
				{/* Profile card */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					className="rounded-2xl border border-line bg-surface p-6 shadow-card"
				>
					<div className="flex items-center gap-4">
						<AvatarUpload size="md" />
						<div className="min-w-0">
							<p className="truncate font-serif text-lg font-bold text-text">{user?.fullName || 'Student'}</p>
							<p className="text-xs uppercase tracking-widest text-primary-ink font-bold">{user?.role || 'student'}</p>
							<p className="mt-1 text-[13px] text-muted">Tap your photo to upload — it helps confirm your ID.</p>
						</div>
					</div>

					<div className="mt-6 space-y-3 text-sm">
						<div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
							<Mail className="h-4 w-4 text-primary-ink flex-shrink-0" />
							<span className="truncate text-text">{user?.email || 'Not available'}</span>
						</div>
						<div className="flex items-center gap-3 rounded-xl border border-line bg-surface-alt px-4 py-3">
							{user?.verified ? (
								<>
									<BadgeCheck className="h-4 w-4 text-success-ink flex-shrink-0" />
									<span className="text-text">Identity verified</span>
								</>
							) : (
								<>
									<ShieldAlert className="h-4 w-4 text-muted flex-shrink-0" />
									<span className="text-muted">Identity not verified yet</span>
								</>
							)}
						</div>
					</div>
				</motion.div>

				{/* Editable profile details */}
				<ProfileEditCard />

				{/* Identity verification */}
				<PlacementCard />

				<VerificationCard />

				{/* Change password */}
				<ChangePasswordCard />

				{/* Quick stats */}
				<motion.div
					initial={{ opacity: 0, y: 12 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="grid grid-cols-2 gap-3 sm:gap-4"
				>
					<button
						onClick={() => navigate('/saved')}
						className="rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 sm:p-5"
					>
						<Heart className="h-5 w-5 text-primary-ink" />
						<p className="mt-3 font-serif text-xl font-bold text-text sm:text-2xl">{savedListings.length}</p>
						<p className="text-xs text-muted">Saved homes</p>
					</button>
					<button
						onClick={() => navigate('/compare')}
						className="rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 sm:p-5"
					>
						<GitCompare className="h-5 w-5 text-primary-ink" />
						<p className="mt-3 font-serif text-xl font-bold text-text sm:text-2xl">{compareList.length}</p>
						<p className="text-xs text-muted">In comparison</p>
					</button>
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
