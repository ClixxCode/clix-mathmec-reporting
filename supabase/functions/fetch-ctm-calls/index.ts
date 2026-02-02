import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CTMCall {
  id: string;
  caller_number: string;
  tracking_number: string;
  duration: number;
  talk_time: number;
  answered: boolean;
  called_at: string;
  source?: {
    name: string;
  };
  score?: number;
  recording_url?: string;
  transcript?: string;
  gclid?: string;
  campaign?: string;
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

    if (!CTM_API_KEY) {
      throw new Error('CTM_API_KEY is not configured');
    }
    if (!CTM_API_SECRET) {
      throw new Error('CTM_API_SECRET is not configured');
    }

    const { accountId, startDate, endDate } = await req.json();

    if (!accountId) {
      throw new Error('accountId is required');
    }

    // Build date filter params
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('per_page', '100');

    const authHeader = btoa(`${CTM_API_KEY}:${CTM_API_SECRET}`);

    console.log(`Fetching CTM calls for account ${accountId} from ${startDate} to ${endDate}`);

    const response = await fetch(
      `https://api.calltrackingmetrics.com/api/v1/accounts/${accountId}/calls.json?${params.toString()}`,
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
    
    const totalCalls = calls.length;
    const answeredCalls = calls.filter(c => c.answered).length;
    const missedCalls = totalCalls - answeredCalls;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    
    // Filter Google Ads attributed calls (have gclid or source contains Google/AdWords)
    const googleAdsCalls = calls.filter(c => 
      c.gclid || 
      c.source?.name?.toLowerCase().includes('google') ||
      c.source?.name?.toLowerCase().includes('adwords') ||
      c.source?.name?.toLowerCase().includes('ads')
    );

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
        id: c.id,
        callerNumber: c.caller_number,
        duration: c.duration,
        answered: c.answered,
        calledAt: c.called_at,
        source: c.source?.name,
        score: c.score,
        hasRecording: !!c.recording_url,
        hasTranscript: !!c.transcript,
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
