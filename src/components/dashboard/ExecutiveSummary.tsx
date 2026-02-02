import { Lightbulb, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

function useExecutiveSummary() {
  const { filters } = useDashboardFilters();
  const monthYear = format(filters.selectedMonth, "yyyy-MM");

  return useQuery({
    queryKey: ["executive-summary", monthYear],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-campaign-narrative", {
        body: { month_year: monthYear },
      });

      if (error) {
        console.error("Error generating summary:", error);
        throw error;
      }

      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      return data;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: false,
  });
}

function KeyFindingsContent() {
  const { data, isLoading, error, refetch, isFetching } = useExecutiveSummary();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
        <span className="text-sm text-gray-600">Generating executive summary...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Unable to generate summary</p>
            <p className="text-amber-600 mt-1">{error instanceof Error ? error.message : "Please try again"}</p>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Retry
        </Button>
      </div>
    );
  }

  const narrative = data?.narrative_text || data?.narrativeText || "";

  return (
    <div className="space-y-4">
      <div className="prose prose-sm max-w-none text-gray-600 prose-headings:text-gray-900 prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-strong:text-gray-900">
        <ReactMarkdown>{narrative}</ReactMarkdown>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">AI-generated summary</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs text-gray-500 hover:text-gray-700"
        >
          <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
          Regenerate
        </Button>
      </div>
    </div>
  );
}

export function ExecutiveSummaryDesktop() {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 p-6 relative shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-4 flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-lg">Key Findings</h3>
          <KeyFindingsContent />
        </div>
      </div>
    </div>
  );
}

export function ExecutiveSummaryMobile() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  if (!isMobile) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors"
        aria-label="View Key Findings"
      >
        <Lightbulb className="w-5 h-5 text-white" />
      </button>

      {/* Dialog popup */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <span>Key Findings</span>
            </DialogTitle>
            <DialogDescription>
              AI-generated executive summary for this month
            </DialogDescription>
          </DialogHeader>
          <KeyFindingsContent />
        </DialogContent>
      </Dialog>
    </>
  );
}

// Legacy exports for compatibility
export function ExecutiveSummary() {
  return <ExecutiveSummaryDesktop />;
}

export function ExecutiveSummaryInline({ onScrolledPast }: { onScrolledPast?: (scrolled: boolean) => void }) {
  return <ExecutiveSummaryDesktop />;
}

export function ExecutiveSummarySticky({ visible }: { visible: boolean }) {
  return null;
}
