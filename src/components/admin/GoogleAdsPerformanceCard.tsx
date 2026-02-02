import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, TrendingUp, DollarSign, MousePointer, Eye, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportSummary {
  imported: number;
  totalParsed: number;
  errors?: string[];
}

interface PerformanceAnalytics {
  total_records: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_cost: number;
  date_range: { earliest: string | null; latest: string | null };
}

export function GoogleAdsPerformanceCard() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["google-ads-performance-analytics"],
    queryFn: async () => {
      // Get total records
      const { count: totalRecords } = await supabase
        .from("google_ads_performance")
        .select("*", { count: "exact", head: true });

      // Get aggregated metrics
      const { data: metricsData } = await supabase
        .from("google_ads_performance")
        .select("impressions, clicks, conversions, cost");

      const totalImpressions = metricsData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0;
      const totalClicks = metricsData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;
      const totalConversions = metricsData?.reduce((sum, d) => sum + (Number(d.conversions) || 0), 0) || 0;
      const totalCost = metricsData?.reduce((sum, d) => sum + (Number(d.cost) || 0), 0) || 0;

      // Get date range
      const { data: earliestData } = await supabase
        .from("google_ads_performance")
        .select("date")
        .order("date", { ascending: true })
        .limit(1);

      const { data: latestData } = await supabase
        .from("google_ads_performance")
        .select("date")
        .order("date", { ascending: false })
        .limit(1);

      return {
        total_records: totalRecords || 0,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_conversions: totalConversions,
        total_cost: totalCost,
        date_range: {
          earliest: earliestData?.[0]?.date || null,
          latest: latestData?.[0]?.date || null,
        },
      } as PerformanceAnalytics;
    },
  });

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const text = await file.text();
      setUploadProgress(30);

      const { data, error } = await supabase.functions.invoke("import-google-ads-performance", {
        body: { csvContent: text },
      });

      setUploadProgress(80);

      if (error) throw error;

      if (data.success) {
        setUploadProgress(100);
        setLastImport({
          imported: data.imported,
          totalParsed: data.totalParsed,
          errors: data.errors,
        });

        toast({
          title: "Import Complete",
          description: `Imported ${data.imported} performance records`,
        });

        refetchAnalytics();
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [toast, refetchAnalytics]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
    e.target.value = "";
  }, [handleFileUpload]);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <CardTitle className="text-base">Google Ads Performance</CardTitle>
              <CardDescription className="mt-1">
                Import daily campaign performance data (impressions, clicks, cost, conversions)
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Upload Dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("google-ads-csv-upload")?.click()}
        >
          <input
            id="google-ads-csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            {isUploading
              ? "Uploading..."
              : "Drop Google Ads CSV here or click to upload"}
          </p>
        </div>

        {/* Progress Bar */}
        {uploadProgress > 0 && (
          <div className="space-y-1">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-xs text-gray-500 text-center">
              {uploadProgress < 100 ? "Processing..." : "Complete!"}
            </p>
          </div>
        )}

        {/* Last Import Summary */}
        {lastImport && (
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              {!lastImport.errors?.length ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <span className="text-sm font-medium">Last Import</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{lastImport.totalParsed}</p>
                <p className="text-xs text-gray-500">Parsed</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">{lastImport.imported}</p>
                <p className="text-xs text-gray-500">Imported</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{lastImport.errors?.length || 0}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Summary */}
        {analyticsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : analytics && analytics.total_records > 0 ? (
          <div className="space-y-2">
            {analytics.date_range.earliest && analytics.date_range.latest && (
              <p className="text-xs text-gray-500 mb-2">
                Data: {analytics.date_range.earliest} to {analytics.date_range.latest}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <TrendingUp className="w-4 h-4" />
                Records
              </span>
              <span className="font-semibold">{analytics.total_records.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Eye className="w-4 h-4" />
                Impressions
              </span>
              <span className="font-semibold">
                {analytics.total_impressions.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <MousePointer className="w-4 h-4" />
                Clicks
              </span>
              <span className="font-semibold text-blue-600">
                {analytics.total_clicks.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="w-4 h-4" />
                Conversions
              </span>
              <span className="font-semibold text-green-600">
                {analytics.total_conversions.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <DollarSign className="w-4 h-4" />
                Total Spend
              </span>
              <span className="font-semibold text-emerald-600">
                ${analytics.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ) : analytics?.total_records === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">No performance data imported yet</p>
        ) : null}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={() => refetchAnalytics()}
            disabled={analyticsLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${analyticsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
