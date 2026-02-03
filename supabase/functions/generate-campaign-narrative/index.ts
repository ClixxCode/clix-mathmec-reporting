import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callLovableAI({
  lovableApiKey,
  systemPrompt,
  userPrompt,
  models,
}: {
  lovableApiKey: string;
  systemPrompt: string;
  userPrompt: string;
  models: string[];
}) {
  const url = 'https://ai.gateway.lovable.dev/v1/chat/completions';

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptLabel = `${model} (attempt ${attempt + 1}/2)`;
      console.log(`Calling Lovable AI Gateway: ${attemptLabel}`);

      const aiResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${lovableApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 3000,
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const narrativeText = aiData.choices?.[0]?.message?.content || '';
        return { ok: true as const, narrativeText, modelUsed: model };
      }

      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return {
          ok: false as const,
          status: 429,
          message: 'Rate limit exceeded. Please try again in a moment.',
          details: errorText,
        };
      }
      if (aiResponse.status === 402) {
        return {
          ok: false as const,
          status: 402,
          message: 'AI credits exhausted. Please add credits to continue.',
          details: errorText,
        };
      }

      if (aiResponse.status >= 500 && attempt < 1) {
        await sleep(400 * (attempt + 1));
        continue;
      }

      break;
    }
  }

  return {
    ok: false as const,
    status: 502,
    message: 'AI service temporarily unavailable. Please try again shortly.',
    details: null,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { month_year } = await req.json();
    
    if (!month_year) {
      return new Response(
        JSON.stringify({ error: 'month_year is required (format: 2026-01)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'AI is not configured (missing LOVABLE_API_KEY).' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse month to get date range
    const [year, month] = month_year.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    console.log(`Generating executive summary for ${month_year} (${startDateStr} to ${endDateStr})`);

    // ===============================
    // 1. Fetch Google Ads Changes
    // ===============================
    const { data: changes, error: changesError } = await supabase
      .from('google_ads_changes')
      .select('change_date, campaign, change_category, change_description')
      .gte('change_date', startDate.toISOString())
      .lte('change_date', endDate.toISOString())
      .order('change_date', { ascending: true });

    if (changesError) {
      console.error('Error fetching changes:', changesError);
    }
    console.log(`Found ${changes?.length || 0} Google Ads changes`);

    // Summarize changes
    const changeSummary: Record<string, any> = {
      total_changes: changes?.length || 0,
      by_category: {} as Record<string, number>,
      top_campaigns: [] as { campaign: string; count: number }[],
      notable_changes: [] as { date: string; campaign: string; description: string }[]
    };

    const campaignCounts: Record<string, number> = {};
    for (const change of changes || []) {
      const cat = change.change_category || 'other';
      changeSummary.by_category[cat] = (changeSummary.by_category[cat] || 0) + 1;
      
      if (change.campaign) {
        campaignCounts[change.campaign] = (campaignCounts[change.campaign] || 0) + 1;
      }
      
      if (cat !== 'system' && change.change_description?.length > 20 && changeSummary.notable_changes.length < 10) {
        changeSummary.notable_changes.push({
          date: change.change_date,
          campaign: change.campaign || 'Unknown',
          description: change.change_description.substring(0, 150)
        });
      }
    }
    changeSummary.top_campaigns = Object.entries(campaignCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([campaign, count]) => ({ campaign, count }));

    // ===============================
    // 2. Fetch Google Ads Performance
    // ===============================
    const { data: performance, error: perfError } = await supabase
      .from('google_ads_performance')
      .select('campaign, date, impressions, clicks, conversions, cost, cost_per_conversion')
      .gte('date', startDateStr)
      .lte('date', endDateStr);

    if (perfError) {
      console.error('Error fetching performance:', perfError);
    }
    console.log(`Found ${performance?.length || 0} performance records`);

    // Aggregate performance
    const perfSummary = {
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      total_cost: 0,
      avg_cost_per_conversion: 0,
      avg_ctr: 0,
      by_campaign: [] as { campaign: string; impressions: number; clicks: number; conversions: number; cost: number }[]
    };

    const campaignPerf: Record<string, { impressions: number; clicks: number; conversions: number; cost: number }> = {};
    for (const row of performance || []) {
      perfSummary.total_impressions += row.impressions || 0;
      perfSummary.total_clicks += row.clicks || 0;
      perfSummary.total_conversions += row.conversions || 0;
      perfSummary.total_cost += row.cost || 0;

      if (row.campaign) {
        if (!campaignPerf[row.campaign]) {
          campaignPerf[row.campaign] = { impressions: 0, clicks: 0, conversions: 0, cost: 0 };
        }
        campaignPerf[row.campaign].impressions += row.impressions || 0;
        campaignPerf[row.campaign].clicks += row.clicks || 0;
        campaignPerf[row.campaign].conversions += row.conversions || 0;
        campaignPerf[row.campaign].cost += row.cost || 0;
      }
    }

    perfSummary.avg_ctr = perfSummary.total_impressions > 0 
      ? (perfSummary.total_clicks / perfSummary.total_impressions) * 100 
      : 0;
    perfSummary.avg_cost_per_conversion = perfSummary.total_conversions > 0 
      ? perfSummary.total_cost / perfSummary.total_conversions 
      : 0;

    perfSummary.by_campaign = Object.entries(campaignPerf)
      .sort((a, b) => b[1].cost - a[1].cost)
      .slice(0, 8)
      .map(([campaign, data]) => ({ campaign, ...data }));

    // ===============================
    // 3. Fetch HubSpot Contacts
    // ===============================
    const { data: contacts, error: contactsError } = await supabase
      .from('hubspot_contacts')
      .select('hubspot_create_date, original_traffic_source, traffic_source_drill_down_1, quality_score, lead_status, state_region')
      .gte('hubspot_create_date', startDateStr)
      .lte('hubspot_create_date', endDateStr + 'T23:59:59');

    if (contactsError) {
      console.error('Error fetching contacts:', contactsError);
    }
    console.log(`Found ${contacts?.length || 0} contacts`);

    // Summarize contacts
    const contactSummary = {
      total_contacts: contacts?.length || 0,
      paid_search_contacts: 0,
      organic_contacts: 0,
      other_sources: 0,
      avg_quality_score: 0,
      high_quality_count: 0,
      low_quality_count: 0,
      by_source: {} as Record<string, number>,
      by_state: {} as Record<string, number>
    };

    let totalQuality = 0;
    let qualityCount = 0;
    for (const contact of contacts || []) {
      const source = (contact.original_traffic_source || 'Unknown').toLowerCase();
      
      if (source.includes('paid') || source.includes('ppc') || source.includes('cpc')) {
        contactSummary.paid_search_contacts++;
      } else if (source.includes('organic')) {
        contactSummary.organic_contacts++;
      } else {
        contactSummary.other_sources++;
      }

      const sourceName = contact.original_traffic_source || 'Unknown';
      contactSummary.by_source[sourceName] = (contactSummary.by_source[sourceName] || 0) + 1;

      if (contact.state_region) {
        contactSummary.by_state[contact.state_region] = (contactSummary.by_state[contact.state_region] || 0) + 1;
      }

      if (contact.quality_score !== null && contact.quality_score !== undefined) {
        totalQuality += contact.quality_score;
        qualityCount++;
        if (contact.quality_score >= 20) contactSummary.high_quality_count++;
        if (contact.quality_score < 10) contactSummary.low_quality_count++;
      }
    }
    contactSummary.avg_quality_score = qualityCount > 0 ? Math.round(totalQuality / qualityCount * 10) / 10 : 0;

    // ===============================
    // 4. Fetch HubSpot Deals
    // ===============================
    const { data: deals, error: dealsError } = await supabase
      .from('hubspot_deals')
      .select('create_date, close_date, deal_stage, amount, closed_amount, original_traffic_source, days_to_close')
      .or(`create_date.gte.${startDateStr},close_date.gte.${startDateStr}`)
      .or(`create_date.lte.${endDateStr}T23:59:59,close_date.lte.${endDateStr}T23:59:59`);

    if (dealsError) {
      console.error('Error fetching deals:', dealsError);
    }
    console.log(`Found ${deals?.length || 0} deals`);

    // Summarize deals
    const dealSummary = {
      deals_created: 0,
      deals_won: 0,
      total_revenue: 0,
      avg_deal_value: 0,
      avg_days_to_close: 0,
      pipeline_value: 0,
      by_stage: {} as Record<string, number>
    };

    let totalDaysToClose = 0;
    let daysToCloseCount = 0;

    for (const deal of deals || []) {
      // Count deals created in this month
      if (deal.create_date && deal.create_date >= startDateStr && deal.create_date <= endDateStr + 'T23:59:59') {
        dealSummary.deals_created++;
      }

      // Count deals closed/won in this month
      const stage = (deal.deal_stage || '').toLowerCase();
      if (stage.includes('won') || stage.includes('closed won')) {
        if (deal.close_date && deal.close_date >= startDateStr && deal.close_date <= endDateStr + 'T23:59:59') {
          dealSummary.deals_won++;
          dealSummary.total_revenue += deal.closed_amount || deal.amount || 0;
        }
      }

      // Pipeline value (open deals)
      if (!stage.includes('won') && !stage.includes('lost') && deal.amount) {
        dealSummary.pipeline_value += deal.amount;
      }

      // By stage
      const stageName = deal.deal_stage || 'Unknown';
      dealSummary.by_stage[stageName] = (dealSummary.by_stage[stageName] || 0) + 1;

      if (deal.days_to_close !== null && deal.days_to_close !== undefined) {
        totalDaysToClose += deal.days_to_close;
        daysToCloseCount++;
      }
    }

    dealSummary.avg_deal_value = dealSummary.deals_won > 0 
      ? Math.round(dealSummary.total_revenue / dealSummary.deals_won) 
      : 0;
    dealSummary.avg_days_to_close = daysToCloseCount > 0 
      ? Math.round(totalDaysToClose / daysToCloseCount) 
      : 0;

    // ===============================
    // 5. Fetch Google Ads Geo Performance
    // ===============================
    const reportMonthDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const { data: geoData, error: geoError } = await supabase
      .from('google_ads_geo_performance')
      .select('location, metro_area, conversions, cost, clicks, impressions')
      .eq('report_month', reportMonthDate);

    if (geoError) {
      console.error('Error fetching geo performance:', geoError);
    }
    console.log(`Found ${geoData?.length || 0} geo performance records`);

    // Aggregate geo data by location
    const geoSummary = {
      total_geo_conversions: 0,
      total_geo_cost: 0,
      by_location: {} as Record<string, { conversions: number; cost: number; clicks: number; impressions: number; cost_per_conversion: number }>
    };

    for (const row of geoData || []) {
      const location = row.location || 'Unknown';
      geoSummary.total_geo_conversions += Number(row.conversions) || 0;
      geoSummary.total_geo_cost += Number(row.cost) || 0;

      if (!geoSummary.by_location[location]) {
        geoSummary.by_location[location] = { conversions: 0, cost: 0, clicks: 0, impressions: 0, cost_per_conversion: 0 };
      }
      geoSummary.by_location[location].conversions += Number(row.conversions) || 0;
      geoSummary.by_location[location].cost += Number(row.cost) || 0;
      geoSummary.by_location[location].clicks += Number(row.clicks) || 0;
      geoSummary.by_location[location].impressions += Number(row.impressions) || 0;
    }

    // Calculate cost per conversion for each location
    for (const location of Object.keys(geoSummary.by_location)) {
      const loc = geoSummary.by_location[location];
      loc.cost_per_conversion = loc.conversions > 0 ? loc.cost / loc.conversions : 0;
    }

    // Sort locations by conversions descending
    const sortedLocations = Object.entries(geoSummary.by_location)
      .sort((a, b) => b[1].conversions - a[1].conversions);

    // ===============================
    // 6. Build the AI Prompt
    // ===============================
    const monthName = startDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    const systemPrompt = `You are a marketing analyst writing monthly executive summaries for Matthews Mechanical, a commercial metal fabrication and industrial services company. 

Your audience:
- Business owners and operations managers in metal fabrication, welding, and industrial trades
- They understand their business deeply but are NOT marketing experts
- They care about: getting quality leads, cost efficiency, and growing their business
- They appreciate plain language, not marketing jargon

Your writing style:
- Pragmatic and objective—state facts, explain what they mean for the business
- Performance-oriented—connect everything back to leads, revenue, and ROI
- Use analogies from manufacturing/trades when helpful (e.g., "just like calibrating a machine for precision")
- Never be cocky or over-confident; acknowledge uncertainty and areas for improvement
- Keep paragraphs short and scannable
- Use specific numbers—don't say "increased significantly," say "increased 23%"

CRITICAL FORMATTING RULES:
- Use proper markdown headers: ## for main sections, ### for subsections
- For bullet lists, put each item on its own line starting with "- " (dash space)
- For numbered lists, put each item on its own line starting with "1. ", "2. ", etc.
- Add a blank line before and after lists
- Never combine list items on the same line
- Wrap important metrics in **bold**

Structure your narrative as:
1. **Executive Summary** (2-3 sentences: headline metrics and what they mean)
1. **Executive Summary** (2-3 sentences: headline metrics and what they mean)
2. **Lead Generation** (contacts, quality scores, sources)
3. **Geographic Performance** (which locations are generating the best ROI)
4. **Revenue Impact** (deals won, pipeline, ROI on ad spend)
5. **Campaign Management** (what was changed and why it mattered)
6. **Looking Ahead** (brief action items as a numbered list)

DO NOT:
- Use technical marketing jargon without explaining it
- List every detail—focus on the story the data tells
- Make promises or guarantees
- Use phrases like "crushing it" or "amazing results"
- Put multiple list items on a single line`;

    const userPrompt = `Write an executive summary for Matthews Mechanical for ${monthName}.

=== GOOGLE ADS PERFORMANCE ===
Total Impressions: ${perfSummary.total_impressions.toLocaleString()}
Total Clicks: ${perfSummary.total_clicks.toLocaleString()}
Click-Through Rate: ${perfSummary.avg_ctr.toFixed(2)}%
Total Conversions: ${perfSummary.total_conversions}
Total Ad Spend: $${perfSummary.total_cost.toLocaleString()}
Cost per Conversion: $${perfSummary.avg_cost_per_conversion.toFixed(2)}

Top Campaigns by Spend:
${perfSummary.by_campaign.map(c => `- ${c.campaign}: $${c.cost.toLocaleString()} spend, ${c.conversions} conversions`).join('\n')}

=== LEAD GENERATION (HubSpot Contacts) ===
Total New Contacts: ${contactSummary.total_contacts}
Paid Search Leads: ${contactSummary.paid_search_contacts}
Organic Leads: ${contactSummary.organic_contacts}
Other Sources: ${contactSummary.other_sources}
Average Quality Score: ${contactSummary.avg_quality_score}/30
High Quality Leads (20+): ${contactSummary.high_quality_count}
Low Quality Leads (<10): ${contactSummary.low_quality_count}

Top Sources: ${Object.entries(contactSummary.by_source).slice(0, 5).map(([s, c]) => `${s}: ${c}`).join(', ')}
Top States: ${Object.entries(contactSummary.by_state).slice(0, 5).map(([s, c]) => `${s}: ${c}`).join(', ')}

=== DEALS & REVENUE ===
Deals Created This Month: ${dealSummary.deals_created}
Deals Won This Month: ${dealSummary.deals_won}
Revenue Closed: $${dealSummary.total_revenue.toLocaleString()}
Average Deal Value: $${dealSummary.avg_deal_value.toLocaleString()}
Average Days to Close: ${dealSummary.avg_days_to_close}
Open Pipeline Value: $${dealSummary.pipeline_value.toLocaleString()}

=== CAMPAIGN MANAGEMENT (${changeSummary.total_changes} changes made) ===
Changes by Type: ${Object.entries(changeSummary.by_category).map(([k, v]) => `${k}: ${v}`).join(', ')}

Most Active Campaigns: ${changeSummary.top_campaigns.map((c: any) => `${c.campaign} (${c.count} changes)`).join(', ')}

Notable Changes:
${changeSummary.notable_changes.map((c: any) => `- ${c.date}: ${c.campaign} - ${c.description}`).join('\n')}

=== GEOGRAPHIC PERFORMANCE (By Mathews Location) ===
Total Geo Conversions: ${geoSummary.total_geo_conversions}
Total Geo Spend: $${geoSummary.total_geo_cost.toLocaleString()}

Performance by Location:
${sortedLocations.map(([loc, data]) => `- ${loc}: ${data.conversions} conversions, $${data.cost.toFixed(0)} spend, $${data.cost_per_conversion.toFixed(2)} cost/conv`).join('\n')}

Best Performing Location: ${sortedLocations[0] ? `${sortedLocations[0][0]} with ${sortedLocations[0][1].conversions} conversions at $${sortedLocations[0][1].cost_per_conversion.toFixed(2)}/conversion` : 'N/A'}
${sortedLocations.length > 1 ? `Highest Cost per Conversion: ${[...sortedLocations].sort((a, b) => b[1].cost_per_conversion - a[1].cost_per_conversion)[0][0]} at $${[...sortedLocations].sort((a, b) => b[1].cost_per_conversion - a[1].cost_per_conversion)[0][1].cost_per_conversion.toFixed(2)}` : ''}

=== CALCULATED METRICS ===
Cost per Lead (Ad Spend / Paid Search Leads): $${contactSummary.paid_search_contacts > 0 ? (perfSummary.total_cost / contactSummary.paid_search_contacts).toFixed(2) : 'N/A'}
ROAS (Revenue / Ad Spend): ${perfSummary.total_cost > 0 ? (dealSummary.total_revenue / perfSummary.total_cost).toFixed(2) : 'N/A'}x

Write a cohesive executive summary that tells the story of this month's marketing performance. Connect the dots between ad spend, lead quality, geographic performance, and revenue outcomes. Be specific with numbers but explain what they mean for the business. Include insights about which locations are performing best and any opportunities to optimize underperforming markets.`;

    const aiResult = await callLovableAI({
      lovableApiKey,
      systemPrompt,
      userPrompt,
      models: ['google/gemini-3-flash-preview', 'google/gemini-2.5-flash', 'google/gemini-2.5-pro'],
    });

    if (!aiResult.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: aiResult.message,
          details: aiResult.details,
          status: aiResult.status,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const narrativeText = aiResult.narrativeText;
    console.log('Generated narrative:', narrativeText.substring(0, 200) + '...');

    // Build comprehensive summary for storage
    const fullSummary = {
      changes: changeSummary,
      performance: perfSummary,
      contacts: contactSummary,
      deals: dealSummary
    };

    // Save the narrative
    const { data: savedNarrative, error: saveError } = await supabase
      .from('campaign_narratives')
      .upsert({
        month_year,
        narrative_text: narrativeText,
        ai_generated: true,
        is_edited: false,
        performance_context: fullSummary,
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
        summary: fullSummary
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
