import { locationPerformance } from "@/data/deals";
import { MapPin } from "lucide-react";

export function LocationPerformance() {
  const maxConversions = Math.max(...locationPerformance.map(l => l.conversions));
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Performance by Location</h3>
        <p className="text-sm text-gray-500 mt-1">December spend allocation & results</p>
      </div>
      <div className="p-6 space-y-5">
        {locationPerformance.map((loc) => (
          <div key={loc.location} className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-blue-50">
                  <MapPin className="w-4 h-4 text-blue-600" />
                </div>
                <span className="font-medium text-gray-900">{loc.location}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500">${loc.cost.toLocaleString()}</span>
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
              <span>{loc.clicks} clicks</span>
              <span>CPC: ${loc.cpc.toFixed(2)}</span>
              <span>CPConv: ${loc.costPerConversion}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
