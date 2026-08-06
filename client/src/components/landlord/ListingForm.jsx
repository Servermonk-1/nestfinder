import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Upload, X } from 'lucide-react';
import { getImageUrl } from '../../utils/urlHelper';
import LocationPicker from '../map/LocationPicker';

const ALL_AMENITIES = ['Electricity', 'Water', 'Security', 'WiFi', 'Parking', 'Kitchen', 'Private Bath'];
const ROOM_TYPES = [
	{ value: 'single', label: 'Single Room' },
	{ value: 'shared', label: 'Shared Room' },
	{ value: 'self-contained', label: 'Self-Contained' },
];
const MAX_IMAGES = 6;

const emptyForm = {
	title: '',
	description: '',
	cautionDeposit: '',
	agentFee: '',
	legalFee: '',
	address: '',
	city: '',
	area: '',
	state: '',
	price: '',
	priceUnit: 'annual',
	roomType: 'self-contained',
	rooms: 1,
	amenities: [],
	contactPhone: '',
	contactEmail: '',
};

// The label WRAPS its control rather than sitting beside it. As siblings with
// no `htmlFor`, none of these fields were programmatically labelled — a screen
// reader announced "edit text, blank" for the room count and the room-type
// select. Wrapping associates them implicitly and makes the label clickable.
const Field = ({ label, error, children }) => (
	<label className="block">
		<span className="mb-1.5 block text-sm font-semibold text-text">{label}</span>
		{children}
		{error && <p className="mt-1 text-xs font-medium text-danger-ink">{error}</p>}
	</label>
);

const inputClass = (error) =>
	`w-full rounded-xl border-2 bg-surface px-4 py-2.5 text-sm text-text outline-none transition-all
	${error ? 'border-danger/60 bg-danger/5' : 'border-muted/15 focus:border-primary/60'}`;

export default function ListingForm({ mode = 'create', initialData, initialPin = null, existingImages = [], onSubmit, submitting }) {
	const [form, setForm] = useState({ ...emptyForm, ...initialData });
	const [files, setFiles] = useState([]);
	const [previews, setPreviews] = useState([]);
	const [errors, setErrors] = useState({});
	// Which of the already-published photos survive this edit. The server treats
	// the list it receives as authoritative and deletes from Cloudinary anything
	// missing from it, so this has to be the full keep-list, not a diff.
	const [kept, setKept] = useState(existingImages);
	// The map pin lives beside the form rather than in it — it isn't a listing
	// column, it's a pair of coordinates the server turns into a GeoJSON point.
	const [pin, setPin] = useState(initialPin);

	const setField = (key, value) => {
		setForm((f) => ({ ...f, [key]: value }));
		setErrors((e) => ({ ...e, [key]: '' }));
	};

	const toggleAmenity = (a) => {
		setForm((f) => ({
			...f,
			amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
		}));
	};

	const handleFiles = (e) => {
		const picked = Array.from(e.target.files || []);
		const room = MAX_IMAGES - kept.length - files.length;
		const accepted = picked.slice(0, Math.max(room, 0));
		setFiles((f) => [...f, ...accepted]);
		setPreviews((p) => [...p, ...accepted.map((f) => URL.createObjectURL(f))]);
		e.target.value = '';
	};

	const removeFile = (idx) => {
		setFiles((f) => f.filter((_, i) => i !== idx));
		setPreviews((p) => p.filter((_, i) => i !== idx));
	};

	const removeExisting = (url) => setKept((k) => k.filter((u) => u !== url));

	const validate = () => {
		const e = {};
		if (!form.title || form.title.trim().length < 5) e.title = 'Title must be at least 5 characters';
		if (!form.description || form.description.trim().length < 20) e.description = 'Description must be at least 20 characters';
		if (!form.address.trim()) e.address = 'Address is required';
		if (!form.city.trim()) e.city = 'City is required';
		if (!form.area.trim()) e.area = 'Area is required';
		if (!form.state.trim()) e.state = 'State is required';
		if (!form.price || Number(form.price) <= 0) e.price = 'Enter a valid price';
		if (!form.rooms || Number(form.rooms) < 1) e.rooms = 'Must have at least 1 room';
		if (!form.contactPhone.trim()) e.contactPhone = 'Contact phone is required';
		if (!form.contactEmail.trim()) e.contactEmail = 'Contact email is required';
		if (mode === 'create' && files.length === 0) e.images = 'Add at least one photo';
		// A published listing with no photo is worse than one the landlord never
		// got round to editing, so don't let an edit empty it out.
		if (mode === 'edit' && kept.length + files.length === 0) e.images = 'Keep at least one photo';
		setErrors(e);
		return Object.keys(e).length === 0;
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if (!validate()) return;
		// Pin is optional — skipping it falls back to automatic geocoding rather
		// than blocking a landlord whose street isn't on the map.
		onSubmit(pin ? { ...form, lat: pin.lat, lng: pin.lng } : form, files, kept);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-8">
			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-4 font-serif text-lg font-bold text-text">Basic Details</h2>
				<div className="space-y-4">
					<Field label="Listing Title" error={errors.title}>
						<input
							type="text"
							placeholder="e.g. Cozy Self-Contained Near Campus Gate"
							value={form.title}
							onChange={(e) => setField('title', e.target.value)}
							className={inputClass(errors.title)}
						/>
					</Field>
					<Field label="Description" error={errors.description}>
						<textarea
							rows={4}
							placeholder="Describe the room, what's nearby, and why a student should choose it..."
							value={form.description}
							onChange={(e) => setField('description', e.target.value)}
							className={`${inputClass(errors.description)} resize-none`}
						/>
					</Field>
					<div className="grid gap-4 sm:grid-cols-2">
						<Field label="Room Type">
							<select
								value={form.roomType}
								onChange={(e) => setField('roomType', e.target.value)}
								className={inputClass()}
							>
								{ROOM_TYPES.map((t) => (
									<option key={t.value} value={t.value}>{t.label}</option>
								))}
							</select>
						</Field>
						<Field label="Number of Rooms" error={errors.rooms}>
							<input
								type="number"
								min={1}
								value={form.rooms}
								onChange={(e) => setField('rooms', e.target.value)}
								className={inputClass(errors.rooms)}
							/>
						</Field>
					</div>
					<Field label="Rent (₦)" error={errors.price}>
						{/* `inputClass` includes w-full. On this row that made the select
						    ask for 100% AND 144px AND the gap — and `shrink-0` stopped it
						    giving any of that back, so a 393px phone scrolled sideways by
						    3px. The select gets an explicit width instead, and the input
						    gets min-w-0 so it is the one that yields. */}
						<div className="flex gap-2">
							<input
								type="number"
								min={0}
								placeholder="e.g. 180000"
								value={form.price}
								onChange={(e) => setField('price', e.target.value)}
								className={`${inputClass(errors.price)} min-w-0 flex-1`}
							/>
							<select
								value={form.priceUnit}
								onChange={(e) => setField('priceUnit', e.target.value)}
								aria-label="Rent period"
								className={`${inputClass(false).replace('w-full', '')} w-32 shrink-0 cursor-pointer sm:w-36`}
							>
								<option value="annual">per year</option>
								<option value="monthly">per month</option>
							</select>
						</div>
						{form.price > 0 && (
							<p className="mt-1.5 text-xs text-muted">
								Students will see {form.priceUnit === 'monthly'
									? `₦${Number(form.price).toLocaleString()}/mo (≈ ₦${Math.round(Number(form.price) * 12).toLocaleString()}/yr)`
									: `₦${Number(form.price).toLocaleString()}/yr (≈ ₦${Math.round(Number(form.price) / 12).toLocaleString()}/mo)`}
							</p>
						)}
					</Field>
				</div>
			</section>

			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-4 font-serif text-lg font-bold text-text">Location</h2>
				<div className="space-y-4">
					<Field label="Street Address" error={errors.address}>
						<input
							type="text"
							placeholder="e.g. 14 Ogunlana Close"
							value={form.address}
							onChange={(e) => setField('address', e.target.value)}
							className={inputClass(errors.address)}
						/>
					</Field>
					<div className="grid gap-4 sm:grid-cols-3">
						<Field label="Area / Neighbourhood" error={errors.area}>
							<input
								type="text"
								placeholder="e.g. Agbowo"
								value={form.area}
								onChange={(e) => setField('area', e.target.value)}
								className={inputClass(errors.area)}
							/>
						</Field>
						<Field label="City" error={errors.city}>
							<input
								type="text"
								placeholder="e.g. Ibadan"
								value={form.city}
								onChange={(e) => setField('city', e.target.value)}
								className={inputClass(errors.city)}
							/>
						</Field>
						<Field label="State" error={errors.state}>
							<input
								type="text"
								placeholder="e.g. Oyo"
								value={form.state}
								onChange={(e) => setField('state', e.target.value)}
								className={inputClass(errors.state)}
							/>
						</Field>
					</div>

					<div className="border-t border-muted/10 pt-4">
						<h3 className="mb-1 text-sm font-bold text-text">Pin on the map</h3>
						<LocationPicker
							address={form.address}
							area={form.area}
							city={form.city}
							state={form.state}
							value={pin}
							onChange={setPin}
						/>
					</div>
				</div>
			</section>

			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-1 font-serif text-lg font-bold text-text">Move-in costs</h2>
				<p className="mb-4 text-sm text-muted">
					What a student pays on top of the rent. Leave a field at 0 if you don't charge it.
					Students see the honest total before applying — hiding these is the complaint they make most.
				</p>
				<div className="grid gap-4 sm:grid-cols-3">
					<Field label="Caution deposit (₦)">
						<input type="number" min="0" placeholder="e.g. 50000" value={form.cautionDeposit}
							onChange={(e) => setField('cautionDeposit', e.target.value)} className={inputClass()} />
						<span className="mt-1 block text-xs text-muted">Refunded to the student at the end.</span>
					</Field>
					<Field label="Agent fee (₦)">
						<input type="number" min="0" placeholder="0" value={form.agentFee}
							onChange={(e) => setField('agentFee', e.target.value)} className={inputClass()} />
					</Field>
					<Field label="Legal / agreement fee (₦)">
						<input type="number" min="0" placeholder="0" value={form.legalFee}
							onChange={(e) => setField('legalFee', e.target.value)} className={inputClass()} />
					</Field>
				</div>
			</section>

			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-4 font-serif text-lg font-bold text-text">Amenities</h2>
				<div className="flex flex-wrap gap-2">
					{ALL_AMENITIES.map((a) => {
						const active = form.amenities.includes(a);
						return (
							<button
								key={a}
								type="button"
								onClick={() => toggleAmenity(a)}
								className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
									active
										? 'border-primary bg-primary text-white'
										: 'border-muted/20 bg-surface-alt/50 text-muted hover:border-primary/40 hover:text-text'
								}`}
							>
								{a}
							</button>
						);
					})}
				</div>
			</section>

			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-4 font-serif text-lg font-bold text-text">Photos</h2>
				{errors.images && <p className="mb-3 text-xs font-medium text-danger-ink">{errors.images}</p>}

				{kept.length > 0 && (
					<div className="mb-4">
						<p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Current Photos</p>
						<div className="flex flex-wrap gap-3">
							{kept.map((img) => (
								<div key={img} className="group relative h-24 w-24 overflow-hidden rounded-xl">
									<img src={getImageUrl(img)} alt="" className="h-full w-full object-cover" />
									<button
										type="button"
										onClick={() => removeExisting(img)}
										aria-label="Remove photo"
										className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-paper/80 text-text opacity-0 transition group-hover:opacity-100"
									>
										<X className="h-3 w-3" />
									</button>
								</div>
							))}
						</div>
						<p className="mt-2 text-xs text-muted">Removed photos are deleted permanently when you save.</p>
					</div>
				)}

				<div className="flex flex-wrap gap-3">
					{previews.map((src, i) => (
						<div key={src} className="group relative h-24 w-24 overflow-hidden rounded-xl">
							<img src={src} alt="" className="h-full w-full object-cover" />
							<button
								type="button"
								onClick={() => removeFile(i)}
								aria-label="Remove photo"
								className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-paper/80 text-text opacity-0 transition group-hover:opacity-100"
							>
								<X className="h-3 w-3" />
							</button>
						</div>
					))}
					{kept.length + files.length < MAX_IMAGES && (
						<label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-muted/25 text-muted transition hover:border-primary/50 hover:text-primary-ink">
							<Upload className="h-5 w-5" />
							<span className="text-[12px] font-semibold">Add Photo</span>
							<input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple onChange={handleFiles} className="hidden" />
						</label>
					)}
				</div>
				<p className="mt-3 text-xs text-muted">Up to {MAX_IMAGES} photos · JPEG, PNG or WebP · 5MB max each</p>
			</section>

			<section className="rounded-2xl border border-primary/10 bg-surface p-6">
				<h2 className="mb-4 font-serif text-lg font-bold text-text">Contact Info Shown to Students</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					<Field label="Contact Phone" error={errors.contactPhone}>
						<input
							type="tel"
							placeholder="e.g. +2348031234567"
							value={form.contactPhone}
							onChange={(e) => setField('contactPhone', e.target.value)}
							className={inputClass(errors.contactPhone)}
						/>
					</Field>
					<Field label="Contact Email" error={errors.contactEmail}>
						<input
							type="email"
							placeholder="e.g. you@example.com"
							value={form.contactEmail}
							onChange={(e) => setField('contactEmail', e.target.value)}
							className={inputClass(errors.contactEmail)}
						/>
					</Field>
				</div>
			</section>

			<motion.button
				type="submit"
				disabled={submitting}
				whileHover={{ scale: 1.01 }}
				whileTap={{ scale: 0.98 }}
				className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/20 transition hover:shadow-xl hover:shadow-primary/30 disabled:opacity-60"
			>
				{submitting ? (
					<>
						<Loader2 className="h-4 w-4 animate-spin" /> {mode === 'create' ? 'Publishing…' : 'Saving…'}
					</>
				) : mode === 'create' ? 'Publish Listing' : 'Save Changes'}
			</motion.button>
		</form>
	);
}
