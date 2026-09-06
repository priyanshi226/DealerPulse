// Types for the Questions engine. The JSON catalogue (src/data/analyticsQuestions.json)
// is the source of truth for *what* a question means; these types just give
// that JSON a validated shape and give the engine/UI something to type against.

import type { LeadSource, LeadStatus } from '../../data/types';

export type FilterKey =
  | 'branch'
  | 'salesRep'
  | 'source'
  | 'model'
  | 'status'
  | 'dateRange'
  | 'lostReason'
  | 'dealValueRange'
  | 'activeClosed'
  | 'deliveryStatus'
  | 'expectedCloseRange';

export type BreakdownDimension = 'branch' | 'salesRep' | 'source' | 'model' | 'status' | 'lostReason' | 'month';

export type MetricType = 'number' | 'percentage' | 'currency' | 'duration' | 'ranking' | 'breakdown' | 'list';

export type DataGrain = 'lead' | 'delivery' | 'status_history' | 'target';

export type DateField = 'created_at' | 'delivery_date' | 'status_history' | 'expected_close_date' | 'target_month' | null;

export type CalcType =
  | 'count'
  | 'sum'
  | 'average'
  | 'median'
  | 'ratio'
  | 'stage_reached'
  | 'stage_conversion'
  | 'funnel_dropoff'
  | 'stage_duration'
  | 'sales_cycle'
  | 'target_metric'
  | 'aging_bucket'
  | 'stale'
  | 'overdue'
  | 'delivery_metric'
  | 'lead_list'
  | 'month_ranking';

export interface CalcCondition {
  /** 'active' = not delivered/lost, 'closed' = delivered or lost, otherwise a literal LeadStatus. */
  status?: LeadStatus | 'active' | 'closed';
}

export interface MetricSpec {
  type: 'count' | 'sum';
  field?: 'deal_value';
  condition?: CalcCondition;
}

export interface Calculation {
  type: CalcType;
  field?: 'deal_value';
  condition?: CalcCondition;
  numerator?: MetricSpec;
  denominator?: MetricSpec;
  from?: LeadStatus;
  to?: LeadStatus;
  stage?: LeadStatus;
  target?: 'revenue' | 'units';
  targetPart?: 'target' | 'actual' | 'achievementPct' | 'gap' | 'closest';
  bucket?: string;
  ageMetric?: 'count' | 'value';
  deliveryMetric?:
    | 'medianDays'
    | 'averageDays'
    | 'count'
    | 'fastest'
    | 'slowest'
    | 'delayedCount'
    | 'delayedPct'
    | 'delayReasons'
    | 'byBranch'
    | 'byModel'
    | 'revenue';
  sortBy?: 'daysInactive' | 'dealValue';
  direction?: 'asc' | 'desc';
  limit?: number;
  monthMetric?: 'revenue' | 'deliveries';
}

export interface QuestionDefinition {
  id: string;
  category: string;
  question: string;
  description?: string;
  metricType: MetricType;
  unitLabel?: string;
  supportedFilters: FilterKey[];
  dataGrain: DataGrain;
  dateField: DateField;
  breakdown?: BreakdownDimension;
  rankDirection?: 'asc' | 'desc';
  minSampleSize?: number;
  calculation: Calculation;
  format: 'number' | 'percentage' | 'INR' | 'days' | 'text';
}

export interface QuestionCatalogue {
  meta: {
    staleThresholdDays: number;
    minSampleSize: number;
  };
  questions: QuestionDefinition[];
}

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

export interface AnswerRow {
  key: string;
  label: string;
  value: string;
  raw: number;
  flag?: string;
}

export interface QuestionAnswer {
  kind: 'single' | 'ranking' | 'breakdown' | 'list' | 'empty';
  value?: string;
  raw?: number | null;
  rankingLabel?: string;
  rows?: AnswerRow[];
  emptyReason?: string;
}

export interface QuestionFilterOptionSet {
  branches: { id: string; label: string }[];
  reps: { id: string; label: string; branchId: string }[];
  sources: { value: LeadSource; label: string }[];
  models: string[];
  statuses: { value: LeadStatus; label: string }[];
  lostReasons: string[];
  dateBounds: { min: string; max: string } | null;
}
