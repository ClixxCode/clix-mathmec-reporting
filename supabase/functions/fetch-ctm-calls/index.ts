import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CTMCall {
  id: string | number;
  caller_number: string;
  tracking_number: string;
  duration: number;
  talk_time?: number;
  answered?: boolean;
  status?: string;
  call_status?: string;
  business_name?: string;
  called_at: string;
  source?: string;
  tracking_source?: {
    name: string;
  };
  score?: number;
  recording_url?: string;
  audio?: string;
  transcript?: string;
  transcription_text?: string;
  summary?: string;
  location?: string;
  gclid?: string;
  campaign?: string;
  ga?: {
    gclid?: string;
  };
}

interface CTMCallsResponse {
  calls: CTMCall[];
  page: number;
  total_pages: number;
  total_entries: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const CTM_API_KEY = Deno.env.get('CTM_API_KEY');
    const CTM_API_SECRET = Deno.env.get('CTM_API_SECRET');
    const CTM_ACCOUNT_ID = Deno.env.get('CTM_ACCOUNT_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!CTM_API_KEY) {
      throw new Error('CTM_API_KEY is not configured');
    }
    if (!CTM_API_SECRET) {
      throw new Error('CTM_API_SECRET is not configured');
    }
    if (!CTM_ACCOUNT_ID) {
      throw new Error('CTM_ACCOUNT_ID is not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { db: { schema: "mathmec" } });

    const { startDate, endDate } = await req.json();

    // Build date filter params
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('per_page', '100');

    const authHeader = btoa(`${CTM_API_KEY}:${CTM_API_SECRET}`);

    console.log(`Fetching CTM calls for account ${CTM_ACCOUNT_ID} from ${startDate} to ${endDate}`);

    const response = await fetch(
      `https://api.calltrackingmetrics.com/api/v1/accounts/${CTM_ACCOUNT_ID}/calls.json?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CTM API error [${response.status}]:`, errorText);
      throw new Error(`CTM API call failed [${response.status}]: ${errorText}`);
    }

    const data: CTMCallsResponse = await response.json();
    console.log(`Fetched ${data.calls?.length || 0} calls from CTM`);

    // Process call data for dashboard
    const calls = data.calls || [];
    
    // Log first call structure for debugging
    if (calls.length > 0) {
      console.log('Sample call structure:', JSON.stringify(calls[0], null, 2));
    }

    // Upsert calls into the database for persistent storage
    const callsToUpsert = calls.map(c => ({
      call_id: String(c.id),
      caller_number: c.caller_number,
      tracking_number: c.tracking_number,
      duration: c.duration || 0,
      talk_time: c.talk_time || 0,
      answered: c.status === 'answered' || c.call_status === 'answered' || (c.duration > 0),
      called_at: c.called_at ? new Date(c.called_at).toISOString() : null,
      source: typeof c.source === 'string' ? c.source : c.tracking_source?.name || null,
      score: c.score || null,
      recording_url: c.audio || c.recording_url || null,
      transcript: c.transcription_text || c.transcript || null,
      ai_summary: c.summary || null,
      gclid: c.ga?.gclid || c.gclid || null,
      campaign: c.campaign || null,
      location_url: c.location || null,
      raw_data: c,
    }));

    if (callsToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('ctm_calls')
        .upsert(callsToUpsert, { 
          onConflict: 'call_id',
          ignoreDuplicates: false 
        });

      if (upsertError) {
        console.error('Error upserting CTM calls:', upsertError);
      } else {
        console.log(`Upserted ${callsToUpsert.length} calls to database`);
      }
    }
    
    const totalCalls = calls.length;
    // Use talk_time > 0 OR duration > 0 as answered indicator (fallback for different API versions)
    const answeredCalls = calls.filter(c => 
      c.answered === true || 
      (c.talk_time && c.talk_time > 0) || 
      (c.duration && c.duration > 0)
    ).length;
    const missedCalls = totalCalls - answeredCalls;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    
    // Filter Google Ads attributed calls
    const googleAdsCalls = calls.filter(c => {
      // Source field is a direct string in CTM
      const sourceName = (typeof c.source === 'string' ? c.source : '').toLowerCase();
      const location = c.location?.toLowerCase() || '';
      
      // Check for Google Ads indicators
      const hasGoogleSource = sourceName.includes('google') || sourceName.includes('adwords') || sourceName.includes('ads');
      const hasGclid = location.includes('gclid=') || !!c.gclid || !!c.ga?.gclid;
      const hasUtmGoogle = location.includes('utm_source=google') || 
                           location.includes('utm_source=adwords') ||
                           location.includes('utm_medium=cpc') ||
                           location.includes('utm_medium=ppc');
      
      return hasGoogleSource || hasGclid || hasUtmGoogle;
    });

    console.log(`Google Ads calls: ${googleAdsCalls.length} out of ${totalCalls}`);

    // Calculate lead scores
    const scoredCalls = calls.filter(c => c.score !== undefined && c.score !== null);
    const avgLeadScore = scoredCalls.length > 0
      ? Math.round(scoredCalls.reduce((sum, c) => sum + (c.score || 0), 0) / scoredCalls.length)
      : null;

    const summary = {
      totalCalls,
      answeredCalls,
      missedCalls,
      answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
      totalDuration,
      avgDuration,
      googleAdsCalls: googleAdsCalls.length,
      avgLeadScore,
      // Include recent calls for display
      recentCalls: calls.slice(0, 20).map(c => ({
        id: String(c.id),
        callerNumber: c.caller_number,
        duration: c.duration,
        answered: c.status === 'answered' || c.call_status === 'answered' || (c.duration > 0),
        calledAt: c.called_at,
        source: typeof c.source === 'string' ? c.source : c.tracking_source?.name,
        score: c.score,
        hasRecording: !!(c.audio || c.recording_url),
        hasTranscript: !!(c.transcript || c.transcription_text),
        aiSummary: c.summary || null,
      })),
    };

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching CTM calls:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
