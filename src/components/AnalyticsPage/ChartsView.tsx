import { useMemo, useState } from 'react';
import {
  calculateCurrentPipeline,
  calculateExpectedClose,
  calculateHistoricalFunnel,
  calculateLeadAging,
  calculateLossAnalysis,
  calculateOverview,
  calculateSalesVelocity,
  calculateTargetPerformance,
  calculateDeliveryAnalytics,
} from '../../analytics/calculations';
import { deriveAnalyticsFilterOptions, filterDeliveries, filterLeads } from '../../analytics/filters';
import { EMPTY_ANALYTICS_FILTERS } from '../../analytics/types';
import type { AnalyticsFilterState } from '../../analytics/types';
import type { NormalizedData } from '../../data/loadData';
import { SectionNav } from '../shared/SectionNav';
import { GlobalFilterBar } from './GlobalFilterBar';
import { AgingSection } from './sections/AgingSection';
import { CurrentPipelineSection } from './sections/CurrentPipelineSection';
import { DeliverySection } from './sections/DeliverySection';
import { ExpectedCloseSection } from './sections/ExpectedCloseSection';
import { FunnelSection } from './sections/FunnelSection';
import { LossSection } from './sections/LossSection';
import { OverviewSection } from './sections/OverviewSection';
import { PerformanceSection } from './sections/PerformanceSection';
import { RankedDealershipsSection } from './sections/RankedDealershipsSection';
import { RankedRepsSection } from './sections/RankedRepsSection';
import { SourceMixSection } from './sections/SourceMixSection';
import { TargetsSection } from './sections/TargetsSection';
import { TrendSection } from './sections/TrendSection';
import { VelocitySection } from './sections/VelocitySection';

interface ChartsViewProps {
  data: NormalizedData;
  referenceNowIso: string;
}

/** The Charts mode of the Analytics page — the full filter → calculate →
 * visualize dashboard. Owns its own filter state, independent of Questions
 * mode's (the two are separate slicing sessions), and receives the already
 * loaded dataset from the shared AnalyticsPage shell. */
export function ChartsView({ data, referenceNowIso }: ChartsViewProps) {
  const [filters, setFilters] = useState<AnalyticsFilterState>(EMPTY_ANALYTICS_FILTERS);

  const filterOptions = useMemo(() => deriveAnalyticsFilterOptions(data.raw, filters), [data, filters]);

  const branchIndexById = useMemo(() => new Map(data.raw.branches.map((b, i) => [b.id, i])), [data]);

  const filteredLeads = useMemo(() => filterLeads(data.leads, filters), [data, filters]);
  const filteredDeliveries = useMemo(() => filterDeliveries(filteredLeads, data.raw.deliveries), [data, filteredLeads]);

  const overview = useMemo(() => calculateOverview(filteredLeads, data.raw, filters), [data, filteredLeads, filters]);
  const pipeline = useMemo(() => calculateCurrentPipeline(filteredLeads), [filteredLeads]);
  const funnel = useMemo(() => calculateHistoricalFunnel(filteredLeads), [filteredLeads]);
  const velocity = useMemo(() => calculateSalesVelocity(filteredLeads), [filteredLeads]);
  const delivery = useMemo(() => calculateDeliveryAnalytics(filteredLeads, filteredDeliveries), [filteredLeads, filteredDeliveries]);
  const aging = useMemo(() => calculateLeadAging(filteredLeads, referenceNowIso), [filteredLeads, referenceNowIso]);
  const expectedClose = useMemo(() => calculateExpectedClose(filteredLeads, referenceNowIso), [filteredLeads, referenceNowIso]);
  const loss = useMemo(() => calculateLossAnalysis(filteredLeads), [filteredLeads]);

  const targetPerfByBranch = useMemo(() => calculateTargetPerformance(data.raw, filters, 'branch'), [data, filters]);

  const navItems = [
    { id: 'overview', label: 'Overview' },
    { id: 'ranked-dealerships', label: 'Branches' },
    { id: 'ranked-reps', label: 'Reps' },
    { id: 'pipeline-source', label: 'Pipeline & Source' },
    { id: 'funnel', label: 'Funnel' },
    { id: 'performance', label: 'Performance' },
    { id: 'targets', label: 'Targets' },
    { id: 'trend', label: 'Trend' },
    { id: 'velocity-aging', label: 'Velocity & Aging' },
    { id: 'delivery', label: 'Delivery' },
    { id: 'expected-close-loss', label: 'Forecast & Loss' },
  ];

  return (
    <div className="analytics-page">
      <div className="analytics-page__intro">
        <h1 className="analytics-page__title">How are sales performing?</h1>
        <p className="analytics-page__subtitle">
          Revenue, conversion, pipeline, and how your branches and reps compare — the full picture behind the numbers.
        </p>
      </div>

      <GlobalFilterBar filters={filters} options={filterOptions} onChange={setFilters} />

      {filteredLeads.length === 0 ? (
        <div className="analytics-empty analytics-empty--page">
          <p>No data for the selected filters.</p>
        </div>
      ) : (
        <>
          <SectionNav items={navItems} />
          <div className="analytics-stack">
            <div id="overview" className="section-anchor">
              <OverviewSection overview={overview} filters={filters} filterOptions={filterOptions} />
            </div>

            <div id="ranked-dealerships" className="section-anchor">
              <RankedDealershipsSection
                filteredLeads={filteredLeads}
                filteredDeliveries={filteredDeliveries}
                referenceNowIso={referenceNowIso}
                raw={data.raw}
                filters={filters}
                filterOptions={filterOptions}
              />
            </div>
            <div id="ranked-reps" className="section-anchor">
              <RankedRepsSection
                filteredLeads={filteredLeads}
                filteredDeliveries={filteredDeliveries}
                referenceNowIso={referenceNowIso}
                filters={filters}
                filterOptions={filterOptions}
              />
            </div>

            <div id="pipeline-source" className="section-anchor analytics-row">
              <CurrentPipelineSection rows={pipeline} filters={filters} filterOptions={filterOptions} />
              <SourceMixSection
                filteredLeads={filteredLeads}
                filteredDeliveries={filteredDeliveries}
                referenceNowIso={referenceNowIso}
                filters={filters}
                filterOptions={filterOptions}
              />
            </div>

            <div id="funnel" className="section-anchor">
              <FunnelSection funnel={funnel} filters={filters} filterOptions={filterOptions} />
            </div>
            <div id="performance" className="section-anchor">
              <PerformanceSection
                filteredLeads={filteredLeads}
                filteredDeliveries={filteredDeliveries}
                referenceNowIso={referenceNowIso}
                branchIndexById={branchIndexById}
                targetRowsByBranch={targetPerfByBranch.rows}
                targetsApplicable={targetPerfByBranch.applicable}
                filters={filters}
                filterOptions={filterOptions}
              />
            </div>
            <div id="targets" className="section-anchor">
              <TargetsSection raw={data.raw} filters={filters} filterOptions={filterOptions} />
            </div>
            <div id="trend" className="section-anchor">
              <TrendSection
                raw={data.raw}
                filteredLeads={filteredLeads}
                filteredDeliveries={filteredDeliveries}
                referenceNowIso={referenceNowIso}
                filters={filters}
                filterOptions={filterOptions}
              />
            </div>
            <div id="velocity-aging" className="section-anchor analytics-row">
              <VelocitySection stages={velocity} filters={filters} filterOptions={filterOptions} />
              <AgingSection buckets={aging} filters={filters} filterOptions={filterOptions} />
            </div>
            <div id="delivery" className="section-anchor">
              <DeliverySection delivery={delivery} filters={filters} filterOptions={filterOptions} />
            </div>
            <div id="expected-close-loss" className="section-anchor analytics-row">
              <ExpectedCloseSection buckets={expectedClose} filters={filters} filterOptions={filterOptions} />
              <LossSection loss={loss} filters={filters} filterOptions={filterOptions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
