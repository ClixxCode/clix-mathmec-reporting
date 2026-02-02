import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, Loader2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function GoogleAdsPerformanceCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);

  // Get record count and date range
  const { data: stats, isLoading } = useQuery({
    queryKey: ["google-ads-performance-stats"],
    queryFn: async () => {
      const { count, error: countError } = await supabase
        .from("google_ads_performance")
        .select("*", { count: "exact", head: true });

      if (countError) throw countError;

      // Get date range
      const { data: dateRange } = await supabase
        .from("google_ads_performance")
        .select("date")
        .order("date", { ascending: true })
        .limit(1);

      const { data: latestDate } = await supabase
        .from("google_ads_performance")
        .select("date")
        .order("date", { ascending: false })
        .limit(1);

      return {
        count: count || 0,
        earliestDate: dateRange?.[0]?.date,
        latestDate: latestDate?.[0]?.date,
      };
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);

    try {
      const text = await file.text();
      
      const { data, error } = await supabase.functions.invoke("import-google-ads-performance", {
        body: { csvContent: text },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Import Successful",
          description: `Imported ${data.imported} performance records.`,
        });
        queryClient.invalidateQueries({ queryKey: ["google-ads-performance-stats"] });
      } else {
        throw new Error(data.error || "Import failed");
      }
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV file",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <CardTitle className="text-base">Google Ads Performance</CardTitle>
              <Badge 
                variant={stats?.count ? "default" : "secondary"}
                className={`mt-1 ${stats?.count ? "bg-green-600" : ""}`}
              >
                {stats?.count ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {stats.count} Records
                  </span>
                ) : (
                  "No Data"
                )}
              </Badge>
            </div>
          </div>
          <TrendingUp className="w-5 h-5 text-gray-400" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="mb-4">
          Import daily campaign performance data from Google Ads exports (CSV format with Day, Campaign, Impressions, Clicks, Cost, Conversions)
        </CardDescription>

        {stats?.earliestDate && stats?.latestDate && (
          <p className="text-xs text-gray-500 mb-3">
            Data range: {stats.earliestDate} to {stats.latestDate}
          </p>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isImporting}
            onClick={() => document.getElementById("google-ads-csv-input")?.click()}
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {isImporting ? "Importing..." : "Import CSV"}
          </Button>
          <input
            id="google-ads-csv-input"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>
      </CardContent>
    </Card>
  );
}
