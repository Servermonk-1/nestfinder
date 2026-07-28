import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Eye, Home, MapPin, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import VerificationCard from '../../components/common/VerificationCard';
import AvatarUpload from '../../components/common/AvatarUpload';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getImageUrl } from '../../utils/urlHelper';
import { formatPrice } from '../../utils/price';

function ListingRow({ listing, onToggle, onDelete }) {
	const [busy, setBusy] = useState(false);

	const toggle = async () => {
		setBusy(true);
		await onToggle(listing._id);
		setBusy(false);
	};

	const remove = async () => {
		if (!window.confirm(`Delete "${listing.title}"? This can't be undone.`)) return;
		setBusy(true);
		await onDelete(listing._id);
	};

	return (
		<motion.div
			layout
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition hover:border-primary/30 sm:flex-row sm:items-center"
		>
			<div className="relative h-32 w-full shrink-0 overflow-hidden rounded-xl sm:h-20 sm:w-28">
				{listing.images?.[0] ? (
					<img src={getImageUrl(listing.images[0])} alt={listing.title} className="h-full w-full object-cover" />
				) : (
					<div className="flex h-full w-full items-center justify-center bg-surface-alt text-muted">
						<Home className="h-6 w-6" />
					</div>
				)}
				{!listing.available && (
					<div className="absolute inset-0 flex items-center justify-center bg-ink/60">
						<span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">Taken</span>
					</div>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<Link to={`/listings/${listing._id}`} className="truncate font-serif text-base font-bold text-text hover:text-primary-ink">
					{listing.title}
				</Link>
				<p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
					<MapPin className="h-3 w-3 shrink-0" /> {listing.area}, {listing.city}
				</p>
				<div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
					<span className="font-bold text-primary-ink">{formatPrice(listing)}</span>
					<span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {listing.views || 0} views</span>
					<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${listing.available ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger-ink'}`}>
						{listing.available ? 'Available' : 'Taken'}
					</span>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
				<button
					onClick={toggle}
					disabled={busy}
					title={listing.available ? 'Mark as taken' : 'Mark as available'}
					className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-primary/40 hover:text-primary-ink disabled:opacity-50"
				>
					<Power className="h-4 w-4" />
				</button>
				<Link
					to={`/landlord/listings/${listing._id}/edit`}
					className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-primary/40 hover:text-primary-ink"
				>
					<Pencil className="h-4 w-4" />
				</Link>
				<button
					onClick={remove}
					disabled={busy}
					className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-muted transition hover:border-danger/40 hover:text-danger-ink disabled:opacity-50"
				>
					<Trash2 className="h-4 w-4" />
				</button>
			</div>
		</motion.div>
	);
}

export default function LandlordDashboard() {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [listings, setListings] = useState([]);
	const [loading, setLoading] = useState(true);

	const loadListings = () => {
		setLoading(true);
		api.get('/listings/landlord/mine')
			.then(({ data }) => setListings(data.listings))
			.catch(() => toast.error('Failed to load your listings'))
			.finally(() => setLoading(false));
	};

	useEffect(() => {
		loadListings();
	}, []);

	const handleToggle = async (id) => {
		try {
			const { data } = await api.patch(`/listings/${id}/availability`);
			setListings((prev) => prev.map((l) => (l._id === id ? { ...l, available: data.available } : l)));
		} catch {
			toast.error('Failed to update availability');
		}
	};

	const handleDelete = async (id) => {
		try {
			await api.delete(`/listings/${id}`);
			setListings((prev) => prev.filter((l) => l._id !== id));
			toast.success('Listing deleted');
		} catch {
			toast.error('Failed to delete listing');
		}
	};

	const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
	const availableCount = listings.filter((l) => l.available).length;

	return (
		<div className="min-h-screen bg-base text-text">
			<LandlordNavbar />
			<div className="mx-auto max-w-5xl px-4 pb-16 pt-28 md:px-8">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
						<AvatarUpload size="md" />
						<div>
							<p className="mb-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
								<span className="h-px w-6 bg-primary/50" /> Landlord dashboard
							</p>
							<h1 className="font-serif text-2xl font-extrabold text-text md:text-3xl">
								Welcome, {user?.fullName?.split(' ')[0] || 'Landlord'}
							</h1>
							<p className="mt-1 text-sm text-muted">Manage the rooms you've listed for students.</p>
						</div>
					</motion.div>
					<button
						onClick={() => navigate('/landlord/listings/new')}
						className="flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
					>
						<Plus className="h-4 w-4" /> Add Listing
					</button>
				</div>

				<div className="mt-6">
					<VerificationCard role="landlord" />
				</div>

				{!loading && listings.length > 0 && (
					<div className="mt-6 grid grid-cols-3 gap-3">
						{[
							{ label: 'Listings', value: listings.length },
							{ label: 'Available', value: availableCount },
							{ label: 'Total Views', value: totalViews },
						].map((s) => (
							<div key={s.label} className="rounded-xl border border-line bg-surface p-4 text-center shadow-card">
								<p className="font-serif text-2xl font-bold text-primary-ink">{s.value}</p>
								<p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-muted">{s.label}</p>
							</div>
						))}
					</div>
				)}

				<div className="mt-8 space-y-3">
					{loading ? (
						[...Array(3)].map((_, i) => (
							<div key={i} className="h-28 animate-pulse rounded-2xl border border-line bg-surface" />
						))
					) : listings.length === 0 ? (
						<div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-20 text-center shadow-card">
							<Home className="h-10 w-10 text-muted" />
							<p className="mt-4 font-serif text-lg font-bold text-text">No listings yet</p>
							<p className="mt-1 max-w-sm text-sm text-muted">Add your first room so students can find it in Browse.</p>
							<button
								onClick={() => navigate('/landlord/listings/new')}
								className="mt-6 flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 text-sm font-bold text-white shadow-glow-sm transition hover:shadow-glow"
							>
								<Plus className="h-4 w-4" /> Add Your First Listing
							</button>
						</div>
					) : (
						listings.map((listing) => (
							<ListingRow key={listing._id} listing={listing} onToggle={handleToggle} onDelete={handleDelete} />
						))
					)}
				</div>
			</div>
		</div>
	);
}
