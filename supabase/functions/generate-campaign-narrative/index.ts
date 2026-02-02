import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { month_year, performance_data } = await req.json();
    
    if (!month_year) {
      return new Response(
        JSON.stringify({ error: 'month_year is required (format: 2026-01)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse month to get date range
    const [year, month] = month_year.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    console.log(`Generating narrative for ${month_year} (${startDate.toISOString()} to ${endDate.toISOString()})`);

    // Fetch change history for the month
    const { data: changes, error: changesError } = await supabase
      .from('google_ads_changes')
      .select('*')
      .gte('change_date', startDate.toISOString())
      .lte('change_date', endDate.toISOString())
      .order('change_date', { ascending: true });

    if (changesError) {
      console.error('Error fetching changes:', changesError);
      throw changesError;
    }

    console.log(`Found ${changes?.length || 0} changes for ${month_year}`);

    // Summarize changes by category and campaign
    const changeSummary: Record<string, any> = {
      total_changes: changes?.length || 0,
      by_category: {},
      by_campaign: {},
      notable_changes: []
    };

    for (const change of changes || []) {
      // By category
      const cat = change.change_category || 'other';
      changeSummary.by_category[cat] = (changeSummary.by_category[cat] || 0) + 1;
      
      // By campaign
      if (change.campaign) {
        if (!changeSummary.by_campaign[change.campaign]) {
          changeSummary.by_campaign[change.campaign] = { total: 0, categories: {} };
        }
        changeSummary.by_campaign[change.campaign].total++;
        changeSummary.by_campaign[change.campaign].categories[cat] = 
          (changeSummary.by_campaign[change.campaign].categories[cat] || 0) + 1;
      }
      
      // Track notable changes (non-trivial ones)
      if (cat !== 'system' && change.change_description && 
          change.change_description.length > 20 &&
          changeSummary.notable_changes.length < 15) {
        changeSummary.notable_changes.push({
          date: change.change_date,
          campaign: change.campaign,
          description: change.change_description.substring(0, 200)
        });
      }
    }

    // Build the AI prompt
    const monthName = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    const systemPrompt = `You are a marketing analyst writing monthly campaign reports for Matthews Mechanical, a commercial metal fabrication and industrial services company. 

Your audience:
- Business owners and operations managers in metal fabrication, welding, and industrial trades
- They understand their business deeply but are NOT Google Ads experts
- They care about: getting quality leads, cost efficiency, and growing their business
- They appreciate plain language, not marketing jargon

Your writing style:
- Pragmatic and objective—state facts, explain what they mean for the business
- Performance-oriented—always connect back to quality contacts and business outcomes
- Use analogies from manufacturing/trades when helpful (e.g., "just like calibrating a machine for precision")
- Never be cocky or over-confident; acknowledge uncertainty and areas for improvement
- Keep paragraphs short and scannable
- Lead with what matters most to the business

Structure your narrative as:
1. **The Bottom Line** (1-2 sentences: what happened this month and why it matters)
2. **What We Did** (explain management decisions in plain language)
3. **What's Working** (connect to business outcomes)
4. **What Needs Attention** (honest assessment, next steps)
5. **Looking Ahead** (brief, actionable)

DO NOT:
- Use technical Google Ads jargon without explaining it
- List every keyword change (summarize patterns instead)
- Make promises or guarantees
- Use phrases like "we're crushing it" or "amazing results"`;

    const userPrompt = `Write a campaign management narrative for Matthews Mechanical for ${monthName}.

CHANGE HISTORY SUMMARY:
${JSON.stringify(changeSummary, null, 2)}

${performance_data ? `PERFORMANCE DATA:
${JSON.stringify(performance_data, null, 2)}` : ''}

Based on the management changes made this month, write a narrative that:
1. Explains what strategic decisions were made and why (in plain language)
2. Connects those decisions to business outcomes when possible
3. Uses manufacturing/trades analogies where helpful
4. Stays honest about what's working and what needs improvement

Remember: Your audience runs a metal fabrication business. They want to know if their marketing investment is bringing in quality leads, not technical details about match types or bid strategies.`;

    console.log('Calling Lovable AI Gateway...');
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const narrativeText = aiData.choices?.[0]?.message?.content || '';
    
    console.log('Generated narrative:', narrativeText.substring(0, 200) + '...');

    // Save the narrative
    const { data: savedNarrative, error: saveError } = await supabase
      .from('campaign_narratives')
      .upsert({
        month_year,
        narrative_text: narrativeText,
        ai_generated: true,
        is_edited: false,
        performance_context: performance_data || null,
        change_summary: changeSummary,
      }, {
        onConflict: 'month_year'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving narrative:', saveError);
      throw saveError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        narrative: savedNarrative,
        change_summary: changeSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating narrative:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
