import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function parseCSVLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvContent } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'CSV content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Google Ads performance import...');
    console.log('CSV content length:', csvContent.length);

    // Parse CSV - handle UTF-16 encoding artifacts and normalize
    const normalizedContent = csvContent
      .replace(/\0/g, '') // Remove null bytes from UTF-16
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const lines = normalizedContent.split('\n').filter((line: string) => line.trim());
    console.log('Total lines:', lines.length);

    // Find header row (contains "Day" or "Campaign")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('day') && line.includes('campaign')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Could not find header row with Day and Campaign columns' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Header found at line:', headerIndex);
    
    // Auto-detect delimiter: tabs or commas
    const headerLine = lines[headerIndex];
    const tabCount = (headerLine.match(/\t/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';
    console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
    
    const headers = parseCSVLine(headerLine, delimiter).map((h: string) => h.trim().toLowerCase());
    console.log('Headers:', headers);

    // Map column indices
    const colMap: Record<string, number> = {};
    headers.forEach((header: string, idx: number) => {
      if (header.includes('day')) colMap.date = idx;
      else if (header.includes('campaign')) colMap.campaign = idx;
      else if (header.includes('impr')) colMap.impressions = idx;
      else if (header.includes('clicks')) colMap.clicks = idx;
      else if (header.includes('cost') && !header.includes('conv') && !header.includes('cpc')) colMap.cost = idx;
      else if (header.includes('avg') && header.includes('cpc')) colMap.avg_cpc = idx;
      else if (header.includes('conversions') || header === 'conv.') colMap.conversions = idx;
      else if (header.includes('conv') && header.includes('rate')) colMap.conversion_rate = idx;
      else if (header.includes('cost') && header.includes('conv')) colMap.cost_per_conversion = idx;
      else if (header.includes('currency')) colMap.currency_code = idx;
    });

    console.log('Column mapping:', colMap);

    const records: Array<{
      date: string;
      campaign: string;
      impressions: number;
      clicks: number;
      cost: number;
      avg_cpc: number;
      conversions: number;
      conversion_rate: number;
      cost_per_conversion: number;
      currency_code: string;
    }> = [];

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line, delimiter);
      
      const dateVal = values[colMap.date] || '';
      const campaignVal = values[colMap.campaign] || '';
      
      // Skip if no valid date or campaign
      if (!dateVal || !campaignVal || !dateVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
        console.log('Skipping invalid row:', { dateVal, campaignVal });
        continue;
      }

      // Parse numeric values
      const parseNum = (val: string | undefined): number => {
        if (!val) return 0;
        const cleaned = val.replace(/[^0-9.-]/g, '');
        return parseFloat(cleaned) || 0;
      };

      const parsePercent = (val: string | undefined): number => {
        if (!val) return 0;
        const cleaned = val.replace(/[%,]/g, '');
        return parseFloat(cleaned) || 0;
      };

      records.push({
        date: dateVal,
        campaign: campaignVal,
        impressions: Math.round(parseNum(values[colMap.impressions])),
        clicks: Math.round(parseNum(values[colMap.clicks])),
        cost: parseNum(values[colMap.cost]),
        avg_cpc: parseNum(values[colMap.avg_cpc]),
        conversions: parseNum(values[colMap.conversions]),
        conversion_rate: parsePercent(values[colMap.conversion_rate]),
        cost_per_conversion: parseNum(values[colMap.cost_per_conversion]),
        currency_code: values[colMap.currency_code] || 'USD',
      });
    }

    console.log('Parsed records:', records.length);
    if (records.length > 0) {
      console.log('Sample record:', records[0]);
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert in batches
    const BATCH_SIZE = 100;
    let inserted = 0;
    let updated = 0;
    let errors: string[] = [];

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      
      const { data, error } = await supabase
        .from('google_ads_performance')
        .upsert(batch, { 
          onConflict: 'date,campaign',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Batch insert error:', error);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        inserted += data?.length || batch.length;
      }
    }

    const result = {
      success: true,
      imported: inserted,
      totalParsed: records.length,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('Import complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Import error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
