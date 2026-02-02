import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

export interface CTMCallSummary {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  answerRate: number;
  totalDuration: number;
  avgDuration: number;
  googleAdsCalls: number;
  avgLeadScore: number | null;
  recentCalls: {
    id: string;
    callerNumber: string;
    duration: number;
    answered: boolean;
    calledAt: string;
    source: string | null;
    score: number | null;
    hasRecording: boolean;
    hasTranscript: boolean;
  }[];
}

export function useCTMCalls() {
  const { filters } = useDashboardFilters();

  return useQuery({
    queryKey: ["ctm-calls", filters.startDate, filters.endDate],
    queryFn: async (): Promise<CTMCallSummary | null> => {
      const { data, error } = await supabase.functions.invoke("fetch-ctm-calls", {
        body: {
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });

      if (error) {
        console.error("Error fetching CTM calls:", error);
        throw error;
      }

      if (data?.error) {
        console.error("CTM API error:", data.error);
        return null;
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
