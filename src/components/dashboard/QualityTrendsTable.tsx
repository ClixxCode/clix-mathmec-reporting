import { useState, useMemo } from "react";
import { leadQualityTrends, QualityTrendRow } from "@/data/leads";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

type SortKey = "month" | "totalContacts" | "avgQuality";
type SortDirection = "asc" | "desc";

export function QualityTrendsTable() {
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
    return [...leadQualityTrends].sort((a, b) => {
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
  }, [sortKey, sortDirection]);

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

  // Get trend based on original order (not sorted order)
  const getTrend = (row: QualityTrendRow) => {
    const originalIndex = leadQualityTrends.findIndex((r) => r.month === row.month);
    const prevAvg = originalIndex > 0 ? leadQualityTrends[originalIndex - 1].avgQuality : row.avgQuality;
    return row.avgQuality >= prevAvg;
  };


  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Contact Quality Trends</h3>
        <p className="text-sm text-gray-500 mt-1">Monthly breakdown of contact quality scores</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
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
            {sortedData.map((row) => {
              const isUp = getTrend(row);

              return (
                <tr key={row.month} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 font-medium text-gray-900">{row.month}</td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {row.totalContacts}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right font-semibold text-gray-900">
                    {row.avgQuality.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${isUp ? 'bg-emerald-50' : 'bg-red-50'}`}>
                      {isUp ? (
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-500" />
                      )}
                    </div>
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
