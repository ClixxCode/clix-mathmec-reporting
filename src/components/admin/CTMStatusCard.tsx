import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTMAccountInfo {
  connected: boolean;
  accountId?: string;
  accountName?: string;
  status?: string;
  timezone?: string;
  error?: string;
}

export function CTMStatusCard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["ctm-account"],
    queryFn: async (): Promise<CTMAccountInfo> => {
      const { data, error } = await supabase.functions.invoke("fetch-ctm-account");
      
      if (error) {
        console.error("Error fetching CTM account:", error);
        return { connected: false, error: error.message };
      }
      
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const isConnected = data?.connected === true;

  return (
    <Card className={`transition-all ${isConnected ? "border-green-200 bg-green-50/30" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📞</span>
            <div>
              <CardTitle className="text-base">Call Tracking Metrics</CardTitle>
              <Badge 
                variant={isConnected ? "default" : "secondary"}
                className={`mt-1 ${isConnected ? "bg-green-600" : ""}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Checking...
                  </span>
                ) : isConnected ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Not Connected
                  </span>
                )}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="mb-4">
          Import call tracking data including call duration, source, and outcomes
        </CardDescription>
        
        {isConnected && data && (
          <div className="bg-white rounded-lg border border-green-100 p-3 mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-gray-900">{data.accountName}</span>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <p>Account ID: <span className="font-mono">{data.accountId}</span></p>
              {data.timezone && <p>Timezone: {data.timezone}</p>}
            </div>
          </div>
        )}
        
        {!isConnected && data?.error && (
          <p className="text-xs text-amber-600 mb-3">
            {data.error}
          </p>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1.5"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            {isRefetching ? 'Checking...' : 'Check Status'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
