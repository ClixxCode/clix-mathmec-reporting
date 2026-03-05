import { useRef, useState } from "react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { FunnelMetrics } from "@/components/dashboard/FunnelMetrics";
import { QualityTrendsTable } from "@/components/dashboard/QualityTrendsTable";
import { CampaignPerformance } from "@/components/dashboard/CampaignPerformance";
import { LocationPerformance } from "@/components/dashboard/LocationPerformance";
import { ExecutiveSummaryDesktop, ExecutiveSummaryMobile } from "@/components/dashboard/ExecutiveSummary";
import { MonthSelector } from "@/components/dashboard/MonthSelector";
import { DashboardFiltersProvider, useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import mathmecLogo from "@/assets/mathews-logo-white.png";
import html2pdf from "html2pdf.js";

function DashboardContent() {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b border-gray-700" style={{ backgroundColor: '#1A3140' }}>
        <div className="container py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <img src={mathmecLogo} alt="Mathews Mechanical" className="h-20 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-white">Performance Report</h1>
                <div className="flex items-center gap-2">
                  <p className="text-gray-300 text-sm">{monthLabel}</p>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-gray-300 px-2 py-0.5 rounded">Google Ads</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MonthSelector />
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
            </div>
          </div>
        </div>
      </header>

      {/* Mobile floating button */}
      <ExecutiveSummaryMobile />

      <main ref={contentRef} className="container py-8 space-y-8">
        {/* Funnel Metrics */}
        <section>
          <FunnelMetrics />
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
