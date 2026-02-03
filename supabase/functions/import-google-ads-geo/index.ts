import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Metro area to Mathews location mapping
const METRO_TO_LOCATION: Record<string, string> = {
  'san francisco-oakland-san jose ca': 'Newark',
  'seattle-tacoma wa': 'Seattle',
  'portland or': 'Portland',
  'denver co': 'Denver',
};

function mapMetroToLocation(metroArea: string): string {
  const normalized = metroArea.toLowerCase().trim();
  return METRO_TO_LOCATION[normalized] || 'Unknown';
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

    const { csvContent, reportMonth } = await req.json();
    
    if (!csvContent) {
      return new Response(
        JSON.stringify({ error: 'CSV content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!reportMonth) {
      return new Response(
        JSON.stringify({ error: 'Report month is required (YYYY-MM-DD format)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting Google Ads geo performance import...');
    console.log('Report month:', reportMonth);

    // Parse CSV - handle various encodings
    const normalizedContent = csvContent
      .replace(/\0/g, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    const lines = normalizedContent.split('\n').filter((line: string) => line.trim());
    console.log('Total lines:', lines.length);

    // Find header row (contains "Metro area" or "Conversions")
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i].toLowerCase();
      if (line.includes('metro area') && line.includes('conversions')) {
        headerIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      return new Response(
        JSON.stringify({ error: 'Could not find header row with Metro area and Conversions columns' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Header found at line:', headerIndex);
    
    // Auto-detect delimiter
    const headerLine = lines[headerIndex];
    const tabCount = (headerLine.match(/\t/g) || []).length;
    const commaCount = (headerLine.match(/,/g) || []).length;
    const delimiter = tabCount > commaCount ? '\t' : ',';
    console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : 'COMMA');
    
    // Parse header - handle quoted fields
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(headerLine).map(h => h.toLowerCase());
    console.log('Headers:', headers);

    // Map column indices
    const colMap: Record<string, number> = {};
    headers.forEach((header: string, idx: number) => {
      if (header.includes('metro area')) colMap.metro_area = idx;
      else if (header.includes('region')) colMap.region = idx;
      else if (header === 'conversions' || header === 'conv.') colMap.conversions = idx;
      else if (header.includes('cost') && header.includes('conv')) colMap.cost_per_conversion = idx;
      else if (header === 'clicks') colMap.clicks = idx;
      else if (header === 'ctr') colMap.ctr = idx;
      else if (header.includes('impr')) colMap.impressions = idx;
      else if (header.includes('currency')) colMap.currency_code = idx;
    });

    // Calculate cost from conversions * cost_per_conversion if cost column not present
    console.log('Column mapping:', colMap);

    const records: Array<{
      report_month: string;
      metro_area: string;
      location: string;
      region: string | null;
      conversions: number;
      cost: number;
      cost_per_conversion: number | null;
      clicks: number;
      ctr: number | null;
      impressions: number;
      currency_code: string;
      raw_data: Record<string, string>;
    }> = [];

    // Parse data rows
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      
      const metroArea = values[colMap.metro_area] || '';
      
      // Skip if no valid metro area
      if (!metroArea || metroArea.toLowerCase().includes('total')) {
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

      const conversions = parseNum(values[colMap.conversions]);
      const costPerConversion = parseNum(values[colMap.cost_per_conversion]);
      const cost = conversions * costPerConversion; // Calculate total cost

      // Build raw_data object for reference
      const rawData: Record<string, string> = {};
      headers.forEach((header, idx) => {
        if (values[idx]) rawData[header] = values[idx];
      });

      records.push({
        report_month: reportMonth,
        metro_area: metroArea,
        location: mapMetroToLocation(metroArea),
        region: values[colMap.region] || null,
        conversions,
        cost,
        cost_per_conversion: costPerConversion || null,
        clicks: Math.round(parseNum(values[colMap.clicks])),
        ctr: parsePercent(values[colMap.ctr]) || null,
        impressions: Math.round(parseNum(values[colMap.impressions])),
        currency_code: values[colMap.currency_code] || 'USD',
        raw_data: rawData,
      });
    }

    console.log('Parsed records:', records.length);
    if (records.length > 0) {
      console.log('Sample record:', records[0]);
      console.log('Location mapping summary:', 
        records.reduce((acc, r) => {
          acc[r.location] = (acc[r.location] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
    }

    if (records.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid data rows found in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert records
    const { data, error } = await supabase
      .from('google_ads_geo_performance')
      .upsert(records, { 
        onConflict: 'report_month,metro_area,region',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Upsert error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate by location for summary
    const locationSummary = records.reduce((acc, r) => {
      if (!acc[r.location]) {
        acc[r.location] = { conversions: 0, cost: 0, clicks: 0, impressions: 0 };
      }
      acc[r.location].conversions += r.conversions;
      acc[r.location].cost += r.cost;
      acc[r.location].clicks += r.clicks;
      acc[r.location].impressions += r.impressions;
      return acc;
    }, {} as Record<string, { conversions: number; cost: number; clicks: number; impressions: number }>);

    const result = {
      success: true,
      imported: data?.length || records.length,
      totalParsed: records.length,
      locationSummary,
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
