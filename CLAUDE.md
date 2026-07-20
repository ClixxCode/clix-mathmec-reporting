# CLAUDE.md — clix-mathmec-reporting

Vite + React + Supabase reporting dashboard for the client **Mathews
Mechanical**. Lives behind the multi-client hub: clients visit
`reporting.clix.solutions/mathews-mechanical`, which proxies to this app's
Vercel deployment. Migrated from Lovable (old project `hfzysrftppvxkxfgcumw`;
22,448 rows, counts verified).

## The slug is load-bearing

This app is built to live under `/mathews-mechanical`. That slug appears in
three places **in this repo** and must never be changed independently:

- `vite.config.ts` → `base: "/mathews-mechanical/"`
- `<BrowserRouter basename="/mathews-mechanical">`
- `vercel.json` → asset routes, SPA fallback, and the bare `/` redirect

(The fourth copy is the hub's rewrites in Clix-Team/clix-reporting-hub.)
Symptom of a mismatch: page loads but assets 404 / blank screen.

## Backend

- Supabase project **"Clix Clients"** — ref `meoytnnklgjfnqbngmgx`.
- All Mathews data in the **`mathmec`** schema (exposed in the API's
  exposed-schemas list). Frontend and all 12 edge functions use
  `{ db: { schema: "mathmec" } }` — never `public`.
- Edge-function secrets (`CTM_API_KEY`, `CTM_API_SECRET`, `CTM_ACCOUNT_ID`,
  `ANTHROPIC_API_KEY`) belong in **Supabase secrets, not Vercel env vars**.
  As of 2026-07-20 this is still an open item — they were mistakenly added to
  Vercel and functions reported "CTM credentials not configured".

## Deploy

- Vercel project `clix-mathmec-reporting`, team "Clix projects"
  (`team_IysEeVf3nSQOzC1G165cvhIV`). Vercel builds `main`.
- Do **not** attach `reporting.clix.solutions` to this project — the hub owns
  that domain.
- After merging to `main`, confirm a new production deployment exists and its
  SHA matches `origin/main` (push ≠ deploy — this bit the hub on 2026-07-17).

## Verifying a deploy

Test directly first, then through the hub — all should return 200 (bare `/`
returns a 307 to the slug on the direct domain):

```
https://clix-mathmec-reporting.vercel.app/mathews-mechanical[/, /admin, /assets/<real-hash>.js]
https://reporting.clix.solutions/mathews-mechanical[...same matrix]
```

Full runbook + failure-symptom table: `docs/ADDING_A_CLIENT.md` in
Clix-Team/clix-reporting-hub (with the `clix-client-reporting-onboarding`
skill). Platform-wide learnings go in that repo's `LEARNINGS.md`.
