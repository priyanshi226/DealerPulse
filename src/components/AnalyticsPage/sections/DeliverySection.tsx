import { DATE_SEMANTICS, FORMULA, GRAIN } from '../../../analytics/chartInfo/text';
import type { ChartInfo } from '../../../analytics/chartInfo/types';
import type { DeliveryAnalyticsResult } from '../../../analytics/calculations';
import { formatCompactCurrency, formatDays, formatPercent } from '../../../analytics/format';
import type { AnalyticsFilterOptions, AnalyticsFilterState } from '../../../analytics/types';
import { BarChart, type BarChartRow } from '../charts/BarChart';
import { ChartInfoButton } from '../charts/ChartInfoButton';
import { SectionCard } from '../charts/SectionCard';
import { StatTile } from '../charts/StatTile';

interface DeliverySectionProps {
  delivery: DeliveryAnalyticsResult;
  filters: AnalyticsFilterState;
  filterOptions: AnalyticsFilterOptions;
}

export function DeliverySection({ delivery, filters, filterOptions }: DeliverySectionProps) {
  const byBranchRows: BarChartRow[] = [...delivery.byBranch]
    .sort((a, b) => (a.medianDays ?? 0) - (b.medianDays ?? 0))
    .map((r) => ({
      key: r.key,
      label: r.label,
      sublabel: `${r.count} delivered`,
      value: r.medianDays ?? 0,
      displayValue: r.medianDays === null ? '—' : formatDays(r.medianDays),
    }));

  const byModelRows: BarChartRow[] = [...delivery.byModel]
    .sort((a, b) => (a.medianDays ?? 0) - (b.medianDays ?? 0))
    .map((r) => ({
      key: r.key,
      label: r.label,
      sublabel: `${r.count} delivered`,
      value: r.medianDays ?? 0,
      displayValue: r.medianDays === null ? '—' : formatDays(r.medianDays),
    }));

  const delayRows: BarChartRow[] = delivery.delayReasons.map((r) => ({
    key: r.reason,
    label: r.reason,
    value: r.count,
    displayValue: r.count.toLocaleString('en-IN'),
  }));

  const bucketRows: BarChartRow[] = delivery.timeBuckets.map((b) => ({
    key: b.key,
    label: b.label,
    value: b.count,
    displayValue: b.count.toLocaleString('en-IN'),
  }));

  const delayedCount = delivery.delayReasons.reduce((sum, r) => sum + r.count, 0);
  const delayedPct = delivery.deliveriesCount ? (delayedCount / delivery.deliveriesCount) * 100 : null;

  const info: ChartInfo = {
    title: 'Delivery Performance',
    chartType: 'KPI cards + horizontal bars + ordered bars',
    description: "Order-to-delivery timing and delay causes for the filtered leads' delivery records, joined via delivery.lead_id → lead.id.",
    formula: `${FORMULA.deliveryTime}\n${FORMULA.delayedPct}`,
    dataGrain: GRAIN.delivery,
    dateSemantics: DATE_SEMANTICS.deliveryDate,
    relevantFilters: ['branch', 'salesRep', 'source', 'model', 'dateRange'],
    recordsIncluded: delivery.deliveriesCount,
    recordsLabel: 'delivery records',
    values: [
      { label: 'Median time', value: delivery.medianDays === null ? '—' : formatDays(delivery.medianDays) },
      { label: 'Average time', value: delivery.averageDays === null ? '—' : formatDays(delivery.averageDays) },
      { label: 'Delayed', value: delayedPct === null ? '—' : `${delayedCount} (${formatPercent(delayedPct, 0)})` },
    ],
    caveat:
      'Delay reasons are shown as a horizontal bar rather than a donut — 7+ distinct reasons is past the point where a donut stays reliably readable.',
  };

  return (
    <SectionCard
      title="Delivery Performance"
      description="How long it takes from order to delivery, and the most common reasons for delays."
      info={<ChartInfoButton info={info} filters={filters} filterOptions={filterOptions} />}
    >
      <div className="stat-grid stat-grid--compact">
        <StatTile label="Deliveries" value={delivery.deliveriesCount.toLocaleString('en-IN')} />
        <StatTile label="Median Time" value={delivery.medianDays === null ? '—' : formatDays(delivery.medianDays)} />
        <StatTile label="Average Time" value={delivery.averageDays === null ? '—' : formatDays(delivery.averageDays)} />
        <StatTile label="Fastest" value={delivery.fastestDays === null ? '—' : formatDays(delivery.fastestDays)} />
        <StatTile label="Slowest" value={delivery.slowestDays === null ? '—' : formatDays(delivery.slowestDays)} />
        <StatTile label="Delivered Revenue" value={formatCompactCurrency(delivery.revenue)} />
      </div>

      <div className="analytics-subgrid">
        <div>
          <h3 className="analytics-subheading">Delivery time by branch</h3>
          <BarChart rows={byBranchRows} emptyMessage="No deliveries for the selected filters." />
        </div>
        <div>
          <h3 className="analytics-subheading">Delivery time by model</h3>
          <BarChart rows={byModelRows} emptyMessage="No deliveries for the selected filters." />
        </div>
      </div>

      <div className="analytics-subgrid">
        <div>
          <h3 className="analytics-subheading">Distribution of delivery times</h3>
          <BarChart rows={bucketRows} emptyMessage="No deliveries for the selected filters." />
        </div>
        <div>
          <h3 className="analytics-subheading">Delay reasons</h3>
          <BarChart rows={delayRows} emptyMessage="No delayed deliveries for the selected filters." />
        </div>
      </div>
    </SectionCard>
  );
}
