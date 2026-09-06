import { useEffect, useMemo, useState } from 'react';
import { calculateDealRisk, calculateInsights, calculateRepCapacity } from '../../analytics/calculations';
import type { Insight } from '../../analytics/calculations';
import { deriveAnalyticsFilterOptions, filterDeliveries, filterLeads } from '../../analytics/filters';
import { EMPTY_ANALYTICS_FILTERS } from '../../analytics/types';
import type { AnalyticsFilterState } from '../../analytics/types';
import { loadDealershipData } from '../../data/loadData';
import type { NormalizedData } from '../../data/loadData';
import type { EnrichedLead } from '../../data/types';
import { AskAiCard } from '../AskAi/AskAiCard';
import { GlobalFilterBar } from '../AnalyticsPage/GlobalFilterBar';
import { LeadJourneyModal } from '../DataExplorer/LeadJourneyModal';
import '../DataExplorer/DataExplorer.css';
import { BottlenecksSection } from './sections/BottlenecksSection';
import { DealsAttentionTable } from './sections/DealsAttentionTable';
import { ExecutivePrioritiesSection } from './sections/ExecutivePrioritiesSection';
import { NextBestActionsSection } from './sections/NextBestActionsSection';
import { RepCapacitySection } from './sections/RepCapacitySection';
import './ActionablePage.css';

const ASK_AI_ACTIONABLE_SUGGESTIONS = [
  'Which sales rep has the most high-value stagnant deals?',
  'Why are these deals at risk?',
  'What should we focus on this week?',
];

export function ActionablePage() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilterState>(EMPTY_ANALYTICS_FILTERS);
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [focusRepId, setFocusRepId] = useState<string | null>(null);
  const [focusBranchId, setFocusBranchId] = useState<string | null>(null);

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

  const referenceNowIso = useMemo(() => {
    if (!data || data.leads.length === 0) return new Date().toISOString();
    return data.leads.reduce((max, l) => (l.last_activity_at > max ? l.last_activity_at : max), data.leads[0].last_activity_at);
  }, [data]);

  const filterOptions = useMemo(() => (data ? deriveAnalyticsFilterOptions(data.raw, filters) : null), [data, filters]);
  const filteredLeads = useMemo(() => (data ? filterLeads(data.leads, filters) : []), [data, filters]);
  const filteredDeliveries = useMemo(
    () => (data ? filterDeliveries(filteredLeads, data.raw.deliveries) : []),
    [data, filteredLeads],
  );

  const insights = useMemo(
    () => calculateInsights(filteredLeads, filteredDeliveries, referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );
  const dealRisk = useMemo(() => calculateDealRisk(filteredLeads, referenceNowIso), [filteredLeads, referenceNowIso]);
  const repCapacity = useMemo(() => calculateRepCapacity(filteredLeads, referenceNowIso), [filteredLeads, referenceNowIso]);

  const leadById = useMemo(() => new Map(filteredLeads.map((l) => [l.id, l])), [filteredLeads]);

  function handleViewDeal(leadId: string) {
    const lead = leadById.get(leadId);
    if (lead) setSelectedLead(lead);
  }

  function handleViewRep(repId: string) {
    setFocusRepId(repId);
    setFocusBranchId(null);
    document.getElementById('deals-requiring-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleViewBranch(branchId: string) {
    setFocusBranchId(branchId);
    setFocusRepId(null);
    document.getElementById('deals-requiring-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function handleFocusEntity(insight: Insight) {
    if (insight.entityType === 'rep' && insight.entityId) handleViewRep(insight.entityId);
    else if (insight.entityType === 'branch' && insight.entityId) handleViewBranch(insight.entityId);
    else document.getElementById('deals-requiring-attention')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (error) {
    return <div className="state-screen state-screen--error">Couldn't load dealership data: {error}</div>;
  }

  if (!data || !filterOptions) {
    return <div className="state-screen">Loading dealership data…</div>;
  }

  return (
    <div className="actionable-page">
      <div className="actionable-page__intro">
        <h1 className="actionable-page__title">What should I do about it?</h1>
        <p className="actionable-page__subtitle">
          Analytics shows you what's happening. This page tells you where to focus first, and what to actually do next.
        </p>
      </div>

      <GlobalFilterBar filters={filters} options={filterOptions} onChange={setFilters} />

      {filteredLeads.length === 0 ? (
        <div className="analytics-empty analytics-empty--page">
          <p>No data for the selected filters.</p>
        </div>
      ) : (
        <div className="actionable-stack">
          <ExecutivePrioritiesSection insights={insights} onFocusEntity={handleFocusEntity} />

          <BottlenecksSection insights={insights} onFocusEntity={handleFocusEntity} />

          <NextBestActionsSection
            rows={dealRisk}
            onViewDeal={handleViewDeal}
            onViewRep={handleViewRep}
            onViewBranch={handleViewBranch}
          />

          <div id="deals-requiring-attention">
            <DealsAttentionTable
              rows={dealRisk}
              filterOptions={filterOptions}
              onViewDeal={handleViewDeal}
              focusRepId={focusRepId}
              focusBranchId={focusBranchId}
            />
          </div>

          <RepCapacitySection rows={repCapacity} onViewRep={handleViewRep} />

          <AskAiCard
            title="Ask about risks, reps, or priorities"
            hint="Ask a natural-language question grounded in this dataset — the assistant retrieves the real numbers before answering."
            suggestions={ASK_AI_ACTIONABLE_SUGGESTIONS}
          />
        </div>
      )}

      {selectedLead && <LeadJourneyModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
    </div>
  );
}
