import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, DollarSign, Calendar, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DealsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
}

interface Deal {
  id: string;
  deal_name: string | null;
  deal_stage: string | null;
  amount: number | null;
  close_date: string | null;
  create_date: string | null;
  deal_owner: string | null;
  pipeline: string | null;
}

const stageColors: Record<string, string> = {
  "Closed Won": "bg-emerald-100 text-emerald-800",
  "Closed Lost": "bg-red-100 text-red-800",
  "In Progress": "bg-blue-100 text-blue-800",
  "Proposal": "bg-purple-100 text-purple-800",
  "Negotiation": "bg-amber-100 text-amber-800",
};

export function DealsDialog({ open, onOpenChange, month }: DealsDialogProps) {
  const { data: deals, isLoading } = useQuery({
    queryKey: ["month-deals", month],
    queryFn: async (): Promise<Deal[]> => {
      // Parse month string like "Jan 2026" to date range
      const [monthName, year] = month.split(" ");
      const monthDate = new Date(`${monthName} 1, ${year}`);
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

      const { data, error } = await supabase
        .from("hubspot_deals")
        .select("id, deal_name, deal_stage, amount, close_date, create_date, deal_owner, pipeline")
        .gte("create_date", startDate.toISOString())
        .lte("create_date", endDate.toISOString())
        .order("create_date", { ascending: false });

      if (error) throw error;
      return data || [];
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Deals — {month}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {deals?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No deals found for this month</p>
              ) : (
                deals?.map((deal) => {
                  const stageColor = stageColors[deal.deal_stage || ""] || "bg-gray-100 text-gray-600";

                  return (
                    <div
                      key={deal.id}
                      className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 truncate">
                              {deal.deal_name || "Unnamed Deal"}
                            </span>
                            {deal.deal_stage && (
                              <Badge variant="secondary" className={stageColor}>
                                {deal.deal_stage}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                              <span className="font-medium">{formatCurrency(deal.amount)}</span>
                            </div>
                            {deal.deal_owner && (
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{deal.deal_owner}</span>
                              </div>
                            )}
                            {deal.close_date && (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>Close: {new Date(deal.close_date).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {deal.create_date 
                            ? new Date(deal.create_date).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
