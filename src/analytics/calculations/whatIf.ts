// A deterministic "what if" projection engine — every number here is
// arithmetic over the same filtered real data every other section uses.
// Gemini is never involved in computing these figures; if this is ever
// narrated by AI, the AI explains a number that was already calculated here,
// it does not invent one. Projections, not guarantees — the UI says so.

import type { EnrichedLead } from '../../data/types';
import { STALE_THRESHOLD_DAYS, daysBetween, isActive, pct, sumBy } from './core';

export interface WhatIfBaseline {
  totalLeads: number;
  deliveredCount: number;
  deliveredRevenue: number;
  conversionPct: number | null;
  avgDealValue: number | null;
  stagnantCount: number;
  stagnantValue: number;
}

export function calculateWhatIfBaseline(filteredLeads: EnrichedLead[], referenceNowIso: string): WhatIfBaseline {
  const delivered = filteredLeads.filter((l) => l.status === 'delivered');
  const deliveredRevenue = sumBy(delivered, (l) => l.deal_value);
  const active = filteredLeads.filter(isActive);
  const stagnant = active.filter((l) => daysBetween(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS);

  return {
    totalLeads: filteredLeads.length,
    deliveredCount: delivered.length,
    deliveredRevenue,
    conversionPct: pct(delivered.length, filteredLeads.length),
    avgDealValue: delivered.length > 0 ? deliveredRevenue / delivered.length : null,
    stagnantCount: stagnant.length,
    stagnantValue: sumBy(stagnant, (l) => l.deal_value),
  };
}

export type WhatIfLever = 'conversion' | 'reactivate' | 'dealValue';

export interface WhatIfResult {
  currentValue: string;
  scenarioValue: string;
  additionalRevenue: number;
  additionalUnits: number | null;
  note: string;
}

/** Each lever's amount is a natural, bounded quantity the UI exposes as a
 * slider: conversion = extra percentage points, reactivate = number of
 * stagnant deals to assume are saved, dealValue = a percentage uplift. */
export function calculateWhatIf(baseline: WhatIfBaseline, lever: WhatIfLever, amount: number): WhatIfResult | null {
  if (lever === 'conversion') {
    if (baseline.conversionPct === null || baseline.avgDealValue === null || baseline.totalLeads === 0) return null;
    const newConversionPct = Math.min(100, baseline.conversionPct + amount);
    const additionalUnits = Math.round((baseline.totalLeads * (newConversionPct - baseline.conversionPct)) / 100);
    const additionalRevenue = additionalUnits * baseline.avgDealValue;
    return {
      currentValue: `${baseline.conversionPct.toFixed(1)}%`,
      scenarioValue: `${newConversionPct.toFixed(1)}%`,
      additionalRevenue,
      additionalUnits,
      note: `Assumes the extra ${additionalUnits} deals close at your current average deal value.`,
    };
  }

  if (lever === 'reactivate') {
    if (baseline.conversionPct === null || baseline.avgDealValue === null) return null;
    const dealsReactivated = Math.min(amount, baseline.stagnantCount);
    const additionalUnits = Math.round((dealsReactivated * baseline.conversionPct) / 100);
    const additionalRevenue = additionalUnits * baseline.avgDealValue;
    return {
      currentValue: `${baseline.stagnantCount} deals gone quiet`,
      scenarioValue: `${dealsReactivated} re-engaged`,
      additionalRevenue,
      additionalUnits,
      note: `Assumes re-engaged deals convert at your current ${baseline.conversionPct.toFixed(1)}% rate, same as any other lead.`,
    };
  }

  // dealValue
  if (baseline.avgDealValue === null) return null;
  const newAvgDealValue = baseline.avgDealValue * (1 + amount / 100);
  const additionalRevenue = baseline.deliveredRevenue * (amount / 100);
  return {
    currentValue: `${Math.round(baseline.avgDealValue).toLocaleString('en-IN')}`,
    scenarioValue: `${Math.round(newAvgDealValue).toLocaleString('en-IN')}`,
    additionalRevenue,
    additionalUnits: null,
    note: `Applies the uplift to your delivered revenue for this filter — the same deals, sold for more.`,
  };
}
