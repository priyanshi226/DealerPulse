// Vercel serverless function for POST /api/ask-ai — the production entry
// point once this is deployed. Any file under /api becomes a route
// automatically on Vercel; this is a thin (req, res) adapter around the same
// logic modules server/index.js uses for local dev, so the two never drift
// apart. See DECISIONS.md for why the app needed this in addition to
// server/index.js: a long-running Node HTTP server (what `npm run server`
// starts) is not how Vercel runs Node code — Vercel expects one function per
// file under /api instead.
//
// Vercel's Node runtime auto-parses a JSON request body into req.body and
// reads GEMINI_API_KEY from the project's configured environment variables —
// no .env loading needed here (that's only for local dev, in server/index.js).

import { callGemini } from '../server/gemini.js';
import { buildAskAiContext, formatContextForGemini } from '../server/askAiProcessor.js';
import { getReferenceNow } from '../server/data.js';

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

function isValidMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages.every(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.text === 'string' &&
        m.text.trim().length > 0 &&
        m.text.length <= MAX_MESSAGE_LENGTH,
    )
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body ?? {};
  if (!isValidMessages(body.messages)) {
    res.status(400).json({ error: 'Send a non-empty conversation (each message under 4000 characters).' });
    return;
  }

  try {
    const latestUserMessage = [...body.messages].reverse().find((m) => m.role === 'user')?.text || '';
    const referenceNow = getReferenceNow();
    const dataContext = await buildAskAiContext(latestUserMessage, body.messages, referenceNow);
    const formattedContext = formatContextForGemini(latestUserMessage, dataContext);

    const enrichedMessages = body.messages.map((m, i) =>
      m.role === 'user' && i === body.messages.length - 1 ? { role: 'user', text: formattedContext } : m,
    );

    const reply = await callGemini(enrichedMessages);
    res.status(200).json({ reply });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    console.error('[ask-ai]', err.message);
    res.status(status).json({ error: err.message || 'Something went wrong. Please try again.' });
  }
}
