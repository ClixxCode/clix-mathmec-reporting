import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

export interface LocationPerformanceData {
  location: string;
  cost: number;
  percentBudget: number;
  clicks: number;
  impressions: number;
  conversions: number;
  cpc: number;
  ctr: number;
  costPerConversion: number | null;
}

export function useLocationPerformance() {
  const { filters } = useDashboardFilters();
  const selectedMonth = filters.selectedMonth;

  // Get first day of month for query
  const reportMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const { data, isLoading, error } = useQuery({
    queryKey: ["location-performance", reportMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ads_geo_performance")
        .select("location, cost, clicks, impressions, conversions, ctr, cost_per_conversion")
        .eq("report_month", reportMonth);

      if (error) throw error;

      // Aggregate by location
      const locationMap = new Map<string, {
        cost: number;
        clicks: number;
        impressions: number;
        conversions: number;
        ctrSum: number;
        ctrCount: number;
      }>();

      (data || []).forEach((row) => {
        const existing = locationMap.get(row.location) || {
          cost: 0,
          clicks: 0,
          impressions: 0,
          conversions: 0,
          ctrSum: 0,
          ctrCount: 0,
        };

        locationMap.set(row.location, {
          cost: existing.cost + Number(row.cost || 0),
          clicks: existing.clicks + Number(row.clicks || 0),
          impressions: existing.impressions + Number(row.impressions || 0),
          conversions: existing.conversions + Number(row.conversions || 0),
          ctrSum: existing.ctrSum + Number(row.ctr || 0),
          ctrCount: existing.ctrCount + 1,
        });
      });

      // Calculate totals and percentages
      const totalCost = Array.from(locationMap.values()).reduce((sum, loc) => sum + loc.cost, 0);

      const result: LocationPerformanceData[] = [];
      locationMap.forEach((metrics, location) => {
        // Skip Unknown locations
        if (location === "Unknown") return;

        result.push({
          location,
          cost: metrics.cost,
          percentBudget: totalCost > 0 ? (metrics.cost / totalCost) * 100 : 0,
          clicks: metrics.clicks,
          impressions: metrics.impressions,
          conversions: metrics.conversions,
          cpc: metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0,
          ctr: metrics.ctrCount > 0 ? metrics.ctrSum / metrics.ctrCount : 0,
          costPerConversion: metrics.conversions > 0 ? metrics.cost / metrics.conversions : null,
        });
      });

      // Sort by cost descending
      return result.sort((a, b) => b.cost - a.cost);
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    hasData: (data?.length || 0) > 0,
  };
}
