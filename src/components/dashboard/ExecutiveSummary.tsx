import { Lightbulb, Loader2, RefreshCw, AlertCircle, Upload, FileText } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

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
  const [uploadedContent, setUploadedContent] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const fileName = file.name.toLowerCase();
      
      // Handle text-based files directly
      if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        const text = await file.text();
        setUploadedContent(text);
        toast({
          title: "Document uploaded",
          description: `Loaded content from ${file.name}`,
        });
      } else {
        // For other file types, show a message
        toast({
          title: "Unsupported format",
          description: "Please upload a .txt or .md file for now.",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error("File upload error:", err);
      toast({
        title: "Upload failed",
        description: "Could not read the file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearUploadedContent = () => {
    setUploadedContent(null);
  };

  const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => (
      <h1 className="text-xl font-bold text-foreground mt-6 mb-3 first:mt-0">{children}</h1>
    ),
    h2: ({ children }: { children?: React.ReactNode }) => (
      <h2 className="text-lg font-bold text-foreground mt-5 mb-2">{children}</h2>
    ),
    h3: ({ children }: { children?: React.ReactNode }) => (
      <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>
    ),
    p: ({ children }: { children?: React.ReactNode }) => (
      <p className="text-sm text-muted-foreground leading-relaxed my-3">{children}</p>
    ),
    ul: ({ children }: { children?: React.ReactNode }) => (
      <ul className="list-disc list-outside ml-5 my-3 space-y-2">{children}</ul>
    ),
    ol: ({ children }: { children?: React.ReactNode }) => (
      <ol className="list-decimal list-outside ml-5 my-3 space-y-2">{children}</ol>
    ),
    li: ({ children }: { children?: React.ReactNode }) => (
      <li className="text-sm text-muted-foreground leading-relaxed">{children}</li>
    ),
    strong: ({ children }: { children?: React.ReactNode }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
  };

  // Show uploaded content if available
  if (uploadedContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span>Uploaded document</span>
        </div>
        <div className="max-w-none">
          <ReactMarkdown components={markdownComponents}>{uploadedContent}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">Uploaded content</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearUploadedContent}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear & use AI
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Generating executive summary...</span>
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
        <div className="flex gap-2 flex-wrap">
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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-2"
          >
            <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-pulse' : ''}`} />
            Upload Document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.markdown"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  }

  const narrative = data?.narrative_text || data?.narrativeText || "";

  return (
    <div className="space-y-4">
      <div className="max-w-none">
        <ReactMarkdown components={markdownComponents}>{narrative}</ReactMarkdown>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">AI-generated summary</span>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Upload className="w-3 h-3" />
            Upload
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
            Regenerate
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.markdown"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}

export function ExecutiveSummaryDesktop() {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-6 relative shadow-sm">
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary shadow-lg shadow-primary/20 flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="space-y-4 flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-lg">Key Findings</h3>
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
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-primary shadow-lg shadow-primary/30 hover:bg-primary/90 transition-colors"
        aria-label="View Key Findings"
      >
        <Lightbulb className="w-5 h-5 text-primary-foreground" />
      </button>

      {/* Dialog popup */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary shadow-lg shadow-primary/20">
                <Lightbulb className="w-4 h-4 text-primary-foreground" />
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
