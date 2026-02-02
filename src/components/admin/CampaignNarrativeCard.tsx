import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, Sparkles, RefreshCw, Save, Loader2, CheckCircle2, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, subMonths } from "date-fns";

interface ChangesSummary {
  total_records: number;
  inserted: number;
  skipped: number;
  by_month: Record<string, Record<string, number>>;
}

interface Narrative {
  id: string;
  month_year: string;
  narrative_text: string;
  ai_generated: boolean;
  is_edited: boolean;
  change_summary: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function CampaignNarrativeCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [uploadSummary, setUploadSummary] = useState<ChangesSummary | null>(null);

  // Fetch changes count
  const { data: changesCount } = useQuery({
    queryKey: ["ads-changes-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("google_ads_changes")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch existing narrative for selected month
  const { data: narrative, isLoading: narrativeLoading } = useQuery({
    queryKey: ["campaign-narrative", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_narratives")
        .select("*")
        .eq("month_year", selectedMonth)
        .maybeSingle();
      
      if (error) throw error;
      return data as Narrative | null;
    },
  });

  // Generate months for selector (last 6 months)
  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy"),
    };
  });

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await supabase.functions.invoke("import-ads-changes", {
        body: formData,
      });

      if (response.error) throw new Error(response.error.message);

      const result = response.data as { success: boolean; summary: ChangesSummary };
      setUploadSummary(result.summary);
      
      queryClient.invalidateQueries({ queryKey: ["ads-changes-count"] });
      
      toast({
        title: "Import Complete",
        description: `Imported ${result.summary.inserted} campaign changes.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  }, [queryClient, toast]);

  const handleGenerateNarrative = async () => {
    setIsGenerating(true);
    
    try {
      const response = await supabase.functions.invoke("generate-campaign-narrative", {
        body: { 
          month_year: selectedMonth,
          performance_data: null // Could pass performance metrics here
        },
      });

      if (response.error) throw new Error(response.error.message);

      // Backend may return a friendly failure payload (HTTP 200) when AI is temporarily unavailable
      const result = response.data as any;
      if (result && result.success === false) {
        throw new Error(result.error || "Narrative generation failed.");
      }
      
      queryClient.invalidateQueries({ queryKey: ["campaign-narrative", selectedMonth] });
      
      toast({
        title: "Narrative Generated",
        description: "AI has created a campaign management summary.",
      });
    } catch (error) {
      console.error("Generate error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const saveNarrative = useMutation({
    mutationFn: async (text: string) => {
      const { error } = await supabase
        .from("campaign_narratives")
        .update({ 
          narrative_text: text,
          is_edited: true,
          updated_at: new Date().toISOString()
        })
        .eq("month_year", selectedMonth);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaign-narrative", selectedMonth] });
      setIsEditing(false);
      toast({
        title: "Saved",
        description: "Your edits have been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const startEditing = () => {
    setEditedText(narrative?.narrative_text || "");
    setIsEditing(true);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Monthly Executive Summary
                {changesCount && changesCount > 0 && (
                  <Badge variant="outline" className="text-xs font-medium bg-muted text-muted-foreground border-border">
                    {changesCount.toLocaleString()} changes logged
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI-generated insights from Google Ads, contacts, deals & performance data
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-sm text-blue-900 mb-2">How to Use</h4>
          <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside">
            <li>Import <strong>HubSpot contacts & deals</strong> using the cards above</li>
            <li>Import <strong>Google Ads performance</strong> data (top section)</li>
            <li>Optionally, upload <strong>Google Ads Change History</strong> (Tools → Change History → CSV)</li>
            <li>Select a month and click "Generate Summary" for a comprehensive AI report</li>
          </ol>
        </div>

        {/* Upload Section */}
        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <h4 className="font-medium text-sm text-gray-900 mb-1">Import Change History</h4>
              <p className="text-xs text-gray-500">
                Upload Google Ads change history CSV to analyze management decisions
              </p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2" 
              disabled={isUploading}
              onClick={() => document.getElementById('change-history-upload')?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {isUploading ? "Importing..." : "Upload CSV"}
            </Button>
            <input
              id="change-history-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
          </div>
          
          {uploadSummary && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                <CheckCircle2 className="w-4 h-4" />
                Import Successful
              </div>
              <div className="text-xs text-green-600 space-y-1">
                <p>Imported {uploadSummary.inserted} changes (skipped {uploadSummary.skipped} system entries)</p>
                {Object.keys(uploadSummary.by_month).length > 0 && (
                  <p>
                    Months covered: {Object.keys(uploadSummary.by_month).sort().reverse().join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Month Selector & Generate */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              Select Month
            </label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="pt-6">
            <Button 
              onClick={handleGenerateNarrative} 
              disabled={isGenerating || !changesCount}
              variant="default"
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : narrative ? (
                <RefreshCw className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isGenerating ? "Generating..." : narrative ? "Regenerate Summary" : "Generate Summary"}
            </Button>
          </div>
        </div>

        {/* Narrative Display/Edit */}
        {narrativeLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading narrative...
          </div>
        ) : narrative ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {format(new Date(selectedMonth + "-01"), "MMMM yyyy")} Executive Summary
                </span>
                {narrative.is_edited && (
                  <Badge variant="outline" className="text-xs">Edited</Badge>
                )}
                {narrative.ai_generated && !narrative.is_edited && (
                  <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                )}
              </div>
              {!isEditing && (
                <Button variant="ghost" size="sm" className="gap-1.5" onClick={startEditing}>
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
              )}
            </div>
            
            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  className="min-h-[300px] font-sans text-sm leading-relaxed"
                  placeholder="Enter your narrative..."
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveNarrative.mutate(editedText)}
                    disabled={saveNarrative.isPending}
                    size="sm"
                    className="gap-1.5"
                  >
                    {saveNarrative.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save Changes
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white border border-gray-200 rounded-lg prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                  {narrative.narrative_text}
                </div>
              </div>
            )}
            
            <p className="text-xs text-gray-400">
              Last updated: {new Date(narrative.updated_at).toLocaleString()}
            </p>
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-gray-200 rounded-lg">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">No executive summary for this month</p>
            <p className="text-xs text-gray-400">
              Click "Generate Summary" to create one from all available data
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
