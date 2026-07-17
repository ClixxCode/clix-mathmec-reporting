# Migration: Lovable → Clix Clients Supabase (`mathmec` schema)

This app originally ran on Lovable with its own Lovable-managed Supabase
project (`hfzysrftppvxkxfgcumw`). It has been migrated into the shared
**Clix Clients** project (`meoytnnklgjfnqbngmgx`), which hosts one Postgres
schema per client. Mathews Mechanical lives in the **`mathmec`** schema and is
registered in the `public.clients` registry.

## Already done (2026-07-17)

**Database (Clix Clients project):**

- Created the `mathmec` schema with all 9 tables, indexes, triggers, and the
  `update_updated_at_column()` trigger function
- Copied **22,448 rows** from the old project (server-side via `pg_net`,
  verified against source counts): 11,875 contacts, 5,720 deals, 1,128 leads,
  2,352 ads-performance rows, 679 CTM calls, 600 change-history rows, 85 geo
  rows, 7 narratives, 2 data-source rows
- Registered the client in `public.clients` (slug `mathmec`)
- **Hardened security vs the old project** (which allowed public read *and
  write* on everything): anon/authenticated get SELECT only; all writes go
  through edge functions (service role) — except `campaign_narratives`, which
  keeps anon INSERT/UPDATE because the executive-summary editor writes it
  directly from the browser

**Code (this repo):**

- Frontend client and all 11 DB-touching edge functions target the `mathmec`
  schema (`{ db: { schema: "mathmec" } }`)
- `.env` and `supabase/config.toml` point at the Clix Clients project
- `src/integrations/supabase/types.ts` re-keyed to the `mathmec` schema
- AI functions call the Claude API (`claude-opus-4-8`) via `ANTHROPIC_API_KEY`
  (Lovable AI gateway removed); `lovable-tagger` and all Lovable boilerplate
  removed

## Remaining steps (in order)

### 1. Expose the `mathmec` schema to the API  ← everything is gated on this

Dashboard → project `meoytnnklgjfnqbngmgx` → **Settings → Data API →
Exposed schemas** → add `mathmec` to the list.

Until this is done, every PostgREST call (frontend *and* edge functions)
returns `PGRST106: Invalid schema`. This setting isn't reachable via the
management MCP, so it's a one-time manual toggle.

### 2. Deploy the edge functions

```sh
supabase login
supabase link --project-ref meoytnnklgjfnqbngmgx
supabase functions deploy   # deploys all 12; config.toml sets verify_jwt per function
```

(No function-name collisions — the project had no edge functions before this.)

### 3. Set the function secrets

```sh
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  CTM_API_KEY=... \
  CTM_API_SECRET=... \
  CTM_ACCOUNT_ID=...
```

CTM values come from the CTM dashboard or the old Lovable project's function
secrets; they can't be extracted from this repo. `LOVABLE_API_KEY` is no
longer used.

### 4. Smoke-test

- `npm run dev` — Monthly/Quarterly/Quality views should render with live data
- `/admin`: record counts populate; try one CSV re-import; CTM status card;
  "Generate narrative" (exercises the Claude key)

### 5. Deploy the frontend

Vercel (framework: Vite, build `npm run build`, output `dist/`) with the three
`VITE_SUPABASE_*` values from `.env`. Add a SPA rewrite
(`{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`) so
`/admin` survives hard refresh.

### 6. Decommission

If new data lands in the old Lovable project between now and cutover, top up
with `scripts/migrate-data.mjs` (upserts on primary key; set
`DEST_SCHEMA=mathmec`). Then retire the Lovable project.

## Notes & follow-ups

- **Shared anon key:** the Clix Clients anon key is shared by every client app
  on the project. Anyone holding it can *read* the `mathmec` tables (the
  dashboard is an unauthenticated client-facing report, as before — but note
  `hubspot_contacts.raw_data` contains contact PII) and can write
  `campaign_narratives`. If that's not acceptable, gate the dashboard behind
  Supabase Auth and drop the anon policies.
- `public.goals` in the Clix Clients project (pre-existing, unrelated to this
  migration) has RLS disabled entirely — flagged by the Supabase advisor and
  worth fixing: `ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;` plus
  appropriate policies.
- After step 1, optionally regenerate types:
  `supabase gen types typescript --project-id meoytnnklgjfnqbngmgx --schema mathmec > src/integrations/supabase/types.ts`
  (the current file was hand-adjusted and type-checks).
