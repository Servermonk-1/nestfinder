import { useMemo } from 'react';
import { Clock3, Save, Trash2, RotateCcw, ArrowRight } from 'lucide-react';
import { useCompare } from '../../context/CompareContext';

export default function ComparisonHistory() {
  const {
    comparisonHistory,
    savedComparisons,
    loadSavedComparison,
    deleteSavedComparison,
    compareList,
  } = useCompare();

  const creationCount = useMemo(() => savedComparisons.length, [savedComparisons.length]);

  if (!comparisonHistory.length && !savedComparisons.length) {
    return (
      <div className="rounded-3xl border border-primary/20 bg-surface/80 p-6 text-center text-sm text-muted shadow-xl shadow-black/10">
        <div className="mb-3 text-primary-ink font-semibold uppercase tracking-[0.24em]">History & Saved Comparisons</div>
        <p>Save a comparison to keep your past decisions and quickly reopen them later.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-primary/20 bg-surface/80 p-6 shadow-xl shadow-black/10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-ink">History & Saved Comparisons</p>
          <h2 className="mt-2 text-xl font-bold text-text">Keep your best comparisons</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-2 text-xs font-semibold text-primary-ink">
          <Save className="h-4 w-4" /> {creationCount}
        </div>
      </div>

      {savedComparisons.length > 0 && (
        <div className="space-y-4">
          {savedComparisons.slice(-3).reverse().map((snapshot) => (
            <div key={snapshot.id} className="rounded-3xl border border-primary/10 bg-surface/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{snapshot.name}</p>
                  <p className="text-xs text-muted">{new Date(snapshot.timestamp).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => loadSavedComparison(snapshot.id)}
                    className="rounded-full bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSavedComparison(snapshot.id)}
                    className="rounded-full border border-danger/20 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger-ink transition hover:bg-danger/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 text-xs text-muted">
                {snapshot.listings.length} properties · {snapshot.preferences ? Object.values(snapshot.preferences).filter(Boolean).length : 0} priorities selected
              </div>
            </div>
          ))}
        </div>
      )}

      {comparisonHistory.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-ink">Recent analysis</div>
          {comparisonHistory.slice(0, 3).map((history) => (
            <div key={history.id} className="rounded-3xl border border-primary/10 bg-surface/90 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text">{history.listings.map((l) => l.title).join(' vs ')}</p>
                  <p className="text-xs text-muted">{new Date(history.timestamp).toLocaleString()}</p>
                </div>
                <RotateCcw className="h-4 w-4 text-primary-ink" />
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Clock3 className="h-3.5 w-3.5" />
                <span>{history.listings.length} properties compared</span>
                <ArrowRight className="h-3.5 w-3.5" />
                <span>{history.preferences ? Object.values(history.preferences).filter(Boolean).length : 0} priorities used</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

