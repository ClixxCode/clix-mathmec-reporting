import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, MapPin, Loader2, CheckCircle2 } from "lucide-react";

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

export function GoogleAdsGeoCard() {
  const [isImporting, setIsImporting] = useState(false);
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Parse month input to first day of month
    const [year, month] = reportMonth.split("-");
    const reportMonthDate = `${year}-${month}-01`;

    setIsImporting(true);
    setLastResult(null);

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke("import-google-ads-geo", {
        body: { csvContent: text, reportMonth: reportMonthDate },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setLastResult(data);
      toast.success(`Imported ${data.imported} geo records for ${data.totalParsed} metros`);
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import geo performance data");
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Google Ads Geo Performance
        </CardTitle>
        <CardDescription>
          Import metro-level performance data with automatic location mapping
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reportMonth">Report Month</Label>
          <Input
            id="reportMonth"
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-4">
          <Button asChild disabled={isImporting} className="flex-1">
            <label className="cursor-pointer flex items-center justify-center gap-2">
              {isImporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isImporting ? "Importing..." : "Upload Geo CSV"}
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isImporting}
              />
            </label>
          </Button>
        </div>

        {lastResult && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
              <CheckCircle2 className="h-4 w-4" />
              Import Successful
            </div>
            <div className="text-sm text-gray-600 space-y-2">
              <p>Imported {lastResult.imported} records from {lastResult.totalParsed} metros</p>
              <div className="mt-2">
                <p className="font-medium text-gray-700 mb-1">Location Summary:</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(lastResult.locationSummary).map(([location, stats]) => (
                    <div key={location} className="bg-white p-2 rounded border text-xs">
                      <span className="font-medium">{location}</span>
                      <div className="text-gray-500">
                        {stats.conversions} conv · ${stats.cost.toFixed(0)} spend
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-500">
          Metro areas are automatically mapped: SF Bay Area → Newark, Seattle-Tacoma → Seattle, etc.
        </p>
      </CardContent>
    </Card>
  );
}
