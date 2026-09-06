import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { handleAskAi } from './server/handler.js'

// Node 20.6+ built-in .env loader, so GEMINI_API_KEY is available to the
// dev-only middleware below the same way server/index.js loads it for
// standalone/self-hosted runs.
try {
  process.loadEnvFile()
} catch {
  // No .env file (or older Node) — fine, GEMINI_API_KEY may already be set in the environment.
}

/** Mounts POST /api/ask-ai directly into Vite's own dev server, in-process —
 * so `npm run dev` alone is a complete local setup. No second terminal
 * running `npm run server`, no proxy to a separate port. The Gemini key
 * still never reaches the browser: this middleware runs in the same Node
 * process as the dev server, not in client code. Production (Vercel) uses
 * api/ask-ai.js instead; self-hosting outside Vercel uses server/index.js —
 * both of those, and this, call the same handleAskAi(). */
function askAiDevMiddleware(): Plugin {
  return {
    name: 'ask-ai-dev-middleware',
    configureServer(server) {
      server.middlewares.use('/api/ask-ai', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }
        handleAskAi(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), askAiDevMiddleware()],
})
