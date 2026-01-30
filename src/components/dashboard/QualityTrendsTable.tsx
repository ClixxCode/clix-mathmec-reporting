import { useState, useMemo } from "react";
import { useQualityTrends, QualityTrendRow } from "@/hooks/use-contact-analytics";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from "lucide-react";

type SortKey = "month" | "totalContacts" | "avgQuality";
type SortDirection = "asc" | "desc";

export function QualityTrendsTable() {
  const { data: qualityTrends, isLoading, error } = useQualityTrends();
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const parseMonthYear = (monthStr: string): Date => {
    const [month, year] = monthStr.split(" ");
    const monthIndex = new Date(`${month} 1, 2000`).getMonth();
    return new Date(parseInt(year), monthIndex, 1);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "month" ? "desc" : "desc");
    }
  };

  const sortedData = useMemo(() => {
    if (!qualityTrends) return [];
    
    return [...qualityTrends].sort((a, b) => {
      let comparison = 0;

      if (sortKey === "month") {
        const dateA = parseMonthYear(a.month);
        const dateB = parseMonthYear(b.month);
        comparison = dateA.getTime() - dateB.getTime();
      } else {
        comparison = a[sortKey] - b[sortKey];
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [qualityTrends, sortKey, sortDirection]);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1.5 text-gray-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1.5 text-blue-600" />
    );
  };

  const SortableHeader = ({ column, children, className = "" }: { column: SortKey; children: React.ReactNode; className?: string }) => (
    <th
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center ${className.includes("text-right") ? "justify-end" : ""}`}>
        {children}
        <SortIcon column={column} />
      </div>
    </th>
  );

  // Get trend based on the sorted data position
  const getTrend = (row: QualityTrendRow, index: number) => {
    if (!qualityTrends || index >= qualityTrends.length - 1) return true;
    const originalIndex = qualityTrends.findIndex((r) => r.month === row.month);
    const prevAvg = originalIndex > 0 ? qualityTrends[originalIndex - 1].avgQuality : row.avgQuality;
    return row.avgQuality >= prevAvg;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Contact Quality Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly breakdown of contact quality scores</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Contact Quality Trends</h3>
        </div>
        <div className="flex items-center justify-center py-12 text-red-500">
          Failed to load data
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Contact Quality Trends</h3>
        <p className="text-sm text-gray-500 mt-1">Monthly breakdown of contact quality scores</p>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-gray-100">
              <SortableHeader column="month" className="text-left">
                Month
              </SortableHeader>
              <SortableHeader column="totalContacts" className="text-right">
                Total Contacts
              </SortableHeader>
              <SortableHeader column="avgQuality" className="text-right">
                Avg Quality
              </SortableHeader>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sortedData.map((row, index) => {
              const isUp = getTrend(row, index);

              return (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-900">{row.month}</td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {row.totalContacts}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {row.avgQuality > 0 ? row.avgQuality.toFixed(1) : "—"}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {row.avgQuality > 0 ? (
                      <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {isUp ? (
                          <TrendingUp className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
