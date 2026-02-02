import { useState } from "react";
import { useFunnelMetrics } from "@/hooks/use-funnel-metrics";
import { useCTMCalls } from "@/hooks/use-ctm-calls";
import { ChevronRight, ChevronDown, Phone, FileText, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Metric definitions for info tooltips
const metricDefinitions: Record<string, string> = {
  spend: "Total ad spend for the selected month.",
  impressions: "The number of times your ads were shown.",
  ctr: "Click-through rate: Clicks ÷ Impressions. How often people click after seeing the ad.",
  clicks: "The number of clicks on your ads.",
  cpc: "Average cost per click: Total Cost ÷ Clicks.",
  conversions: "Total conversion actions recorded (forms, calls, etc.) as defined in the Google Ads account.",
  conversionRate: "Conversions ÷ Clicks. How often clicks turn into tracked conversions.",
  contacts: "Contacts from Paid Search sources in HubSpot for the selected month.",
  deals: "Deals associated with Paid Search contacts.",
  dealRate: "Deals ÷ Contacts. How often contacts become deals.",
  won: "Deals closed as won this month.",
  winRate: "Won Deals ÷ Total Deals. Close rate for deals.",
  revenue: "Total revenue from closed-won deals this month.",
};

interface FunnelCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant: "blue" | "green";
  isLoading?: boolean;
  onClick?: () => void;
  isClickable?: boolean;
  isExpanded?: boolean;
  infoKey?: string;
  subtitleInfoKey?: string;
}

function FunnelCard({ 
  title, 
  value, 
  subtitle, 
  variant, 
  isLoading, 
  onClick,
  isClickable,
  isExpanded,
  infoKey,
  subtitleInfoKey,
}: FunnelCardProps) {
  const borderColor = variant === "blue" ? "border-t-blue-500" : "border-t-emerald-500";
  const hoverClass = isClickable ? "cursor-pointer hover:shadow-md transition-shadow" : "";
  const expandedClass = isExpanded ? "ring-2 ring-blue-400" : "";
  
  return (
    <div 
      className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-2 ${borderColor} p-4 min-w-0 ${hoverClass} ${expandedClass}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
            {title}
          </p>
          {infoKey && metricDefinitions[infoKey] && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>{metricDefinitions[infoKey]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {isClickable && (
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {isLoading ? "..." : value}
      </p>
      {subtitle && (
        <div className="flex items-center gap-1 mt-0.5">
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
          {subtitleInfoKey && metricDefinitions[subtitleInfoKey] && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    className="text-gray-300 hover:text-gray-500 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Info className="w-2.5 h-2.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  <p>{metricDefinitions[subtitleInfoKey]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
}

function FunnelConnector({ variant }: { variant: "blue" | "green" }) {
  const color = variant === "blue" ? "text-blue-300" : "text-emerald-300";
  
  return (
    <div className={`flex items-center justify-center ${color} hidden sm:flex`}>
      <ChevronRight className="w-5 h-5" />
    </div>
  );
}

interface FunnelRowProps {
  title: string;
  variant: "blue" | "green";
  children: React.ReactNode;
}

function FunnelRow({ title, variant, children }: FunnelRowProps) {
  const labelColor = variant === "blue" ? "text-blue-600" : "text-emerald-600";
  const bgColor = variant === "blue" ? "bg-blue-50/50" : "bg-emerald-50/50";
  
  return (
    <div className={`rounded-2xl ${bgColor} p-4`}>
      <p className={`text-xs font-semibold ${labelColor} uppercase tracking-wider mb-3`}>
        {title}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 sm:gap-1 items-center">
        {children}
      </div>
    </div>
  );
}

interface ConversionBreakdownProps {
  formConversions: number;
  callConversions: number;
  isLoading?: boolean;
}

function ConversionBreakdown({ formConversions, callConversions, isLoading }: ConversionBreakdownProps) {
  const total = formConversions + callConversions;
  const formPercent = total > 0 ? Math.round((formConversions / total) * 100) : 0;
  const callPercent = total > 0 ? Math.round((callConversions / total) * 100) : 0;

  return (
    <div className="mt-3 bg-white/80 rounded-lg p-3 border border-blue-100">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-gray-600">Conversion Breakdown</span>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-gray-400 hover:text-blue-600">
                <Info className="w-3 h-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              <p>Form conversions from Google Ads. Call data requires CTM integration.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-2">
          <div className="p-1.5 bg-blue-100 rounded">
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{isLoading ? "..." : formConversions}</p>
            <p className="text-xs text-gray-500">Forms ({formPercent}%)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-amber-50 rounded-lg p-2">
          <div className="p-1.5 bg-amber-100 rounded">
            <Phone className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">
              {isLoading ? "..." : (callConversions > 0 ? callConversions : "—")}
            </p>
            <p className="text-xs text-gray-500">
              {callConversions > 0 ? `Calls (${callPercent}%)` : "Calls (CTM)"}
            </p>
          </div>
        </div>
      </div>
      
      {callConversions === 0 && (
        <p className="text-xs text-gray-400 mt-2 text-center">
          Connect CTM to see call conversions
        </p>
      )}
    </div>
  );
}

export function FunnelMetrics() {
  const metrics = useFunnelMetrics();
  const { data: ctmData, isLoading: ctmLoading } = useCTMCalls();
  const [showConversionBreakdown, setShowConversionBreakdown] = useState(false);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`.replace(".0k", "k");
    }
    return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString("en-US");
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // For now, assume all Google Ads conversions are forms unless CTM is connected
  const formConversions = metrics.conversions;
  const callConversions = ctmData?.googleAdsCalls || 0;

  return (
    <div className="space-y-4">
      {/* Top of Funnel: Google Ads Performance */}
      <div className="rounded-2xl bg-blue-50/50 p-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3">
          Google Ads Performance
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] gap-2 sm:gap-1 items-center">
          <FunnelCard
            title="Spend"
            value={formatCurrency(metrics.spend)}
            subtitle="Monthly budget"
            variant="blue"
            infoKey="spend"
          />
          <FunnelConnector variant="blue" />
          <FunnelCard
            title="Impressions"
            value={formatNumber(metrics.impressions)}
            subtitle={`${formatPercent(metrics.ctr)} CTR`}
            variant="blue"
            infoKey="impressions"
            subtitleInfoKey="ctr"
          />
          <FunnelConnector variant="blue" />
          <FunnelCard
            title="Clicks"
            value={formatNumber(metrics.clicks)}
            subtitle={`$${metrics.cpc.toFixed(2)} CPC`}
            variant="blue"
            infoKey="clicks"
            subtitleInfoKey="cpc"
          />
          <FunnelConnector variant="blue" />
          <FunnelCard
            title="Conversions"
            value={metrics.conversions + callConversions}
            subtitle={`${formatPercent(metrics.conversionRate)} rate`}
            variant="blue"
            isClickable
            isExpanded={showConversionBreakdown}
            onClick={() => setShowConversionBreakdown(!showConversionBreakdown)}
            infoKey="conversions"
            subtitleInfoKey="conversionRate"
          />
        </div>
        
        {/* Conversion Breakdown Drill-down */}
        {showConversionBreakdown && (
          <ConversionBreakdown
            formConversions={formConversions}
            callConversions={callConversions}
            isLoading={ctmLoading}
          />
        )}
      </div>

      {/* Bottom of Funnel: Business Outcomes */}
      <FunnelRow title="Business Outcomes" variant="green">
        <FunnelCard
          title="Contacts"
          value={formatNumber(metrics.contacts)}
          subtitle="Paid Search"
          variant="green"
          isLoading={metrics.isLoading}
          infoKey="contacts"
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Deals"
          value={formatNumber(metrics.deals)}
          subtitle={`${formatPercent(metrics.dealRate)} deal rate`}
          variant="green"
          isLoading={metrics.isLoading}
          infoKey="deals"
          subtitleInfoKey="dealRate"
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Won"
          value={metrics.wonDeals}
          subtitle={`${formatPercent(metrics.winRate)} win rate`}
          variant="green"
          isLoading={metrics.isLoading}
          infoKey="won"
          subtitleInfoKey="winRate"
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Revenue"
          value={formatCurrency(metrics.revenue)}
          subtitle={metrics.wonDeals > 0 ? `${formatCurrency(metrics.avgDealSize)} avg` : "—"}
          variant="green"
          isLoading={metrics.isLoading}
          infoKey="revenue"
        />
      </FunnelRow>
    </div>
  );
}
