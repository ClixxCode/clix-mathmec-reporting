import { ArrowLeft, Database, FileText, Phone, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import mathmecLogo from "@/assets/mathmec-logo.png";
import { HubSpotContactsCard } from "@/components/admin/HubSpotContactsCard";
import { HubSpotDealsCard } from "@/components/admin/HubSpotDealsCard";
import { CampaignNarrativeCard } from "@/components/admin/CampaignNarrativeCard";
import { CTMStatusCard } from "@/components/admin/CTMStatusCard";
import { GoogleAdsPerformanceCard } from "@/components/admin/GoogleAdsPerformanceCard";
import { GoogleAdsGeoCard } from "@/components/admin/GoogleAdsGeoCard";

export default function Admin() {
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
        {/* Google Ads Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Google Ads Performance</h2>
              <p className="text-sm text-gray-500">Campaign metrics and geographic conversion data</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GoogleAdsPerformanceCard />
            <GoogleAdsGeoCard />
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

        {/* Call Tracking Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-teal-100">
              <Phone className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Call Tracking</h2>
              <p className="text-sm text-gray-500">Phone conversion attribution via CTM integration</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CTMStatusCard />
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
