#!/usr/bin/env node
/**
 * Copies all application data from the old (Lovable-managed) Supabase project
 * into a new Clix-owned Supabase project via the PostgREST API.
 *
 * The old project's RLS policies allow public reads with the anon key, so the
 * source side only needs the anon key. The destination side uses the service
 * role key so the copy works regardless of the new project's policies.
 *
 * Usage:
 *   SOURCE_SUPABASE_URL=https://hfzysrftppvxkxfgcumw.supabase.co \
 *   SOURCE_SUPABASE_ANON_KEY=eyJ... \
 *   DEST_SUPABASE_URL=https://meoytnnklgjfnqbngmgx.supabase.co \
 *   DEST_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
 *   DEST_SCHEMA=mathmec \
 *   node scripts/migrate-data.mjs [--dry-run] [--table <name>]
 *
 * The initial 22,448-row copy was already performed server-side via pg_net
 * (see MIGRATION.md). This script remains useful for delta top-ups if new
 * rows land in the old project before final cutover — it upserts on primary
 * key, so re-running is safe. DEST_SCHEMA targets a non-public destination
 * schema via PostgREST's Content-Profile header (the schema must be in the
 * project's exposed schemas list).
 */

const TABLES = [
  "data_sources",
  "google_ads_performance",
  "google_ads_geo_performance",
  "google_ads_changes",
  "hubspot_contacts",
  "hubspot_deals",
  "hubspot_leads",
  "ctm_calls",
  "campaign_narratives",
];

const PAGE_SIZE = 500;

const env = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value.replace(/\/$/, "");
};

const SOURCE_URL = env("SOURCE_SUPABASE_URL");
const SOURCE_KEY = env("SOURCE_SUPABASE_ANON_KEY");
const DEST_URL = env("DEST_SUPABASE_URL");
const DEST_KEY = env("DEST_SUPABASE_SERVICE_ROLE_KEY");
const DEST_SCHEMA = process.env.DEST_SCHEMA || "public";

const dryRun = process.argv.includes("--dry-run");
const tableArgIdx = process.argv.indexOf("--table");
const onlyTable = tableArgIdx !== -1 ? process.argv[tableArgIdx + 1] : null;

async function fetchPage(table, offset) {
  const res = await fetch(`${SOURCE_URL}/rest/v1/${table}?select=*&order=id.asc`, {
    headers: {
      apikey: SOURCE_KEY,
      Authorization: `Bearer ${SOURCE_KEY}`,
      Range: `${offset}-${offset + PAGE_SIZE - 1}`,
    },
  });
  if (!res.ok) throw new Error(`read ${table} @${offset}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function insertRows(table, rows) {
  const res = await fetch(`${DEST_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: DEST_KEY,
      Authorization: `Bearer ${DEST_KEY}`,
      "Content-Type": "application/json",
      "Content-Profile": DEST_SCHEMA,
      // Upsert on primary key so the script is safe to re-run
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`write ${table}: ${res.status} ${await res.text()}`);
}

async function migrateTable(table) {
  let offset = 0;
  let total = 0;
  for (;;) {
    const rows = await fetchPage(table, offset);
    if (rows.length === 0) break;
    if (!dryRun) await insertRows(table, rows);
    total += rows.length;
    offset += PAGE_SIZE;
    process.stdout.write(`\r  ${table}: ${total} rows${dryRun ? " (dry run)" : ""}   `);
    if (rows.length < PAGE_SIZE) break;
  }
  console.log(`\r  ${table}: ${total} rows ${dryRun ? "found (dry run)" : "copied"}     `);
  return total;
}

console.log(`Copying ${SOURCE_URL} -> ${DEST_URL}${dryRun ? " (DRY RUN)" : ""}\n`);
let grandTotal = 0;
for (const table of TABLES) {
  if (onlyTable && table !== onlyTable) continue;
  try {
    grandTotal += await migrateTable(table);
  } catch (err) {
    console.error(`\n  ${table}: FAILED — ${err.message}`);
    process.exitCode = 1;
  }
}
console.log(`\nDone. ${grandTotal} total rows.`);
