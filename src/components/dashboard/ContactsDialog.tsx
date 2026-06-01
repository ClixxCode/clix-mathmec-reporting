import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building, Mail, Phone, MessageSquare, PhoneCall, Target, ChevronDown, Sparkles } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
interface ContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
}

interface Contact {
  id: string;
  record_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  company_name: string | null;
  lead_status: string | null;
  quality_score: number | null;
  quality_analysis: { source?: string; bucket?: string; reason?: string; had_message?: boolean; had_call?: boolean } | null;
  message: string | null;
  hubspot_create_date: string | null;
  traffic_source_drill_down_1: string | null;
  traffic_source_drill_down_2: string | null;
}

interface LeadInfo {
  lead_stage: string | null;
  disqualification_reason: string | null;
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

const getLeadStageBadge = (lead: LeadInfo | undefined): { label: string; color: string; tooltip?: string } | null => {
  const stage = lead?.lead_stage?.trim();
  if (!stage) return null;
  const s = stage.toLowerCase();
  if (s === "qualified") return { label: "Qualified", color: "bg-emerald-100 text-emerald-800" };
  if (s === "connected") return { label: "In Progress", color: "bg-blue-100 text-blue-800" };
  if (s === "disqualified") {
    const reason = lead?.disqualification_reason?.trim();
    if (reason && reason.toLowerCase() === "spam") {
      return { label: "Spam", color: "bg-red-100 text-red-800" };
    }
    return { label: reason ? `Disqualified · ${reason}` : "Disqualified", color: "bg-red-100 text-red-700" };
  }
  if (s === "new") return { label: "New", color: "bg-amber-100 text-amber-800" };
  if (s === "attempting") return { label: "Attempting", color: "bg-amber-100 text-amber-800" };
  return { label: stage, color: "bg-gray-100 text-gray-700" };
};

const getAiBadge = (qa: Contact["quality_analysis"]): { label: string; color: string; tooltip?: string } | null => {
  if (!qa || qa.source !== "ai_inferred" || !qa.bucket) return null;
  const map: Record<string, { label: string; color: string }> = {
    likely_qualified: { label: "Likely Qualified", color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    likely_disqualified: { label: "Likely Disqualified", color: "bg-red-50 text-red-700 border border-red-200" },
    likely_spam: { label: "Likely Spam", color: "bg-red-50 text-red-700 border border-red-200" },
    insufficient_context: { label: "Insufficient context", color: "bg-gray-100 text-gray-500" },
  };
  const m = map[qa.bucket];
  if (!m) return null;
  return { ...m, tooltip: qa.reason };
};

// Normalize phone numbers for comparison (strip non-digits, handle +1 prefix)
const normalizePhone = (phone: string | null): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  // Remove leading 1 for US numbers
  return digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
};

// Contact Card Component
function ContactCard({ 
  contact, 
  stageBadge, 
  matchedCalls 
}: { 
  contact: Contact; 
  stageBadge: { label: string; color: string; tooltip?: string; isAi?: boolean }; 
  matchedCalls?: CTMCall[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="rounded-lg border border-gray-100 hover:border-gray-200 transition-colors bg-white overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between gap-4 text-left hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <span className="font-medium text-gray-900 truncate">
                {contact.first_name || ""} {contact.last_name || "Unknown"}
              </span>
              <Badge
                variant="secondary"
                className={stageBadge.color}
                title={stageBadge.tooltip}
              >
                {stageBadge.isAi && <span className="mr-1 text-[9px] font-bold opacity-70">AI</span>}
                {stageBadge.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {contact.traffic_source_drill_down_1 && (
                <div className="flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-600 font-medium max-w-[150px] truncate" title={contact.traffic_source_drill_down_1}>
                    {contact.traffic_source_drill_down_1}
                  </span>
                </div>
              )}
              {contact.traffic_source_drill_down_2 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500 max-w-[150px] truncate" title={contact.traffic_source_drill_down_2}>
                    {contact.traffic_source_drill_down_2}
                  </span>
                </div>
              )}
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {contact.hubspot_create_date 
                  ? new Date(contact.hubspot_create_date).toLocaleDateString()
                  : "—"}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 border-t border-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mt-3">
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
            </div>

            {contact.message && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600">
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
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ContactsDialog({ open, onOpenChange, month }: ContactsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isScoring, setIsScoring] = useState(false);
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
        .select("id, record_id, first_name, last_name, email, phone_number, company_name, lead_status, quality_score, quality_analysis, message, hubspot_create_date, traffic_source_drill_down_1, traffic_source_drill_down_2")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString())
        .order("hubspot_create_date", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Contact[];
    },
    enabled: open,
  });

  // Fetch all leads and build a contact_id -> lead map
  const { data: leads } = useQuery({
    queryKey: ["month-leads", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_leads")
        .select("associated_contact_id, lead_stage, disqualification_reason");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const handleAiScore = async () => {
    setIsScoring(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-score-contacts", { body: {} });
      if (error) throw error;
      const s = data?.summary || {};
      toast({
        title: "AI scoring complete",
        description: `${s.scored ?? 0} scored · ${s.skipped_insufficient ?? 0} insufficient · ${s.failed ?? 0} failed (of ${s.candidates ?? 0} unscored)`,
      });
      queryClient.invalidateQueries({ queryKey: ["month-contacts", month] });
    } catch (e) {
      toast({
        title: "AI scoring failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const leadByContact = new Map<string, LeadInfo>();
  leads?.forEach((l) => {
    if (l.associated_contact_id && !leadByContact.has(l.associated_contact_id)) {
      leadByContact.set(l.associated_contact_id, {
        lead_stage: l.lead_stage,
        disqualification_reason: l.disqualification_reason,
      });
    }
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl">
                Paid Search Contacts — {month}
              </DialogTitle>
              <DialogDescription>
                Contacts from paid search with matched call recordings and summaries
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 flex-shrink-0 mr-6"
              disabled={isScoring}
              onClick={handleAiScore}
              title="Use AI to estimate quality for contacts without a HubSpot lead stage, based on their form message and matched call recording."
            >
              <Sparkles className={`w-3.5 h-3.5 ${isScoring ? "animate-pulse" : ""}`} />
              {isScoring ? "Scoring…" : "AI-score gaps"}
            </Button>
          </div>
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
                  const leadBadge = getLeadStageBadge(leadByContact.get(contact.record_id));
                  const aiBadge = !leadBadge ? getAiBadge(contact.quality_analysis) : null;
                  const stageBadge = leadBadge
                    ?? (aiBadge ? { ...aiBadge, isAi: true } : { label: "No lead yet", color: "bg-gray-100 text-gray-500" });
                  
                  // Find matching calls by phone number
                  const normalizedContactPhone = normalizePhone(contact.phone_number);
                  const matchedCalls = normalizedContactPhone ? callsByPhone.get(normalizedContactPhone) : undefined;

                  return (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      stageBadge={stageBadge}
                      matchedCalls={matchedCalls}
                    />
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
