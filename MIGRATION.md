# Migration runbook: Lovable → Claude Code + Clix Supabase

This repo was originally built on Lovable, with its database and edge functions
running in a Lovable-managed Supabase project (`hfzysrftppvxkxfgcumw`) that is
**not** in the Clix Supabase org. This runbook moves everything onto
Clix-owned infrastructure.

Code-side de-coupling from Lovable is already done on this branch:

- `lovable-tagger` removed from the Vite build
- `ai-score-contacts` and `generate-campaign-narrative` edge functions now call
  the Claude API directly (`claude-opus-4-8`) via `ANTHROPIC_API_KEY` instead of
  the Lovable AI gateway / `LOVABLE_API_KEY`
- `.lovable/` and the Lovable README boilerplate removed
- `.env.example` + this runbook + `scripts/migrate-data.mjs` added

What remains is standing up the new infrastructure — the steps below.

## 0. Prerequisites

- [Supabase CLI](https://supabase.com/docs/guides/local-development) ≥ 1.200, logged in to the Clix org (`supabase login`)
- An Anthropic API key for the AI features
- CTM credentials (`CTM_API_KEY`, `CTM_API_SECRET`, `CTM_ACCOUNT_ID`) — copy
  from the CTM dashboard or the old project's function secrets; they cannot be
  extracted from this repo

## 1. Create (or choose) the target Supabase project

Create a new project in the Clix org (recommended: one dedicated project per
client, e.g. "Mathews Mechanical") via the dashboard or:

```sh
supabase projects create "Mathews Mechanical" --org-id aynthqvdwjzyunvlptgp --region us-east-1
```

Note the new project ref (`<NEW_REF>` below).

## 2. Apply the schema

```sh
supabase link --project-ref <NEW_REF>   # rewrites supabase/config.toml project_id
supabase db push                        # replays supabase/migrations/
```

> Note: the migrations reproduce the current public read/write RLS policies
> exactly (parity-first). A hardening pass — read-only public policies, auth on
> /admin — is recommended as a follow-up once the migration is validated.

## 3. Deploy edge functions and set secrets

```sh
supabase functions deploy    # deploys all functions in supabase/functions/
supabase secrets set \
  ANTHROPIC_API_KEY=sk-ant-... \
  CTM_API_KEY=... \
  CTM_API_SECRET=... \
  CTM_ACCOUNT_ID=...
```

(`LOVABLE_API_KEY` is no longer used anywhere.)

## 4. Copy the data

The old project is publicly readable with its anon key (in the current `.env`),
so data can be copied table-by-table over PostgREST:

```sh
SOURCE_SUPABASE_URL=https://hfzysrftppvxkxfgcumw.supabase.co \
SOURCE_SUPABASE_ANON_KEY=<old anon key, currently in .env> \
DEST_SUPABASE_URL=https://<NEW_REF>.supabase.co \
DEST_SUPABASE_SERVICE_ROLE_KEY=<new project service role key> \
node scripts/migrate-data.mjs --dry-run   # counts rows first

# then run for real (idempotent — upserts on primary key)
node scripts/migrate-data.mjs
```

Spot-check row counts per table against the old project afterwards
(the `/admin` page shows record counts for the major tables).

## 5. Point the frontend at the new project

```sh
# .env (and hosting provider env vars)
VITE_SUPABASE_PROJECT_ID="<NEW_REF>"
VITE_SUPABASE_URL="https://<NEW_REF>.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="<new anon key>"
```

Regenerate the typed client against the new project (keeps `types.ts` honest):

```sh
supabase gen types typescript --project-id <NEW_REF> > src/integrations/supabase/types.ts
```

## 6. Deploy the frontend

Vercel (recommended — Clix account already connected):

- Import the repo, framework preset **Vite**, build `npm run build`, output `dist`
- Add the three `VITE_SUPABASE_*` env vars
- Add a SPA rewrite so `/admin` works on hard refresh: `vercel.json` with
  `{"rewrites": [{"source": "/(.*)", "destination": "/index.html"}]}`

## 7. Validate, then cut over

- Load the dashboard against the new project; compare Monthly/Quarterly/Quality
  views for a couple of months against the old deployment
- Test one CSV import on `/admin`, the CTM status card, and
  "Generate narrative" (exercises `ANTHROPIC_API_KEY`)
- Repoint DNS / share the new URL; decommission the Lovable project when
  comfortable

## 8. Recommended follow-up (not part of parity migration)

- **Lock down RLS:** every table currently allows public read *and write* with
  the anon key. Move writes behind the service role (edge functions only) and
  decide whether public read of `hubspot_contacts` (contains PII in `raw_data`)
  is acceptable for a client-facing dashboard.
- **Gate `/admin`** behind Supabase Auth (magic link is the lightest option).
- Remove the hardcoded fallback data in `src/data/` once live tables fully
  cover those views.
