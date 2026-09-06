import type { EnrichedLead, LeadStatus } from '../../data/types';
import { STATUS_LABELS } from '../../data/transformations';
import { average, daysBetween, median } from './core';

const STAGE_TRANSITIONS: [LeadStatus, LeadStatus][] = [
  ['new', 'contacted'],
  ['contacted', 'test_drive'],
  ['test_drive', 'negotiation'],
  ['negotiation', 'order_placed'],
  ['order_placed', 'delivered'],
];

export interface VelocityStageRow {
  key: string;
  label: string;
  medianDays: number | null;
  averageDays: number | null;
  sampleSize: number;
}

/** Median (and average) days spent between each pair of consecutive funnel
 * stages, using each lead's own status_history timestamps — only leads that
 * actually recorded both timestamps contribute to a given stage's sample. */
export function calculateSalesVelocity(filteredLeads: EnrichedLead[]): VelocityStageRow[] {
  return STAGE_TRANSITIONS.map(([from, to]) => {
    const durations: number[] = [];
    for (const lead of filteredLeads) {
      const fromEntry = lead.status_history.find((h) => h.status === from);
      const toEntry = lead.status_history.find((h) => h.status === to);
      if (fromEntry && toEntry) {
        durations.push(daysBetween(fromEntry.timestamp, toEntry.timestamp));
      }
    }
    return {
      key: `${from}_${to}`,
      label: `${STATUS_LABELS[from]} → ${STATUS_LABELS[to]}`,
      medianDays: median(durations),
      averageDays: average(durations),
      sampleSize: durations.length,
    };
  });
}
