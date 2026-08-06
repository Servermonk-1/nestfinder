import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import LandlordNavbar from '../../components/landlord/LandlordNavbar';
import ListingForm from '../../components/landlord/ListingForm';
import NearbyPlacements from '../../components/landlord/NearbyPlacements';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function EditListingPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { user } = useAuth();
	const [listing, setListing] = useState(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [notFound, setNotFound] = useState(false);

	useEffect(() => {
		api.get(`/listings/${id}`)
			.then(({ data }) => {
				if (data.listing.landlord?._id !== user?.id) {
					toast.error("You don't own this listing");
					navigate('/landlord/dashboard');
					return;
				}
				setListing(data.listing);
			})
			.catch(() => setNotFound(true))
			.finally(() => setLoading(false));
	}, [id]);

	const handleSubmit = async (form, files = [], keptImages = []) => {
		setSubmitting(true);
		try {
			// Multipart, not JSON: an edit can now add photos, and the server needs
			// the surviving image URLs in the same request to know which Cloudinary
			// assets to keep and which to delete.
			const fd = new FormData();
			Object.entries({ ...form, price: Number(form.price), rooms: Number(form.rooms) }).forEach(([key, value]) => {
				if (key === 'amenities') {
					fd.append('amenities', JSON.stringify(value));
				} else {
					fd.append(key, value);
				}
			});
			// The server reads `images` as the authoritative keep-list. Send an
			// explicit empty marker when nothing survives, or the key would be
			// absent and the server would read that as "leave the photos alone".
			if (keptImages.length === 0) {
				fd.append('images', '');
			} else {
				keptImages.forEach((url) => fd.append('images', url));
			}
			files.forEach((file) => fd.append('images', file));

			await api.put(`/listings/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
			toast.success('Listing updated!');
			navigate('/landlord/dashboard');
		} catch (err) {
			toast.error(err.response?.data?.message || 'Failed to update listing');
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="min-h-screen bg-paper text-text">
			<LandlordNavbar />
			<div className="mx-auto max-w-3xl px-4 pb-16 pt-28 md:px-8">
				<button
					onClick={() => navigate('/landlord/dashboard')}
					className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-text"
				>
					<ArrowLeft className="h-4 w-4" /> Back to Dashboard
				</button>

				{loading ? (
					<div className="flex items-center justify-center py-24">
						<Loader2 className="h-6 w-6 animate-spin text-primary-ink" />
					</div>
				) : notFound ? (
					<div className="rounded-2xl border border-primary/10 bg-surface p-10 text-center">
						<p className="font-serif text-lg font-bold text-text">Listing not found</p>
						<p className="mt-1 text-sm text-muted">It may have been deleted.</p>
					</div>
				) : listing ? (
					<>
						<motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
							<h1 className="font-serif text-2xl font-bold text-text md:text-3xl">Edit Listing</h1>
							<p className="mt-1 text-sm text-muted">Update the details below. Photos can be added or removed.</p>
						</motion.div>

						<div className="mt-8">
							<ListingForm
								mode="edit"
								initialData={{
									title: listing.title,
									description: listing.description,
									address: listing.address,
									city: listing.city,
									area: listing.area,
									state: listing.state,
									price: listing.price,
									priceUnit: listing.priceUnit,
									cautionDeposit: listing.cautionDeposit ?? '',
									agentFee: listing.agentFee ?? '',
									legalFee: listing.legalFee ?? '',
									roomType: listing.roomType,
									rooms: listing.rooms,
									amenities: listing.amenities || [],
									contactPhone: listing.contactPhone,
									contactEmail: listing.contactEmail,
								}}
								// Only seed the picker from a pin the landlord placed
								// themselves — a machine guess must not be shown as
								// though they'd already confirmed it.
								initialPin={
									listing.locationSource === 'landlord' && listing.location?.coordinates?.length === 2
										? { lat: listing.location.coordinates[1], lng: listing.location.coordinates[0] }
										: null
								}
								existingImages={listing.images || []}
								onSubmit={handleSubmit}
								submitting={submitting}
							/>
						</div>

						{/* Who this room is actually convenient for. */}
						<div className="mt-8">
							<NearbyPlacements listingId={listing._id} />
						</div>
					</>
				) : null}
			</div>
		</div>
	);
}
