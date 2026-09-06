import { getLeads, getDateRange, getAnalyticsContext, getDatasetDateSpan, getMonthlyTrend, getRepRiskBreakdown } from './data.js';

/** The app's currency throughout (see src/data/format.ts) is INR, formatted
 * with Indian digit grouping — Gemini must echo the same convention back,
 * not a bare "$" figure with Western grouping. */
function inr(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

/**
 * Analyze a user's question to determine what data context is needed,
 * then retrieve and format that context for Gemini.
 *
 * This processor distinguishes between:
 * - DATA QUESTIONS: "How many leads last month?" → retrieve and calculate
 * - ADVISORY QUESTIONS: "How can we improve?" → retrieve context + reasoning
 *
 * Only send Gemini the minimum relevant data needed to answer.
 */
export async function buildAskAiContext(userMessage, conversationHistory, referenceNow) {
  const data = { referenceNow };

  // Detect question type and what period they're asking about
  const lowerMsg = userMessage.toLowerCase();

  // Date/period detection
  let period = null;
  if (lowerMsg.includes('last month')) period = 'last_month';
  else if (lowerMsg.includes('this month')) period = 'this_month';
  else if (lowerMsg.includes('last quarter')) period = 'last_quarter';
  else if (lowerMsg.includes('this quarter')) period = 'this_quarter';
  else if (lowerMsg.includes('last year')) period = 'last_year';
  else if (lowerMsg.includes('this year')) period = 'this_year';

  if (period) {
    const dateRange = getDateRange(period, referenceNow);
    data.period = period;
    data.dateRange = dateRange;
  } else {
    // No explicit period named in the question (e.g. "which rep performed best?").
    // Default to the full dataset rather than leaving the window unstated — Gemini
    // must always know what period its numbers cover.
    data.dateRange = getDatasetDateSpan();
  }

  // Detect if this is a data question or advisory question
  const isDataQuestion =
    lowerMsg.includes('how many') ||
    lowerMsg.includes('how much') ||
    lowerMsg.includes('total') ||
    lowerMsg.includes('conversion') ||
    lowerMsg.includes('revenue') ||
    lowerMsg.includes('leads') ||
    lowerMsg.includes('sales') ||
    lowerMsg.includes('best performing') ||
    lowerMsg.includes('worst performing') ||
    lowerMsg.includes('which') ||
    lowerMsg.includes('source') ||
    lowerMsg.includes('percentage') ||
    lowerMsg.includes('what was') ||
    lowerMsg.includes('what is our');

  data.isDataQuestion = isDataQuestion;

  // Detect questions about change over time ("why is X changing/falling/rising",
  // "what's the trend", "compared to last month") — these can't be answered from
  // a single period snapshot, so pull the month-by-month series instead.
  const isTrendQuestion =
    lowerMsg.includes('why') ||
    lowerMsg.includes('trend') ||
    lowerMsg.includes('chang') || // changing, changed, change
    lowerMsg.includes('increas') ||
    lowerMsg.includes('decreas') ||
    lowerMsg.includes('improv') ||
    lowerMsg.includes('worsen') ||
    lowerMsg.includes('declin') ||
    lowerMsg.includes('falling') ||
    lowerMsg.includes('fell') ||
    lowerMsg.includes('rising') ||
    lowerMsg.includes('rose') ||
    lowerMsg.includes('growing') ||
    lowerMsg.includes('compared to') ||
    lowerMsg.includes('over time') ||
    lowerMsg.includes('best-performing month') ||
    lowerMsg.includes('best performing month');

  data.isTrendQuestion = isTrendQuestion;
  if (isTrendQuestion) {
    data.monthlyTrend = getMonthlyTrend();
  }

  // Detect questions about stagnant/at-risk deals or rep workload — these need
  // the same risk/capacity breakdown the Actionable page's Rep Capacity and
  // Deals Requiring Attention sections use, not just leads/revenue/conversion.
  const isRiskQuestion =
    lowerMsg.includes('stagnant') ||
    lowerMsg.includes('stuck') ||
    lowerMsg.includes('at risk') ||
    lowerMsg.includes('high-value') ||
    lowerMsg.includes('high value') ||
    lowerMsg.includes('idle') ||
    lowerMsg.includes('inactive') ||
    lowerMsg.includes('overload') ||
    lowerMsg.includes('workload') ||
    lowerMsg.includes('capacity') ||
    lowerMsg.includes('bottleneck') ||
    lowerMsg.includes('follow up') ||
    lowerMsg.includes('follow-up') ||
    lowerMsg.includes('focus on');

  data.isRiskQuestion = isRiskQuestion;
  if (isRiskQuestion) {
    data.repRisk = getRepRiskBreakdown(getLeads(), referenceNow);
  }

  // Retrieve relevant leads — data.dateRange is always set by this point
  // (either the named period, or the full dataset span as a fallback).
  const leads = getLeads({
    afterDate: data.dateRange.start,
    beforeDate: data.dateRange.end,
  });

  // Always include analytics context
  data.analytics = getAnalyticsContext(leads);

  // For advisory questions, include the last message from the conversation
  // to maintain context
  if (!isDataQuestion && conversationHistory.length > 0) {
    const lastAssistantMessage = [...conversationHistory]
      .reverse()
      .find((m) => m.role === 'assistant');
    data.previousContext = lastAssistantMessage?.text || null;
  }

  return data;
}

/**
 * Format the data context into a clear, readable prompt for Gemini.
 * This tells Gemini what data we actually have so it can base answers on reality.
 */
export function formatContextForGemini(userQuestion, dataContext) {
  let contextStr = '';

  if (dataContext.dateRange) {
    contextStr += `\nDATA PERIOD: ${dataContext.dateRange.label}\n`;
  }

  // Always include the key metrics
  const a = dataContext.analytics;
  contextStr += `ACTUAL SALES DATA:
- Total leads: ${a.totalLeads}
- Delivered (won): ${a.deliveredCount}
- Lost: ${a.lostCount}
- Active pipeline: ${a.activePipelineValue ? inr(a.activePipelineValue) : 'N/A'}
- Delivered revenue: ${a.deliveredRevenue ? inr(a.deliveredRevenue) : 'N/A'}
- Conversion rate: ${a.conversionRate !== null ? a.conversionRate.toFixed(1) + '%' : 'N/A'}
- Loss rate: ${a.lossRate !== null ? a.lossRate.toFixed(1) + '%' : 'N/A'}`;

  // Add month-by-month trend if this is a "why is X changing" style question —
  // a single-period snapshot can't explain a trend, only a series can.
  if (dataContext.isTrendQuestion && dataContext.monthlyTrend?.length > 0) {
    contextStr += '\n\nMONTH-BY-MONTH TREND (entire dataset):';
    for (const m of dataContext.monthlyTrend) {
      contextStr += `\n- ${m.label}: ${m.totalLeads} leads, ${m.delivered} delivered, ${m.lost} lost, conversion rate ${m.conversionRate !== null ? m.conversionRate.toFixed(1) + '%' : 'N/A'}, revenue ${inr(m.revenue)}`;
    }
  }

  // Add per-rep stagnant-deal / workload breakdown for risk/capacity questions —
  // "stagnant" here means 15+ days without activity, same threshold the
  // Actionable page's Rep Capacity and Deals Requiring Attention sections use.
  if (dataContext.isRiskQuestion && dataContext.repRisk) {
    const repsWithStagnant = Object.entries(dataContext.repRisk)
      .filter(([, stats]) => stats.stagnantLeads > 0)
      .sort((a, b) => b[1].highValueStagnantLeads - a[1].highValueStagnantLeads || b[1].stagnantLeads - a[1].stagnantLeads)
      .slice(0, 8);
    if (repsWithStagnant.length > 0) {
      contextStr +=
        '\n\nREP WORKLOAD / STAGNANT DEALS (active leads with 15+ days of no activity; "high-value" = at or above the median active deal value):';
      for (const [rep, stats] of repsWithStagnant) {
        contextStr += `\n- ${rep} (${stats.branch}): ${stats.activeLeads} active leads, ${stats.stagnantLeads} stagnant, ${stats.highValueStagnantLeads} high-value stagnant, pipeline ${inr(stats.pipelineValue)}`;
      }
    } else {
      contextStr += '\n\nREP WORKLOAD / STAGNANT DEALS: No reps currently have stagnant (15+ day inactive) active deals.';
    }
  }

  // Add breakdown if data question
  if (dataContext.isDataQuestion) {
    // Breakdown by source
    if (Object.keys(dataContext.analytics.bySource).some((s) => dataContext.analytics.bySource[s].leads > 0)) {
      contextStr += '\n\nBY SOURCE:';
      for (const [source, stats] of Object.entries(dataContext.analytics.bySource)) {
        if (stats.leads > 0) {
          contextStr += `\n- ${source}: ${stats.leads} leads, ${stats.converted} converted (${stats.conversionRate ? stats.conversionRate.toFixed(1) : 'N/A'}%), ${inr(stats.revenue || 0)}`;
        }
      }
    }

    // Breakdown by branch
    if (Object.keys(dataContext.analytics.byBranch).some((b) => dataContext.analytics.byBranch[b].leads > 0)) {
      contextStr += '\n\nBY BRANCH:';
      for (const [branch, stats] of Object.entries(dataContext.analytics.byBranch)) {
        if (stats.leads > 0) {
          contextStr += `\n- ${branch}: ${stats.leads} leads, ${stats.converted} converted (${stats.conversionRate ? stats.conversionRate.toFixed(1) : 'N/A'}%), ${inr(stats.revenue || 0)}`;
        }
      }
    }

    // Breakdown by rep (top 5)
    const reps = Object.entries(dataContext.analytics.byRep)
      .filter(([, stats]) => stats.leads > 0)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5);
    if (reps.length > 0) {
      contextStr += '\n\nTOP SALES REPS:';
      for (const [rep, stats] of reps) {
        contextStr += `\n- ${rep}: ${stats.leads} leads, ${stats.converted} converted (${stats.conversionRate ? stats.conversionRate.toFixed(1) : 'N/A'}%), ${inr(stats.revenue || 0)}`;
      }
    }

    // Breakdown by status
    contextStr += '\n\nBY STATUS:';
    for (const [status, count] of Object.entries(dataContext.analytics.byStatus)) {
      if (count > 0) {
        contextStr += `\n- ${status}: ${count}`;
      }
    }
  }

  contextStr += '\n\nUSER QUESTION: ' + userQuestion;

  return contextStr;
}
