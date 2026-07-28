import { motion } from 'framer-motion';
import { calculateScore, calculateMatchPercentage } from '../../utils/compareScore';

const priorityOptions = [
  { key: 'lowestPrice', label: 'Lowest Price' },
  { key: 'security', label: 'Security' },
  { key: 'electricity', label: 'Electricity' },
  { key: 'verifiedLandlord', label: 'Verified Landlord' },
  { key: 'closeToSchool', label: 'Close To School' },
  { key: 'fastInternet', label: 'Fast Internet' },
];

export default function CompareWhatIfSimulator({ listings, preferences, onPreferenceChange }) {
  if (!listings || listings.length < 2) return null;

  const previewListings = listings.map((listing) => ({
    ...listing,
    score: calculateScore(listing, listings),
    matchPercentage: calculateMatchPercentage(listing, preferences),
  }));

  const winner = previewListings.reduce((best, current) => {
    if (!best || current.score + current.matchPercentage > best.score + best.matchPercentage) return current;
    return best;
  }, null);

  return (
    <section className="rounded-3xl border border-primary/20 bg-surface/80 p-6 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-ink">What-if simulator</p>
          <h2 className="mt-2 text-xl font-bold text-text">Change priorities live</h2>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {priorityOptions.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onPreferenceChange({ [option.key]: !preferences[option.key] })}
            className={`rounded-3xl border px-4 py-4 text-left transition ${
              preferences[option.key]
                ? 'border-primary bg-primary/10 text-text shadow-sm shadow-primary/10'
                : 'border-primary/10 bg-surface text-muted hover:border-primary/20 hover:bg-surface/90'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{option.label}</span>
              <span className="text-xs text-muted">{preferences[option.key] ? 'On' : 'Off'}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        {previewListings.map((property) => (
          <motion.div
            key={property._id || property.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`rounded-3xl border p-4 transition ${
              property === winner ? 'border-primary bg-primary/10' : 'border-primary/10 bg-surface'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-text">{property.title}</h3>
                <p className="text-xs text-muted">{property.area || property.location}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-primary-ink">{property.matchPercentage}%</div>
                <div className="text-xs text-muted">Match score</div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface">
              <div className="h-full rounded-full bg-gradient-to-r from-primary to-highlight" style={{ width: `${property.matchPercentage}%` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

