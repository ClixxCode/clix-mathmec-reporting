import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, Clock, CheckCircle, XCircle, Mic } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CallsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
}

interface CTMCall {
  id: string;
  caller_number: string | null;
  tracking_number: string | null;
  duration: number | null;
  talk_time: number | null;
  answered: boolean | null;
  called_at: string | null;
  source: string | null;
  campaign: string | null;
  score: number | null;
  ai_summary: string | null;
  gclid: string | null;
}

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const formatPhoneNumber = (phone: string | null): string => {
  if (!phone) return "Unknown";
  // Basic US phone formatting
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
};

export function CallsDialog({ open, onOpenChange, month }: CallsDialogProps) {
  // Parse month for date range
  const [monthName, year] = month.split(" ");
  const monthDate = new Date(`${monthName} 1, ${year}`);
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: calls, isLoading } = useQuery({
    queryKey: ["google-ads-calls", month],
    queryFn: async (): Promise<CTMCall[]> => {
      const { data, error } = await supabase
        .from("ctm_calls")
        .select("id, caller_number, tracking_number, duration, talk_time, answered, called_at, source, campaign, score, ai_summary, gclid")
        .gte("called_at", startDate.toISOString())
        .lte("called_at", endDate.toISOString())
        .not("gclid", "is", null) // Only Google Ads calls (have a gclid)
        .order("called_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const answeredCalls = calls?.filter(c => c.answered) || [];
  const totalTalkTime = calls?.reduce((sum, c) => sum + (c.talk_time || 0), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Google Ads Calls — {month}
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {calls?.length || 0} calls
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-4">
            <span>Calls attributed to Google Ads via CTM tracking</span>
            {calls && calls.length > 0 && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-emerald-600">{answeredCalls.length} answered</span>
                <span className="text-gray-300">•</span>
                <span className="text-blue-600">{formatDuration(totalTalkTime)} total talk time</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">Caller</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Duration</TableHead>
                  <TableHead className="font-semibold">Campaign</TableHead>
                  <TableHead className="font-semibold text-center">Score</TableHead>
                  <TableHead className="font-semibold">Summary</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No Google Ads calls found for this month
                    </TableCell>
                  </TableRow>
                ) : (
                  calls?.map((call) => (
                    <TableRow key={call.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{formatPhoneNumber(call.caller_number)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.answered ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Answered
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-700">
                            <XCircle className="w-3 h-3 mr-1" />
                            Missed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span>{formatDuration(call.duration)}</span>
                          {call.talk_time && call.talk_time !== call.duration && (
                            <span className="text-xs text-gray-400">
                              ({formatDuration(call.talk_time)} talk)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {call.campaign ? (
                          <span className="text-xs text-blue-600 font-medium truncate max-w-[120px] block">
                            {call.campaign}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {call.score !== null ? (
                          <Badge 
                            variant="secondary" 
                            className={
                              call.score >= 7 ? "bg-emerald-100 text-emerald-700" :
                              call.score >= 4 ? "bg-yellow-100 text-yellow-700" :
                              "bg-red-100 text-red-700"
                            }
                          >
                            {call.score}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {call.ai_summary ? (
                          <div className="flex items-start gap-1.5 max-w-[200px]">
                            <Mic className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <span className="text-xs text-gray-600 line-clamp-2">
                              {call.ai_summary}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">No summary</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                        {call.called_at 
                          ? new Date(call.called_at).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
