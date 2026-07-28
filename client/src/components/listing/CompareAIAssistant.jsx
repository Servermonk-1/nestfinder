import { useState } from 'react';
import { MessageSquare, ShieldCheck, DollarSign, Star, CheckCircle2 } from 'lucide-react';
import { getRecommendationFor } from '../../utils/recommendationEngine';

const queries = [
  { key: 'safest', label: 'Which property is safest?' },
  { key: 'cheapest', label: 'Which property is cheapest?' },
  { key: 'most-amenities', label: 'Which property has the best amenities?' },
  { key: 'best-for-students', label: 'Which is the best overall student option?' },
];

const queryIcons = {
  safest: ShieldCheck,
  cheapest: DollarSign,
  'most-amenities': Star,
  'best-for-students': CheckCircle2,
};

export default function CompareAIAssistant({ listings }) {
  const [activeQuery, setActiveQuery] = useState(null);
  const [result, setResult] = useState(null);

  const handleQuery = (key) => {
    const recommendation = getRecommendationFor(listings, key);
    setActiveQuery(key);
    setResult(recommendation);
  };

  return (
    <section className="rounded-3xl border border-primary/20 bg-surface/80 p-6 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary-ink">AI Assistant</p>
          <h2 className="mt-2 text-xl font-bold text-text">Ask NestFinder</h2>
        </div>
        <MessageSquare className="h-5 w-5 text-primary-ink" />
      </div>

      <div className="mt-5 grid gap-3">
        {queries.map((item) => {
          const Icon = queryIcons[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleQuery(item.key)}
              className={`flex items-center gap-3 rounded-3xl border px-4 py-4 text-left transition ${
                activeQuery === item.key
                  ? 'border-primary bg-primary/10 text-text'
                  : 'border-primary/10 bg-surface text-muted hover:border-primary/20 hover:bg-surface-alt'
              }`}
            >
              <Icon className="h-5 w-5 text-primary-ink" />
              <span className="text-sm font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 rounded-3xl border border-primary/10 bg-surface/90 p-5">
        {result ? (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-primary-ink">Answer</p>
            <h3 className="mt-3 text-lg font-semibold text-text">{result.property?.title || 'No property available'}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{result.reason}</p>
          </div>
        ) : (
          <div className="text-sm leading-6 text-muted">
            Select a question above to get an instant comparison insight from the assistant.
          </div>
        )}
      </div>
    </section>
  );
}

