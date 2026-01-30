import { useRef, useState } from "react";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { QualityTrendsTable } from "@/components/dashboard/QualityTrendsTable";
import { LocationPerformance } from "@/components/dashboard/LocationPerformance";
import { DealsTable } from "@/components/dashboard/DealsTable";
import { ExecutiveSummaryDesktop, ExecutiveSummaryMobile } from "@/components/dashboard/ExecutiveSummary";
import { Glossary } from "@/components/dashboard/Glossary";
import { DollarSign, Phone, Users, TrendingUp, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import mathmecLogo from "@/assets/mathmec-logo.png";
import { getDecemberMetrics } from "@/data/leads";
import html2pdf from "html2pdf.js";

const Index = () => {
  const decemberMetrics = getDecemberMetrics();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    setIsGenerating(true);
    
    try {
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: 'Mathews-Mechanical-December-2025-Report.pdf',
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-900 rounded-xl">
                <img src={mathmecLogo} alt="Mathews Mechanical" className="h-10 w-auto" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Performance Report</h1>
                <p className="text-gray-500 text-sm">December 2025</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium shadow-sm shadow-blue-600/20">
                One-Pager Dashboard
              </span>
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
                {isGenerating ? "Generating..." : "Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile floating button */}
      <ExecutiveSummaryMobile />

      <main ref={contentRef} className="container py-8 space-y-8">
        {/* Executive Summary - Sticky on desktop */}
        <section className="hidden lg:block">
          <ExecutiveSummaryDesktop />
        </section>

        {/* Key Metrics */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Spend"
              value="$2,814"
              subtitle="December Paid Search budget"
              icon={DollarSign}
              variant="blue"
            />
            <MetricCard
              title="Conversions"
              value={decemberMetrics.conversions}
              subtitle="Paid Search campaigns"
              icon={Users}
              variant="green"
            />
            <MetricCard
              title="Contacts"
              value={decemberMetrics.totalContacts}
              subtitle="Calls & Form Submissions"
              icon={Phone}
              variant="purple"
            />
            <MetricCard
              title="Quality Rate"
              value={`${decemberMetrics.qualityRate}`}
              subtitle="Contact Quality"
              icon={TrendingUp}
              variant="orange"
              tooltipContent={
                <div className="space-y-2 text-xs">
                  <p className="font-semibold text-foreground">Quality Scoring Model (0-30 pts)</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Service Relevance:</span> 0-8 pts</li>
                    <li><span className="font-medium text-foreground">Project Specificity:</span> 0-7 pts</li>
                    <li><span className="font-medium text-foreground">Commercial Intent:</span> 0-6 pts</li>
                    <li><span className="font-medium text-foreground">Engagement Quality:</span> 0-5 pts</li>
                    <li><span className="font-medium text-foreground">Conversion Indicators:</span> 0-7 pts</li>
                  </ul>
                </div>
              }
            />
          </div>
        </section>

        {/* Two Column Layout */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QualityTrendsTable />
          <LocationPerformance />
        </section>

        {/* Deals Table */}
        <section>
          <DealsTable />
        </section>

        {/* Glossary */}
        <Glossary />

        {/* Footer */}
        <footer className="text-center text-sm text-gray-400 py-6 border-t border-gray-200">
          <p>Report generated for Mathews Mechanical • December 2025</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
