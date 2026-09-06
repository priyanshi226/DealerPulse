// Reusable narrative snippets shared across chart info panels, so the same
// concept (e.g. "date is based on delivery_date") is written once and reused
// everywhere it applies, rather than re-typed per chart.

export const DATE_SEMANTICS = {
  createdAt: "Date is based on each lead's created_at (when the lead was acquired).",
  deliveryDate:
    "Date is based on the linked delivery record's delivery_date (joined via delivery.lead_id → lead.id), not the lead's created_at.",
  statusHistory: "Stage timestamps come from each lead's status_history, not created_at or delivery_date.",
  expectedClose: "Date is based on each lead's expected_close_date.",
  lastActivity: "Age is measured as days since each lead's last_activity_at, not created_at.",
  targetMonth: 'Targets are matched using branch_id + month, aligned against the same months in the current date range.',
  snapshot: "This is a current-status snapshot (lead.status) — it doesn't depend on a date range.",
} as const;

export const GRAIN = {
  lead: 'Lead',
  statusHistory: 'Lead journey / status history',
  delivery: 'Delivery record',
  target: 'Branch × Month target',
} as const;

export const FORMULA = {
  conversionRate: 'Conversion Rate = Delivered Leads ÷ Total Leads × 100',
  lossRate: 'Loss Rate = Lost Leads ÷ Total Leads × 100',
  activePipeline: 'Active Pipeline Value = Σ deal_value for leads that are neither Delivered nor Lost',
  targetAchievement: 'Revenue Target Achievement = Delivered Revenue ÷ Applicable Revenue Target × 100',
  unitAchievement: 'Unit Target Achievement = Delivered Units ÷ Applicable Unit Target × 100',
  revenueGap: 'Revenue Gap = Delivered Revenue − Applicable Revenue Target',
  stageConversion: 'Stage Conversion = Leads reaching next stage ÷ Leads reaching current stage × 100',
  stageReached: "Reached count = leads whose status_history includes this status at any point, regardless of today's status",
  salesCycle: 'Median Sales Cycle = Median(delivery_date − created_at) for delivered leads',
  stageDuration: 'Median Stage Duration = Median(timestamp of stage B − timestamp of stage A) from status_history, per lead',
  deliveryTime: 'Median Delivery Time = Median(delivery_date − order_date)',
  deliveredRevenue: 'Delivered Revenue = Σ deal_value for leads with status = Delivered',
  avgDealValue: 'Average Deal Value = Σ deal_value ÷ count, over the matching leads',
  agingBucket: 'Bucket membership = days since last_activity_at, for active leads only',
  overdue: 'Overdue = active leads where expected_close_date is before the reference date',
  lostByReason: 'Σ / count of lost leads (status = Lost), grouped by lost_reason',
  delayReasons: 'Count of delivery records with a non-null delay_reason, grouped by reason',
  delayedPct: 'Delayed % = Deliveries with a delay_reason ÷ Total deliveries × 100',
  statusDistribution: 'Count (or Σ deal_value) of leads grouped by current lead.status',
  sourceMix: 'Count of leads grouped by lead.source, as a share of the filtered total',
  monthlyTrend: 'Leads/deliveries/revenue grouped by month; conversion grouped by lead-creation-month cohort',
} as const;

export const COMPOSITION_CAVEAT =
  'This chart represents the composition of the selected total. Percentages are calculated from the filtered dataset.';

export const FUNNEL_CAVEAT =
  "This funnel represents the number of leads that reached each historical stage at least once. A lead currently in Negotiation may still appear in New, Contacted, Test Drive and Negotiation because those stages occurred in its journey — it is not the same as counting today's status.";
