import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const headers: string[] = [];
  const rows: string[][] = [];
  
  // First, find and parse the header row
  const headerMatch = csvText.match(/Date & time,User,Campaign,Ad group,Changes/);
  if (headerMatch) {
    headers.push('Date & time', 'User', 'Campaign', 'Ad group', 'Changes');
  }
  
  // Now parse records - handle multi-line quoted fields
  const chars = csvText.split('');
  let inQuotes = false;
  let currentField = '';
  let currentRow: string[] = [];
  let foundHeader = false;
  
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    const nextChar = chars[i + 1];
    
    // Skip until we find the header
    if (!foundHeader) {
      if (csvText.substring(i, i + 15) === 'Date & time,Use') {
        foundHeader = true;
        // Skip to end of header line
        while (i < chars.length && chars[i] !== '\n') i++;
        continue;
      }
      continue;
    }
    
    if (char === '"') {
      // Check for escaped quote ("")
      if (nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip LF after CR
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.length >= 5 && currentRow[0]) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Handle last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length >= 5 && currentRow[0]) {
      rows.push(currentRow);
    }
  }
  
  return { headers, rows };
}

function categorizeChange(description: string): string {
  const lower = description.toLowerCase();
  
  if (lower.includes('negative') && (lower.includes('keyword added') || lower.includes('keywords added'))) {
    return 'negative_keyword_added';
  }
  if (lower.includes('keyword added') || lower.includes('keywords added')) {
    return 'keyword_added';
  }
  if (lower.includes('keyword removed') || lower.includes('keywords removed')) {
    return 'keyword_removed';
  }
  if (lower.includes('bid') || lower.includes('cpc') || lower.includes('budget')) {
    return 'bid_change';
  }
  if (lower.includes('age range') || lower.includes('audience') || lower.includes('targeting') || lower.includes('location')) {
    return 'targeting';
  }
  if (lower.includes('ad') && (lower.includes('added') || lower.includes('changed') || lower.includes('created'))) {
    return 'ad_change';
  }
  if (lower.includes('status changed') || lower.includes('paused') || lower.includes('enabled')) {
    return 'status_change';
  }
  if (lower.includes('customer manager')) {
    return 'system';
  }
  
  return 'other';
}

function parseDate(dateStr: string): Date | null {
  // Format: "Jan 31, 2026, 4:33:20 AM" or similar
  try {
    const cleaned = dateStr.replace(/"/g, '').trim();
    const date = new Date(cleaned);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch {
    // Fall through to manual parsing
  }
  
  // Manual parsing for "Jan 31, 2026, 4:33:20 AM"
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  try {
    const parts = dateStr.replace(/"/g, '').trim().split(',');
    if (parts.length >= 2) {
      const [monthDay, year] = [parts[0].trim(), parts[1].trim()];
      const [monthStr, day] = monthDay.split(' ');
      const month = months[monthStr];
      if (month !== undefined) {
        return new Date(parseInt(year), month, parseInt(day));
      }
    }
  } catch {
    return null;
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "mathmec" } });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing change history file: ${file.name}, size: ${file.size}`);
    
    const csvText = await file.text();
    const { headers, rows } = parseCSV(csvText);
    
    console.log(`Parsed ${rows.length} change records`);
    
    // Find column indices
    const dateIdx = headers.findIndex(h => h.toLowerCase().includes('date'));
    const userIdx = headers.findIndex(h => h.toLowerCase() === 'user');
    const campaignIdx = headers.findIndex(h => h.toLowerCase() === 'campaign');
    const adGroupIdx = headers.findIndex(h => h.toLowerCase().includes('ad group'));
    const changesIdx = headers.findIndex(h => h.toLowerCase() === 'changes');
    
    console.log(`Column indices: date=${dateIdx}, user=${userIdx}, campaign=${campaignIdx}, adGroup=${adGroupIdx}, changes=${changesIdx}`);
    
    const records: any[] = [];
    let skipped = 0;
    
    for (const row of rows) {
      const dateStr = row[dateIdx] || '';
      const changeDate = parseDate(dateStr);
      
      if (!changeDate) {
        skipped++;
        continue;
      }
      
      const changeDescription = row[changesIdx] || '';
      
      // Skip system/HubSpot automated changes
      if (changeDescription.toLowerCase().includes('customer manager')) {
        skipped++;
        continue;
      }
      
      records.push({
        change_date: changeDate.toISOString(),
        user_email: row[userIdx] || null,
        campaign: row[campaignIdx] || null,
        ad_group: row[adGroupIdx] || null,
        change_description: changeDescription,
        change_category: categorizeChange(changeDescription),
        raw_data: {
          original_row: row,
          headers: headers
        }
      });
    }
    
    console.log(`Prepared ${records.length} records for insert (skipped ${skipped})`);
    
    // Batch insert in chunks of 100
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('google_ads_changes').insert(batch);
      
      if (error) {
        console.error(`Batch insert error at ${i}:`, error);
        throw error;
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${records.length} records`);
    }
    
    // Get summary by month
    const { data: summary } = await supabase
      .from('google_ads_changes')
      .select('change_date, change_category')
      .order('change_date', { ascending: false });
    
    const byMonth: Record<string, Record<string, number>> = {};
    
    for (const record of summary || []) {
      const date = new Date(record.change_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[monthKey]) {
        byMonth[monthKey] = {};
      }
      
      const category = record.change_category || 'other';
      byMonth[monthKey][category] = (byMonth[monthKey][category] || 0) + 1;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_records: records.length,
          inserted: inserted,
          skipped: skipped,
          by_month: byMonth
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing change history:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
