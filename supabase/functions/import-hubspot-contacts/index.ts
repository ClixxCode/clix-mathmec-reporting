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

// Essential columns to keep in raw_data (reduces memory usage)
const ESSENTIAL_RAW_COLUMNS = [
  "Record ID", "First Name", "Last Name", "Email", "Phone Number",
  "Company Name", "City", "State/Region", "Country/Region",
  "Original Traffic Source", "Latest Traffic Source",
  "Original Traffic Source Drill-Down 1", "Original Traffic Source Drill-Down 2",
  "Lifecycle Stage", "Lead Status", "Message", "Create Date",
  "Contact owner", "Record source detail 1", "Incoming Lead Source",
];

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
    const lines = csvText.split(/\r?\n/);
    const totalLines = lines.length;
    
    // Find first non-empty line for headers
    let headerLineIndex = 0;
    while (headerLineIndex < lines.length && !lines[headerLineIndex].trim()) {
      headerLineIndex++;
    }
    
    if (headerLineIndex >= lines.length) {
      return new Response(
        JSON.stringify({ error: "CSV file is empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse headers
    const headers = parseCSVLine(lines[headerLineIndex]);
    console.log(`Found ${headers.length} columns`);

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

    // Delete all existing contacts before importing (replace mode)
    console.log("Clearing existing contacts...");
    const { error: deleteError } = await supabase
      .from("hubspot_contacts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Failed to clear existing contacts:", deleteError);
      return new Response(
        JSON.stringify({ error: `Failed to clear existing data: ${deleteError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("Cleared existing contacts");

    // Process in streaming batches to reduce memory
    const BATCH_SIZE = 100;
    const seenRecordIds = new Set<string>();
    let batch: Record<string, unknown>[] = [];
    let processed = 0;
    let skippedDuplicates = 0;
    let skippedEmpty = 0;
    let errors = 0;

    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      const recordId = values[recordIdIndex];
      
      if (!recordId || recordId.trim() === "") {
        skippedEmpty++;
        continue;
      }

      // Skip duplicates within file (keep first occurrence for streaming)
      if (seenRecordIds.has(recordId)) {
        skippedDuplicates++;
        continue;
      }
      seenRecordIds.add(recordId);

      // Build raw_data with only essential columns (reduces memory)
      const rawData: Record<string, string> = {};
      for (const col of ESSENTIAL_RAW_COLUMNS) {
        const idx = headerIndexMap[col];
        if (idx !== undefined) {
          rawData[col] = values[idx] || "";
        }
      }

      // Build record with mapped columns
      const record: Record<string, unknown> = { raw_data: rawData };

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

      batch.push(record);

      // Insert batch when full
      if (batch.length >= BATCH_SIZE) {
        const { error } = await supabase
          .from("hubspot_contacts")
          .insert(batch);

        if (error) {
          console.error(`Batch error at row ${i}:`, error.message);
          errors += batch.length;
        } else {
          processed += batch.length;
        }

        if (processed % 1000 === 0) {
          console.log(`Progress: ${processed} processed, ${errors} errors`);
        }

        batch = []; // Clear batch to free memory
      }
    }

    // Insert remaining records
    if (batch.length > 0) {
      const { error } = await supabase
        .from("hubspot_contacts")
        .insert(batch);

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
