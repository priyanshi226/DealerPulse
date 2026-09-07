import { useEffect, useMemo, useState } from 'react';
import { loadDealershipData, type NormalizedData } from '../../data/loadData';
import { ChartsView } from './ChartsView';
import './AnalyticsPage.css';

/** Analytics is purely descriptive — "what is happening?" Questions used to
 * live behind a sub-toggle inside this page; it's now its own top-level tab
 * (one click instead of two), which is also why this component no longer
 * owns any mode-switching state — it only ever shows the charts. */
export function AnalyticsPage() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadDealershipData()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Anchors "today" to the dataset's own timeline (its latest recorded
  // activity), since this is synthetic historical data rather than a live feed.
  const referenceNowIso = useMemo(() => {
    if (!data || data.leads.length === 0) return new Date().toISOString();
    return data.leads.reduce((max, l) => (l.last_activity_at > max ? l.last_activity_at : max), data.leads[0].last_activity_at);
  }, [data]);

  if (error) {
    return <div className="state-screen state-screen--error">Couldn't load dealership data: {error}</div>;
  }

  if (!data) {
    return <div className="state-screen">Loading dealership data…</div>;
  }

  return (
    <div className="analytics-shell">
      <ChartsView data={data} referenceNowIso={referenceNowIso} />
    </div>
  );
}
