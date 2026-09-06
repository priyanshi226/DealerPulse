// The Charts page's info-button layer. This does NOT re-run any
// calculation — it only carries the static narrative (what/how/grain/date)
// plus whatever numbers the section already computed, so the info panel can
// never drift from what the chart itself shows.

export type ChartsFilterKey = 'branch' | 'salesRep' | 'source' | 'model' | 'status' | 'dateRange';

export interface ChartInfoValue {
  label: string;
  value: string;
}

export interface ChartInfo {
  title: string;
  chartType: string;
  description: string;
  formula: string;
  dataGrain: string;
  dateSemantics: string;
  relevantFilters: ChartsFilterKey[];
  recordsLabel?: string;
  recordsIncluded?: number;
  values?: ChartInfoValue[];
  interpretation?: string;
  caveat?: string;
}
