import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import ListingForm from '../../components/landlord/ListingForm';
import api from '../../services/api';

export default function AddListingPage() {
	const navigate = useNavigate();
	const [submitting, setSubmitting] = useState(false);
	const [verified, setVerified] = useState(null); // null = loading

	useEffect(() => {
		api.get('/profile/me')
			.then(({ data }) => setVerified(!!data.user.verified))
			.catch(() => setVerified(false));
	}, []);

	const handleSubmit = async (form, files) => {
		setSubmitting(true);
		try {
			const fd = new FormData();
			Object.entries(form).forEach(([key, value]) => {
				if (key === 'amenities') {
					fd.append('amenities', JSON.stringify(value));
				} else {
					fd.append(key, value);
				}
			});
			files.forEach((file) => fd.append('images', file));

			await api.post('/listings', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success('Listing published!');
			navigate('/landlord/dashboard');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to publish listing');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-base text-text">
			<LandlordNavbar />
			<div className="mx-auto max-w-3xl px-4 pb-16 pt-28 md:px-8">
				<button
					onClick={() => navigate('/landlord/dashboard')}
					className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
				>
					<ArrowLeft className="h-4 w-4" /> Back to Dashboard
				</button>
				<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
					<h1 className="font-serif text-2xl font-bold text-text md:text-3xl">Add New Listing</h1>
					<p className="mt-1 text-sm text-muted">Fill in the details below so students can find your room.</p>
				</motion.div>

				{verified === null ? (
					<div className="flex items-center justify-center py-24">
						<Loader2 className="h-6 w-6 animate-spin text-primary-ink" />
					</div>
				) : !verified ? (
					<div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-primary/10 bg-surface py-16 text-center">
						<div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
							<ShieldCheck className="h-8 w-8 text-primary-ink" />
						</div>
						<h2 className="font-serif text-xl font-bold text-text">Verify your identity to list</h2>
						<p className="mt-2 max-w-sm text-sm text-muted">
							To protect students, only verified landlords can publish rooms. Upload your ID on your dashboard — once an admin approves it, you can list.
						</p>
						<button
							onClick={() => navigate('/landlord/dashboard')}
							className="mt-6 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-base shadow-lg shadow-primary/20 transition hover:shadow-xl"
						>
							Go to verification
						</button>
					</div>
				) : (
					<div className="mt-8">
						<ListingForm mode="create" onSubmit={handleSubmit} submitting={submitting} />
					</div>
				)}
			</div>
		</div>
	);
}
