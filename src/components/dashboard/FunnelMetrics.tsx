import { useFunnelMetrics } from "@/hooks/use-funnel-metrics";
import { ChevronRight } from "lucide-react";

interface FunnelCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  variant: "blue" | "green";
  isLoading?: boolean;
}

function FunnelCard({ title, value, subtitle, variant, isLoading }: FunnelCardProps) {
  const borderColor = variant === "blue" ? "border-t-blue-500" : "border-t-emerald-500";
  
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 border-t-2 ${borderColor} p-4 min-w-0`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">
        {title}
      </p>
      <p className="text-2xl font-bold text-gray-900 mt-1">
        {isLoading ? "..." : value}
      </p>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>
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

export function FunnelMetrics() {
  const metrics = useFunnelMetrics();

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

  return (
    <div className="space-y-4">
      {/* Top of Funnel: Google Ads Performance */}
      <FunnelRow title="Google Ads Performance" variant="blue">
        <FunnelCard
          title="Spend"
          value={formatCurrency(metrics.spend)}
          subtitle="Monthly budget"
          variant="blue"
        />
        <FunnelConnector variant="blue" />
        <FunnelCard
          title="Impressions"
          value={formatNumber(metrics.impressions)}
          subtitle={`${formatPercent(metrics.ctr)} CTR`}
          variant="blue"
        />
        <FunnelConnector variant="blue" />
        <FunnelCard
          title="Clicks"
          value={formatNumber(metrics.clicks)}
          subtitle={`$${metrics.cpc.toFixed(2)} CPC`}
          variant="blue"
        />
        <FunnelConnector variant="blue" />
        <FunnelCard
          title="Conversions"
          value={metrics.conversions}
          subtitle={`${formatPercent(metrics.conversionRate)} rate`}
          variant="blue"
        />
      </FunnelRow>

      {/* Bottom of Funnel: Business Outcomes */}
      <FunnelRow title="Business Outcomes" variant="green">
        <FunnelCard
          title="Contacts"
          value={formatNumber(metrics.contacts)}
          subtitle="Paid Search"
          variant="green"
          isLoading={metrics.isLoading}
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Deals"
          value={formatNumber(metrics.deals)}
          subtitle={`${formatPercent(metrics.dealRate)} deal rate`}
          variant="green"
          isLoading={metrics.isLoading}
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Won"
          value={metrics.wonDeals}
          subtitle={`${formatPercent(metrics.winRate)} win rate`}
          variant="green"
          isLoading={metrics.isLoading}
        />
        <FunnelConnector variant="green" />
        <FunnelCard
          title="Revenue"
          value={formatCurrency(metrics.revenue)}
          subtitle={metrics.wonDeals > 0 ? `${formatCurrency(metrics.avgDealSize)} avg` : "—"}
          variant="green"
          isLoading={metrics.isLoading}
        />
      </FunnelRow>
    </div>
  );
}
