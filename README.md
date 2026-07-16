# Mathews Mechanical — Marketing Performance Reporting

A client-facing marketing performance dashboard for Mathews Mechanical, built and maintained by Clix. It reports on Google Ads spend, HubSpot contacts/deals/leads, CallTrackingMetrics phone attribution, and AI-generated campaign narratives.

## Stack

- **Frontend:** Vite + React 18 + TypeScript, shadcn/ui (Radix + Tailwind), TanStack Query, Recharts
- **Backend:** Supabase (Postgres + Edge Functions) — no separate server
- **AI:** Claude API (`claude-opus-4-8`) for contact quality scoring and executive-summary narratives
- **PDF export:** html2pdf.js (client-side)

## Architecture

```
Google Ads / HubSpot CSV exports ──▶ /admin drag-and-drop
                                        │
                                        ▼
                             Supabase Edge Functions (import-*)
                                        │  service-role upserts
                                        ▼
CallTrackingMetrics API ──▶ fetch-ctm-* ─▶ Postgres ◀── ai-score-contacts /
                                        │              generate-campaign-narrative
                                        ▼              (Claude API)
                        React dashboard (direct PostgREST queries
                        via @supabase/supabase-js + TanStack Query)
```

- `/` — the client-facing report (Monthly, Quarterly, Quality Insights views)
- `/admin` — data source management: CSV imports, CTM status, narrative generation

## Development

```sh
npm install
cp .env.example .env   # fill in your Supabase project values
npm run dev            # http://localhost:8080
```

Other scripts: `npm run build`, `npm run lint`, `npm test`.

## Environment variables (frontend)

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref (used by tooling only) |

## Edge function secrets (Supabase)

Set with `supabase secrets set` (or the dashboard):

| Secret | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | `ai-score-contacts`, `generate-campaign-narrative` |
| `CTM_API_KEY`, `CTM_API_SECRET`, `CTM_ACCOUNT_ID` | `fetch-ctm-calls`, `fetch-ctm-account` |

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the platform.

## Deployment

- **Database:** migrations live in `supabase/migrations/` — apply with `supabase db push`
- **Edge functions:** `supabase functions deploy` (JWT verification is disabled per function in `supabase/config.toml`)
- **Frontend:** any static host (Vercel recommended) — build with `npm run build`, output in `dist/`

See `MIGRATION.md` for the runbook used to move this project off Lovable onto Clix-owned infrastructure.
