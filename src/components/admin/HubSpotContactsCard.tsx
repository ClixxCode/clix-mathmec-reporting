import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, Users, Search, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportSummary {
  total_rows: number;
  processed: number;
  errors: number;
  error_details?: string[];
}

interface AnalyticsData {
  total_contacts: number;
  paid_search_contacts: number;
  by_month?: { month: string; count: number; paid_search: number }[];
  by_source?: Record<string, number>;
  last_import?: string;
}

export function HubSpotContactsCard() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lastImport, setLastImport] = useState<ImportSummary | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["contact-analytics"],
    queryFn: async () => {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-analytics`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }
      const data = await response.json();
      
      // Get last import timestamp
      const { data: lastImportData } = await supabase
        .from("hubspot_contacts")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      
      return {
        ...data,
        last_import: lastImportData?.[0]?.created_at || null,
      } as AnalyticsData;
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
      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(30);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-hubspot-contacts`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      setUploadProgress(80);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Import failed");
      }

      setUploadProgress(100);
      setLastImport(result.summary);
      
      toast({
        title: "Import Complete",
        description: `Processed ${result.summary.processed} contacts with ${result.summary.errors} errors`,
      });

      // Refresh analytics after import
      refetchAnalytics();

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
    // Reset input
    e.target.value = "";
  }, [handleFileUpload]);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <CardTitle className="text-base">HubSpot Contacts</CardTitle>
              <CardDescription className="mt-1">
                Import and analyze contact data from HubSpot exports
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
          onClick={() => document.getElementById("csv-upload")?.click()}
        >
          <input
            id="csv-upload"
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
              : "Drop CSV here or click to upload"}
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
                <p className="text-xs text-gray-500">Total Rows</p>
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

        {/* Analytics Summary */}
        {analyticsLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ) : analytics ? (
          <div className="space-y-2">
            {analytics.last_import && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                <Clock className="w-3 h-3" />
                Last import: {new Date(analytics.last_import).toLocaleString()}
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                Total Contacts
              </span>
              <span className="font-semibold">{analytics.total_contacts.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Search className="w-4 h-4" />
                Paid Search
              </span>
              <span className="font-semibold text-blue-600">
                {analytics.paid_search_contacts.toLocaleString()}
              </span>
            </div>
          </div>
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
