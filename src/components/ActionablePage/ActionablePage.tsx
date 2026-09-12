import { useEffect, useMemo, useState } from 'react';
import {
  calculateDealRisk,
  calculateDimensionPerformance,
  calculateInsights,
  calculateRepCapacity,
} from '../../analytics/calculations';
import type { DealRiskRow, Insight } from '../../analytics/calculations';
import { deriveAnalyticsFilterOptions, filterDeliveries, filterLeads } from '../../analytics/filters';
import { formatCompactCurrency, formatDays, formatPercent } from '../../analytics/format';
import { EMPTY_ANALYTICS_FILTERS } from '../../analytics/types';
import type { AnalyticsFilterState } from '../../analytics/types';
import { SOURCE_LABELS } from '../../data/transformations';
import { loadDealershipData } from '../../data/loadData';
import type { NormalizedData } from '../../data/loadData';
import type { EnrichedLead, LeadSource } from '../../data/types';
import { AskAiCard } from '../AskAi/AskAiCard';
import { SectionNav } from '../shared/SectionNav';
import { GlobalFilterBar } from '../AnalyticsPage/GlobalFilterBar';
import { LeadJourneyModal } from '../DataExplorer/LeadJourneyModal';
import '../DataExplorer/DataExplorer.css';
import { BottlenecksSection } from './sections/BottlenecksSection';
import { DealsAttentionTable } from './sections/DealsAttentionTable';
import { ExecutivePrioritiesSection } from './sections/ExecutivePrioritiesSection';
import { NextBestActionsSection } from './sections/NextBestActionsSection';
import { RepCapacitySection } from './sections/RepCapacitySection';
import { WhatIfSection } from './sections/WhatIfSection';
import { EntityDetailModal, type EntityDetailStat } from './EntityDetailModal';
import './ActionablePage.css';

const ASK_AI_ACTIONABLE_SUGGESTIONS = [
  'Which sales rep has the most high-value stagnant deals?',
  'Why are these deals at risk?',
  'What should we focus on this week?',
];

type ViewingEntity = { type: 'rep' | 'branch' | 'source' | 'model'; id: string };

export function ActionablePage() {
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilterState>(EMPTY_ANALYTICS_FILTERS);
  const [selectedLead, setSelectedLead] = useState<EnrichedLead | null>(null);
  const [viewingEntity, setViewingEntity] = useState<ViewingEntity | null>(null);

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

  const repPerf = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'rep', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );
  const branchPerf = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'branch', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );
  const sourcePerf = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'source', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );
  const modelPerf = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'model', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );

  const managerByBranchId = useMemo(() => {
    if (!data) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const rep of data.raw.sales_reps) {
      if (rep.role === 'branch_manager') map.set(rep.branch_id, rep.name);
    }
    return map;
  }, [data]);

  const leadById = useMemo(() => new Map(filteredLeads.map((l) => [l.id, l])), [filteredLeads]);

  function handleViewDeal(leadId: string) {
    const lead = leadById.get(leadId);
    if (lead) setSelectedLead(lead);
  }

  function handleFocusEntity(insight: Insight) {
    if (insight.entityId && (insight.entityType === 'rep' || insight.entityType === 'branch' || insight.entityType === 'source' || insight.entityType === 'model')) {
      setViewingEntity({ type: insight.entityType, id: insight.entityId });
    }
  }

  const detail = useMemo(() => {
    if (!data || !viewingEntity) return null;

    const perfBy = (dealFilter: (row: DealRiskRow) => boolean) => dealRisk.filter(dealFilter);

    if (viewingEntity.type === 'rep') {
      const row = repPerf.find((r) => r.key === viewingEntity.id);
      if (!row) return null;
      const repName = row.label.split(' — ')[1] ?? row.label;
      const branch = data.raw.branches.find((b) => b.id === row.branchId);
      const stats: EntityDetailStat[] = [
        { label: 'Active deals', value: (row.leadCount - row.deliveredCount - row.lostCount).toLocaleString('en-IN') },
        { label: 'Conversion rate', value: row.conversionPct === null ? '—' : formatPercent(row.conversionPct, 1) },
        { label: 'Pipeline value', value: formatCompactCurrency(row.pipelineValue) },
        { label: 'Revenue delivered', value: formatCompactCurrency(row.revenue) },
        { label: 'Avg deal value', value: row.avgDealValue === null ? '—' : formatCompactCurrency(row.avgDealValue) },
        { label: 'Gone quiet (15+ days)', value: row.staleCount.toLocaleString('en-IN') },
      ];
      return {
        kind: 'Sales Rep' as const,
        title: repName,
        subtitle: branch?.name ?? row.label,
        stats,
        deals: perfBy((d) => d.repId === viewingEntity.id),
      };
    }

    if (viewingEntity.type === 'branch') {
      const row = branchPerf.find((r) => r.key === viewingEntity.id);
      if (!row) return null;
      const branch = data.raw.branches.find((b) => b.id === viewingEntity.id);
      const manager = managerByBranchId.get(viewingEntity.id);
      const stats: EntityDetailStat[] = [
        { label: 'Total leads', value: row.leadCount.toLocaleString('en-IN') },
        { label: 'Conversion rate', value: row.conversionPct === null ? '—' : formatPercent(row.conversionPct, 1) },
        { label: 'Revenue', value: formatCompactCurrency(row.revenue) },
        { label: 'Active pipeline', value: formatCompactCurrency(row.pipelineValue) },
        { label: 'Avg deal value', value: row.avgDealValue === null ? '—' : formatCompactCurrency(row.avgDealValue) },
        { label: 'Median sales cycle', value: row.medianCycleDays === null ? '—' : formatDays(row.medianCycleDays) },
      ];
      return {
        kind: 'Branch' as const,
        title: branch?.name ?? row.label,
        subtitle: [branch?.city, manager ? `Manager: ${manager}` : null].filter(Boolean).join(' · '),
        stats,
        deals: perfBy((d) => d.branchId === viewingEntity.id),
      };
    }

    if (viewingEntity.type === 'source') {
      const row = sourcePerf.find((r) => r.key === viewingEntity.id);
      if (!row) return null;
      const label = SOURCE_LABELS[viewingEntity.id as LeadSource] ?? row.label;
      const stats: EntityDetailStat[] = [
        { label: 'Total leads', value: row.leadCount.toLocaleString('en-IN') },
        { label: 'Conversion rate', value: row.conversionPct === null ? '—' : formatPercent(row.conversionPct, 1) },
        { label: 'Revenue', value: formatCompactCurrency(row.revenue) },
        { label: 'Active pipeline', value: formatCompactCurrency(row.pipelineValue) },
        { label: 'Avg deal value', value: row.avgDealValue === null ? '—' : formatCompactCurrency(row.avgDealValue) },
      ];
      return {
        kind: 'Lead Source' as const,
        title: label,
        subtitle: 'Lead source',
        stats,
        deals: perfBy((d) => d.source === viewingEntity.id),
      };
    }

    // model
    const row = modelPerf.find((r) => r.key === viewingEntity.id);
    if (!row) return null;
    const stats: EntityDetailStat[] = [
      { label: 'Total leads', value: row.leadCount.toLocaleString('en-IN') },
      { label: 'Conversion rate', value: row.conversionPct === null ? '—' : formatPercent(row.conversionPct, 1) },
      { label: 'Revenue', value: formatCompactCurrency(row.revenue) },
      { label: 'Active pipeline', value: formatCompactCurrency(row.pipelineValue) },
      { label: 'Avg deal value', value: row.avgDealValue === null ? '—' : formatCompactCurrency(row.avgDealValue) },
    ];
    return {
      kind: 'Model' as const,
      title: viewingEntity.id,
      subtitle: 'Model',
      stats,
      deals: perfBy((d) => d.model === viewingEntity.id),
    };
  }, [data, viewingEntity, dealRisk, repPerf, branchPerf, sourcePerf, modelPerf, managerByBranchId]);

  function handleViewDealFromEntity(leadId: string) {
    setViewingEntity(null);
    handleViewDeal(leadId);
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
        <h1 className="actionable-page__title">What needs your attention?</h1>
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
        <>
          <SectionNav
            items={[
              { id: 'ask-ai-card', label: 'Ask AI' },
              { id: 'what-if-simulator', label: 'What-If' },
              { id: 'executive-priorities', label: 'Priorities' },
              { id: 'bottlenecks', label: 'Full List' },
              { id: 'deals-requiring-attention', label: 'Deals' },
              { id: 'next-best-actions', label: 'Next Actions' },
              { id: 'rep-capacity', label: 'Rep Capacity' },
            ]}
          />
          <div className="actionable-stack">
            <div id="ask-ai-card" className="section-anchor">
              <AskAiCard
                title="Ask about risks, reps, or priorities"
                hint="Ask a natural-language question grounded in this dataset — the assistant retrieves the real numbers before answering."
                suggestions={ASK_AI_ACTIONABLE_SUGGESTIONS}
              />
            </div>

            <div id="what-if-simulator" className="section-anchor">
              <WhatIfSection filteredLeads={filteredLeads} referenceNowIso={referenceNowIso} />
            </div>

            <div id="executive-priorities" className="section-anchor">
              <ExecutivePrioritiesSection insights={insights} onFocusEntity={handleFocusEntity} />
            </div>

            <div id="bottlenecks" className="section-anchor">
              <BottlenecksSection insights={insights} onFocusEntity={handleFocusEntity} />
            </div>

            <div id="deals-requiring-attention" className="section-anchor">
              <DealsAttentionTable rows={dealRisk} filterOptions={filterOptions} onViewDeal={handleViewDeal} />
            </div>

            <div id="next-best-actions" className="section-anchor">
              <NextBestActionsSection
                rows={dealRisk}
                onViewDeal={handleViewDeal}
                onViewRep={(repId) => setViewingEntity({ type: 'rep', id: repId })}
                onViewBranch={(branchId) => setViewingEntity({ type: 'branch', id: branchId })}
              />
            </div>

            <div id="rep-capacity" className="section-anchor">
              <RepCapacitySection rows={repCapacity} onViewRep={(repId) => setViewingEntity({ type: 'rep', id: repId })} />
            </div>
          </div>
        </>
      )}

      {selectedLead && <LeadJourneyModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}

      {detail && (
        <EntityDetailModal
          kind={detail.kind}
          title={detail.title}
          subtitle={detail.subtitle}
          stats={detail.stats}
          deals={detail.deals}
          onClose={() => setViewingEntity(null)}
          onViewDeal={handleViewDealFromEntity}
        />
      )}
    </div>
  );
}
