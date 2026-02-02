import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Header mapping: CSV header -> database column
const HEADER_MAPPING: Record<string, string> = {
  "Deal ID": "deal_id",
  "Deal Name": "deal_name",
  "Deal Stage": "deal_stage",
  "Pipeline": "pipeline",
  "Amount": "amount",
  "Closed Won Amount (ACV)": "closed_amount",
  "Create Date": "create_date",
  "Close Date": "close_date",
  "Days to Close": "days_to_close",
  "Deal owner": "deal_owner",
  "Associated Contact IDs": "associated_contact_id",
  "Original Traffic Source": "original_traffic_source",
  "Original Traffic Source Drill-Down 1": "traffic_source_drill_down_1",
  "Original Traffic Source Drill-Down 2": "traffic_source_drill_down_2",
  "IP City": "ip_city",
  "IP State/Region": "ip_state",
  "IP Country": "ip_country",
};

// Essential columns to keep in raw_data
const ESSENTIAL_RAW_COLUMNS = [
  "Deal ID", "Deal Name", "Deal Stage", "Pipeline", "Amount",
  "Closed Won Amount (ACV)", "Create Date", "Close Date", "Days to Close",
  "Deal owner", "Associated Contact IDs", "Original Traffic Source",
  "Original Traffic Source Drill-Down 1", "Original Traffic Source Drill-Down 2",
  "IP City", "IP State/Region", "IP Country", "Incoming Lead Source (synced from Contact)",
  "Location (synced from contact)", "Lead Status (synced from Contact)",
];

// Robust CSV row parser that supports newlines inside quoted fields.
function* parseCSVRows(text: string): Generator<string[]> {
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field.trim());
    field = "";
  };

  const emitRow = (): string[] | null => {
    if (row.length === 1 && row[0] === "") {
      row = [];
      return null;
    }
    const out = row;
    row = [];
    return out;
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      pushField();
      continue;
    }

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

function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === "") return null;
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
}

function parseNumber(numStr: string): number | null {
  if (!numStr || numStr.trim() === "") return null;
  const cleaned = numStr.replace(/[$,]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseInt(numStr: string): number | null {
  if (!numStr || numStr.trim() === "") return null;
  const num = Number.parseInt(numStr.trim(), 10);
  return isNaN(num) ? null : num;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const csvText = await file.text();
    const allRows: string[][] = [...parseCSVRows(csvText)];
    
    // Find header row
    let headerRowIndex = -1;
    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i].some((c) => (c || "").trim() !== "")) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = headerRowIndex >= 0 ? allRows[headerRowIndex] : null;

    if (!headers) {
      return new Response(
        JSON.stringify({ error: "CSV file is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${headers.length} columns`);

    // Create header index map
    const headerIndexMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndexMap[header] = index;
    });

    // Find Deal ID column
    const dealIdIndex = headerIndexMap["Deal ID"];
    if (dealIdIndex === undefined) {
      return new Response(
        JSON.stringify({ error: "CSV must contain 'Deal ID' column" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const BATCH_SIZE = 100;
    const seenDealIds = new Set<string>();
    let batch: Record<string, unknown>[] = [];
    let processed = 0;
    let skippedDuplicates = 0;
    let skippedEmpty = 0;
    let errors = 0;

    for (let rowIdx = headerRowIndex + 1; rowIdx < allRows.length; rowIdx++) {
      const values = allRows[rowIdx];
      const dealId = String(values[dealIdIndex] || "").trim();

      // Deal IDs are numeric
      if (!dealId || !/^\d+$/.test(dealId)) {
        skippedEmpty++;
        continue;
      }

      if (seenDealIds.has(dealId)) {
        skippedDuplicates++;
        continue;
      }
      seenDealIds.add(dealId);

      // Build raw_data with essential columns
      const rawData: Record<string, string> = {};
      for (const col of ESSENTIAL_RAW_COLUMNS) {
        const idx = headerIndexMap[col];
        if (idx !== undefined) {
          rawData[col] = values[idx] || "";
        }
      }

      // Build record with mapped columns
      const record: Record<string, unknown> = { raw_data: rawData };

      for (const [csvHeader, dbColumn] of Object.entries(HEADER_MAPPING)) {
        const index = headerIndexMap[csvHeader];
        if (index !== undefined) {
          let value: unknown = values[index] || null;
          
          // Parse dates
          if ((dbColumn === "create_date" || dbColumn === "close_date") && value) {
            value = parseDate(value as string);
          }
          
          // Parse numbers
          if ((dbColumn === "amount" || dbColumn === "closed_amount") && value) {
            value = parseNumber(value as string);
          }
          
          // Parse integers
          if (dbColumn === "days_to_close" && value) {
            value = parseInt(value as string);
          }
          
          record[dbColumn] = value;
        }
      }

      batch.push(record);

      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from("hubspot_deals")
          .upsert(batch, { onConflict: 'deal_id' });

        if (error) {
          console.error(`Batch error:`, error.message);
          errors += batch.length;
        } else {
          processed += batch.length;
        }

        if (processed % 500 === 0) {
          console.log(`Progress: ${processed} processed, ${errors} errors`);
        }

        batch = [];
      }
    }

    // Final batch
    if (batch.length > 0) {
      const { error } = await supabase
        .from("hubspot_deals")
        .upsert(batch, { onConflict: 'deal_id' });

      if (error) {
        console.error("Final batch error:", error.message);
        errors += batch.length;
      } else {
        processed += batch.length;
      }
    }

    const validRows = processed + skippedDuplicates;
    console.log(`Import complete: ${processed} processed, ${skippedDuplicates} duplicates, ${skippedEmpty} empty rows, ${errors} errors`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          total_rows: validRows,
          processed,
          duplicates: skippedDuplicates,
          empty_rows: skippedEmpty,
          errors,
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
