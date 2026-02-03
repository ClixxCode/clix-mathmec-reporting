import { useState } from "react";
import { useFunnelMetrics } from "@/hooks/use-funnel-metrics";
import { useCTMCalls } from "@/hooks/use-ctm-calls";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { format } from "date-fns";
import { ChevronRight, ChevronDown, Phone, FileText, Info, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ContactsDialog } from "./ContactsDialog";
import { DealsDialog } from "./DealsDialog";
import { FormsDialog } from "./FormsDialog";
import { CallsDialog } from "./CallsDialog";

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
  onFormsClick: () => void;
  onCallsClick: () => void;
}

function ConversionBreakdown({ formConversions, callConversions, googleConversions, isLoading, onFormsClick, onCallsClick }: ConversionBreakdownProps) {
  const totalTracked = formConversions + callConversions;
  const gap = totalTracked - googleConversions;
  const hasGap = Math.abs(gap) > 0;
  const trackedHigher = gap > 0;

  return (
    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
      <div className="mt-3 bg-white rounded-lg p-4 border border-blue-100">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <button 
            onClick={onFormsClick}
            className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer text-left"
          >
            <FileText className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">{isLoading ? "..." : formConversions}</p>
              <p className="text-xs text-gray-500">Forms (HubSpot)</p>
            </div>
          </button>
          <button 
            onClick={onCallsClick}
            className="flex items-center gap-3 p-2 -m-2 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer text-left"
            disabled={callConversions === 0}
          >
            <Phone className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xl font-bold text-gray-900">
                {isLoading ? "..." : (callConversions > 0 ? callConversions : "—")}
              </p>
              <p className="text-xs text-gray-500">
                {callConversions > 0 ? "Calls (CTM)" : "Calls (connect CTM)"}
              </p>
            </div>
          </button>
        </div>

        {/* Attribution context */}
        <div className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3 space-y-2">
          {hasGap && (
            <p>
              <span className="font-medium">{totalTracked} tracked vs. {googleConversions} Google conversions.</span>{" "}
              {trackedHigher 
                ? "CTM captures repeat callers and click-to-call ads that may not trigger Google's pixel."
                : "Some conversions may not result in CRM records due to abandoned forms or spam filtering."
              }
            </p>
          )}
          <div className="flex items-start gap-2 bg-blue-50 rounded p-2 -mx-1">
            <AlertCircle className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700">
              <span className="font-medium">Why numbers may differ:</span> Google counts pixel fires (every form submit), 
              while HubSpot counts <em>contacts created</em>. Repeat visitors submitting new forms trigger Google's pixel 
              but update their existing HubSpot contact instead of creating a new one. 
              <span className="font-medium"> Deals are the north star metric</span> since each represents a distinct opportunity.
            </p>
          </div>
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
  const [showFormsDialog, setShowFormsDialog] = useState(false);
  const [showCallsDialog, setShowCallsDialog] = useState(false);

  // Format month for dialogs using the actual Date object (avoids timezone issues)
  const currentMonth = format(filters.selectedMonth, "MMM yyyy");

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
            onFormsClick={() => setShowFormsDialog(true)}
            onCallsClick={() => setShowCallsDialog(true)}
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
      <FormsDialog
        open={showFormsDialog}
        onOpenChange={setShowFormsDialog}
        month={currentMonth}
      />
      <CallsDialog
        open={showCallsDialog}
        onOpenChange={setShowCallsDialog}
        month={currentMonth}
      />
    </div>
  );
}
