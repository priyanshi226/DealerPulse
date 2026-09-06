import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Load dealership data from the JSON file.
 * This is called once and cached, so the backend never re-parses it on every request.
 */
let cachedData = null;

export function loadDealershipData() {
  if (cachedData) return cachedData;

  const dataPath = path.join(__dirname, '../dealership_data.json');
  try {
    const content = fs.readFileSync(dataPath, 'utf-8');
    cachedData = JSON.parse(content);
  } catch (err) {
    throw new Error(`Failed to load dealership data: ${err.message}`);
  }

  // Build lookup maps
  cachedData._branchById = new Map(cachedData.branches.map((b) => [b.id, b]));
  cachedData._repById = new Map(cachedData.sales_reps.map((r) => [r.id, r]));
  cachedData._deliveryByLeadId = new Map(cachedData.deliveries.map((d) => [d.lead_id, d]));

  // Calculate the reference "now" time from the latest lead activity in the dataset
  // This ensures date calculations (last month, etc.) are anchored to the data's timeline, not today
  if (cachedData.leads && cachedData.leads.length > 0) {
    const latestActivity = cachedData.leads.reduce((max, l) => {
      return l.last_activity_at > max ? l.last_activity_at : max;
    }, cachedData.leads[0].last_activity_at);
    cachedData._referenceNow = latestActivity;
  } else {
    cachedData._referenceNow = new Date().toISOString();
  }

  return cachedData;
}

/**
 * Get the reference "now" time from the dataset (latest lead activity).
 * This is used for date calculations in questions like "last month" or "this quarter".
 */
export function getReferenceNow() {
  const data = loadDealershipData();
  return data._referenceNow;
}

/**
 * Get the full date span the dataset actually covers (earliest to latest lead
 * creation date). Used so a question with no explicit period ("which rep
 * performed best?") can still tell Gemini what window "all data" means,
 * rather than leaving the period unstated.
 */
export function getDatasetDateSpan() {
  const data = loadDealershipData();
  if (!data._dateSpan) {
    let earliest = data.leads[0]?.created_at;
    let latest = data.leads[0]?.created_at;
    for (const lead of data.leads) {
      if (lead.created_at < earliest) earliest = lead.created_at;
      if (lead.created_at > latest) latest = lead.created_at;
    }
    const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    data._dateSpan = {
      start: earliest,
      end: latest,
      label: earliest && latest ? `${fmt(earliest)} to ${fmt(latest)} (entire dataset)` : 'entire dataset',
    };
  }
  return data._dateSpan;
}

/**
 * Get all leads, optionally filtered by status or date range.
 */
export function getLeads(filters = {}) {
  const data = loadDealershipData();
  let leads = data.leads;

  if (filters.status) {
    leads = leads.filter((l) => l.status === filters.status);
  }

  if (filters.statusIn) {
    leads = leads.filter((l) => filters.statusIn.includes(l.status));
  }

  if (filters.afterDate) {
    leads = leads.filter((l) => l.created_at >= filters.afterDate);
  }

  if (filters.beforeDate) {
    leads = leads.filter((l) => l.created_at <= filters.beforeDate);
  }

  if (filters.source) {
    leads = leads.filter((l) => l.source === filters.source);
  }

  if (filters.branchId) {
    leads = leads.filter((l) => l.branch_id === filters.branchId);
  }

  if (filters.repId) {
    leads = leads.filter((l) => l.assigned_to === filters.repId);
  }

  return leads;
}

/**
 * Helper to get month boundaries from a date.
 */
export function getMonthBoundaries(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = date.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
  };
}

/**
 * Get date ranges for relative periods.
 */
export function getDateRange(period, referenceNow) {
  const ref = new Date(referenceNow);
  const year = ref.getFullYear();
  const month = ref.getMonth();

  switch (period) {
    case 'last_month': {
      const lastMonthDate = new Date(year, month - 1, 1);
      return getMonthBoundaries(lastMonthDate.toISOString());
    }
    case 'this_month':
      return getMonthBoundaries(referenceNow);
    case 'last_quarter': {
      const quarterMonth = Math.floor((month - 3) / 3) * 3;
      const start = new Date(year, quarterMonth, 1);
      const end = new Date(year, quarterMonth + 3, 0, 23, 59, 59);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `Q${Math.floor(quarterMonth / 3)} ${year}`,
      };
    }
    case 'this_quarter': {
      const quarterMonth = Math.floor(month / 3) * 3;
      const start = new Date(year, quarterMonth, 1);
      const end = new Date(year, quarterMonth + 3, 0, 23, 59, 59);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `Q${Math.floor(quarterMonth / 3) + 1} ${year}`,
      };
    }
    case 'last_year': {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31, 23, 59, 59);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${year - 1}`,
      };
    }
    case 'this_year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31, 23, 59, 59);
      return {
        start: start.toISOString(),
        end: end.toISOString(),
        label: `${year}`,
      };
    }
    default:
      return null;
  }
}

/**
 * Calculate conversion rate safely (returns null if denominator is 0).
 */
export function calculateConversionRate(delivered, total) {
  if (total === 0) return null;
  return (delivered / total) * 100;
}

/**
 * Month-by-month breakdown across the whole dataset — leads, conversions,
 * revenue, conversion rate per month. This is what lets "why is our
 * conversion rate changing?" be answered from real numbers instead of a
 * single-period snapshot: the model needs the trend, not just one point.
 */
export function getMonthlyTrend() {
  const data = loadDealershipData();
  const byMonth = new Map();

  for (const lead of data.leads) {
    const monthKey = lead.created_at.slice(0, 7); // "2025-08"
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, { leads: [] });
    }
    byMonth.get(monthKey).leads.push(lead);
  }

  const months = [...byMonth.keys()].sort();

  return months.map((monthKey) => {
    const monthLeads = byMonth.get(monthKey).leads;
    const delivered = monthLeads.filter((l) => l.status === 'delivered');
    const lost = monthLeads.filter((l) => l.status === 'lost');
    const revenue = delivered.reduce((sum, l) => sum + (l.deal_value || 0), 0);
    const label = new Date(`${monthKey}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    return {
      month: monthKey,
      label,
      totalLeads: monthLeads.length,
      delivered: delivered.length,
      lost: lost.length,
      revenue,
      conversionRate: calculateConversionRate(delivered.length, monthLeads.length),
    };
  });
}

const ACTIVE_STATUSES = ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed'];
/** A lead counts as "stale"/stagnant once it's gone this many days without
 * activity — mirrors STALE_THRESHOLD_DAYS in src/analytics/calculations/core.ts,
 * so the backend's risk numbers agree with the frontend Actionable page. */
const STALE_THRESHOLD_DAYS = 15;

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function daysSince(iso, referenceNowIso) {
  return (new Date(referenceNowIso).getTime() - new Date(iso).getTime()) / 86_400_000;
}

/**
 * Per-rep risk/workload breakdown — active-lead volume, stagnant deals (no
 * activity in 15+ days), and how many of those stagnant deals are high-value
 * (above the median active deal value). This is what lets Ask AI answer
 * "which rep has the most high-value stagnant deals?" — the same question
 * the Actionable page's Rep Capacity section answers, from the same rule.
 */
export function getRepRiskBreakdown(leads, referenceNowIso) {
  const data = loadDealershipData();
  const active = leads.filter((l) => ACTIVE_STATUSES.includes(l.status));
  const highValueThreshold = median(active.map((l) => l.deal_value || 0)) ?? 0;

  const byRep = {};
  for (const rep of data.sales_reps) {
    const repActive = active.filter((l) => l.assigned_to === rep.id);
    const stagnant = repActive.filter((l) => daysSince(l.last_activity_at, referenceNowIso) >= STALE_THRESHOLD_DAYS);
    const highValueStagnant = stagnant.filter((l) => (l.deal_value || 0) >= highValueThreshold);
    if (repActive.length === 0) continue;
    byRep[rep.name] = {
      branch: data._branchById.get(rep.branch_id)?.name ?? rep.branch_id,
      activeLeads: repActive.length,
      stagnantLeads: stagnant.length,
      highValueStagnantLeads: highValueStagnant.length,
      pipelineValue: repActive.reduce((sum, l) => sum + (l.deal_value || 0), 0),
    };
  }
  return byRep;
}

/**
 * Extract analytics context from leads based on common questions.
 * This runs the same calculations the dashboard uses.
 */
export function getAnalyticsContext(leads) {
  const data = loadDealershipData();

  // Basic counts
  const totalLeads = leads.length;
  const deliveredLeads = leads.filter((l) => l.status === 'delivered');
  const deliveredCount = deliveredLeads.length;
  const deliveredRevenue = deliveredLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);
  const lostLeads = leads.filter((l) => l.status === 'lost');
  const lostCount = lostLeads.length;
  const activeLeads = leads.filter((l) => ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed'].includes(l.status));
  const activePipelineValue = activeLeads.reduce((sum, l) => sum + (l.deal_value || 0), 0);

  // Rates
  const conversionRate = calculateConversionRate(deliveredCount, totalLeads);
  const lossRate = calculateConversionRate(lostCount, totalLeads);

  // By source
  const bySource = {};
  for (const source of ['website', 'walk_in', 'referral', 'phone_enquiry', 'social_media', 'auto_expo']) {
    const sourceLeads = leads.filter((l) => l.source === source);
    const sourceDelivered = sourceLeads.filter((l) => l.status === 'delivered');
    const sourceRevenue = sourceDelivered.reduce((sum, l) => sum + (l.deal_value || 0), 0);
    bySource[source] = {
      leads: sourceLeads.length,
      converted: sourceDelivered.length,
      revenue: sourceRevenue,
      conversionRate: calculateConversionRate(sourceDelivered.length, sourceLeads.length),
    };
  }

  // By branch
  const byBranch = {};
  for (const branch of data.branches) {
    const branchLeads = leads.filter((l) => l.branch_id === branch.id);
    const branchDelivered = branchLeads.filter((l) => l.status === 'delivered');
    const branchRevenue = branchDelivered.reduce((sum, l) => sum + (l.deal_value || 0), 0);
    byBranch[branch.name] = {
      leads: branchLeads.length,
      converted: branchDelivered.length,
      revenue: branchRevenue,
      conversionRate: calculateConversionRate(branchDelivered.length, branchLeads.length),
    };
  }

  // By sales rep
  const byRep = {};
  for (const rep of data.sales_reps) {
    const repLeads = leads.filter((l) => l.assigned_to === rep.id);
    const repDelivered = repLeads.filter((l) => l.status === 'delivered');
    const repRevenue = repDelivered.reduce((sum, l) => sum + (l.deal_value || 0), 0);
    byRep[rep.name] = {
      leads: repLeads.length,
      converted: repDelivered.length,
      revenue: repRevenue,
      conversionRate: calculateConversionRate(repDelivered.length, repLeads.length),
    };
  }

  // By status
  const byStatus = {};
  for (const status of ['new', 'contacted', 'test_drive', 'negotiation', 'order_placed', 'delivered', 'lost']) {
    byStatus[status] = leads.filter((l) => l.status === status).length;
  }

  // By model
  const byModel = {};
  for (const lead of leads) {
    if (!byModel[lead.model_interested]) {
      byModel[lead.model_interested] = { leads: 0, converted: 0, revenue: 0 };
    }
    byModel[lead.model_interested].leads += 1;
    if (lead.status === 'delivered') {
      byModel[lead.model_interested].converted += 1;
      byModel[lead.model_interested].revenue += lead.deal_value || 0;
    }
  }

  return {
    totalLeads,
    deliveredCount,
    deliveredRevenue,
    lostCount,
    activePipelineValue,
    conversionRate,
    lossRate,
    bySource,
    byBranch,
    byRep,
    byStatus,
    byModel,
  };
}
