// The deterministic engine behind the Actionable page. Every number here is
// computed the same way the rest of the calculation layer works — pure
// functions over the filtered lead set, no fabrication, no LLM in the loop.
// "AI Executive Priorities" branding refers to how insights are presented,
// not to how they're computed: every insight below is a fixed, documented
// rule over real metrics, so it's reproducible and auditable.

import { SOURCE_LABELS, STATUS_LABELS } from '../../data/transformations';
import type { Delivery, EnrichedLead, LeadSource, LeadStatus } from '../../data/types';
import { MIN_SAMPLE_SIZE, STALE_THRESHOLD_DAYS, daysBetween, isActive, median, pct, sumBy } from './core';
import { calculateDimensionPerformance } from './dimensionPerformance';

// ---------- Executive Priorities / Bottlenecks ----------

export type InsightSeverity = 'critical' | 'warning' | 'opportunity';
export type InsightCategory = 'risk' | 'conversion' | 'pipeline' | 'capacity' | 'opportunity' | 'concentration';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  category: InsightCategory;
  icon: string;
  title: string;
  explanation: string;
  metricLabel: string;
  metricValue: string;
  /** Estimated revenue at stake / opportunity size, when the insight is monetizable. */
  financialImpact: number | null;
  recommendedAction: string;
  entityType: 'branch' | 'rep' | 'source' | 'model' | 'company';
  entityId: string | null;
  entityLabel: string;
}

/** A branch/source needs at least this many leads before its rate is treated
 * as a meaningful signal — same floor the rest of the app uses (MIN_SAMPLE_SIZE),
 * but insights additionally require a full app-wide sample for stability. */
const MIN_SAMPLE_FOR_INSIGHT = MIN_SAMPLE_SIZE;

/** A branch is flagged once its conversion rate trails the company average by
 * at least this many percentage points — big enough to be a real signal, not noise. */
const CONVERSION_GAP_THRESHOLD_PTS = 10;

/** A rep is flagged as a capacity risk once their active-lead count exceeds
 * the company's average active load per rep by this multiple. */
const CAPACITY_RISK_MULTIPLE = 1.6;

/** Leads sitting in Test Drive/Negotiation are "mid-funnel stuck" once this
 * share of all active leads is concentrated there. */
const MID_FUNNEL_CONCENTRATION_THRESHOLD_PCT = 35;

/** A model is a concentration risk once it holds this much of active pipeline value. */
const MODEL_CONCENTRATION_THRESHOLD_PCT = 35;

function fmtCr(value: number): string {
  return `₹${(value / 1_00_00_000).toFixed(2)} Cr`;
}

export function calculateInsights(
  filteredLeads: EnrichedLead[],
  filteredDeliveries: Delivery[],
  referenceNowIso: string,
): Insight[] {
  const insights: Insight[] = [];
  const active = filteredLeads.filter(isActive);

  // 1. HIGH RISK — value tied up in stagnant (stale) active deals.
  const stagnant = active.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS);
  const stagnantValue = sumBy(stagnant, (l) => l.deal_value);
  if (stagnant.length > 0) {
    insights.push({
      id: 'risk-stagnant-value',
      severity: stagnantValue >= 1_00_00_000 ? 'critical' : 'warning',
      category: 'risk',
      icon: '🚨',
      title: 'Deals going quiet',
      explanation: `${fmtCr(stagnantValue)} is sitting in ${stagnant.length} deal${stagnant.length === 1 ? '' : 's'} that ${stagnant.length === 1 ? "hasn't" : "haven't"} been touched in ${STALE_THRESHOLD_DAYS}+ days.`,
      metricLabel: 'Money tied up',
      metricValue: fmtCr(stagnantValue),
      financialImpact: stagnantValue,
      recommendedAction: 'Start with the highest-value deals below — a quick check-in now could save them.',
      entityType: 'company',
      entityId: null,
      entityLabel: 'All branches',
    });
  }

  // 2. CONVERSION ISSUE — a branch trailing the company average.
  const companyConversion = pct(filteredLeads.filter((l) => l.status === 'delivered').length, filteredLeads.length);
  const byBranch = calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'branch', referenceNowIso);
  if (companyConversion !== null) {
    const worstBranch = byBranch
      .filter((b) => b.leadCount >= MIN_SAMPLE_FOR_INSIGHT && b.conversionPct !== null)
      .sort((a, b) => (a.conversionPct ?? 0) - (b.conversionPct ?? 0))[0];
    if (worstBranch && companyConversion - (worstBranch.conversionPct ?? 0) >= CONVERSION_GAP_THRESHOLD_PTS) {
      const branchName = worstBranch.label.split(' — ')[1] ?? worstBranch.label;
      insights.push({
        id: 'conversion-branch-gap',
        severity: 'warning',
        category: 'conversion',
        icon: '⚠️',
        title: `${branchName} is converting fewer leads than it should`,
        explanation: `Only ${worstBranch.conversionPct!.toFixed(1)}% of ${branchName}'s leads turn into sales, versus ${companyConversion.toFixed(1)}% company-wide — that's a real gap, not noise.`,
        metricLabel: 'Behind the company average by',
        metricValue: `${(companyConversion - worstBranch.conversionPct!).toFixed(1)} pts`,
        financialImpact: null,
        recommendedAction: `See how ${branchName} handles and follows up on leads, and compare it with your best branch.`,
        entityType: 'branch',
        entityId: worstBranch.key,
        entityLabel: branchName,
      });
    }
  }

  // 3. PIPELINE ISSUE — mid-funnel concentration (Test Drive + Negotiation).
  const midFunnel = active.filter((l) => l.status === 'test_drive' || l.status === 'negotiation');
  const midFunnelPct = pct(midFunnel.length, active.length);
  if (midFunnelPct !== null && midFunnelPct >= MID_FUNNEL_CONCENTRATION_THRESHOLD_PCT) {
    insights.push({
      id: 'pipeline-midfunnel-stuck',
      severity: 'warning',
      category: 'pipeline',
      icon: '📉',
      title: 'Too many deals stuck mid-pipeline',
      explanation: `${midFunnelPct.toFixed(0)}% of your active deals (${fmtCr(sumBy(midFunnel, (l) => l.deal_value))} worth) are stuck between the test drive and negotiation stages — that's where deals tend to lose momentum.`,
      metricLabel: 'Share of active pipeline',
      metricValue: `${midFunnelPct.toFixed(0)}%`,
      financialImpact: sumBy(midFunnel, (l) => l.deal_value),
      recommendedAction: 'Give reps room to negotiate on price and give them better answers to common objections.',
      entityType: 'company',
      entityId: null,
      entityLabel: 'All branches',
    });
  }

  // 4. CAPACITY RISK — a rep carrying disproportionately more active leads than peers.
  const byRep = calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'rep', referenceNowIso);
  const repsWithLoad = byRep.filter((r) => r.leadCount > 0);
  if (repsWithLoad.length >= 2) {
    const activeByRepKey = new Map<string, number>();
    for (const lead of active) {
      activeByRepKey.set(lead.assigned_to, (activeByRepKey.get(lead.assigned_to) ?? 0) + 1);
    }
    const avgActive = sumBy([...activeByRepKey.values()], (v) => v) / repsWithLoad.length;
    let worstRep: { key: string; label: string; count: number } | null = null;
    for (const [repId, count] of activeByRepKey) {
      if (count >= avgActive * CAPACITY_RISK_MULTIPLE && count >= 8 && (!worstRep || count > worstRep.count)) {
        const row = byRep.find((r) => r.key === repId);
        worstRep = { key: repId, label: row?.label.split(' — ')[1] ?? repId, count };
      }
    }
    if (worstRep && avgActive > 0) {
      const pctAboveAvg = Math.round((worstRep.count / avgActive - 1) * 100);
      insights.push({
        id: 'capacity-rep-overload',
        severity: 'warning',
        category: 'capacity',
        icon: '👤',
        title: `${worstRep.label} may have too much on their plate`,
        explanation: `${worstRep.label} is handling ${worstRep.count} active leads — ${pctAboveAvg}% more than the typical rep (${avgActive.toFixed(1)}). Leads can slip through the cracks at that load.`,
        metricLabel: 'Active leads',
        metricValue: `${worstRep.count} (avg ${avgActive.toFixed(1)})`,
        financialImpact: null,
        recommendedAction: 'Consider moving some newer leads to a rep with more room on their plate.',
        entityType: 'rep',
        entityId: worstRep.key,
        entityLabel: worstRep.label,
      });
    }
  }

  // 5. OPPORTUNITY — the lowest-converting source, sized against the company average.
  const bySource = calculateDimensionPerformance(filteredLeads, filteredDeliveries, 'source', referenceNowIso);
  const companyAvgDealValue = (() => {
    const delivered = filteredLeads.filter((l) => l.status === 'delivered');
    return delivered.length > 0 ? sumBy(delivered, (l) => l.deal_value) / delivered.length : null;
  })();
  if (companyConversion !== null && companyAvgDealValue !== null) {
    const worstSource = bySource
      .filter((s) => s.leadCount >= MIN_SAMPLE_FOR_INSIGHT && s.conversionPct !== null && s.conversionPct < companyConversion)
      .sort((a, b) => (a.conversionPct ?? 0) - (b.conversionPct ?? 0))[0];
    if (worstSource) {
      const gapPts = companyConversion - worstSource.conversionPct!;
      const opportunityRevenue = (gapPts / 100) * worstSource.leadCount * companyAvgDealValue;
      const sourceLabel = SOURCE_LABELS[worstSource.key as keyof typeof SOURCE_LABELS] ?? worstSource.label;
      if (opportunityRevenue >= 1_00_000) {
        insights.push({
          id: 'opportunity-source-conversion',
          severity: 'opportunity',
          category: 'opportunity',
          icon: '🎯',
          title: `${sourceLabel} leads are under-converting`,
          explanation: `${sourceLabel} only converts ${worstSource.conversionPct!.toFixed(1)}% of its leads, against a ${companyConversion.toFixed(1)}% average. Get it to match the average and you'd likely add about ${fmtCr(opportunityRevenue)} in revenue.`,
          metricLabel: "What you're leaving on the table",
          metricValue: fmtCr(opportunityRevenue),
          financialImpact: opportunityRevenue,
          recommendedAction: `Find out why ${sourceLabel} leads aren't converting — is it lead quality, slow follow-up, or how they're being qualified?`,
          entityType: 'source',
          entityId: worstSource.key,
          entityLabel: sourceLabel,
        });
      }
    }
  }

  // 6. CONCENTRATION RISK — pipeline value concentrated in a single model.
  const activePipelineTotal = sumBy(active, (l) => l.deal_value);
  if (activePipelineTotal > 0) {
    const byModel = new Map<string, number>();
    for (const lead of active) byModel.set(lead.model_interested, (byModel.get(lead.model_interested) ?? 0) + lead.deal_value);
    const [topModel, topModelValue] = [...byModel.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const concentrationPct = pct(topModelValue, activePipelineTotal);
    if (topModel && concentrationPct !== null && concentrationPct >= MODEL_CONCENTRATION_THRESHOLD_PCT) {
      insights.push({
        id: 'concentration-model-risk',
        severity: 'warning',
        category: 'concentration',
        icon: '📦',
        title: `You're leaning heavily on ${topModel}`,
        explanation: `${concentrationPct.toFixed(0)}% of your active pipeline (${fmtCr(topModelValue)}) is riding on ${topModel} alone. If demand or stock for it dips, a big chunk of your pipeline goes with it.`,
        metricLabel: 'Share of active pipeline',
        metricValue: `${concentrationPct.toFixed(0)}%`,
        financialImpact: topModelValue,
        recommendedAction: `Point some lead generation and rep attention toward other models so you're not overly reliant on one.`,
        entityType: 'model',
        entityId: topModel,
        entityLabel: topModel,
      });
    }
  }

  const severityRank: Record<InsightSeverity, number> = { critical: 0, warning: 1, opportunity: 2 };
  return insights.sort((a, b) => {
    const rankDiff = severityRank[a.severity] - severityRank[b.severity];
    if (rankDiff !== 0) return rankDiff;
    return (b.financialImpact ?? 0) - (a.financialImpact ?? 0);
  });
}

// ---------- Deal-level risk & Next Best Actions ----------

export type DealRiskLevel = 'high' | 'medium';

export interface DealRiskRow {
  leadId: string;
  customerName: string;
  model: string;
  source: LeadSource;
  dealValue: number;
  stage: LeadStatus;
  stageLabel: string;
  repId: string;
  repName: string;
  branchId: string;
  branchName: string;
  daysSinceActivity: number;
  isOverdue: boolean;
  risk: DealRiskLevel;
  reason: string;
  recommendedAction: string;
}

/** Deals above this deal value are treated as "high value" for risk/action
 * purposes — the median deal value among currently active deals, recomputed
 * per filtered slice rather than a fixed rupee figure. */
function highValueThreshold(active: EnrichedLead[]): number {
  return median(active.map((l) => l.deal_value)) ?? 0;
}

export function calculateDealRisk(filteredLeads: EnrichedLead[], referenceNowIso: string): DealRiskRow[] {
  const active = filteredLeads.filter(isActive);
  const valueThreshold = highValueThreshold(active);
  const now = new Date(referenceNowIso).getTime();

  const rows: DealRiskRow[] = [];

  for (const lead of active) {
    const days = daysBetween(lead.last_activity_at, referenceNowIso);
    const isOverdue = new Date(lead.expected_close_date).getTime() < now;
    const isHighValue = lead.deal_value >= valueThreshold;

    let risk: DealRiskLevel | null = null;
    if (days >= STALE_THRESHOLD_DAYS || (isOverdue && days >= 7)) risk = 'high';
    else if (days >= 7 || isOverdue) risk = 'medium';

    if (!risk) continue; // healthy deal — not "requiring attention"

    let reason: string;
    let recommendedAction: string;

    if (days >= STALE_THRESHOLD_DAYS && isHighValue) {
      reason = `A high-value deal that's gone quiet for ${Math.floor(days)} days`;
      recommendedAction = `Worth a manager's attention — this is a big deal that's been silent for ${Math.floor(days)} days.`;
      risk = 'high';
    } else if (lead.status === 'negotiation' && (days >= 7 || isOverdue)) {
      reason = isOverdue ? "Stuck in negotiation, past the expected close date" : `Stuck in negotiation for ${Math.floor(days)} days`;
      recommendedAction = 'Revisit the price or offer — something is holding this deal back from closing.';
    } else if ((lead.status === 'new' || lead.status === 'contacted') && days >= 7) {
      reason = `Nobody has followed up in ${Math.floor(days)} days`;
      recommendedAction = "Call the customer today — it's been too long since the last contact.";
    } else if (days >= 30) {
      reason = `Gone quiet for ${Math.floor(days)} days`;
      recommendedAction = "Move this to nurture — it's likely cooled off for now.";
    } else if (isOverdue) {
      reason = 'The expected close date has already passed';
      recommendedAction = 'Check in with the customer — the expected close date has come and gone.';
    } else if (lead.status === 'test_drive') {
      reason = `No follow-up in the ${Math.floor(days)} days since the test drive`;
      recommendedAction = 'Send a model comparison to keep the momentum going after the test drive.';
    } else {
      reason = `Gone quiet for ${Math.floor(days)} days`;
      recommendedAction = 'Check in with the customer.';
    }

    rows.push({
      leadId: lead.id,
      customerName: lead.customer_name,
      model: lead.model_interested,
      source: lead.source,
      dealValue: lead.deal_value,
      stage: lead.status,
      stageLabel: STATUS_LABELS[lead.status],
      repId: lead.assigned_to,
      repName: lead.repName,
      branchId: lead.branch_id,
      branchName: lead.branchName,
      daysSinceActivity: Math.floor(days),
      isOverdue,
      risk,
      reason,
      recommendedAction,
    });
  }

  return rows.sort((a, b) => {
    if (a.risk !== b.risk) return a.risk === 'high' ? -1 : 1;
    return b.dealValue - a.dealValue;
  });
}

// ---------- Rep Capacity ----------

export type RepCapacityLevel = 'overloaded' | 'attention' | 'healthy';

export interface RepCapacityRow {
  repId: string;
  repName: string;
  branchName: string;
  activeLeads: number;
  stagnantLeads: number;
  pipelineValue: number;
  avgDealValue: number | null;
  conversionPct: number | null;
  level: RepCapacityLevel;
}

export function calculateRepCapacity(filteredLeads: EnrichedLead[], referenceNowIso: string): RepCapacityRow[] {
  const byRepId = new Map<string, EnrichedLead[]>();
  for (const lead of filteredLeads) {
    const bucket = byRepId.get(lead.assigned_to);
    if (bucket) bucket.push(lead);
    else byRepId.set(lead.assigned_to, [lead]);
  }

  const activeCounts = [...byRepId.entries()].map(([, leads]) => leads.filter(isActive).length);
  const avgActive = activeCounts.length > 0 ? activeCounts.reduce((s, v) => s + v, 0) / activeCounts.length : 0;

  const rows: RepCapacityRow[] = [];
  for (const [repId, leads] of byRepId) {
    const active = leads.filter(isActive);
    const stagnant = active.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS);
    const delivered = leads.filter((l) => l.status === 'delivered');
    const revenue = sumBy(delivered, (l) => l.deal_value);

    let level: RepCapacityLevel = 'healthy';
    if (active.length >= avgActive * CAPACITY_RISK_MULTIPLE && active.length >= 8) level = 'overloaded';
    else if (stagnant.length >= 3 || (active.length > avgActive && stagnant.length > 0)) level = 'attention';

    rows.push({
      repId,
      repName: leads[0].repName,
      branchName: leads[0].branchName,
      activeLeads: active.length,
      stagnantLeads: stagnant.length,
      pipelineValue: sumBy(active, (l) => l.deal_value),
      avgDealValue: delivered.length > 0 ? revenue / delivered.length : null,
      conversionPct: pct(delivered.length, leads.length),
      level,
    });
  }

  const levelRank: Record<RepCapacityLevel, number> = { overloaded: 0, attention: 1, healthy: 2 };
  return rows.sort((a, b) => {
    const rankDiff = levelRank[a.level] - levelRank[b.level];
    if (rankDiff !== 0) return rankDiff;
    return b.activeLeads - a.activeLeads;
  });
}
