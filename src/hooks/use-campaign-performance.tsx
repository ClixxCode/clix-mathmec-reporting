import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

interface CampaignPerformance {
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  costPerConversion: number | null;
  contacts: number;
  deals: number;
  dealValue: number;
}

// Normalize campaign names to match between Google Ads and HubSpot
const normalizeCampaignName = (name: string): string => {
  const lower = name.toLowerCase().trim();
  
  // Specific mappings for known mismatches
  const mappings: Record<string, string> = {
    "metal fabrication | all geos": "metalfab-all-geos",
    "metalfab-all-geos": "metalfab-all-geos",
    "fall protection | all geos": "fall protection | all geos",
    "metal fabrication | pmax": "metal fabrication | pmax",
  };
  
  return mappings[lower] || lower;
};

// Get display name for a normalized campaign
const getDisplayName = (normalizedName: string, originalNames: Map<string, string>): string => {
  return originalNames.get(normalizedName) || normalizedName;
};

export function useCampaignPerformance() {
  const { filters } = useDashboardFilters();
  const selectedMonth = filters.selectedMonth;

  const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

  // Fetch Google Ads performance data
  const { data: adsData, isLoading: adsLoading } = useQuery({
    queryKey: ["campaign-ads-performance", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ads_performance")
        .select("campaign, cost, impressions, clicks, conversions")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch HubSpot contacts by campaign
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ["campaign-contacts", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .select("traffic_source_drill_down_1")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch HubSpot deals by campaign
  const { data: dealsData, isLoading: dealsLoading } = useQuery({
    queryKey: ["campaign-deals", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_deals")
        .select("traffic_source_drill_down_1, amount")
        .ilike("original_traffic_source", "Paid Search")
        .gte("create_date", startDate.toISOString())
        .lte("create_date", endDate.toISOString());

      if (error) throw error;
      return data || [];
    },
  });

  // Aggregate data by campaign
  const campaignPerformance: CampaignPerformance[] = (() => {
    if (!adsData) return [];

    // Track original names for display
    const originalNames = new Map<string, string>();

    // Aggregate Google Ads data by normalized campaign name
    const adsMap = new Map<string, { spend: number; impressions: number; clicks: number; conversions: number }>();
    adsData.forEach((row) => {
      const normalized = normalizeCampaignName(row.campaign);
      if (!originalNames.has(normalized)) {
        originalNames.set(normalized, row.campaign); // Keep first (usually Google Ads) name for display
      }
      const existing = adsMap.get(normalized) || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      adsMap.set(normalized, {
        spend: existing.spend + Number(row.cost || 0),
        impressions: existing.impressions + Number(row.impressions || 0),
        clicks: existing.clicks + Number(row.clicks || 0),
        conversions: existing.conversions + Number(row.conversions || 0),
      });
    });

    // Count contacts by normalized campaign name
    const contactsMap = new Map<string, number>();
    contactsData?.forEach((row) => {
      const campaign = row.traffic_source_drill_down_1 || "Unknown";
      const normalized = normalizeCampaignName(campaign);
      if (!originalNames.has(normalized)) {
        originalNames.set(normalized, campaign);
      }
      contactsMap.set(normalized, (contactsMap.get(normalized) || 0) + 1);
    });

    // Aggregate deals by normalized campaign name
    const dealsMap = new Map<string, { count: number; value: number }>();
    dealsData?.forEach((row) => {
      const campaign = row.traffic_source_drill_down_1 || "Unknown";
      const normalized = normalizeCampaignName(campaign);
      if (!originalNames.has(normalized)) {
        originalNames.set(normalized, campaign);
      }
      const existing = dealsMap.get(normalized) || { count: 0, value: 0 };
      dealsMap.set(normalized, {
        count: existing.count + 1,
        value: existing.value + Number(row.amount || 0),
      });
    });

    // Merge all data
    const allCampaigns = new Set([
      ...adsMap.keys(),
      ...contactsMap.keys(),
      ...dealsMap.keys(),
    ]);

    const result: CampaignPerformance[] = [];
    allCampaigns.forEach((normalizedCampaign) => {
      const ads = adsMap.get(normalizedCampaign) || { spend: 0, impressions: 0, clicks: 0, conversions: 0 };
      const contacts = contactsMap.get(normalizedCampaign) || 0;
      const deals = dealsMap.get(normalizedCampaign) || { count: 0, value: 0 };

      // Only include campaigns that have some activity
      if (ads.spend > 0 || contacts > 0 || deals.count > 0) {
        result.push({
          campaign: getDisplayName(normalizedCampaign, originalNames),
          spend: ads.spend,
          impressions: ads.impressions,
          clicks: ads.clicks,
          conversions: ads.conversions,
          costPerConversion: ads.conversions > 0 ? ads.spend / ads.conversions : null,
          contacts,
          deals: deals.count,
          dealValue: deals.value,
        });
      }
    });

    // Sort by spend descending
    return result.sort((a, b) => b.spend - a.spend);
  })();

  return {
    data: campaignPerformance,
    isLoading: adsLoading || contactsLoading || dealsLoading,
  };
}
