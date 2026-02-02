import { useState } from "react";
import { useFunnelMetrics } from "@/hooks/use-funnel-metrics";
import { useCTMCalls } from "@/hooks/use-ctm-calls";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { ChevronRight, ChevronDown, Phone, FileText, Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { ContactsDialog } from "./ContactsDialog";
import { DealsDialog } from "./DealsDialog";

// Metric definitions for info tooltips
const metricDefinitions: Record<string, string> = {
  spend: "Total ad spend for the selected month from Google Ads.",
  impressions: "The number of times your ads were shown.",
  ctr: "Click-through rate: Clicks ÷ Impressions. How often people click after seeing the ad.",
  clicks: "The number of clicks on your ads.",
  cpc: "Average cost per click: Total Cost ÷ Clicks.",
  conversions: "Google Ads tracked conversion actions. This is the master number from Google's tracking pixel.",
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
  const hoverClass = isClickable ? "cursor-pointer hover:shadow-md hover:bg-gray-50/50 transition-all" : "";
  const expandedClass = isExpanded ? "shadow-md bg-blue-50/30" : "";
  
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
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
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
  googleConversions: number;
  isLoading?: boolean;
}

function ConversionBreakdown({ formConversions, callConversions, googleConversions, isLoading }: ConversionBreakdownProps) {
  const totalTracked = formConversions + callConversions;
  const formPercent = totalTracked > 0 ? Math.round((formConversions / totalTracked) * 100) : 0;
  const callPercent = totalTracked > 0 ? Math.round((callConversions / totalTracked) * 100) : 0;
  
  const gap = totalTracked - googleConversions;
  const hasGap = Math.abs(gap) > 0;
  const trackedHigher = gap > 0;

  return (
    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
      <div className="mt-4 bg-gradient-to-b from-white to-blue-50/50 rounded-xl p-4 border border-blue-100/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-gray-700">Conversion Breakdown</span>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-gray-400 hover:text-blue-600 transition-colors">
                  <Info className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm text-xs">
                <p className="font-medium mb-1">Why might these numbers differ from Google Ads?</p>
                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                  <li>Google Ads uses its pixel for conversion tracking</li>
                  <li>Forms come from HubSpot (Paid Search contacts)</li>
                  <li>Calls come from CTM (all tracked calls)</li>
                  <li>Attribution windows and tracking methods vary</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {/* Form Submissions */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Form Submissions</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {isLoading ? "..." : formConversions}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={formPercent} className="h-2 flex-1" />
              <span className="text-xs text-gray-500 w-10 text-right">{formPercent}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">From HubSpot (Paid Search)</p>
          </div>
          
          {/* Phone Calls */}
          <div className="bg-white rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 rounded">
                  <Phone className="w-4 h-4 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-gray-700">Phone Calls</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {isLoading ? "..." : (callConversions > 0 ? callConversions : "—")}
              </span>
            </div>
            {callConversions > 0 ? (
              <>
                <div className="flex items-center gap-2">
                  <Progress value={callPercent} className="h-2 flex-1 [&>div]:bg-amber-500" />
                  <span className="text-xs text-gray-500 w-10 text-right">{callPercent}%</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">From CTM (Google Ads calls)</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">Connect CTM to see call data</p>
            )}
          </div>
        </div>

        {/* Reconciliation Notice */}
        {hasGap && (
          <div className={`mt-4 p-3 rounded-lg flex items-start gap-2.5 ${
            trackedHigher ? "bg-amber-50 border border-amber-100" : "bg-blue-50 border border-blue-100"
          }`}>
            <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
              trackedHigher ? "text-amber-500" : "text-blue-500"
            }`} />
            <div className="text-xs leading-relaxed">
              {trackedHigher ? (
                <>
                  <span className="font-medium text-amber-800">
                    {totalTracked} tracked vs. {googleConversions} Google conversions
                  </span>
                  <p className="text-amber-700 mt-0.5">
                    CTM captures all calls to tracking numbers, including repeat callers and click-to-call ads that may not trigger Google's conversion pixel.
                  </p>
                </>
              ) : (
                <>
                  <span className="font-medium text-blue-800">
                    {totalTracked} tracked vs. {googleConversions} Google conversions
                  </span>
                  <p className="text-blue-700 mt-0.5">
                    Some Google Ads conversions may not result in CRM records due to abandoned forms, spam filtering, or tracking delays.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Total */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Total Tracked</span>
          <span className="text-xl font-bold text-gray-900">{isLoading ? "..." : totalTracked}</span>
        </div>
      </div>
    </CollapsibleContent>
  );
}

export function FunnelMetrics() {
  const metrics = useFunnelMetrics();
  const { data: ctmData, isLoading: ctmLoading } = useCTMCalls();
  const { filters } = useDashboardFilters();
  const [showConversionBreakdown, setShowConversionBreakdown] = useState(false);
  const [showContactsDialog, setShowContactsDialog] = useState(false);
  const [showDealsDialog, setShowDealsDialog] = useState(false);

  // Format month for dialogs (e.g., "Jan 2026")
  const currentMonth = new Date(filters.startDate).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

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

  // Form submissions = Paid Search contacts with Incoming Lead Source = "Form Submission"
  // Call conversions = from CTM (if connected)
  const formConversions = metrics.formSubmissions;
  const callConversions = ctmData?.googleAdsCalls || 0;

  return (
    <div className="space-y-4">
      {/* Top of Funnel: Google Ads Performance */}
      <Collapsible open={showConversionBreakdown} onOpenChange={setShowConversionBreakdown}>
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
            <CollapsibleTrigger asChild>
              <div>
                <FunnelCard
                  title="Conversions"
                  value={formatNumber(metrics.conversions)}
                  subtitle={`${formatPercent(metrics.conversionRate)} rate`}
                  variant="blue"
                  isClickable
                  isExpanded={showConversionBreakdown}
                  infoKey="conversions"
                  subtitleInfoKey="conversionRate"
                  isLoading={metrics.isLoading}
                />
              </div>
            </CollapsibleTrigger>
          </div>
          
          {/* Conversion Breakdown Drill-down */}
          <ConversionBreakdown
            formConversions={formConversions}
            callConversions={callConversions}
            googleConversions={metrics.conversions}
            isLoading={ctmLoading || metrics.isLoading}
          />
        </div>
      </Collapsible>

      {/* Bottom of Funnel: Business Outcomes */}
      <FunnelRow title="Business Outcomes" variant="green">
        <FunnelCard
          title="Contacts"
          value={formatNumber(metrics.contacts)}
          subtitle="Paid Search"
          variant="green"
          isLoading={metrics.isLoading}
          infoKey="contacts"
          isClickable
          onClick={() => setShowContactsDialog(true)}
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
          isClickable
          onClick={() => setShowDealsDialog(true)}
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

      {/* Dialogs */}
      <ContactsDialog
        open={showContactsDialog}
        onOpenChange={setShowContactsDialog}
        month={currentMonth}
      />
      <DealsDialog
        open={showDealsDialog}
        onOpenChange={setShowDealsDialog}
        month={currentMonth}
      />
    </div>
  );
}
