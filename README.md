# DealerPulse

A dealership sales intelligence dashboard — **Actionable** (what should I do about
it, the default landing page), **Analytics** (what's happening), **Questions** (ask
anything in plain English), plus a row-level raw data view — built on a synthetic
dataset of leads, branches, reps, deliveries, and targets. A guided walkthrough
introduces all of it on first visit (replayable any time from the topbar). See
`DECISIONS.md` for the product reasoning and `ASSIGNMENT.md` for the brief this was
built against.

## Running it locally

```bash
npm install
cp .env.example .env   # then paste in a real GEMINI_API_KEY
npm run dev
```

That's it — `npm run dev` alone is enough. Vite's dev server mounts the Ask AI
backend logic in-process (see `vite.config.ts`), so there's no second terminal or
separate process to start. Open the printed `localhost` URL; Analytics and
Actionable work immediately, and Ask AI (on the Actionable tab) works as soon as
`GEMINI_API_KEY` is set in `.env`. Without a key, everything else still works —
only the Ask AI chat shows a "not configured" message.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server + the Ask AI API, in one process |
| `npm run build` | Type-checks, then builds the production bundle to `dist/` |
| `npm run preview` | Serves the built `dist/` locally (frontend only, no `/api`) |
| `npm run server` | Serves the built `dist/` **and** `/api/ask-ai` from one Node process — for self-hosting outside Vercel. Run `npm run build` first. |
| `npm run lint` | Oxlint |

## Deploying

Built for Vercel: `vercel.json` + `api/ask-ai.js` handle the serverless side
automatically on push/import. Set `GEMINI_API_KEY` as an environment variable in
the Vercel project settings — it's never read from a committed file.

## Where things live

- `src/analytics/calculations/` — the one shared calculation layer. Every
  number shown anywhere in the app (charts, rankings, Actionable's risk
  detection, the What-If Simulator, the Questions engine) is computed here
  exactly once.
- `src/components/ActionablePage/`, `src/components/AnalyticsPage/` — the main
  views (Analytics also owns `QuestionsView.tsx`, its own top-level tab).
- `src/walkthrough/` — the guided tour: `steps.ts` defines what each step
  says and which real element it points at; `Walkthrough.tsx` drives tab
  navigation and positions the spotlight/tooltip around that element.
- `server/gemini.js`, `server/data.js`, `server/askAiProcessor.js` — the Ask AI
  logic (Gemini client, dataset access, and the retrieval step that grounds
  Gemini's answers in real numbers instead of letting it guess). Reused
  identically by all three ways this app can run (`npm run dev`,
  `npm run server`, and the Vercel function) — see `server/handler.js` for the
  shared request handler and each entry point's own thin adapter around it.
