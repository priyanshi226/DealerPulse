import { useMemo } from 'react';
import { calculateDimensionPerformance } from '../../../analytics/calculations';
import { COMPOSITION_CAVEAT, DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { SOURCE_LABELS } from '../../../data/transformations';
import type { Delivery, EnrichedLead, LeadSource } from '../../../data/types';
import { branchColorVar } from '../../DataExplorer/colors';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { DonutChart, type DonutSlice } from '../charts/DonutChart';
import { SectionCard } from '../charts/SectionCard';

interface SourceMixSectionProps {
  filteredLeads: EnrichedLead[];
  filteredDeliveries: Delivery[];
  referenceNowIso: string;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

// Fixed order (never re-sorted by value) so a given source always gets the
// same color slot regardless of the current filter/ranking.
const SOURCE_ORDER: LeadSource[] = ['website', 'walk_in', 'referral', 'phone_enquiry', 'social_media', 'auto_expo'];

export function SourceMixSection({ filteredLeads, filteredDeliveries, referenceNowIso, filters, filterOptions }: SourceMixSectionProps) {
  const rows = useMemo(
    () => calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'source', referenceNowIso),
    [filteredLeads, filteredDeliveries, referenceNowIso],
  );

  const total = filteredLeads.length;

  const slices: DonutSlice[] = SOURCE_ORDER.map((source, i) => {
    const row = rows.find((r) => r.key === source);
    return { key: source, label: SOURCE_LABELS[source], value: row?.leadCount ?? 0, color: branchColorVar(i) };
  }).filter((s) => s.value > 0);

  const info: ChartInfo = {
    title: 'Lead Source Mix',
    chartType: 'Donut chart',
    description: 'Share of the filtered leads by acquisition source.',
    formula: FORMULA.sourceMix,
    dataGrain: GRAIN.lead,
    dateSemantics: DATE_SEMANTICS.createdAt,
    relevantFilters: ['branch', 'salesRep', 'model', 'status', 'dateRange'],
    recordsIncluded: total,
    recordsLabel: 'leads in the filtered slice',
    values: slices.map((s) => ({ label: s.label, value: `${s.value.toLocaleString('en-IN')} (${total ? Math.round((s.value / total) * 100) : 0}%)` })),
    caveat: COMPOSITION_CAVEAT,
  };

  return (
    <SectionCard
      title="Lead Source Mix"
      description="Where the filtered leads came from, as a share of the total — a different question from ranking sources by revenue."
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <DonutChart slices={slices} formatValue={(v) => v.toLocaleString('en-IN')} />
    </SectionCard>
  );
}
