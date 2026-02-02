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
import { Loader2, User, Building, Mail, Phone, MessageSquare, PhoneCall, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
}

interface Contact {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  company_name: string | null;
  lead_status: string | null;
  quality_score: number | null;
  message: string | null;
  hubspot_create_date: string | null;
  traffic_source_drill_down_1: string | null;
}

interface CTMCall {
  id: string;
  caller_number: string | null;
  ai_summary: string | null;
  called_at: string | null;
  duration: number;
  answered: boolean;
}

const leadStatusColors: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Open": "bg-green-100 text-green-800",
  "Connected": "bg-purple-100 text-purple-800",
  "Unqualified": "bg-gray-100 text-gray-600",
};

const getQualityLabel = (score: number | null): { label: string; color: string } => {
  if (score === null) return { label: "Not scored", color: "bg-gray-100 text-gray-500" };
  if (score >= 20) return { label: "High", color: "bg-emerald-100 text-emerald-800" };
  if (score >= 10) return { label: "Medium", color: "bg-yellow-100 text-yellow-800" };
  return { label: "Low", color: "bg-red-100 text-red-800" };
};

// Normalize phone numbers for comparison (strip non-digits, handle +1 prefix)
const normalizePhone = (phone: string | null): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // Remove leading 1 for US numbers
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
};

export function ContactsDialog({ open, onOpenChange, month }: ContactsDialogProps) {
  // Parse month for date range
  const [monthName, year] = month.split(" ");
  const monthDate = new Date(`${monthName} 1, ${year}`);
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: contacts, isLoading: contactsLoading } = useQuery({
    queryKey: ["month-contacts", month],
    queryFn: async (): Promise<Contact[]> => {
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .select("id, first_name, last_name, email, phone_number, company_name, lead_status, quality_score, message, hubspot_create_date, traffic_source_drill_down_1")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString())
        .order("hubspot_create_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch CTM calls for the same period
  const { data: ctmCalls } = useQuery({
    queryKey: ["month-ctm-calls", month],
    queryFn: async (): Promise<CTMCall[]> => {
      const { data, error } = await supabase
        .from("ctm_calls")
        .select("id, caller_number, ai_summary, called_at, duration, answered")
        .gte("called_at", startDate.toISOString())
        .lte("called_at", endDate.toISOString())
        .not("ai_summary", "is", null);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Build a map of normalized phone -> CTM calls
  const callsByPhone = new Map<string, CTMCall[]>();
  ctmCalls?.forEach(call => {
    const normalized = normalizePhone(call.caller_number);
    if (normalized) {
      const existing = callsByPhone.get(normalized) || [];
      existing.push(call);
      callsByPhone.set(normalized, existing);
    }
  });

  const isLoading = contactsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Paid Search Contacts — {month}
          </DialogTitle>
          <DialogDescription>
            Contacts from paid search with matched call recordings and summaries
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-3">
              {contacts?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No contacts found for this month</p>
              ) : (
                contacts?.map((contact) => {
                  const quality = getQualityLabel(contact.quality_score);
                  const statusColor = leadStatusColors[contact.lead_status || ""] || "bg-gray-100 text-gray-600";
                  
                  // Find matching calls by phone number
                  const normalizedContactPhone = normalizePhone(contact.phone_number);
                  const matchedCalls = normalizedContactPhone ? callsByPhone.get(normalizedContactPhone) : undefined;

                  return (
                    <div
                      key={contact.id}
                      className="p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {contact.first_name || ""} {contact.last_name || "Unknown"}
                            </span>
                            {contact.lead_status && (
                              <Badge variant="secondary" className={statusColor}>
                                {contact.lead_status}
                              </Badge>
                            )}
                            <Badge variant="secondary" className={quality.color}>
                              {contact.quality_score !== null 
                                ? `${quality.label} (${contact.quality_score})` 
                                : quality.label}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                            {contact.company_name && (
                              <div className="flex items-center gap-2">
                                <Building className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{contact.company_name}</span>
                              </div>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400" />
                                <span className="truncate">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone_number && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                <span>{contact.phone_number}</span>
                              </div>
                            )}
                            {contact.traffic_source_drill_down_1 && (
                              <div className="flex items-center gap-2">
                                <Target className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-blue-600 font-medium truncate">
                                  {contact.traffic_source_drill_down_1}
                                </span>
                              </div>
                            )}
                          </div>

                          {contact.message && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <div className="flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <p className="text-sm text-gray-600 line-clamp-3">
                                  {contact.message}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* CTM Call Summary */}
                          {matchedCalls && matchedCalls.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {matchedCalls.map((call) => (
                                <div key={call.id} className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                                  <div className="flex items-start gap-2">
                                    <PhoneCall className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-blue-700">Call Recording Summary</span>
                                        <span className="text-xs text-blue-500">
                                          {call.called_at ? new Date(call.called_at).toLocaleDateString() : ""}
                                        </span>
                                        <span className="text-xs text-blue-500">
                                          ({Math.floor((call.duration || 0) / 60)}:{String((call.duration || 0) % 60).padStart(2, '0')})
                                        </span>
                                      </div>
                                      <p className="text-sm text-gray-700">
                                        {call.ai_summary}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-xs text-gray-400 whitespace-nowrap">
                          {contact.hubspot_create_date 
                            ? new Date(contact.hubspot_create_date).toLocaleDateString()
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
