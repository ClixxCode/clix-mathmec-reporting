import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Header mapping: CSV header -> database column
const HEADER_MAPPING: Record<string, string> = {
  "Record ID": "record_id",
  "First Name": "first_name",
  "Last Name": "last_name",
  "Email": "email",
  "Phone Number": "phone_number",
  "Company Name": "company_name",
  "City": "city",
  "State/Region": "state_region",
  "Country/Region": "country",
  "Original Traffic Source": "original_traffic_source",
  "Original Traffic Source Drill-Down 1": "traffic_source_drill_down_1",
  "Original Traffic Source Drill-Down 2": "traffic_source_drill_down_2",
  "Lifecycle Stage": "lifecycle_stage",
  "Lead Status": "lead_status",
  "Message": "message",
  "Create Date": "hubspot_create_date",
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
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
    const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== "");
    
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: "CSV file is empty or has no data rows" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse headers
    const headers = parseCSVLine(lines[0]);
    console.log(`Found ${headers.length} columns, ${lines.length - 1} data rows`);

    // Create header index map
    const headerIndexMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndexMap[header] = index;
    });

    // Find Record ID column index
    const recordIdIndex = headerIndexMap["Record ID"];
    if (recordIdIndex === undefined) {
      return new Response(
        JSON.stringify({ error: "CSV must contain 'Record ID' column" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse all rows and deduplicate by record_id (keep last occurrence)
    const recordsMap = new Map<string, Record<string, unknown>>();
    let duplicatesSkipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      const recordId = values[recordIdIndex];
      
      if (!recordId) continue;

      // Build raw_data object with all columns
      const rawData: Record<string, string> = {};
      headers.forEach((header, index) => {
        rawData[header] = values[index] || "";
      });

      // Build record with mapped columns
      const record: Record<string, unknown> = {
        raw_data: rawData,
      };

      // Map known columns
      for (const [csvHeader, dbColumn] of Object.entries(HEADER_MAPPING)) {
        const index = headerIndexMap[csvHeader];
        if (index !== undefined) {
          let value: unknown = values[index] || null;
          
          if (dbColumn === "hubspot_create_date" && value) {
            value = parseDate(value as string);
          }
          
          record[dbColumn] = value;
        }
      }

      // Fallback: Use "Latest Traffic Source" if "Original Traffic Source" is empty
      if (!record.original_traffic_source || record.original_traffic_source === "") {
        const latestTsIndex = headerIndexMap["Latest Traffic Source"];
        if (latestTsIndex !== undefined && values[latestTsIndex]) {
          record.original_traffic_source = values[latestTsIndex];
        }
      }

      // Track duplicates
      if (recordsMap.has(recordId)) {
        duplicatesSkipped++;
      }
      
      // Store (overwrites any previous occurrence - keeps last)
      recordsMap.set(recordId, record);
    }

    const uniqueRecords = Array.from(recordsMap.values());
    console.log(`Unique records: ${uniqueRecords.length}, duplicates merged: ${duplicatesSkipped}`);

    // Process in larger batches for efficiency
    const BATCH_SIZE = 500;
    const summary = {
      total_rows: lines.length - 1,
      unique_records: uniqueRecords.length,
      duplicates_merged: duplicatesSkipped,
      processed: 0,
      errors: 0,
      error_details: [] as string[],
    };

    for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
      const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .upsert(batch, { 
          onConflict: "record_id",
          ignoreDuplicates: false 
        })
        .select("record_id");

      if (error) {
        console.error(`Batch ${i}-${i + batch.length} error:`, error);
        summary.errors += batch.length;
        summary.error_details.push(`Batch error: ${error.message}`);
      } else {
        summary.processed += data?.length || batch.length;
      }

      console.log(`Processed ${Math.min(i + BATCH_SIZE, uniqueRecords.length)}/${uniqueRecords.length}`);
    }

    console.log("Import complete:", summary);

    return new Response(
      JSON.stringify({ 
        success: true, 
        summary: {
          total_rows: summary.total_rows,
          unique_records: summary.unique_records,
          duplicates_merged: summary.duplicates_merged,
          processed: summary.processed,
          errors: summary.errors,
          error_details: summary.error_details.slice(0, 5),
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
