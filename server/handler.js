// The raw Node-http-style request handler for POST /api/ask-ai — pulled out
// of index.js so it can be reused as-is by two different hosts that both
// hand it an unconsumed (req, res) pair: the standalone server (index.js,
// for `npm run server` / self-hosting outside Vercel) and the Vite dev
// server's own middleware (vite.config.ts), so `npm run dev` alone is enough
// locally — no second terminal running a separate process.
//
// This is deliberately NOT used by api/ask-ai.js (the Vercel serverless
// function): Vercel pre-parses the request body onto req.body and the raw
// body stream is already drained by the time the function runs, so the
// stream-reading approach here would hang. Vercel gets its own thin adapter;
// the actual AI logic (gemini.js / data.js / askAiProcessor.js) is what's
// shared across all three entry points, not this HTTP plumbing.

import { callGemini } from './gemini.js';
import { buildAskAiContext, formatContextForGemini } from './askAiProcessor.js';
import { getReferenceNow } from './data.js';

const MAX_BODY_BYTES = 20_000;
const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 4000;

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf-8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body.'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

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

export async function handleAskAi(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    sendJson(res, err.status ?? 400, { error: err.message });
    return;
  }

  if (!isValidMessages(body.messages)) {
    sendJson(res, 400, { error: 'Send a non-empty conversation (each message under 4000 characters).' });
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
    sendJson(res, 200, { reply });
  } catch (err) {
    const status = Number.isInteger(err.status) ? err.status : 500;
    console.error('[ask-ai]', err.message);
    sendJson(res, status, { error: err.message || 'Something went wrong. Please try again.' });
  }
}
