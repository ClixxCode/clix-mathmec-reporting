import { useState, useMemo } from "react";
import { deals, advertisingLocations, getAdCity } from "@/data/deals";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Filter, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function DealsTable() {
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const uniqueStages = useMemo(() => {
    const stages = [...new Set(deals.map((d) => d.dealStage))];
    return stages.sort();
  }, []);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      const adCity = getAdCity(deal.ipCity);
      const matchesCity = cityFilter === "all" || adCity.toLowerCase() === cityFilter.toLowerCase();
      const matchesStage = stageFilter === "all" || deal.dealStage === stageFilter;
      return matchesCity && matchesStage;
    });
  }, [cityFilter, stageFilter]);

  // Aggregate by advertising city (mapped)
  const cityAggregation = useMemo(() => {
    const agg: Record<string, { total: number; won: number; lost: number; revenue: number }> = {};

    filteredDeals.forEach((deal) => {
      const adCity = getAdCity(deal.ipCity);
      if (!agg[adCity]) {
        agg[adCity] = { total: 0, won: 0, lost: 0, revenue: 0 };
      }
      agg[adCity].total++;
      if (deal.dealStage.includes("Won")) {
        agg[adCity].won++;
        agg[adCity].revenue += deal.closedAmount;
      } else if (deal.dealStage.includes("Lost")) {
        agg[adCity].lost++;
      }
    });

    return Object.entries(agg)
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [filteredDeals]);

  const getStageStyle = (stage: string) => {
    if (stage.includes("Won")) return "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700";
    if (stage.includes("Lost")) return "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700";
    return "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Deals from Search</h3>
            <p className="text-sm text-gray-500 mt-1">
              Last 180 Days • {filteredDeals.length} deals • Filter by city and stage
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-50">
              <Filter className="w-4 h-4 text-gray-400" />
            </div>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200 rounded-lg">
                <SelectValue placeholder="All Cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cities</SelectItem>
                {advertisingLocations.map((city) => (
                  <SelectItem key={city} value={city.toLowerCase()}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[150px] bg-gray-50 border-gray-200 rounded-lg">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {uniqueStages.map((stage) => (
                  <SelectItem key={stage} value={stage}>
                    {stage}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* City Aggregation Summary */}
      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" />
          City Summary {cityFilter !== "all" && `(filtered: ${cityFilter})`}
        </h4>
        <div className="flex flex-wrap gap-2">
          {cityAggregation.map((city) => (
            <button
              key={city.city}
              onClick={() => setCityFilter(cityFilter === city.city.toLowerCase() ? "all" : city.city.toLowerCase())}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer ${
                cityFilter === city.city.toLowerCase()
                  ? "bg-blue-50 border-blue-200 shadow-sm"
                  : "bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              <div className="p-1 rounded-md bg-blue-100">
                <MapPin className="w-3 h-3 text-blue-600" />
              </div>
              <div>
                <span className="font-medium text-sm text-gray-900">{city.city}</span>
                <span className="ml-1 text-xs text-blue-600">(Ads)</span>
              </div>
              <div className="flex items-center gap-1.5 ml-2 text-xs">
                <span className="text-gray-500">{city.total}</span>
                <span className="text-emerald-600 font-medium">+{city.won}</span>
                <span className="text-red-500 font-medium">-{city.lost}</span>
                {city.revenue > 0 && (
                  <span className="text-gray-900 font-semibold">${city.revenue.toLocaleString()}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Deals List */}
      <TooltipProvider>
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Deal</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">City</th>
                <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredDeals.map((deal) => {
                const adCity = getAdCity(deal.ipCity);
                const showTooltip = adCity !== deal.ipCity;

                return (
                  <tr key={deal.dealId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="max-w-[250px] truncate font-medium text-sm text-gray-900">{deal.dealName}</div>
                      <div className="text-xs text-gray-400">{deal.trafficSourceDrillDown2}</div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {deal.firstName} {deal.lastName}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500">
                      {new Date(deal.creationDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-4">
                      {showTooltip ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 cursor-help">
                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              <span className="text-sm text-gray-900">{adCity}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Original location: {deal.ipCity}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-sm text-gray-600">{adCity}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={getStageStyle(deal.dealStage)}>{deal.dealStage.replace(/ \(.*\)/, "")}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-gray-900">
                      {deal.closedAmount > 0 ? `$${deal.closedAmount.toLocaleString()}` : "-"}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-gray-400">{deal.daysToClose || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
    </div>
  );
}
