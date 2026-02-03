import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

interface MonthlyData {
  month: string;
  count: number;
  paid_search: number;
  avg_quality: number | null;
}

interface ContactAnalyticsResponse {
  total_contacts: number;
  paid_search_contacts: number;
  filtered_count: number;
  by_month?: MonthlyData[];
  by_source?: Record<string, number>;
}

export function useContactAnalytics() {
  const { filters } = useDashboardFilters();

  return useQuery({
    queryKey: ["contact-analytics", filters.startDate, filters.endDate],
    queryFn: async (): Promise<ContactAnalyticsResponse> => {
      const { data, error } = await supabase.functions.invoke("contact-analytics", {
        body: null,
      });

      if (error) throw error;
      return data;
    },
  });
}

export function useMonthlyMetrics() {
  const { filters } = useDashboardFilters();

  return useQuery({
    queryKey: ["monthly-metrics", filters.startDate, filters.endDate],
    queryFn: async () => {
      // Query only Paid Search contacts for the selected month
      const { data: contacts, error, count } = await supabase
        .from("hubspot_contacts")
        .select("*", { count: "exact" })
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", filters.startDate)
        .lte("hubspot_create_date", filters.endDate + "T23:59:59");

      if (error) throw error;

      const paidSearchContacts = count || 0;

      // Calculate average quality (if quality_score exists)
      const qualityScores = contacts
        ?.filter((c) => c.quality_score !== null)
        .map((c) => c.quality_score as number) || [];
      
      const avgQuality = qualityScores.length > 0
        ? Math.round((qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length) * 10) / 10
        : null;

      return {
        totalContacts: paidSearchContacts, // Now shows Paid Search only
        paidSearchContacts,
        avgQuality,
        conversions: paidSearchContacts,
      };
    },
  });
}

export interface QualityTrendRow {
  month: string;
  totalContacts: number;
  qualificationRate: number;
  unqualifiedCount: number;
  reviewedCount: number;
  dataQualityWarning: boolean;
}

export function useQualityTrends() {
  return useQuery({
    queryKey: ["quality-trends-paid-search"],
    queryFn: async (): Promise<QualityTrendRow[]> => {
      // Get only Paid Search contacts grouped by month
      const { data: contacts, error } = await supabase
        .from("hubspot_contacts")
        .select("hubspot_create_date, lead_status, original_traffic_source")
        .ilike("original_traffic_source", "Paid Search")
        .not("hubspot_create_date", "is", null)
        .order("hubspot_create_date", { ascending: false });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { 
        count: number; 
        unqualifiedCount: number;
        reviewedCount: number;
      }> = {};

      contacts?.forEach((contact) => {
        if (!contact.hubspot_create_date) return;
        
        const date = new Date(contact.hubspot_create_date);
        const monthKey = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;

        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, unqualifiedCount: 0, reviewedCount: 0 };
        }

        monthlyData[monthKey].count++;
        
        // Track lead status
        const status = contact.lead_status?.toLowerCase();
        if (status) {
          monthlyData[monthKey].reviewedCount++;
          if (status === "unqualified") {
            monthlyData[monthKey].unqualifiedCount++;
          }
        }
      });

      // Convert to array and sort by date (most recent first)
      const result = Object.entries(monthlyData)
        .map(([month, data]) => {
          // Qualification rate: (Total - Unqualified) / Total * 100
          const qualificationRate = data.count > 0
            ? Math.round(((data.count - data.unqualifiedCount) / data.count) * 100)
            : 100;
          
          // Warning if more than 50% of contacts have no lead_status
          const unreviewedPercent = data.count > 0 
            ? ((data.count - data.reviewedCount) / data.count) * 100 
            : 0;
          
          return {
            month,
            totalContacts: data.count,
            qualificationRate,
            unqualifiedCount: data.unqualifiedCount,
            reviewedCount: data.reviewedCount,
            dataQualityWarning: unreviewedPercent > 50,
          };
        })
        .sort((a, b) => {
          const dateA = new Date(a.month);
          const dateB = new Date(b.month);
          return dateB.getTime() - dateA.getTime();
        });

      return result;
    },
  });
}
