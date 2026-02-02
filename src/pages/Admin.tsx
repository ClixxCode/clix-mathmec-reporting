import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Database, RefreshCw, CheckCircle2, XCircle, ExternalLink, FileText, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import mathmecLogo from "@/assets/mathmec-logo.png";
import { HubSpotContactsCard } from "@/components/admin/HubSpotContactsCard";
import { HubSpotDealsCard } from "@/components/admin/HubSpotDealsCard";
import { CampaignNarrativeCard } from "@/components/admin/CampaignNarrativeCard";
import { CTMStatusCard } from "@/components/admin/CTMStatusCard";

interface DataSource {
  id: string;
  name: string;
  type: string;
  is_connected: boolean;
  last_sync_at: string | null;
  config: Record<string, unknown>;
}

const dataSourceMeta: Record<string, { description: string; icon: string; docsUrl: string }> = {
  google_ads: {
    description: "Pull campaign performance, spend, clicks, and conversion data from Google Ads",
    icon: "📊",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
  },
  call_tracking_metrics: {
    description: "Import call tracking data including call duration, source, and outcomes",
    icon: "📞",
    docsUrl: "https://calltrackingmetrics.com/developers/",
  },
};

export default function Admin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dataSources, isLoading } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select("*")
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data as DataSource[];
    },
  });

  const toggleConnection = useMutation({
    mutationFn: async ({ id, connected }: { id: string; connected: boolean }) => {
      const { error } = await supabase
        .from("data_sources")
        .update({ 
          is_connected: connected,
          last_sync_at: connected ? new Date().toISOString() : null 
        })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["data-sources"] });
      toast({
        title: variables.connected ? "Connected" : "Disconnected",
        description: `Data source has been ${variables.connected ? "connected" : "disconnected"}.`,
      });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gray-900 rounded-xl">
                <img src={mathmecLogo} alt="Mathews Mechanical" className="h-10 w-auto" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-500 text-sm">Data Sources & Connectors</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        {/* Data Sources Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Data Sources</h2>
              <p className="text-sm text-gray-500">Connect external platforms to sync data into your dashboard</p>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-2/3 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dataSources?.filter(source => source.type !== 'call_tracking_metrics' && source.type !== 'google_ads').map((source) => {
                const meta = dataSourceMeta[source.type] || {
                  description: "External data source",
                  icon: "🔗",
                  docsUrl: "#",
                };

                return (
                  <Card 
                    key={source.id} 
                    className={`transition-all ${source.is_connected ? "border-green-200 bg-green-50/30" : ""}`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{meta.icon}</span>
                          <div>
                            <CardTitle className="text-base">{source.name}</CardTitle>
                            <Badge 
                              variant={source.is_connected ? "default" : "secondary"}
                              className={`mt-1 ${source.is_connected ? "bg-green-600" : ""}`}
                            >
                              {source.is_connected ? (
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
                        <Switch
                          checked={source.is_connected}
                          onCheckedChange={(checked) => 
                            toggleConnection.mutate({ id: source.id, connected: checked })
                          }
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="mb-4">
                        {meta.description}
                      </CardDescription>
                      
                      {source.last_sync_at && (
                        <p className="text-xs text-gray-500 mb-3">
                          Last synced: {new Date(source.last_sync_at).toLocaleString()}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1.5"
                          disabled={!source.is_connected}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sync Now
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="gap-1.5"
                          onClick={() => window.open(meta.docsUrl, "_blank")}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          API Docs
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Call Tracking Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-teal-100">
              <Phone className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call Tracking</h2>
              <p className="text-sm text-gray-500">Connect call tracking data for phone conversion attribution</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CTMStatusCard />
          </div>
        </section>

        {/* HubSpot Data Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-orange-100">
              <Database className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">HubSpot Data</h2>
              <p className="text-sm text-gray-500">Import and manage contacts and deals from HubSpot exports</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HubSpotContactsCard />
            <HubSpotDealsCard />
          </div>
        </section>

        {/* Campaign Narrative Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-purple-100">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Campaign Management Insights</h2>
              <p className="text-sm text-gray-500">AI-generated narratives from Google Ads change history</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <CampaignNarrativeCard />
          </div>
        </section>
      </main>
    </div>
  );
}