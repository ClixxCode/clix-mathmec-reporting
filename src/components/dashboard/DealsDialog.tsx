import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
  wonOnly?: boolean;
}

interface DealWithContact {
  id: string;
  deal_name: string | null;
  deal_stage: string | null;
  amount: number | null;
  create_date: string | null;
  associated_contact_id: string | null;
  contact_name: string | null;
  contact_create_date: string | null;
  days_to_deal: number | null;
  campaign: string | null;
  keyword: string | null;
}

const stageColors: Record<string, string> = {
  "Closed Won": "bg-emerald-100 text-emerald-800",
  "Closed Lost": "bg-red-100 text-red-800",
  "Quote Delivered to Customer": "bg-blue-100 text-blue-800",
  "Assigned to Estimator": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-800",
  "Proposal": "bg-purple-100 text-purple-800",
  "Negotiation": "bg-amber-100 text-amber-800",
};

export function DealsDialog({ open, onOpenChange, month, wonOnly = false }: DealsDialogProps) {
  const { data: deals, isLoading } = useQuery({
    queryKey: ["month-deals-with-contacts", month, wonOnly],
    queryFn: async (): Promise<DealWithContact[]> => {
      // Parse month string like "Jan 2026" to date range
      const [monthName, year] = month.split(" ");
      const monthDate = new Date(`${monthName} 1, ${year}`);
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from("hubspot_deals")
        .select("id, deal_name, deal_stage, amount, create_date, associated_contact_id, traffic_source_drill_down_1, traffic_source_drill_down_2")
        .gte("create_date", startDate.toISOString())
        .lte("create_date", endDate.toISOString())
        .order("create_date", { ascending: false });

      if (dealsError) throw dealsError;

      // Get unique contact IDs
      const contactIds = [...new Set(
        (dealsData || [])
          .map(d => d.associated_contact_id)
          .filter(Boolean)
      )];

      // Fetch associated contacts
      let contactsMap: Record<string, { name: string; create_date: string | null }> = {};
      if (contactIds.length > 0) {
        const { data: contactsData } = await supabase
          .from("hubspot_contacts")
          .select("record_id, first_name, last_name, hubspot_create_date")
          .in("record_id", contactIds);

        if (contactsData) {
          contactsMap = contactsData.reduce((acc, c) => {
            const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unknown";
            acc[c.record_id] = { name, create_date: c.hubspot_create_date };
            return acc;
          }, {} as Record<string, { name: string; create_date: string | null }>);
        }
      }

      // Combine deals with contact info
      const mapped = (dealsData || []).map(deal => {
        const contact = deal.associated_contact_id ? contactsMap[deal.associated_contact_id] : null;
        let daysToDeeal: number | null = null;
        
        if (contact?.create_date && deal.create_date) {
          const contactDate = new Date(contact.create_date);
          const dealDate = new Date(deal.create_date);
          daysToDeeal = Math.round((dealDate.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
        }

        return {
          id: deal.id,
          deal_name: deal.deal_name,
          deal_stage: deal.deal_stage,
          amount: deal.amount,
          create_date: deal.create_date,
          associated_contact_id: deal.associated_contact_id,
          contact_name: contact?.name || null,
          contact_create_date: contact?.create_date || null,
          days_to_deal: daysToDeeal,
          campaign: deal.traffic_source_drill_down_1 || null,
          keyword: deal.traffic_source_drill_down_2 || null,
        };
      });
      return wonOnly
        ? mapped.filter((d) => (d.deal_stage || "").toLowerCase().includes("won"))
        : mapped;
    },
    enabled: open,
  });

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {wonOnly ? `Won Deals — ${month}` : `Deals — ${month}`}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            {wonOnly ? (
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Won Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{deals?.length || 0} deals won</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      deals && deals.length > 0
                        ? (deals.reduce((sum, d) => sum + (d.amount || 0), 0) / deals.length)
                        : 0
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Per won deal</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">Avg Days to Win</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const withDays = (deals || []).filter((d) => d.days_to_deal !== null);
                      if (withDays.length === 0) return "—";
                      const avg = withDays.reduce((s, d) => s + (d.days_to_deal || 0), 0) / withDays.length;
                      return `${Math.round(avg)}d`;
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Contact → won</p>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{deals?.length || 0} deals</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Closed Won</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    deals?.filter(d => d.deal_stage?.toLowerCase().includes("won"))
                      .reduce((sum, d) => sum + (d.amount || 0), 0) || 0
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {deals?.filter(d => d.deal_stage?.toLowerCase().includes("won")).length || 0} won
                </p>
              </div>
            </div>
            )}

            <ScrollArea className="h-[50vh]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white border-b border-[#e0e0e0] z-10">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Deal</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Stage</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Keyword</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deals?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-8">No deals found for this month</td></tr>
                  ) : (
                    deals?.map((deal, index) => {
                      const stageColor = stageColors[deal.deal_stage || ""] || "bg-gray-100 text-gray-600";
                      return (
                        <tr key={deal.id} className={`hover:bg-gray-50 transition-colors ${index % 2 ? "bg-[#fafafa]" : "bg-white"}`}>
                          <td className="px-4 py-3 max-w-[220px]">
                            <div className="flex items-center gap-2 min-w-0">
                              <Briefcase className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                              <span className="font-medium text-gray-900 truncate" title={deal.deal_name || "Unnamed Deal"}>
                                {deal.deal_name || "Unnamed Deal"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {deal.deal_stage && (
                              <Badge variant="secondary" className={`${stageColor} text-xs font-medium whitespace-nowrap`}>
                                {deal.deal_stage.length > 16 ? deal.deal_stage.substring(0, 16) + "…" : deal.deal_stage}
                              </Badge>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${deal.amount ? "text-emerald-600" : "text-gray-400"}`}>
                            {formatCurrency(deal.amount)}
                          </td>
                          <td className="px-4 py-3 max-w-[140px]">
                            {deal.contact_name ? (
                              <div className="flex items-center gap-1.5 min-w-0">
                                <User className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                                <span className="text-gray-700 truncate">{deal.contact_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <span className="text-gray-600 truncate block" title={deal.campaign || ""}>
                              {deal.campaign || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <span className="text-gray-600 truncate block" title={deal.keyword || ""}>
                              {deal.keyword || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {deal.days_to_deal !== null ? (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                                deal.days_to_deal <= 7 
                                  ? "bg-emerald-100 text-emerald-700" 
                                  : deal.days_to_deal <= 30 
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}>
                                {deal.days_to_deal === 0 ? "Same day" : `${deal.days_to_deal}d`}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
