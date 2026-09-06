// Plain Node HTTP server — no Express, no extra dependencies. It has two jobs:
//   1. POST /api/ask-ai — the only place the Gemini API key is ever used.
//   2. Serve the built frontend (dist/) so the whole app is one deployable process.
//
// This is for self-hosting outside Vercel (`npm run server` against a built
// dist/). For local development, `npm run dev` alone is enough — Vite's own
// dev server mounts the same handleAskAi() as in-process middleware (see
// vite.config.ts), so nothing here needs to be running in a second terminal.
// In production on Vercel, api/ask-ai.js is the entry point instead.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleAskAi } from './handler.js';

// Node 20.6+ built-in .env loader — no `dotenv` dependency needed.
try {
  process.loadEnvFile();
} catch {
  // No .env file (or older Node) — fall back to whatever is already in the environment.
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT) || 8787;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);

  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end();
    return;
  }

  try {
    const st = await stat(filePath);
    if (st.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    filePath = path.join(DIST_DIR, 'index.html'); // SPA-style fallback
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found. Run `npm run build` to generate the dist/ folder this server serves in production.');
  }
}

const server = createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ask-ai') {
    handleAskAi(req, res);
    return;
  }
  if (req.url?.startsWith('/api/')) {
    sendJson(res, 404, { error: 'Not found' });
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    serveStatic(req, res);
    return;
  }
  res.writeHead(405);
  res.end();
});

server.listen(PORT, () => {
  console.log(`DealerPulse API server listening on http://localhost:${PORT}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠ GEMINI_API_KEY is not set — configure it in .env for the Ask AI feature to work.');
  }
});
