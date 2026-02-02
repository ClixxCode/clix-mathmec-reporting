import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

// Static Google Ads data from campaign_report.csv (pending API integration)
const STATIC_ADS_DATA = {
  spend: 2813.85,
  impressions: 15092,
  clicks: 982,
  conversions: 19,
};

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

  // Query Paid Search contacts for selected month
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["funnel-contacts", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hubspot_contacts")
        .select("*", { count: "exact", head: true })
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", filters.startDate)
        .lte("hubspot_create_date", filters.endDate + "T23:59:59");

      if (error) throw error;
      return count || 0;
    },
  });

  // Query all deals (they have linked contacts)
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["funnel-deals", filters.startDate, filters.endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_deals")
        .select("deal_stage, amount")
        .gte("create_date", filters.startDate)
        .lte("create_date", filters.endDate + "T23:59:59");

      if (error) throw error;

      const totalDeals = data?.length || 0;
      const wonDeals = data?.filter((d) =>
        d.deal_stage?.toLowerCase().includes("won")
      ) || [];
      const wonCount = wonDeals.length;
      const totalRevenue = wonDeals.reduce(
        (sum, d) => sum + (Number(d.amount) || 0),
        0
      );

      return {
        totalDeals,
        wonCount,
        totalRevenue,
      };
    },
  });

  // Calculate derived metrics
  const contacts = contactsData || 0;
  const deals = dealsData?.totalDeals || 0;
  const wonDeals = dealsData?.wonCount || 0;
  const revenue = dealsData?.totalRevenue || 0;

  // Top of funnel calculations
  const ctr = STATIC_ADS_DATA.impressions > 0
    ? (STATIC_ADS_DATA.clicks / STATIC_ADS_DATA.impressions) * 100
    : 0;
  const cpc = STATIC_ADS_DATA.clicks > 0
    ? STATIC_ADS_DATA.spend / STATIC_ADS_DATA.clicks
    : 0;
  const conversionRate = STATIC_ADS_DATA.clicks > 0
    ? (STATIC_ADS_DATA.conversions / STATIC_ADS_DATA.clicks) * 100
    : 0;

  // Bottom of funnel calculations
  const dealRate = contacts > 0 ? (deals / contacts) * 100 : 0;
  const winRate = deals > 0 ? (wonDeals / deals) * 100 : 0;
  const avgDealSize = wonDeals > 0 ? revenue / wonDeals : 0;

  return {
    // Static ads data
    spend: STATIC_ADS_DATA.spend,
    impressions: STATIC_ADS_DATA.impressions,
    clicks: STATIC_ADS_DATA.clicks,
    conversions: STATIC_ADS_DATA.conversions,
    ctr,
    cpc,
    conversionRate,

    // Live CRM data
    contacts,
    deals,
    wonDeals,
    revenue,
    dealRate,
    winRate,
    avgDealSize,

    isLoading: contactsLoading || dealsLoading,
  };
}
