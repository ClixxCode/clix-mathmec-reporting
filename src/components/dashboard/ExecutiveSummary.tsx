import { Lightbulb, ChevronUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function KeyFindingsContent() {
  return (
    <div className="space-y-4">
      <div className="space-y-3 text-sm text-gray-600">
        <p>
          <strong className="text-gray-900">The bottom line:</strong> We're spending smarter, not more. By pausing
          campaigns that weren't working and switching to Performance Max, we're bringing in more quality leads without
          increasing our budget.
        </p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
            <span>
              <strong className="text-gray-900">Newark is carrying the team</strong> — it's generating most of our
              conversions at the lowest cost per lead.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
            <span>
              <strong className="text-gray-900">Metal Fabrication keywords are finally paying off</strong> — we've
              trimmed the fat and kept what actually drives business.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 shrink-0"></span>
            <span>
              <strong className="text-gray-900">Lead quality is climbing</strong> — we've gone from 62% to 78% quality
              rate since September, which is a solid improvement.
            </span>
          </li>
        </ul>
        <p>
          <strong className="text-gray-900">Next steps:</strong> Keep investing in what's working, then carefully test
          the waters in Seattle and Portland.
        </p>
      </div>
    </div>
  );
}

export function ExecutiveSummaryDesktop() {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMobile) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const scrolledPast = !entry.isIntersecting;
        setIsSticky(scrolledPast);
        
        // Reset expanded state when scrolling back to original position
        if (!scrolledPast) {
          setIsExpanded(false);
        }
      },
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [isMobile]);

  if (isMobile) return null;

  const fullPanel = (
    <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 p-6 relative shadow-lg">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 text-lg">Key Findings</h3>
          <KeyFindingsContent />
        </div>
      </div>
    </div>
  );

  const compactBar = (
    <div 
      className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 px-5 py-3 shadow-lg cursor-pointer hover:shadow-xl transition-shadow"
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <Lightbulb className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-semibold text-gray-900">Key Findings</h3>
        </div>
        <button
          className="p-1.5 rounded-lg hover:bg-blue-200/50 transition-colors text-gray-500 hover:text-gray-700"
          aria-label={isExpanded ? "Collapse Key Findings" : "Expand Key Findings"}
        >
          <ChevronUp className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? '' : 'rotate-180'}`} />
        </button>
      </div>
      
      {/* Expandable content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
      >
        <KeyFindingsContent />
      </div>
    </div>
  );

  return (
    <>
      {/* Original position - visible when not sticky */}
      <div 
        ref={containerRef}
        className="transition-opacity duration-300"
        style={{ opacity: isSticky ? 0 : 1 }}
      >
        {fullPanel}
      </div>
      
      {/* Compact floating bar - visible when sticky */}
      <div
        className="fixed top-20 left-1/2 -translate-x-1/2 z-40 w-full max-w-[1280px] px-4 transition-all duration-300"
        style={{
          opacity: isSticky ? 1 : 0,
          transform: `translateX(-50%) ${isSticky ? 'translateY(0)' : 'translateY(-20px)'}`,
          pointerEvents: isSticky ? "auto" : "none",
        }}
      >
        {compactBar}
      </div>
    </>
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
        <DialogContent className="max-w-[90vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                <Lightbulb className="w-4 h-4 text-white" />
              </div>
              <span>Key Findings</span>
            </DialogTitle>
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
