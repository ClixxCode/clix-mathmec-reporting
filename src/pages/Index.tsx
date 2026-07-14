import { useRef, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { FunnelMetrics } from "@/components/dashboard/FunnelMetrics";
import { QualityTrendsTable } from "@/components/dashboard/QualityTrendsTable";
import { CampaignPerformance } from "@/components/dashboard/CampaignPerformance";
import { LocationPerformance } from "@/components/dashboard/LocationPerformance";
import { InvestmentReturns } from "@/components/dashboard/InvestmentReturns";
import { ExecutiveSummaryDesktop, ExecutiveSummaryMobile } from "@/components/dashboard/ExecutiveSummary";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { QuarterlyReview } from "@/components/dashboard/QuarterlyReview";
import { DashboardFiltersProvider, useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { Download, Loader2, CalendarDays, CalendarRange, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import mathmecLogo from "@/assets/mathews-logo-white.png";
import html2pdf from "html2pdf.js";
import { QualityInsights } from "@/components/dashboard/QualityInsights";

function DashboardContent() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState<"monthly" | "quarterly" | "quality">("monthly");
  const { filters } = useDashboardFilters();

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsGenerating(true);
    
    try {
      const monthLabel = format(filters.selectedMonth, "MMMM-yyyy");
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `Mathews-Mechanical-${monthLabel}-Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
        },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(contentRef.current).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const monthLabel = format(filters.selectedMonth, "MMMM yyyy");
  const periodLabel = view === "monthly" || view === "quality" ? monthLabel : "Quarterly Review";

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-gray-200 bg-white">
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Reports</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <button
            onClick={() => setView("monthly")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              view === "monthly"
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <CalendarDays className="w-4 h-4" />
            Monthly Review
          </button>
          <button
            onClick={() => setView("quarterly")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              view === "quarterly"
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <CalendarRange className="w-4 h-4" />
            Quarterly Review
          </button>
          <button
            onClick={() => setView("quality")}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              view === "quality"
                ? "bg-primary/10 text-primary"
                : "text-gray-700 hover:bg-gray-100"
            )}
          >
            <FlaskConical className="w-4 h-4" />
            <span className="flex-1 text-left">Quality Insights</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              Beta
            </span>
          </button>
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
      {/* Header */}
      <header className="border-b border-gray-700" style={{ backgroundColor: '#1A3140' }}>
        <div className="container py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={mathmecLogo} alt="Mathews Mechanical" className="h-20 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-white">Performance Report</h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-300 text-sm">{periodLabel}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-gray-300 px-2 py-0.5 rounded">Google Ads</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              {(view === "monthly" || view === "quality") && <MonthSelector />}
              {view === "monthly" && (
              <Button
                onClick={handleDownloadPDF}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {isGenerating ? "Generating..." : "Download One-Pager"}
              </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile floating button */}
      {view === "monthly" && <ExecutiveSummaryMobile />}

      {view === "monthly" ? (
      <main ref={contentRef} className="container py-8 space-y-8">
        {/* Data Source Notice */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <strong>Note:</strong> This performance report reflects data exclusively from paid search advertising (Google Ads) and does not represent all digital marketing efforts.
        </div>
        {/* Funnel Metrics */}
        <section>
          <FunnelMetrics />
        </section>

        {/* Investment & Returns */}
        <section>
          <InvestmentReturns />
        </section>

        {/* Two Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QualityTrendsTable />
          <LocationPerformance />
        </section>

        {/* Campaign Performance */}
        <section>
          <CampaignPerformance />
        </section>

        {/* Key Findings - Below the table */}
        <section>
          <ExecutiveSummaryDesktop />
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 py-6 border-t border-gray-200">
          <p>Report generated for Mathews Mechanical • {monthLabel} • Data source: Google Ads</p>
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition-colors mt-2 inline-block">
            Admin
          </Link>
        </footer>
      </main>
      ) : view === "quarterly" ? (
      <main className="container py-8 space-y-8">
        <QuarterlyReview />
        <footer className="text-center text-sm text-gray-400 py-6 border-t border-gray-200">
          <p>Quarterly review for Mathews Mechanical • Data source: HubSpot</p>
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition-colors mt-2 inline-block">
            Admin
          </Link>
        </footer>
      </main>
      ) : (
      <main className="container py-8 space-y-8">
        <QualityInsights />
        <footer className="text-center text-sm text-gray-400 py-6 border-t border-gray-200">
          <p>Quality Insights (Beta) • {monthLabel} • Sources: Google Ads, HubSpot, AI scoring</p>
          <Link to="/admin" className="text-gray-400 hover:text-gray-600 transition-colors mt-2 inline-block">
            Admin
          </Link>
        </footer>
      </main>
      )}
      </div>
    </div>
  );
}

const Index = () => {
  return (
    <DashboardFiltersProvider>
      <DashboardContent />
    </DashboardFiltersProvider>
  );
};

export default Index;
