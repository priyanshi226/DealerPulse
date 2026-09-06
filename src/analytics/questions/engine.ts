// The Questions calculation engine. This is deliberately a DISPATCHER, not
// 110 bespoke functions — every `calculation.type` handler below composes
// the same primitives (and, for anything dimension/target/funnel/velocity/
// delivery/aging shaped, the exact calculation functions already built for
// Charts mode in analytics/calculations/*) so the math is defined once and
// answers both surfaces identically.

import {
  MIN_SAMPLE_SIZE,
  STALE_THRESHOLD_DAYS,
  average,
  calculateDeliveryAnalytics,
  calculateExpectedClose,
  calculateHistoricalFunnel,
  calculateLeadAging,
  calculateMonthlyTrend,
  calculateSalesVelocity,
  calculateTargetPerformance,
  daysBetween,
  isActive,
  median,
  pct,
  sumBy,
} from '../calculations';
import { calculateDimensionPerformance } from '../calculations/dimensionPerformance';
import { formatCompactCurrency, formatDays, formatPercent } from '../format';
import type { AnalyticsFilterState } from '../types';
import type { DealershipDataset, Delivery, EnrichedLead, LeadStatus } from '../../data/types';
import { SOURCE_LABELS, STATUS_LABELS } from '../../data/transformations';
import { filterLeadsForQuestion } from './filters';
import type { QuestionFilterState } from './filters';
import type { AnswerRow, CalcCondition, MetricSpec, QuestionAnswer, QuestionDefinition } from './types';

function matchesCondition(lead: EnrichedLead, condition?: CalcCondition): boolean {
  if (!condition?.status) return true;
  if (condition.status === 'active') return isActive(lead);
  if (condition.status === 'closed') return !isActive(lead);
  return lead.status === condition.status;
}

function formatByType(raw: number, format: QuestionDefinition['format']): string {
  switch (format) {
    case 'percentage':
      return formatPercent(raw, 1);
    case 'INR':
      return formatCompactCurrency(raw);
    case 'days':
      return formatDays(raw);
    case 'number':
      return raw.toLocaleString('en-IN');
    default:
      return String(raw);
  }
}

function metricSpecValue(leads: EnrichedLead[], spec: MetricSpec): number {
  const matching = leads.filter((l) => matchesCondition(l, spec.condition));
  return spec.type === 'count' ? matching.length : sumBy(matching, (l) => l.deal_value);
}

const EMPTY_NO_MATCH: QuestionAnswer = { kind: 'empty', emptyReason: 'No matching records' };
const EMPTY_NOT_ENOUGH: QuestionAnswer = { kind: 'empty', emptyReason: 'Not enough data' };

function breakdownLeads(
  leads: EnrichedLead[],
  dimension: NonNullable<QuestionDefinition['breakdown']>,
): Map<string, { label: string; leads: EnrichedLead[] }> {
  const groups = new Map<string, { label: string; leads: EnrichedLead[] }>();
  for (const lead of leads) {
    let key: string;
    let label: string;
    switch (dimension) {
      case 'branch':
        key = lead.branch_id;
        label = `${lead.branch_id} — ${lead.branchName}`;
        break;
      case 'salesRep':
        key = lead.assigned_to;
        label = `${lead.assigned_to} — ${lead.repName}`;
        break;
      case 'source':
        key = lead.source;
        label = SOURCE_LABELS[lead.source] ?? lead.source;
        break;
      case 'model':
        key = lead.model_interested;
        label = lead.model_interested;
        break;
      case 'status':
        key = lead.status;
        label = STATUS_LABELS[lead.status];
        break;
      case 'lostReason':
        key = lead.lost_reason ?? 'Not specified';
        label = key;
        break;
      case 'month':
        key = lead.created_at.slice(0, 7);
        label = key;
        break;
    }
    const existing = groups.get(key);
    if (existing) existing.leads.push(lead);
    else groups.set(key, { label, leads: [lead] });
  }
  return groups;
}

function rankRows(rows: AnswerRow[], direction: 'asc' | 'desc' = 'desc'): AnswerRow[] {
  return [...rows].sort((a, b) => (direction === 'desc' ? b.raw - a.raw : a.raw - b.raw));
}

function toChartsFilters(filters: QuestionFilterState, supported: QuestionDefinition['supportedFilters']): AnalyticsFilterState {
  const supports = (k: string) => supported.includes(k as never);
  return {
    branchIds: supports('branch') ? filters.branchIds : [],
    repIds: supports('salesRep') ? filters.repIds : [],
    sources: supports('source') ? filters.sources : [],
    models: supports('model') ? filters.models : [],
    statuses: supports('status') ? filters.statuses : [],
    dateFrom: supports('dateRange') ? filters.dateFrom : null,
    dateTo: supports('dateRange') ? filters.dateTo : null,
  };
}

export function calculateQuestion(
  question: QuestionDefinition,
  raw: DealershipDataset,
  leads: EnrichedLead[],
  filters: QuestionFilterState,
  referenceNowIso: string,
): QuestionAnswer {
  const deliveryDateByLeadId = new Map(raw.deliveries.map((d) => [d.lead_id, d.delivery_date]));

  const filteredLeads = filterLeadsForQuestion(leads, deliveryDateByLeadId, filters, question.supportedFilters, question.dateField);
  const leadIdSet = new Set(filteredLeads.map((l) => l.id));
  const filteredDeliveries = raw.deliveries.filter((d) => leadIdSet.has(d.lead_id));

  const calc = question.calculation;
  const format = question.format;

  // Target/month questions don't key off the lead-grain cohort at all —
  // handle them before the "cohort is empty" guard below.
  if (calc.type === 'target_metric') return calculateTargetMetric(question, raw, filters);
  if (calc.type === 'month_ranking') return calculateMonthRanking(question, filteredLeads, filteredDeliveries, referenceNowIso);

  if (filteredLeads.length === 0) return EMPTY_NO_MATCH;

  switch (calc.type) {
    case 'count': {
      if (question.breakdown) {
        const groups = breakdownLeads(filteredLeads, question.breakdown);
        const rows: AnswerRow[] = Array.from(groups.entries()).map(([key, g]) => ({
          key,
          label: g.label,
          raw: g.leads.filter((l) => matchesCondition(l, calc.condition)).length,
          value: formatByType(g.leads.filter((l) => matchesCondition(l, calc.condition)).length, format),
        }));
        return finishBreakdown(question, rows);
      }
      const value = filteredLeads.filter((l) => matchesCondition(l, calc.condition)).length;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'sum': {
      if (question.breakdown) {
        const groups = breakdownLeads(filteredLeads, question.breakdown);
        const rows: AnswerRow[] = Array.from(groups.entries()).map(([key, g]) => {
          const val = sumBy(g.leads.filter((l) => matchesCondition(l, calc.condition)), (l) => l.deal_value);
          return { key, label: g.label, raw: val, value: formatByType(val, format) };
        });
        return finishBreakdown(question, rows);
      }
      const value = sumBy(filteredLeads.filter((l) => matchesCondition(l, calc.condition)), (l) => l.deal_value);
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'average':
    case 'median': {
      const stat = calc.type === 'average' ? average : median;
      if (question.breakdown) {
        const groups = breakdownLeads(filteredLeads, question.breakdown);
        const rows: AnswerRow[] = [];
        for (const [key, g] of groups.entries()) {
          const values = g.leads.filter((l) => matchesCondition(l, calc.condition)).map((l) => l.deal_value);
          const val = stat(values);
          if (val !== null) rows.push({ key, label: g.label, raw: val, value: formatByType(val, format) });
        }
        return finishBreakdown(question, rows);
      }
      const values = filteredLeads.filter((l) => matchesCondition(l, calc.condition)).map((l) => l.deal_value);
      const value = stat(values);
      if (value === null) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'ratio': {
      if (!calc.numerator || !calc.denominator) return EMPTY_NOT_ENOUGH;
      if (question.breakdown) {
        const groups = breakdownLeads(filteredLeads, question.breakdown);
        const rows: AnswerRow[] = [];
        for (const [key, g] of groups.entries()) {
          const num = metricSpecValue(g.leads, calc.numerator);
          const den = metricSpecValue(g.leads, calc.denominator);
          const value = pct(num, den);
          if (value !== null) {
            rows.push({
              key,
              label: g.label,
              raw: value,
              value: formatByType(value, format),
              flag: g.leads.length < MIN_SAMPLE_SIZE ? 'low n' : undefined,
            });
          }
        }
        return finishBreakdown(question, rows);
      }
      const num = metricSpecValue(filteredLeads, calc.numerator);
      const den = metricSpecValue(filteredLeads, calc.denominator);
      const value = pct(num, den);
      if (value === null) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'stage_reached': {
      const funnel = calculateHistoricalFunnel(filteredLeads);
      if (!calc.stage) {
        const rows: AnswerRow[] = funnel.stages.map((s) => ({
          key: s.status,
          label: s.label,
          raw: s.reachedCount,
          value: s.reachedCount.toLocaleString('en-IN'),
        }));
        return finishBreakdown(question, rows);
      }
      const stage = funnel.stages.find((s) => s.status === calc.stage);
      if (!stage) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: stage.reachedCount, value: stage.reachedCount.toLocaleString('en-IN') };
    }

    case 'stage_conversion': {
      const funnel = calculateHistoricalFunnel(filteredLeads);
      const stage = funnel.stages.find((s) => s.status === calc.to);
      if (!stage || stage.conversionFromPrevPct === null) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: stage.conversionFromPrevPct, value: formatPercent(stage.conversionFromPrevPct, 1) };
    }

    case 'funnel_dropoff': {
      const funnel = calculateHistoricalFunnel(filteredLeads);
      if (!funnel.largestDropOff) return EMPTY_NOT_ENOUGH;
      return {
        kind: 'ranking',
        raw: funnel.largestDropOff.dropOffPct,
        rankingLabel: `${funnel.largestDropOff.fromLabel} → ${funnel.largestDropOff.toLabel}`,
        value: formatPercent(funnel.largestDropOff.dropOffPct, 0),
      };
    }

    case 'stage_duration': {
      const velocity = calculateSalesVelocity(filteredLeads);
      const row = velocity.find((v) => v.key === `${calc.from}_${calc.to}`);
      if (!row || row.medianDays === null) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: row.medianDays, value: formatDays(row.medianDays) };
    }

    case 'sales_cycle': {
      if (question.breakdown && (question.breakdown === 'branch' || question.breakdown === 'salesRep' || question.breakdown === 'source' || question.breakdown === 'model')) {
        const dim = question.breakdown === 'salesRep' ? 'rep' : question.breakdown;
        const perf = calculateDimensionPerformance(filteredLeads, filteredDeliveries, dim, referenceNowIso);
        const rows: AnswerRow[] = perf
          .filter((r) => r.medianCycleDays !== null)
          .map((r) => ({ key: r.key, label: r.label, raw: r.medianCycleDays as number, value: formatDays(r.medianCycleDays as number) }));
        return finishBreakdown(question, rows);
      }
      const delivered = filteredLeads.filter((l) => l.status === 'delivered' && deliveryDateByLeadId.has(l.id));
      const cycles = delivered.map((l) => daysBetween(l.created_at, deliveryDateByLeadId.get(l.id) as string));
      const value = median(cycles);
      if (value === null) return EMPTY_NOT_ENOUGH;
      return { kind: 'single', raw: value, value: formatDays(value) };
    }

    case 'aging_bucket': {
      const buckets = calculateLeadAging(filteredLeads, referenceNowIso);
      const bucket = buckets.find((b) => b.key === calc.bucket);
      if (!bucket) return EMPTY_NOT_ENOUGH;
      const value = calc.ageMetric === 'value' ? bucket.value : bucket.count;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'stale': {
      const active = filteredLeads.filter(isActive);
      const stale = active.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS);
      if (question.breakdown) {
        const groups = breakdownLeads(active, question.breakdown);
        const rows: AnswerRow[] = Array.from(groups.entries()).map(([key, g]) => {
          const count = g.leads.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS).length;
          return { key, label: g.label, raw: count, value: count.toLocaleString('en-IN') };
        });
        return finishBreakdown(question, rows);
      }
      const value = calc.ageMetric === 'value' ? sumBy(stale, (l) => l.deal_value) : stale.length;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'overdue': {
      const buckets = calculateExpectedClose(filteredLeads, referenceNowIso);
      const bucket = buckets.find((b) => b.key === 'overdue');
      if (!bucket) return EMPTY_NOT_ENOUGH;
      const value = calc.ageMetric === 'value' ? bucket.value : bucket.count;
      return { kind: 'single', raw: value, value: formatByType(value, format) };
    }

    case 'lead_list': {
      const active = filteredLeads.filter(isActive);
      if (active.length === 0) return EMPTY_NO_MATCH;
      const sorted = [...active].sort((a, b) => {
        const av = calc.sortBy === 'dealValue' ? a.deal_value : daysBetween(a.last_activity_at, referenceNowIso);
        const bv = calc.sortBy === 'dealValue' ? b.deal_value : daysBetween(b.last_activity_at, referenceNowIso);
        return calc.direction === 'asc' ? av - bv : bv - av;
      });
      const rows: AnswerRow[] = sorted.slice(0, calc.limit ?? 5).map((l) => {
        const days = Math.round(daysBetween(l.last_activity_at, referenceNowIso));
        return { key: l.id, label: `${l.id} — ${l.customer_name}`, raw: days, value: `${days}d inactive · ${formatCompactCurrency(l.deal_value)}` };
      });
      return { kind: 'list', rows };
    }

    case 'delivery_metric':
      return calculateDeliveryMetric(question, filteredLeads, filteredDeliveries);

    default:
      return EMPTY_NOT_ENOUGH;
  }
}

function finishBreakdown(question: QuestionDefinition, rows: AnswerRow[]): QuestionAnswer {
  if (rows.length === 0) return EMPTY_NO_MATCH;
  const sorted = rankRows(rows, question.rankDirection ?? 'desc');
  if (question.metricType === 'ranking') {
    const top = sorted[0];
    return { kind: 'ranking', raw: top.raw, rankingLabel: top.label, value: top.value };
  }
  return { kind: 'breakdown', rows: sorted };
}

function calculateTargetMetric(question: QuestionDefinition, raw: DealershipDataset, filters: QuestionFilterState): QuestionAnswer {
  const calc = question.calculation;
  const chartsFilters = toChartsFilters(filters, question.supportedFilters);
  const breakdownBy = question.breakdown === 'month' ? 'month' : 'branch';
  const result = calculateTargetPerformance(raw, chartsFilters, breakdownBy);
  if (!result.applicable) return { kind: 'empty', emptyReason: result.reason ?? 'Not applicable for this filter selection' };

  if (question.breakdown) {
    const field = (row: (typeof result.rows)[number]) => {
      if (calc.targetPart === 'closest') return row.targetRevenue > 0 ? -Math.abs(row.revenueGap) : -Infinity;
      if (calc.target === 'units') {
        if (calc.targetPart === 'gap') return row.unitGap;
        return row.unitAchievementPct ?? -Infinity;
      }
      if (calc.targetPart === 'gap') return row.revenueGap;
      return row.revenueAchievementPct ?? -Infinity;
    };
    const displayValue = (row: (typeof result.rows)[number], raw: number) => {
      if (calc.targetPart === 'closest') return `${formatPercent(row.revenueAchievementPct ?? 0, 0)} of target`;
      if (calc.targetPart === 'gap') return formatCompactCurrency(raw);
      return raw === -Infinity ? '—' : formatPercent(raw, 0);
    };
    const rows: AnswerRow[] = result.rows.map((r) => {
      const raw = field(r);
      return { key: r.key, label: r.label, raw, value: displayValue(r, raw) };
    });
    return finishBreakdown(question, rows.filter((r) => r.raw !== -Infinity));
  }

  const t = result.totals;
  let value: number;
  if (calc.target === 'units') {
    value =
      calc.targetPart === 'target'
        ? t.targetUnits
        : calc.targetPart === 'actual'
          ? t.actualUnits
          : calc.targetPart === 'gap'
            ? t.actualUnits - t.targetUnits
            : (t.unitAchievementPct ?? 0);
  } else {
    value =
      calc.targetPart === 'target'
        ? t.targetRevenue
        : calc.targetPart === 'actual'
          ? t.actualRevenue
          : calc.targetPart === 'gap'
            ? t.actualRevenue - t.targetRevenue
            : (t.revenueAchievementPct ?? 0);
  }
  return { kind: 'single', raw: value, value: formatByType(value, question.format) };
}

function calculateMonthRanking(
  question: QuestionDefinition,
  leads: EnrichedLead[],
  deliveries: Delivery[],
  referenceNowIso: string,
): QuestionAnswer {
  const metric = question.calculation.monthMetric === 'deliveries' ? 'delivered' : 'revenue';
  const points = calculateMonthlyTrend(leads, deliveries, metric, referenceNowIso).filter((p) => p.value !== null);
  if (points.length === 0) return EMPTY_NO_MATCH;
  const top = points.reduce((best, p) => ((p.value as number) > (best.value as number) ? p : best));
  return {
    kind: 'ranking',
    raw: top.value as number,
    rankingLabel: top.label,
    value: metric === 'revenue' ? formatCompactCurrency(top.value as number) : (top.value as number).toLocaleString('en-IN'),
  };
}

function calculateDeliveryMetric(question: QuestionDefinition, leads: EnrichedLead[], deliveries: Delivery[]): QuestionAnswer {
  const calc = question.calculation;
  if (deliveries.length === 0) return EMPTY_NO_MATCH;
  const result = calculateDeliveryAnalytics(leads, deliveries);

  switch (calc.deliveryMetric) {
    case 'count':
      return { kind: 'single', raw: result.deliveriesCount, value: result.deliveriesCount.toLocaleString('en-IN') };
    case 'medianDays':
      return result.medianDays === null ? EMPTY_NOT_ENOUGH : { kind: 'single', raw: result.medianDays, value: formatDays(result.medianDays) };
    case 'averageDays':
      return result.averageDays === null ? EMPTY_NOT_ENOUGH : { kind: 'single', raw: result.averageDays, value: formatDays(result.averageDays) };
    case 'fastest':
      return result.fastestDays === null ? EMPTY_NOT_ENOUGH : { kind: 'single', raw: result.fastestDays, value: formatDays(result.fastestDays) };
    case 'slowest':
      return result.slowestDays === null ? EMPTY_NOT_ENOUGH : { kind: 'single', raw: result.slowestDays, value: formatDays(result.slowestDays) };
    case 'revenue':
      return { kind: 'single', raw: result.revenue, value: formatCompactCurrency(result.revenue) };
    case 'delayedCount': {
      const count = deliveries.filter((d) => d.delay_reason).length;
      return { kind: 'single', raw: count, value: count.toLocaleString('en-IN') };
    }
    case 'delayedPct': {
      const count = deliveries.filter((d) => d.delay_reason).length;
      const value = pct(count, deliveries.length);
      return value === null ? EMPTY_NOT_ENOUGH : { kind: 'single', raw: value, value: formatPercent(value, 1) };
    }
    case 'delayReasons': {
      const rows: AnswerRow[] = result.delayReasons.map((r) => ({ key: r.reason, label: r.reason, raw: r.count, value: r.count.toLocaleString('en-IN') }));
      return finishBreakdown(question, rows);
    }
    case 'byBranch': {
      const rows: AnswerRow[] = result.byBranch
        .filter((r) => r.medianDays !== null)
        .map((r) => ({ key: r.key, label: r.label, raw: r.medianDays as number, value: formatDays(r.medianDays as number) }));
      return finishBreakdown(question, rows);
    }
    case 'byModel': {
      const rows: AnswerRow[] = result.byModel
        .filter((r) => r.medianDays !== null)
        .map((r) => ({ key: r.key, label: r.label, raw: r.medianDays as number, value: formatDays(r.medianDays as number) }));
      return finishBreakdown(question, rows);
    }
    default:
      return EMPTY_NOT_ENOUGH;
  }
}

export function isLeadStatus(value: string): value is LeadStatus {
  return ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered', 'lost'].includes(value);
}
