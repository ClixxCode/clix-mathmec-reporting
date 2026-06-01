import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Users, CheckCircle2, AlertCircle, Clock, RefreshCw, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportSummary {
  total_rows: number;
  processed: number;
  duplicates: number;
  empty_rows: number;
  errors: number;
}

export function HubSpotLeadsCard() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ["hubspot-leads-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("hubspot_leads")
        .select("*", { count: "exact", head: true });

      const { data: stages } = await supabase
        .from("hubspot_leads")
        .select("lead_stage");

      const { data: last } = await supabase
        .from("hubspot_leads")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      const counts: Record<string, number> = {};
      stages?.forEach((r) => {
        const k = (r.lead_stage || "Unknown").trim();
        counts[k] = (counts[k] || 0) + 1;
      });

      const qualified = (counts["Qualified"] || 0) + (counts["Connected"] || 0);
      const disqualified = counts["Disqualified"] || 0;
      const denom = qualified + disqualified;
      const qualRate = denom > 0 ? Math.round((qualified / denom) * 100) : 0;

      return {
        total: total || 0,
        counts,
        qualified,
        disqualified,
        qualRate,
        last_import: last?.[0]?.created_at || null,
      };
    },
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid file", description: "Please upload a CSV", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    setUploadProgress(15);
    try {
      const formData = new FormData();
      formData.append("file", file);
      setUploadProgress(40);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-hubspot-leads`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
          body: formData,
        }
      );
      setUploadProgress(85);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Import failed");
      setUploadProgress(100);
      setLastImport(result.summary);
      toast({
        title: "Import Complete",
        description: `Processed ${result.summary.processed} leads (${result.summary.errors} errors)`,
      });
      refetch();
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [toast, refetch]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f);
  }, [handleFileUpload]);

  return (
    <Card className="border-orange-200 bg-orange-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <CardTitle className="text-base">HubSpot Leads</CardTitle>
              <CardDescription className="mt-1">
                Lead stage & disqualification data for true qualification rate
              </CardDescription>
            </div>
          </div>
          {stats?.last_import && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {new Date(stats.last_import).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 hover:border-gray-400"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={onDrop}
          onClick={() => document.getElementById("leads-csv-upload")?.click()}
        >
          <input
            id="leads-csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
            disabled={isUploading}
          />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {isUploading ? "Uploading..." : "Drop HubSpot Leads CSV or click to upload"}
          </p>
        </div>

        {uploadProgress > 0 && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              {uploadProgress < 100 ? "Processing..." : "Complete!"}
            </p>
          </div>
        )}

        {lastImport && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              {lastImport.errors === 0 ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="text-sm font-medium">Last Import</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{lastImport.total_rows}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{lastImport.processed}</p>
                <p className="text-xs text-gray-500">Processed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{lastImport.errors}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>
          </div>
        )}

        {statsLoading ? (
          <div className="animate-pulse h-16 bg-gray-100 rounded" />
        ) : stats && stats.total > 0 ? (
          <div className="space-y-2 bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" /> Total Leads
              </span>
              <span className="font-semibold">{stats.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Target className="w-4 h-4" /> True Qualification Rate
              </span>
              <span className="font-semibold text-emerald-600">{stats.qualRate}%</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-xs pt-2 border-t border-gray-100">
              {(["New", "Attempting", "Connected", "Qualified", "Disqualified"] as const).map((s) => (
                <div key={s} className="text-center">
                  <p className="font-semibold text-gray-900">{stats.counts[s] || 0}</p>
                  <p className="text-gray-500 truncate" title={s}>{s}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => refetch()} disabled={statsLoading}>
            <RefreshCw className={`w-3.5 h-3.5 ${statsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}