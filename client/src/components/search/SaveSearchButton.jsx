import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookmarkPlus, Loader2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

/**
 * Keep the filters currently on screen, and be told when something new matches.
 *
 * Deliberately asks for a name: a student ends up with several of these and
 * "Search 3" tells them nothing when the email arrives.
 */
export default function SaveSearchButton({ filters, nearPlacement, radiusKm }) {
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const [name, setName] = useState('');
	const [saving, setSaving] = useState(false);

	// Suggest a name from what they actually filtered on, so the common case is
	// one click and Enter.
	const suggest = () => {
		const bits = [];
		if (filters.q?.trim()) bits.push(filters.q.trim());
		if (filters.roomType) bits.push(filters.roomType.replace('-', ' '));
		if (filters.city) bits.push(filters.city);
		if (nearPlacement) bits.push('near my placement');
		return bits.join(' · ').slice(0, 60) || 'All homes';
	};

	const openPanel = () => { setName(suggest()); setOpen(true); };

	const submit = async (e) => {
		e.preventDefault();
		setSaving(true);
		try {
			await api.post('/saved-searches', {
				name,
				criteria: {
					q: filters.q, city: filters.city, roomType: filters.roomType,
					minPrice: filters.minPrice, maxPrice: filters.maxPrice,
					amenities: filters.amenities, nearPlacement, radiusKm,
				},
			});
			toast.success('Search saved — we\'ll email you when something new matches');
			setOpen(false);
		} catch (err) {
			toast.error(err.response?.data?.message || 'Could not save this search');
		} finally {
			setSaving(false);
		}
	};

	if (!open) {
		return (
			<button
				onClick={openPanel}
				className="inline-flex items-center gap-2 border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-primary/50 hover:text-primary-ink"
			>
				<BookmarkPlus className="h-4 w-4" strokeWidth={1.75} /> Save this search
			</button>
		);
	}

	return (
		<form onSubmit={submit} className="flex flex-wrap items-center gap-2 border border-primary/30 bg-surface p-2">
			<label htmlFor="save-search-name" className="sr-only">Name this search</label>
			<input
				id="save-search-name"
				autoFocus
				value={name}
				onChange={(e) => setName(e.target.value)}
				maxLength={60}
				placeholder="Name this search"
				className="w-full flex-1 border border-line bg-surface-alt px-3 py-2 text-sm outline-none focus:border-primary sm:w-auto sm:min-w-[200px]"
			/>
			<button
				type="submit"
				disabled={saving || !name.trim()}
				className="inline-flex items-center gap-1.5 bg-primary px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-60"
			>
				{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={2} />} Save
			</button>
			<button
				type="button"
				onClick={() => navigate('/saved-searches')}
				className="px-2 py-2 text-xs font-semibold text-muted hover:text-text"
			>
				View saved
			</button>
			<button type="button" onClick={() => setOpen(false)} aria-label="Cancel" className="p-2 text-muted hover:text-text">
				<X className="h-4 w-4" strokeWidth={1.75} />
			</button>
		</form>
	);
}
