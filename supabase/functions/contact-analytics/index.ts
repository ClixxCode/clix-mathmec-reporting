import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Case-insensitive check for paid search
function isPaidSearch(source: string | null): boolean {
  if (!source) return false;
  return source.toLowerCase() === "paid search";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: "mathmec" } });

    const url = new URL(req.url);
    const source = url.searchParams.get("source");
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");
    const groupBy = url.searchParams.get("group_by"); // "month" or "source"

    // Build base query
    let query = supabase.from("hubspot_contacts").select("*", { count: "exact", head: false });

    // Apply filters
    if (source) {
      query = query.ilike("original_traffic_source", source);
    }
    if (startDate) {
      query = query.gte("hubspot_create_date", startDate);
    }
    if (endDate) {
      query = query.lte("hubspot_create_date", endDate);
    }

    const { data: contacts, count: totalCount, error } = await query;

    if (error) {
      console.error("Query error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get total contacts (unfiltered)
    const { count: allContactsCount } = await supabase
      .from("hubspot_contacts")
      .select("*", { count: "exact", head: true });

    // Get paid search count (case-insensitive)
    const { count: paidSearchCount } = await supabase
      .from("hubspot_contacts")
      .select("*", { count: "exact", head: true })
      .ilike("original_traffic_source", "Paid Search");

    // Build response based on groupBy parameter
    const response: Record<string, unknown> = {
      total_contacts: allContactsCount || 0,
      paid_search_contacts: paidSearchCount || 0,
      filtered_count: totalCount || 0,
    };

    if (groupBy === "month" && contacts) {
      // Group by month
      const byMonth: Record<string, { count: number; paid_search: number }> = {};
      
      for (const contact of contacts) {
        if (!contact.hubspot_create_date) continue;
        
        const date = new Date(contact.hubspot_create_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!byMonth[monthKey]) {
          byMonth[monthKey] = { count: 0, paid_search: 0 };
        }
        byMonth[monthKey].count++;
        
        if (isPaidSearch(contact.original_traffic_source)) {
          byMonth[monthKey].paid_search++;
        }
      }

      response.by_month = Object.entries(byMonth)
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => b.month.localeCompare(a.month));
    }

    if (groupBy === "source" && contacts) {
      // Group by source
      const bySource: Record<string, number> = {};
      
      for (const contact of contacts) {
        const sourceKey = contact.original_traffic_source || "Unknown";
        bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;
      }

      response.by_source = bySource;
    }

    // If no groupBy but we have contacts, include monthly breakdown for paid search
    if (!groupBy) {
      const { data: allContacts } = await supabase
        .from("hubspot_contacts")
        .select("hubspot_create_date, original_traffic_source");

      if (allContacts) {
        const byMonth: Record<string, { count: number; paid_search: number }> = {};
        
        for (const contact of allContacts) {
          if (!contact.hubspot_create_date) continue;
          
          const date = new Date(contact.hubspot_create_date);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          
          if (!byMonth[monthKey]) {
            byMonth[monthKey] = { count: 0, paid_search: 0 };
          }
          byMonth[monthKey].count++;
          
          if (isPaidSearch(contact.original_traffic_source)) {
            byMonth[monthKey].paid_search++;
          }
        }

        response.by_month = Object.entries(byMonth)
          .map(([month, data]) => ({ month, ...data }))
          .sort((a, b) => b.month.localeCompare(a.month));

        // Also include source breakdown
        const bySource: Record<string, number> = {};
        for (const contact of allContacts) {
          const sourceKey = contact.original_traffic_source || "Unknown";
          bySource[sourceKey] = (bySource[sourceKey] || 0) + 1;
        }
        response.by_source = bySource;
      }
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Analytics error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
