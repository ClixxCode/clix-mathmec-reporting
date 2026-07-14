import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

export interface FunnelMetrics {
  // Top of Funnel (Google Ads)
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate
  cpc: number; // Cost per click
  conversionRate: number;

  // Bottom of Funnel (Business Outcomes)
  contacts: number;
  formSubmissions: number; // Contacts with Incoming Lead Source = Form Submission
  deals: number;
  wonDeals: number;
  revenue: number;
  dealRate: number; // Contacts → Deals
  winRate: number; // Deals → Won
  avgDealSize: number;

  isLoading: boolean;
}

export function useFunnelMetrics(): FunnelMetrics {
  const { filters } = useDashboardFilters();

  // Query Google Ads performance data for selected month
  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ["google-ads-performance", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ads_performance")
        .select("cost, impressions, clicks, conversions")
        .gte("date", filters.startDate)
        .lte("date", filters.endDate);

      if (error) throw error;

      // Aggregate totals across all campaigns
      const totals = (data || []).reduce(
        (acc, row) => ({
          spend: acc.spend + (Number(row.cost) || 0),
          impressions: acc.impressions + (Number(row.impressions) || 0),
          clicks: acc.clicks + (Number(row.clicks) || 0),
          conversions: acc.conversions + (Number(row.conversions) || 0),
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      );

      return totals;
    },
  });

  // Query Paid Search contacts for selected month
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["funnel-contacts", filters.startDate, filters.endDate],
    queryFn: async () => {
      // Get all Paid Search contacts
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .select("raw_data")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", filters.startDate)
        .lte("hubspot_create_date", filters.endDate + "T23:59:59");

      if (error) throw error;

      const allContacts = data || [];
      const formSubmissions = allContacts.filter((c) => {
        const incomingSource = (c.raw_data as Record<string, unknown>)?.["Incoming Lead Source"];
        return incomingSource === "Form Submission";
      });

      return {
        total: allContacts.length,
        formSubmissions: formSubmissions.length,
      };
    },
  });

  // Pipeline: deals CREATED in this period (regardless of close status)
  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ["funnel-deals-pipeline", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_deals")
        .select("deal_stage, amount")
        .gte("create_date", filters.startDate)
        .lte("create_date", filters.endDate + "T23:59:59");
      if (error) throw error;
      return { totalDeals: data?.length || 0 };
    },
  });

  // Won/Revenue: deals CLOSED WON in this period (by close_date)
  const { data: wonData, isLoading: wonLoading } = useQuery({
    queryKey: ["funnel-deals-won", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_deals")
        .select("deal_stage, amount, close_date")
        .gte("close_date", filters.startDate)
        .lte("close_date", filters.endDate + "T23:59:59");
      if (error) throw error;
      const won = (data || []).filter((d) =>
        d.deal_stage?.toLowerCase().includes("won")
      );
      return {
        wonCount: won.length,
        totalRevenue: won.reduce((s, d) => s + (Number(d.amount) || 0), 0),
      };
    },
  });

  // Extract values with fallbacks
  const spend = adsData?.spend || 0;
  const impressions = adsData?.impressions || 0;
  const clicks = adsData?.clicks || 0;
  const conversions = adsData?.conversions || 0;

  const contacts = contactsData?.total || 0;
  const formSubmissions = contactsData?.formSubmissions || 0;
  const deals = pipelineData?.totalDeals || 0;
  const wonDeals = wonData?.wonCount || 0;
  const revenue = wonData?.totalRevenue || 0;

  // Top of funnel calculations
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

  // Bottom of funnel calculations
  const dealRate = contacts > 0 ? (deals / contacts) * 100 : 0;
  const winRate = deals > 0 ? (wonDeals / deals) * 100 : 0;
  const avgDealSize = wonDeals > 0 ? revenue / wonDeals : 0;

  return {
    // Live Google Ads data
    spend,
    impressions,
    clicks,
    conversions,

    ctr,
    cpc,
    conversionRate,

    // Live CRM data
    contacts,
    formSubmissions,
    deals,
    wonDeals,
    revenue,
    dealRate,
    winRate,
    avgDealSize,

    isLoading: adsLoading || contactsLoading || pipelineLoading || wonLoading,
  };
}
