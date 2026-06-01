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
    queryKey: ["quality-trends-paid-search-leads"],
    queryFn: async (): Promise<QualityTrendRow[]> => {
      // Get Paid Search contacts (the universe for monthly totals)
      const { data: contacts, error: cErr } = await supabase
        .from("hubspot_contacts")
        .select("record_id, hubspot_create_date")
        .ilike("original_traffic_source", "Paid Search")
        .not("hubspot_create_date", "is", null)
        .order("hubspot_create_date", { ascending: false });
      if (cErr) throw cErr;

      // Get all leads — used to layer lead stage onto contacts via associated_contact_id
      const { data: leads, error: lErr } = await supabase
        .from("hubspot_leads")
        .select("associated_contact_id, lead_stage");
      if (lErr) throw lErr;

      // Map contact_id -> lead_stage (if any)
      const leadByContact = new Map<string, string>();
      leads?.forEach((l) => {
        if (l.associated_contact_id && l.lead_stage) {
          // Keep first seen; multiple leads per contact are rare
          if (!leadByContact.has(l.associated_contact_id)) {
            leadByContact.set(l.associated_contact_id, l.lead_stage);
          }
        }
      });

      const monthlyData: Record<string, {
        count: number;
        qualified: number;
        disqualified: number;
        reviewedCount: number;
      }> = {};

      contacts?.forEach((c) => {
        if (!c.hubspot_create_date) return;
        const date = new Date(c.hubspot_create_date);
        const monthKey = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { count: 0, qualified: 0, disqualified: 0, reviewedCount: 0 };
        }
        monthlyData[monthKey].count++;

        const stage = leadByContact.get(c.record_id);
        if (!stage) return;
        const s = stage.trim().toLowerCase();
        // Qualified bucket: Qualified + Connected (In Progress)
        if (s === "qualified" || s === "connected") {
          monthlyData[monthKey].qualified++;
          monthlyData[monthKey].reviewedCount++;
        } else if (s === "disqualified") {
          monthlyData[monthKey].disqualified++;
          monthlyData[monthKey].reviewedCount++;
        } else {
          // New / Attempting — open, exclude from denominator
          monthlyData[monthKey].reviewedCount++;
        }
      });

      const result = Object.entries(monthlyData)
        .map(([month, d]) => {
          const denom = d.qualified + d.disqualified;
          const qualificationRate = denom > 0 ? Math.round((d.qualified / denom) * 100) : 0;
          const unreviewedPercent = d.count > 0 ? ((d.count - d.reviewedCount) / d.count) * 100 : 0;
          return {
            month,
            totalContacts: d.count,
            qualificationRate,
            unqualifiedCount: d.disqualified,
            reviewedCount: d.reviewedCount,
            dataQualityWarning: unreviewedPercent > 50,
          };
        })
        .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

      return result;
    },
  });
}
