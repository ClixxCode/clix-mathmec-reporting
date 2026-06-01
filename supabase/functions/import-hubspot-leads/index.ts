import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEADER_MAPPING: Record<string, string> = {
  "Record ID": "record_id",
  "Lead Name": "lead_name",
  "Lead stage": "lead_stage",
  "Disqualification Reason": "disqualification_reason",
  "Product Requested": "product_requested",
  "Lead Source": "lead_source",
  "Lead Owner": "lead_owner",
  "Primary Associated Contact Object ID": "associated_contact_id",
  "Object create date/time": "hubspot_create_date",
  "First Outreach Date": "first_outreach_date",
  "Time to First Touch (HH:mm:ss)": "time_to_first_touch",
  "Open deal amount": "open_deal_amount",
  "Closed won deal amount": "closed_won_amount",
};

const ESSENTIAL_RAW_COLUMNS = [
  "Record ID", "Lead Name", "Lead stage", "Disqualification Reason",
  "Lead Disqualification Note", "Product Requested", "Lead Source",
  "Lead Owner", "Lead Pipeline", "Lead Type", "Lead Label",
  "Primary Associated Contact Object ID", "Primary Associated Company Object ID",
  "Primary Associated Object Name", "Object create date/time",
  "First Outreach Date", "Time to First Touch (HH:mm:ss)",
  "Open deal amount", "Closed won deal amount", "Is Open",
  "Record source", "Record source detail 1",
];

function* parseCSVRows(text: string): Generator<string[]> {
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field.trim()); field = ""; };
  const emitRow = (): string[] | null => {
    if (row.length === 1 && row[0] === "") { row = []; return null; }
    const out = row; row = []; return out;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (!inQuotes && char === ",") { pushField(); continue; }
    if (!inQuotes && (char === "\n" || char === "\r")) {
      pushField();
      if (char === "\r" && text[i + 1] === "\n") i++;
      const out = emitRow();
      if (out) yield out;
      continue;
    }
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    pushField();
    const out = emitRow();
    if (out) yield out;
  }
}

function parseDate(s: string): string | null {
  if (!s || !s.trim()) return null;
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch { return null; }
}

function parseNumber(s: string): number | null {
  if (!s || !s.trim()) return null;
  const n = Number(String(s).replace(/[$,]/g, ""));
  return isNaN(n) ? null : n;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return new Response(JSON.stringify({ error: "No file provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const csvText = await file.text();
    const allRows: string[][] = [...parseCSVRows(csvText)];

    let headerRowIndex = -1;
    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i].some((c) => (c || "").trim() !== "")) { headerRowIndex = i; break; }
    }
    const headers = headerRowIndex >= 0 ? allRows[headerRowIndex] : null;
    if (!headers) {
      return new Response(JSON.stringify({ error: "CSV file is empty" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const headerIndexMap: Record<string, number> = {};
    headers.forEach((h, i) => { headerIndexMap[h] = i; });

    const recordIdIndex = headerIndexMap["Record ID"];
    if (recordIdIndex === undefined) {
      return new Response(JSON.stringify({ error: "CSV must contain 'Record ID' column" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const BATCH_SIZE = 100;
    const seen = new Set<string>();
    let batch: Record<string, unknown>[] = [];
    let processed = 0, skippedDuplicates = 0, skippedEmpty = 0, errors = 0;

    for (let rowIdx = headerRowIndex + 1; rowIdx < allRows.length; rowIdx++) {
      const values = allRows[rowIdx];
      const recordId = String(values[recordIdIndex] || "").trim();
      if (!recordId || !/^\d+$/.test(recordId)) { skippedEmpty++; continue; }
      if (seen.has(recordId)) { skippedDuplicates++; continue; }
      seen.add(recordId);

      const rawData: Record<string, string> = {};
      for (const col of ESSENTIAL_RAW_COLUMNS) {
        const idx = headerIndexMap[col];
        if (idx !== undefined) rawData[col] = values[idx] || "";
      }

      const record: Record<string, unknown> = { raw_data: rawData };
      for (const [csvHeader, dbColumn] of Object.entries(HEADER_MAPPING)) {
        const index = headerIndexMap[csvHeader];
        if (index === undefined) continue;
        let value: unknown = values[index] || null;
        if (dbColumn.endsWith("_date") && value) value = parseDate(value as string);
        if ((dbColumn === "open_deal_amount" || dbColumn === "closed_won_amount") && value) {
          value = parseNumber(value as string);
        }
        record[dbColumn] = value;
      }

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase.from("hubspot_leads").upsert(batch, { onConflict: "record_id" });
        if (error) { console.error("Batch error:", error.message); errors += batch.length; }
        else processed += batch.length;
        batch = [];
      }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from("hubspot_leads").upsert(batch, { onConflict: "record_id" });
      if (error) { console.error("Final batch error:", error.message); errors += batch.length; }
      else processed += batch.length;
    }

    const validRows = processed + skippedDuplicates;
    return new Response(JSON.stringify({
      success: true,
      summary: { total_rows: validRows, processed, duplicates: skippedDuplicates, empty_rows: skippedEmpty, errors },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Import error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});