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

// CTM Account ID - will need to be configured
const CTM_ACCOUNT_ID = ""; // User will need to provide this

export function useCTMCalls() {
  const { filters } = useDashboardFilters();

  return useQuery({
    queryKey: ["ctm-calls", filters.startDate, filters.endDate],
    queryFn: async (): Promise<CTMCallSummary | null> => {
      // Skip if no account ID configured
      if (!CTM_ACCOUNT_ID) {
        console.log("CTM Account ID not configured");
        return null;
      }

      const { data, error } = await supabase.functions.invoke("fetch-ctm-calls", {
        body: {
          accountId: CTM_ACCOUNT_ID,
          startDate: filters.startDate,
          endDate: filters.endDate,
        },
      });

      if (error) {
        console.error("Error fetching CTM calls:", error);
        throw error;
      }

      return data;
    },
    enabled: !!CTM_ACCOUNT_ID,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
