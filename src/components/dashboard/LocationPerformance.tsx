import { useLocationPerformance } from "@/hooks/use-location-performance";
import { locationPerformance as staticLocationPerformance } from "@/data/deals";
import { MapPin, Loader2 } from "lucide-react";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { format } from "date-fns";

export function LocationPerformance() {
  const { data: liveData, isLoading, hasData } = useLocationPerformance();
  const { filters } = useDashboardFilters();
  
  // Use live data if available, otherwise fall back to static data
  const locationData = hasData ? liveData : staticLocationPerformance;
  const maxConversions = Math.max(...locationData.map(l => l.conversions), 1);
  
  const monthLabel = format(filters.selectedMonth, "MMMM yyyy");
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Performance by Location</h3>
            <p className="text-sm text-gray-500 mt-1">{monthLabel} spend allocation & results</p>
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
      </div>
      <div className="p-6 space-y-5">
        {locationData.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No geo performance data for this month</p>
        ) : (
          locationData.map((loc) => (
            <div key={loc.location} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-blue-50">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="font-medium text-gray-900">{loc.location}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">${loc.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="font-semibold text-blue-600">{loc.conversions} conv.</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                    style={{ width: `${(loc.conversions / maxConversions) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-500 w-12 text-right">
                  {loc.percentBudget.toFixed(1)}%
                </span>
              </div>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>{loc.clicks.toLocaleString()} clicks</span>
                <span>CPC: ${loc.cpc.toFixed(2)}</span>
                <span>CPConv: {loc.costPerConversion !== null ? `$${loc.costPerConversion.toFixed(2)}` : 'N/A'}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
