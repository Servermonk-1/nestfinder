import { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const preferenceOptions = [
  { key: 'lowestPrice', label: 'Lowest Price' },
  { key: 'security', label: 'Security' },
  { key: 'electricity', label: 'Stable Electricity' },
  { key: 'water', label: 'Water Supply' },
  { key: 'wifi', label: 'WiFi' },
  { key: 'parking', label: 'Parking' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'verifiedLandlord', label: 'Verified Landlord' },
  { key: 'closeToSchool', label: 'Close To School' },
  { key: 'largeRoom', label: 'Large Room' },
  { key: 'available', label: 'Availability' },
  { key: 'quietEnvironment', label: 'Quiet Environment' },
  { key: 'fastInternet', label: 'Fast Internet' },
];

export default function PreferenceSelector({ open, onClose, preferences, onChange, onReset }) {
  const [draftPreferences, setDraftPreferences] = useState(preferences || {});

  if (!open) return null;

  const togglePreference = (key) => {
    setDraftPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = () => {
    onChange(draftPreferences);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-3xl overflow-hidden rounded-[32px] border border-primary/20 bg-surface/95 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-primary/15 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-text">What matters most?</h2>
            <p className="text-sm text-muted">Adjust your priorities to refine comparison recommendations.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {preferenceOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => togglePreference(option.key)}
              className={`rounded-3xl border px-4 py-4 text-left transition ${
                draftPreferences[option.key]
                  ? 'border-primary bg-primary/10 text-text shadow-sm shadow-primary/10'
                  : 'border-primary/10 bg-surface text-muted hover:border-primary/20 hover:bg-surface-alt'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{option.label}</span>
                <span className="text-xs text-muted">{draftPreferences[option.key] ? 'Selected' : 'Off'}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-primary/15 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center rounded-3xl border border-primary/20 bg-surface px-5 py-3 text-sm font-semibold text-muted transition hover:border-primary/30 hover:text-text"
          >
            Reset priorities
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-3xl bg-primary px-5 py-3 text-sm font-semibold text-base transition hover:bg-primary-dark"
          >
            Save preferences
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

