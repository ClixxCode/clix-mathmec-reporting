import { useState, useMemo } from "react";
import { useQualityTrends, QualityTrendRow } from "@/hooks/use-contact-analytics";
import { TrendingUp, TrendingDown, ArrowUp, ArrowDown, ArrowUpDown, Loader2, Info, AlertTriangle } from "lucide-react";
import { ContactsDialog } from "./ContactsDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type SortKey = "month" | "totalContacts" | "qualificationRate";
type SortDirection = "asc" | "desc";

const qualificationInfo = `Qualification Rate:
• Percentage of contacts NOT marked as "Unqualified"
• Formula: (Total - Unqualified) / Total × 100
• Higher is better

Data Quality Warning (⚠️):
• Shown when >50% of contacts lack a lead status
• Indicates sales team needs to review more leads`;

export function QualityTrendsTable() {
  const { data: qualityTrends, isLoading, error } = useQualityTrends();
  const [sortKey, setSortKey] = useState<SortKey>("month");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

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

  const SortableHeader = ({ column, children, className = "", showInfo = false }: { column: SortKey; children: React.ReactNode; className?: string; showInfo?: boolean }) => (
    <th
      className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 transition-colors select-none ${className}`}
      onClick={() => handleSort(column)}
    >
      <div className={`flex items-center ${className.includes("text-right") ? "justify-end" : ""}`}>
        {children}
        {showInfo && (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button 
                  className="text-gray-300 hover:text-gray-500 transition-colors ml-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs whitespace-pre-line">
                <p>{qualificationInfo}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <SortIcon column={column} />
      </div>
    </th>
  );

  // Get trend based on comparing to previous month
  const getTrend = (row: QualityTrendRow, index: number) => {
    if (!qualityTrends || index >= qualityTrends.length - 1) return true;
    const originalIndex = qualityTrends.findIndex((r) => r.month === row.month);
    const prevRate = originalIndex > 0 ? qualityTrends[originalIndex - 1].qualificationRate : row.qualificationRate;
    return row.qualificationRate >= prevRate;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Paid Search Contact Trends</h3>
          <p className="text-sm text-gray-500 mt-1">Monthly breakdown of paid search contacts</p>
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
          <h3 className="text-lg font-semibold text-gray-900">Paid Search Contact Trends</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Paid Search Contact Trends</h3>
        <p className="text-sm text-gray-500 mt-1">Monthly breakdown of paid search contacts & qualification rates</p>
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
              <SortableHeader column="qualificationRate" className="text-right" showInfo>
                Qualification Rate
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
                <tr 
                  key={row.month} 
                  className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedMonth(row.month)}
                >
                  <td className="px-4 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {row.month}
                      {row.dataQualityWarning && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-xs text-xs">
                              <p>
                                {row.reviewedCount} of {row.totalContacts} contacts have a lead status set.
                                <br />
                                Consider reviewing the remaining {row.totalContacts - row.reviewedCount} contacts.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                      {row.totalContacts}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className={`font-semibold ${row.qualificationRate >= 80 ? 'text-emerald-600' : row.qualificationRate >= 60 ? 'text-gray-900' : 'text-amber-600'}`}>
                            {row.qualificationRate}%
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          <p>{row.unqualifiedCount} unqualified of {row.totalContacts} total</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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

      <ContactsDialog 
        open={selectedMonth !== null} 
        onOpenChange={(open) => !open && setSelectedMonth(null)}
        month={selectedMonth || ""}
      />
    </div>
  );
}
