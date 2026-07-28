import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { MessageSquareText, BadgeCheck, Pencil, Trash2, Lock } from 'lucide-react';
import StarRating from './StarRating';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function ReviewCard({ r, onEdit, onDelete }) {
	return (
		<div className={`rounded-xl border p-4 ${r.mine ? 'border-primary/30 bg-primary/5' : 'border-line bg-surface'}`}>
			<div className="mb-1.5 flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="text-sm font-bold text-text">{r.reviewer}</span>
					{r.reviewerVerified && (
						<span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success-ink">
							<BadgeCheck className="h-3 w-3" /> Verified
						</span>
					)}
					{r.mine && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary-ink">You</span>}
				</div>
				<span className="text-xs text-muted">
					{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true })}{r.edited ? ' · edited' : ''}
				</span>
			</div>
			<StarRating value={r.rating} size="h-3.5 w-3.5" />
			{r.comment && <p className="mt-2 text-sm leading-relaxed text-text">{r.comment}</p>}
			{r.mine && (
				<div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
					<button onClick={onEdit} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-ink transition hover:text-primary-dark">
						<Pencil className="h-3.5 w-3.5" /> Edit
					</button>
					<button onClick={onDelete} className="inline-flex items-center gap-1.5 text-xs font-bold text-danger-ink/80 transition hover:text-danger-ink">
						<Trash2 className="h-3.5 w-3.5" /> Delete
					</button>
				</div>
			)}
		</div>
	);
}

export default function ReviewsSection({ listingId }) {
	const { user } = useAuth();
	const [reviews, setReviews] = useState([]);
	const [myReview, setMyReview] = useState(null);
	const [averageRating, setAverageRating] = useState(0);
	const [totalReviews, setTotalReviews] = useState(0);
	const [canReview, setCanReview] = useState(false);
	const [page, setPage] = useState(1);
	const [pages, setPages] = useState(1);
	const [loading, setLoading] = useState(true);

	const [formMode, setFormMode] = useState(null); // 'new' | 'edit' | null
	const [rating, setRating] = useState(0);
	const [comment, setComment] = useState('');
	const [submitting, setSubmitting] = useState(false);

	const load = useCallback((p = 1, append = false) => {
		if (!append) setLoading(true);
		api.get(`/reviews/${listingId}`, { params: { page: p, limit: 5 } })
			.then(({ data }) => {
				setReviews((prev) => (append ? [...prev, ...(data.reviews || [])] : (data.reviews || [])));
				setMyReview(data.myReview || null);
				setAverageRating(data.averageRating || 0);
				setTotalReviews(data.totalReviews || 0);
				setCanReview(Boolean(data.canReview));
				setPage(data.page || 1);
				setPages(data.pages || 1);
			})
			.catch(() => { if (!append) { setReviews([]); setTotalReviews(0); } })
			.finally(() => setLoading(false));
	}, [listingId]);

	useEffect(() => { load(1); }, [load]);

	const openNew = () => { setFormMode('new'); setRating(0); setComment(''); };
	const openEdit = () => { setFormMode('edit'); setRating(myReview.rating); setComment(myReview.comment || ''); };
	const closeForm = () => { setFormMode(null); setRating(0); setComment(''); };

	const submit = async () => {
		if (!rating || submitting) return;
		setSubmitting(true);
		try {
			if (formMode === 'edit' && myReview) {
				await api.patch(`/reviews/${myReview._id}`, { rating, comment: comment.trim() });
				toast.success('Review updated');
			} else {
				await api.post('/reviews', { listingId, rating, comment: comment.trim() });
				toast.success('Review submitted. Thank you!');
			}
			closeForm();
			load(1);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save your review');
		} finally {
			setSubmitting(false);
		}
	};

	const remove = async () => {
		if (!myReview || !window.confirm('Delete your review? This cannot be undone.')) return;
		try {
			await api.delete(`/reviews/${myReview._id}`);
			toast.success('Review removed');
			load(1);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not delete review');
		}
	};

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="font-serif text-2xl font-semibold tracking-tight">Reviews ({totalReviews})</h2>
				{totalReviews > 0 && (
					<div className="flex items-center gap-2">
						<StarRating value={averageRating} />
						<span className="text-sm font-bold text-text">{averageRating}</span>
						<span className="text-xs text-muted">overall</span>
					</div>
				)}
			</div>

			{/* Your review (with edit/delete) */}
			{myReview && formMode !== 'edit' && (
				<div className="mb-4">
					<ReviewCard r={myReview} onEdit={openEdit} onDelete={remove} />
				</div>
			)}

			{/* Write / edit form */}
			<AnimatePresence>
				{formMode && (
					<motion.div
						initial={{ opacity: 0, y: 8 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 8 }}
						className="mb-5 rounded-xl border border-primary/20 bg-surface p-4"
					>
						<p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary-ink">
							{formMode === 'edit' ? 'Edit your review' : 'Your rating'}
						</p>
						<StarRating value={rating} onChange={setRating} size="h-6 w-6" />
						<textarea
							value={comment}
							onChange={(e) => setComment(e.target.value)}
							rows={3}
							maxLength={500}
							placeholder="Share your experience with this listing (optional)"
							className="mt-3 w-full resize-none rounded-xl border border-line bg-surface-alt/60 p-3 text-sm outline-none transition focus:border-primary/50"
						/>
						<div className="mt-3 flex gap-2">
							<button
								onClick={submit}
								disabled={!rating || submitting}
								className="rounded-xl bg-brand-gradient px-4 py-2 text-xs font-bold text-white shadow-glow-sm transition hover:shadow-glow disabled:opacity-50"
							>
								{submitting ? 'Saving…' : formMode === 'edit' ? 'Save changes' : 'Submit Review'}
							</button>
							<button onClick={closeForm} className="rounded-xl px-4 py-2 text-xs font-semibold text-muted transition hover:text-text">
								Cancel
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* List */}
			{loading ? (
				<p className="text-sm text-muted">Loading reviews…</p>
			) : reviews.length === 0 && !myReview ? (
				<p className="rounded-xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted">
					No reviews yet. {canReview ? 'Be the first to share your experience.' : ''}
				</p>
			) : (
				<div className="space-y-3">
					{reviews.map((r) => <ReviewCard key={r._id} r={r} />)}
				</div>
			)}

			{/* Show more */}
			{page < pages && (
				<button
					onClick={() => load(page + 1, true)}
					className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition hover:border-primary/40 hover:text-primary-ink"
				>
					Show more reviews
				</button>
			)}

			{/* Write CTA / eligibility hint */}
			{!formMode && !myReview && (
				<div className="mt-4">
					{canReview ? (
						<button
							onClick={openNew}
							className="inline-flex items-center gap-2 text-sm font-bold text-primary-ink transition hover:text-primary-dark"
						>
							<MessageSquareText className="h-4 w-4" /> Write a Review
						</button>
					) : user ? (
						<p className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-alt/50 px-3.5 py-2.5 text-xs text-muted">
							<Lock className="h-3.5 w-3.5 shrink-0 text-muted" />
							You can leave a review once you've contacted this home's landlord.
						</p>
					) : null}
				</div>
			)}
		</div>
	);
}
