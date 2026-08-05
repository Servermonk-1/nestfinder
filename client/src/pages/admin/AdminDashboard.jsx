import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, Flag, Users, GraduationCap, AlertTriangle, BadgeCheck, ArrowRight, TrendingUp, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import AdminNavbar from '../../components/admin/AdminNavbar';
import api from '../../services/api';

const naira = (n) => `₦${Number(n || 0).toLocaleString('en-NG')}`;

export default function AdminDashboard() {
	const navigate = useNavigate();
	const [stats, setStats] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		api.get('/admin/dashboard')
			.then(({ data }) => setStats(data))
			.catch(() => setStats(null))
			.finally(() => setLoading(false));
	}, []);

	const cards = [
		{ label: 'Total Listings', value: stats?.totalListings, icon: Building2 },
		{ label: 'Flagged Listings', value: stats?.flaggedListings, icon: Flag },
		{ label: 'Landlords', value: stats?.totalLandlords, icon: Users },
		{ label: 'Students', value: stats?.totalStudents, icon: GraduationCap },
		{ label: 'Open Reports', value: stats?.unresolvedReports, icon: AlertTriangle },
	];

	const revenueCards = [
		{ label: 'Revenue Today', value: naira(stats?.revenueToday), icon: TrendingUp, tone: 'primary' },
		{ label: 'Revenue This Month', value: naira(stats?.revenueThisMonth), icon: DollarSign, tone: 'primary' },
		{ label: 'Platform Fees Earned', value: naira(stats?.platformFeesEarned), icon: DollarSign, tone: 'success' },
		{ label: 'Payments Pending', value: stats?.pendingPaymentsCount, icon: Clock, tone: 'highlight' },
		{ label: 'Bookings Completed', value: stats?.completedBookingsCount, icon: CheckCircle2, tone: 'success' },
	];

	const pendingVerifs = stats?.pendingStudentVerifications || 0;

	return (
		<AdminNavbar>
			<div className="mx-auto max-w-6xl px-4 pb-16 pt-10 md:px-8">
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
					<p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
						<span className="h-px w-6 bg-primary/50" /> Admin control
					</p>
					<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">Admin Dashboard</h1>
					<p className="mt-1 text-sm text-muted">Platform overview and moderation.</p>
				</motion.div>

				{/* Analytics grid */}
				<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{revenueCards.map((c, i) => (
						<motion.div
							key={c.label}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: i * 0.05 }}
							className="border border-line bg-surface p-5 shadow-card"
						>
							<div className="flex items-center justify-between">
								<c.icon className={`h-5 w-5 ${
									c.tone === 'primary' ? 'text-primary-ink' :
									c.tone === 'success' ? 'text-success-ink' :
									c.tone === 'highlight' ? 'text-highlight-ink' : 'text-muted'
								}`} />
							</div>
							<p className="mt-3 font-serif text-2xl font-bold tabular-nums text-ink font-mono">
								{loading ? '—' : c.value}
							</p>
							<p className="mt-1 text-xs text-muted">{c.label}</p>
						</motion.div>
					))}
				</div>

				{/* Pending verifications callout */}
				<motion.button
					initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					onClick={() => navigate('/admin/verifications')}
					className={`mt-6 flex w-full items-center justify-between gap-4 border p-5 text-left transition ${
						pendingVerifs > 0
							? 'border-highlight/40 bg-highlight/10 hover:bg-highlight/15'
							: 'border-line bg-surface shadow-card hover:border-primary/30'
					}`}
				>
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center bg-primary/15">
							<BadgeCheck className="h-6 w-6 text-primary-ink" />
						</div>
						<div>
							<p className="font-serif text-lg font-bold text-text">Student verifications</p>
							<p className="text-sm text-muted">
								{loading ? 'Loading…' : pendingVerifs > 0
									? `${pendingVerifs} ID${pendingVerifs > 1 ? 's' : ''} waiting for review`
									: 'No pending reviews right now'}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 text-sm font-bold text-primary-ink">
						Review <ArrowRight className="h-4 w-4" />
					</div>
				</motion.button>

				{/* Stat grid */}
				<div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					{cards.map((c, i) => (
						<motion.div
							key={c.label}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.35 + i * 0.04 }}
							className="border border-line bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40"
						>
							<c.icon className="h-5 w-5 text-primary-ink" />
							<p className="mt-3 font-serif text-2xl font-bold text-text">
								{loading ? '—' : (c.value ?? 0)}
							</p>
							<p className="text-xs text-muted">{c.label}</p>
						</motion.div>
					))}
				</div>
			</div>
		</AdminNavbar>
	);
}
