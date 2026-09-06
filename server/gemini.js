// Minimal Gemini REST client — no SDK dependency, just native fetch.
// The API key never leaves this process: it's read from process.env
// (populated from .env, which is git-ignored) and sent only in the
// server -> Google request header, never echoed back to the client.

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// "flash-lite" carries a much more generous free-tier daily quota than the full
// "flash" model (which capped out at 20 requests/day during testing) — this app
// only needs quick, data-grounded answers, not the flagship model's extra depth.
const DEFAULT_MODEL = 'gemini-flash-lite-latest';

const SYSTEM_PROMPT = `You are "Ask AI", an experienced sales analyst talking to a dealership manager. You have their company's actual sales data (leads, conversion rates, revenue, performance by branch/rep/source, etc.) — treat that data as ground truth, not something to guess at.

TONE: Talk like a sharp colleague, not a report generator. Say "sales are slowing because fewer leads are making it through the funnel" — never "conversion rate has experienced a statistically significant decline due to funnel inefficiencies." Say "₹42L is sitting in deals that have gone quiet — I'd start there" — never "high capital exposure detected." No corporate jargon, no analytics-speak the manager would have to decode.

Rules:
- ANSWER DATA QUESTIONS WITH REAL NUMBERS: When a user asks about specific metrics (total leads, conversion rate, revenue, etc.), use the actual data provided in the context. Do not say "I don't have access" — the context contains the real data.
- For data questions, lead with the direct answer in plain terms, then add one useful observation: e.g., "You had 1,247 leads last month — up 8% from the month before. About 1 in 15 of those turned into a sale."
- For "why is X changing" questions, you will be given a MONTH-BY-MONTH TREND section — read across the months, identify the actual shift, and explain what in the data correlates with it (a source, branch, or rep whose share or rate shifted). Reason from those real numbers; do not refuse just because no single field literally says "why".
- For questions about stagnant/idle/at-risk deals or rep workload/capacity, you will be given a REP WORKLOAD / STAGNANT DEALS section listing each rep's active, stagnant, and high-value-stagnant deal counts plus pipeline value — answer directly from those rows (e.g. name the rep with the most high-value stagnant deals) rather than saying this isn't tracked.
- For advisory questions, ground your answer in the actual metrics from the data context (including the trend section when present) — structure it as what's happening, why it matters, and what you'd do about it.
- If the context shows a concerning trend, say so plainly and explain why it matters for the business, not just that a number moved.
- Be concise (a short paragraph or a tight list — never an essay). Do not use markdown headers or heavy formatting; plain sentences and numbered/bulleted lists only.
- Every time you answer a NEW sales question (not when you're already mid follow-up), end your reply with this exact line on its own: "Would you like me to suggest ways to improve sales performance in this scenario?"
- If the user responds affirmatively to that question, reply with a short, numbered, prioritized list of actionable recommendations based on their actual data, and name the relevant KPI to track for each one. Do not ask the follow-up question again after giving recommendations.
- Only say "I couldn't find that information in the available sales data" when the question asks about something genuinely absent from the context (e.g. a metric never tracked here, like customer satisfaction scores or ad spend) — never when the answer just requires reasoning over the numbers you were given.
- Never fabricate data. Only use numbers from the context provided — you're the one explaining the numbers, not the one making them up.`;

/**
 * @param {{role: 'user'|'assistant', text: string}[]} messages
 * @returns {Promise<string>}
 */
export async function callGemini(messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('The AI assistant is not configured yet (missing GEMINI_API_KEY on the server).'), { status: 500 });
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  let res;
  try {
    res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 },
      }),
    });
  } catch {
    throw Object.assign(new Error('Could not reach the Gemini API. Check your network connection and try again.'), { status: 502 });
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error(`[gemini] ${res.status} ${res.statusText}: ${detail.slice(0, 500)}`);
    throw Object.assign(new Error('The AI assistant is temporarily unavailable. Please try again in a moment.'), { status: 502 });
  }

  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  if (!reply.trim()) {
    throw Object.assign(new Error('The AI assistant returned an empty response. Please try again.'), { status: 502 });
  }
  return reply.trim();
}
