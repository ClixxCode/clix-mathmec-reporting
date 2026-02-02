import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CTMAccount {
  id: number;
  name: string;
  status?: string;
  timezone?: string;
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

    // Check if CTM is configured
    if (!CTM_API_KEY || !CTM_API_SECRET || !CTM_ACCOUNT_ID) {
      return new Response(JSON.stringify({ 
        connected: false,
        error: 'CTM credentials not configured'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = btoa(`${CTM_API_KEY}:${CTM_API_SECRET}`);

    // Fetch account details from CTM API
    const response = await fetch(
      `https://api.calltrackingmetrics.com/api/v1/accounts/${CTM_ACCOUNT_ID}.json`,
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
      return new Response(JSON.stringify({ 
        connected: false,
        error: `Failed to fetch account: ${response.status}`
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const account: CTMAccount = await response.json();
    console.log('CTM Account:', JSON.stringify(account, null, 2));

    return new Response(JSON.stringify({
      connected: true,
      accountId: CTM_ACCOUNT_ID,
      accountName: account.name || `Account ${CTM_ACCOUNT_ID}`,
      status: account.status || 'active',
      timezone: account.timezone,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error fetching CTM account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      connected: false,
      error: errorMessage 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
