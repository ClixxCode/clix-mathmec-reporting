import { Lightbulb, Loader2, RefreshCw, AlertCircle, Upload, FileText, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

// Fetch existing narrative (either uploaded or AI-generated)
function useNarrativeData() {
  const { filters } = useDashboardFilters();
  const monthYear = format(filters.selectedMonth, "yyyy-MM");

  return useQuery({
    queryKey: ["narrative-data", monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_narratives")
        .select("*")
        .eq("month_year", monthYear)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Generate AI summary
function useGenerateSummary() {
  const { filters } = useDashboardFilters();
  const monthYear = format(filters.selectedMonth, "yyyy-MM");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-campaign-narrative", {
        body: { month_year: monthYear },
      });

      if (error) throw error;
      if (!data.success && data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative-data", monthYear] });
    },
  });
}

// Upload document mutation
function useUploadDocument() {
  const { filters } = useDashboardFilters();
  const monthYear = format(filters.selectedMonth, "yyyy-MM");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      const fileName = file.name.toLowerCase();
      let content = "";

      // Handle text-based files directly in browser
      if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.markdown')) {
        content = await file.text();
      } else if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
        // Send to edge function for parsing
        const base64 = await fileToBase64(file);
        const { data, error } = await supabase.functions.invoke("parse-document", {
          body: {
            fileContent: base64,
            fileName: file.name,
            monthYear: monthYear,
          },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);
        
        // Edge function handles the DB save, just invalidate cache
        return { success: true, fileName: file.name };
      } else {
        throw new Error("Unsupported file type. Please upload PDF, Word, or text files.");
      }

      // For text files, save directly to DB
      const { error } = await supabase
        .from("campaign_narratives")
        .upsert({
          month_year: monthYear,
          uploaded_content: content,
          uploaded_at: new Date().toISOString(),
          uploaded_filename: file.name,
          narrative_text: "",
          ai_generated: false,
          is_edited: true,
        }, {
          onConflict: "month_year",
        });

      if (error) throw error;
      return { success: true, fileName: file.name };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative-data", monthYear] });
    },
  });
}

// Clear uploaded content mutation
function useClearUploadedContent() {
  const { filters } = useDashboardFilters();
  const monthYear = format(filters.selectedMonth, "yyyy-MM");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("campaign_narratives")
        .update({
          uploaded_content: null,
          uploaded_at: null,
          uploaded_filename: null,
        })
        .eq("month_year", monthYear);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["narrative-data", monthYear] });
    },
  });
}

// Helper to convert file to base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

function InsightsContent() {
  const { data: narrativeData, isLoading: isLoadingData, error: dataError } = useNarrativeData();
  const generateSummary = useGenerateSummary();
  const uploadDocument = useUploadDocument();
  const clearUploaded = useClearUploadedContent();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await uploadDocument.mutateAsync({ file });
      toast({
        title: "Document uploaded",
        description: `Content saved from ${file.name}`,
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not process the file",
        variant: "destructive",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [uploadDocument, toast]);

  const handleClearUploaded = useCallback(async () => {
    try {
      await clearUploaded.mutateAsync();
      toast({
        title: "Upload cleared",
        description: "You can now generate an AI summary",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Could not clear uploaded content",
        variant: "destructive",
      });
    }
  }, [clearUploaded, toast]);

  const handleGenerateSummary = useCallback(async () => {
    try {
      await generateSummary.mutateAsync();
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Could not generate summary",
        variant: "destructive",
      });
    }
  }, [generateSummary, toast]);

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

  const isProcessing = uploadDocument.isPending || generateSummary.isPending || clearUploaded.isPending;

  // Loading state
  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading insights...</span>
      </div>
    );
  }

  // Check for uploaded content first (takes priority)
  const uploadedContent = narrativeData?.uploaded_content;
  const uploadedFilename = narrativeData?.uploaded_filename;

  if (uploadedContent) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
          <FileText className="w-4 h-4" />
          <span className="truncate flex-1">{uploadedFilename || "Uploaded document"}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearUploaded}
            disabled={isProcessing}
            className="h-6 px-2 text-xs hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        <div className="max-w-none">
          <ReactMarkdown components={markdownComponents}>{uploadedContent}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">From uploaded document</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <Upload className="w-3 h-3" />
            Replace
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  }

  // Check for AI-generated narrative
  const aiNarrative = narrativeData?.narrative_text;

  if (aiNarrative) {
    return (
      <div className="space-y-4">
        <div className="max-w-none">
          <ReactMarkdown components={markdownComponents}>{aiNarrative}</ReactMarkdown>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">AI-generated</span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Upload className="w-3 h-3" />
              Upload
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateSummary}
              disabled={isProcessing}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3 h-3 ${generateSummary.isPending ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </div>
    );
  }

  // No content - show options to generate or upload
  return (
    <div className="space-y-4">
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm mb-4">No insights available for this month yet.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateSummary}
            disabled={isProcessing}
            className="gap-2"
          >
            {generateSummary.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Lightbulb className="w-3.5 h-3.5" />
            )}
            Generate AI Summary
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="gap-2"
          >
            {uploadDocument.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            Upload Document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Supports PDF, Word, and text files
        </p>
      </div>

      {(dataError || generateSummary.error) && (
        <div className="flex items-start gap-2 text-amber-700 bg-amber-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Something went wrong</p>
            <p className="text-amber-600 mt-1">
              {dataError instanceof Error ? dataError.message : 
               generateSummary.error instanceof Error ? generateSummary.error.message : 
               "Please try again"}
            </p>
          </div>
        </div>
      )}
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
          <h3 className="font-semibold text-foreground text-lg">Insights</h3>
          <InsightsContent />
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
        aria-label="View Insights"
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
              <span>Insights</span>
            </DialogTitle>
            <DialogDescription>
              Monthly insights for this period
            </DialogDescription>
          </DialogHeader>
          <InsightsContent />
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
