import { useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, MapPin, RefreshCw, CheckCircle2, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MetroMappingModal } from "./MetroMappingModal";
import { UploadConfirmDialog } from "./UploadConfirmDialog";

interface LocationSummary {
  conversions: number;
  cost: number;
  clicks: number;
  impressions: number;
}

interface ImportResult {
  success: boolean;
  imported: number;
  totalParsed: number;
  locationSummary: Record<string, LocationSummary>;
}

interface UnmappedMetro {
  metro_area: string;
  conversions: number;
  cost: number;
}

interface ValidationResult {
  success: false;
  requiresMapping: true;
  unmappedMetros: UnmappedMetro[];
  totalParsed: number;
}

interface GeoAnalytics {
  total_records: number;
  total_conversions: number;
  total_cost: number;
  locations: string[];
  month_range: { earliest: string | null; latest: string | null };
  last_import: string | null;
}

export function GoogleAdsGeoCard() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [lastImport, setLastImport] = useState<ImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Modal state for unmapped metros
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [unmappedMetros, setUnmappedMetros] = useState<UnmappedMetro[]>([]);
  const [pendingCsvContent, setPendingCsvContent] = useState<string | null>(null);
  const [isSubmittingMappings, setIsSubmittingMappings] = useState(false);
  
  // Confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const pendingFileRef = useRef<File | null>(null);

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["google-ads-geo-analytics"],
    queryFn: async () => {
      const { count: totalRecords } = await supabase
        .from("google_ads_geo_performance")
        .select("*", { count: "exact", head: true });

      const { data: metricsData } = await supabase
        .from("google_ads_geo_performance")
        .select("conversions, cost, location");

      const totalConversions = metricsData?.reduce((sum, d) => sum + (Number(d.conversions) || 0), 0) || 0;
      const totalCost = metricsData?.reduce((sum, d) => sum + (Number(d.cost) || 0), 0) || 0;
      const locations = [...new Set(metricsData?.map(d => d.location).filter(Boolean) || [])];

      const { data: earliestData } = await supabase
        .from("google_ads_geo_performance")
        .select("report_month")
        .order("report_month", { ascending: true })
        .limit(1);

      const { data: latestData } = await supabase
        .from("google_ads_geo_performance")
        .select("report_month")
        .order("report_month", { ascending: false })
        .limit(1);

      const { data: lastImportData } = await supabase
        .from("google_ads_geo_performance")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      return {
        total_records: totalRecords || 0,
        total_conversions: totalConversions,
        total_cost: totalCost,
        locations: locations.filter(l => l !== "Unknown"),
        month_range: {
          earliest: earliestData?.[0]?.report_month || null,
          latest: latestData?.[0]?.report_month || null,
        },
        last_import: lastImportData?.[0]?.created_at || null,
      } as GeoAnalytics;
    },
  });

  const handleFileUpload = useCallback(async (file: File, customMappings?: Record<string, string>) => {
    if (!file.name.endsWith(".csv")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const [year, month] = reportMonth.split("-");
    const reportMonthDate = `${year}-${month}-01`;

    setIsUploading(true);
    setUploadProgress(10);

    try {
      const text = await file.text();
      setUploadProgress(30);

      // First call: validate only (unless we already have custom mappings)
      const isValidationPass = !customMappings;
      
      const { data, error } = await supabase.functions.invoke("import-google-ads-geo", {
        body: { 
          csvContent: text, 
          reportMonth: reportMonthDate,
          customMappings,
          validateOnly: isValidationPass,
        },
      });

      setUploadProgress(80);

      if (error) throw error;

      // Check if we need user to map metros
      if (data.requiresMapping && data.unmappedMetros?.length > 0) {
        setUnmappedMetros(data.unmappedMetros);
        setPendingCsvContent(text);
        setShowMappingModal(true);
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }

      if (data.success) {
        setUploadProgress(100);
        setLastImport(data);
        setPendingCsvContent(null);

        toast({
          title: "Import Complete",
          description: `Imported ${data.imported} geo records across ${Object.keys(data.locationSummary).length} locations`,
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
  }, [reportMonth, toast, refetchAnalytics]);

  const handleMappingConfirm = useCallback(async (mappings: Record<string, string>) => {
    if (!pendingCsvContent) return;

    setIsSubmittingMappings(true);
    setShowMappingModal(false);

    const [year, month] = reportMonth.split("-");
    const reportMonthDate = `${year}-${month}-01`;

    try {
      setIsUploading(true);
      setUploadProgress(50);

      const { data, error } = await supabase.functions.invoke("import-google-ads-geo", {
        body: { 
          csvContent: pendingCsvContent, 
          reportMonth: reportMonthDate,
          customMappings: mappings,
          validateOnly: false,
        },
      });

      setUploadProgress(90);

      if (error) throw error;

      if (data.success) {
        setUploadProgress(100);
        setLastImport(data);
        setPendingCsvContent(null);
        setUnmappedMetros([]);

        toast({
          title: "Import Complete",
          description: `Imported ${data.imported} geo records across ${Object.keys(data.locationSummary).length} locations`,
        });

        refetchAnalytics();
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (error) {
      console.error("Import with mappings error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsSubmittingMappings(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, [pendingCsvContent, reportMonth, toast, refetchAnalytics]);

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
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      pendingFileRef.current = file;
      setShowConfirmDialog(true);
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      pendingFileRef.current = file;
      setShowConfirmDialog(true);
    }
    e.target.value = "";
  }, [toast]);

  const handleConfirmUpload = useCallback(() => {
    setShowConfirmDialog(false);
    if (pendingFileRef.current) {
      handleFileUpload(pendingFileRef.current);
      pendingFileRef.current = null;
    }
  }, [handleFileUpload]);

  return (
    <Card className="border-green-200 bg-green-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📍</span>
            <div>
              <CardTitle className="text-base">Google Ads Geo Performance</CardTitle>
              <CardDescription className="mt-1">
                Import metro-level data with automatic location mapping
              </CardDescription>
            </div>
          </div>
          {analytics?.last_import && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {new Date(analytics.last_import).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Month Selector */}
        <div className="space-y-1.5">
          <Label htmlFor="reportMonth" className="text-xs text-gray-600">Report Month</Label>
          <Input
            id="reportMonth"
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Upload Dropzone */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            isDragging
              ? "border-green-500 bg-green-50"
              : "border-gray-300 hover:border-gray-400"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("google-ads-geo-csv-upload")?.click()}
        >
          <input
            id="google-ads-geo-csv-upload"
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
              : "Drop Geo Report CSV here or click to upload"}
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
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium">Last Import</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(lastImport.locationSummary).map(([location, stats]) => (
                <div key={location} className="bg-gray-50 p-2 rounded text-xs">
                  <span className="font-medium text-gray-900">{location}</span>
                  <div className="text-gray-500">
                    {stats.conversions} conv · ${stats.cost.toFixed(0)}
                  </div>
                </div>
              ))}
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
            {analytics.month_range.earliest && analytics.month_range.latest && (
              <p className="text-xs text-gray-500 mb-2">
                Data: {analytics.month_range.earliest} to {analytics.month_range.latest}
              </p>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4" />
                Locations
              </span>
              <span className="font-semibold">{analytics.locations.join(", ")}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Target className="w-4 h-4" />
                Total Conversions
              </span>
              <span className="font-semibold text-green-600">
                {analytics.total_conversions.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <CheckCircle2 className="w-4 h-4" />
                Total Spend
              </span>
              <span className="font-semibold text-emerald-600">
                ${analytics.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ) : analytics?.total_records === 0 ? (
          <p className="text-sm text-gray-500 text-center py-2">No geo data imported yet</p>
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

        <p className="text-xs text-gray-400">
          SF Bay Area → Newark · Seattle-Tacoma → Seattle · Portland → Portland · Denver → Denver
        </p>
      </CardContent>

      {/* Upload Confirmation Dialog */}
      <UploadConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        fileName={pendingFileRef.current?.name || ""}
        reportMonth={reportMonth}
        onConfirm={handleConfirmUpload}
      />

      {/* Metro Mapping Modal */}
      <MetroMappingModal
        open={showMappingModal}
        onOpenChange={setShowMappingModal}
        unmappedMetros={unmappedMetros}
        onConfirmMappings={handleMappingConfirm}
        isSubmitting={isSubmittingMappings}
      />
    </Card>
  );
}
