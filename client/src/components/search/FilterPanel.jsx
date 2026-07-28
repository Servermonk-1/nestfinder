import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Search, SlidersHorizontal, X, ChevronDown, Check, MapPin,
	Zap, Droplets, Shield, Wifi, Car, Flame, Lock, RotateCcw
} from 'lucide-react';

const amenityOptions = [
	{ value: 'electricity', label: 'Electricity', icon: Zap, color: 'text-primary-ink' },
	{ value: 'water', label: 'Water', icon: Droplets, color: 'text-primary-ink' },
	{ value: 'security', label: 'Security', icon: Shield, color: 'text-primary-ink' },
	{ value: 'wifi', label: 'WiFi', icon: Wifi, color: 'text-primary-ink' },
	{ value: 'parking', label: 'Parking', icon: Car, color: 'text-primary-ink' },
	{ value: 'kitchen', label: 'Kitchen', icon: Flame, color: 'text-primary-ink' },
	{ value: 'private bath', label: 'Private Bath', icon: Lock, color: 'text-primary-ink' },
];

const roomTypes = [
	{ value: '', label: 'Any Type' },
	{ value: 'single', label: 'Single Room' },
	{ value: 'shared', label: 'Shared Room' },
	{ value: 'self-contained', label: 'Self-Contained' },
];

const sortOptions = [
	{ value: 'recommended', label: 'Recommended' },
	{ value: 'newest', label: 'Newest First' },
	{ value: 'price_asc', label: 'Price: Low to High' },
	{ value: 'price_desc', label: 'Price: High to Low' },
];

export default function FilterPanel({ filters, onChange, onReset, totalResults, cities = [] }) {

	const [amenitiesOpen, setAmenitiesOpen] = useState(true);
	const [priceOpen, setPriceOpen] = useState(true);

	const toggleAmenity = (value) => {
		const current = filters.amenities || [];
		const updated = current.includes(value)
			? current.filter(a => a !== value)
			: [...current, value];
		onChange({ amenities: updated });
	};

	const activeFilterCount = [
		filters.city,
		filters.roomType,
		filters.minPrice,
		filters.maxPrice,
		...(filters.amenities || []),
	].filter(Boolean).length;

	return (
		<div className="bg-surface border border-line rounded-2xl overflow-hidden sticky top-20">

			{/* Header */}
			<div className="flex items-center justify-between p-5 border-b border-line">
				<div className="flex items-center gap-2">
					<SlidersHorizontal className="w-4 h-4 text-primary-ink" />
					<span className="text-text font-bold text-sm">Filters</span>
					{activeFilterCount > 0 && (
						<span className="bg-brand-gradient text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
							{activeFilterCount}
						</span>
					)}
				</div>
				{activeFilterCount > 0 && (
					<button
						onClick={onReset}
						className="flex items-center gap-1 text-muted hover:text-text text-xs transition-colors"
					>
						<RotateCcw className="w-3 h-3" />
						Reset
					</button>
				)}
			</div>

			<div className="p-5 space-y-6">

				{/* City — a dropdown of places that actually have listings, so this
				    filter can never send a student to an empty result set. Free-text
				    location searching lives in the main search bar. */}
				<div>
					<label htmlFor="filter-city" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-3">
						City
					</label>
					<div className="relative">
						<MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
						<select
							id="filter-city"
							value={filters.city || ''}
							onChange={e => onChange({ city: e.target.value })}
							className="w-full appearance-none pl-9 pr-9 py-2.5 bg-surface border border-line rounded-xl text-text text-sm outline-none focus:border-primary/50 transition-colors cursor-pointer"
						>
							<option value="">All cities</option>
							{cities.map(({ city, count }) => (
								<option key={city} value={city}>{city} ({count})</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
					</div>
					{!cities.length && (
						<p className="mt-1.5 text-[11px] text-muted">Searching an area? Use the search bar above.</p>
					)}
				</div>

				{/* Room Type */}
				<div>
					<label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-3">
						Room Type
					</label>
					<div className="grid grid-cols-2 gap-2">
						{roomTypes.map(type => (
							<button
								key={type.value}
								onClick={() => onChange({ roomType: type.value })}
								className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all duration-200 text-center
                  ${filters.roomType === type.value
										? 'bg-brand-gradient border-transparent text-white shadow-glow-sm'
										: 'bg-surface border-line text-muted hover:border-primary/30 hover:text-text'
									}`}
							>
								{type.label}
							</button>
						))}
					</div>
				</div>

				{/* Price Range */}
				<div>
					<button
						onClick={() => setPriceOpen(!priceOpen)}
						aria-expanded={priceOpen}
						className="flex items-center justify-between w-full"
					>
						<span className="text-xs font-semibold text-muted uppercase tracking-wider">
							Price Range (per month)
						</span>
						<ChevronDown className={`w-4 h-4 text-muted transition-transform ${priceOpen ? 'rotate-180' : ''}`} />
					</button>

					<AnimatePresence>
						{priceOpen && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								className="overflow-hidden"
							>
								<div className="mt-3 space-y-3">
									<div className="flex items-center gap-2">
										<div className="flex-1">
											<label htmlFor="filter-min-price" className="block text-xs text-muted mb-1.5">Min (₦/mo)</label>
											<input
												id="filter-min-price"
												type="number"
												placeholder="0"
												value={filters.minPrice || ''}
												onChange={e => onChange({ minPrice: e.target.value })}
												className="w-full px-3 py-2.5 bg-surface border border-line rounded-xl text-text text-sm placeholder-muted/50 outline-none focus:border-primary/50"
											/>
										</div>
										<div className="text-muted mt-5">—</div>
										<div className="flex-1">
											<label htmlFor="filter-max-price" className="block text-xs text-muted mb-1.5">Max (₦/mo)</label>
											<input
												id="filter-max-price"
												type="number"
												placeholder="Any"
												value={filters.maxPrice || ''}
												onChange={e => onChange({ maxPrice: e.target.value })}
												className="w-full px-3 py-2.5 bg-surface border border-line rounded-xl text-text text-sm placeholder-muted/50 outline-none focus:border-primary/50"
											/>
										</div>
									</div>

									{/* Quick price presets */}
									<div className="flex flex-wrap gap-1.5">
										{[
											{ label: 'Under 20K', max: 20000 },
											{ label: '20-50K', min: 20000, max: 50000 },
											{ label: '50K+', min: 50000 },
										].map(preset => (
											<button
												key={preset.label}
												onClick={() => onChange({ minPrice: preset.min || '', maxPrice: preset.max || '' })}
												className="text-xs px-3 py-1.5 rounded-full bg-surface border border-line text-muted hover:border-primary/30 hover:text-primary-ink transition-all"
											>
												{preset.label}
											</button>
										))}
									</div>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Amenities */}
				<div>
					<button
						onClick={() => setAmenitiesOpen(!amenitiesOpen)}
						aria-expanded={amenitiesOpen}
						className="flex items-center justify-between w-full"
					>
						<span className="text-xs font-semibold text-muted uppercase tracking-wider">
							Amenities
						</span>
						<ChevronDown className={`w-4 h-4 text-muted transition-transform ${amenitiesOpen ? 'rotate-180' : ''}`} />
					</button>

					<AnimatePresence>
						{amenitiesOpen && (
							<motion.div
								initial={{ height: 0, opacity: 0 }}
								animate={{ height: 'auto', opacity: 1 }}
								exit={{ height: 0, opacity: 0 }}
								className="overflow-hidden"
							>
								<div className="mt-3 space-y-2">
									{amenityOptions.map(({ value, label, icon: Icon, color }) => {
										const selected = (filters.amenities || []).includes(value);
										return (
											<motion.button
												key={value}
												onClick={() => toggleAmenity(value)}
												aria-pressed={selected}
												whileTap={{ scale: 0.97 }}
												className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200
                          ${selected
														? 'bg-brand-gradient border-transparent text-white shadow-glow-sm'
														: 'bg-surface border-line text-muted hover:border-primary/30 hover:text-text'
													}`}
											>
												<Icon className={`w-4 h-4 ${selected ? 'text-white' : color}`} />
												<span className="text-sm font-medium flex-1 text-left">{label}</span>
												{selected && (
													<motion.div
														initial={{ scale: 0 }}
														animate={{ scale: 1 }}
														className="w-4 h-4 bg-white rounded-full flex items-center justify-center"
													>
														<Check className="w-2.5 h-2.5 text-primary-ink" strokeWidth={3} />
													</motion.div>
												)}
											</motion.button>
										);
									})}
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Sort */}
				<div>
					<label htmlFor="filter-sort" className="block text-xs font-semibold text-muted uppercase tracking-wider mb-3">
						Sort By
					</label>
					<select
						id="filter-sort"
						value={filters.sort || 'recommended'}
						onChange={e => onChange({ sort: e.target.value })}
						className="w-full px-3 py-2.5 bg-surface border border-line rounded-xl text-text text-sm outline-none focus:border-primary/50 cursor-pointer"
					>
						{sortOptions.map(opt => (
							<option key={opt.value} value={opt.value} className="bg-surface">
								{opt.label}
							</option>
						))}
					</select>
				</div>
			</div>

			{/* Results count */}
			<div className="px-5 pb-5">
				<div className="bg-surface-alt border border-line rounded-xl px-4 py-3 text-center">
					<span className="text-text font-bold">{totalResults}</span>
					<span className="text-muted text-sm"> listing{totalResults !== 1 ? 's' : ''} found</span>
				</div>
			</div>
		</div>
	);
}
