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
import { Loader2, Building, Mail, Phone, MessageSquare, Target } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  month: string; // e.g., "Jan 2026"
}

interface FormContact {
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

const leadStatusColors: Record<string, string> = {
  "New": "bg-blue-100 text-blue-800",
  "In Progress": "bg-yellow-100 text-yellow-800",
  "Open": "bg-green-100 text-green-800",
  "Connected": "bg-purple-100 text-purple-800",
  "Unqualified": "bg-gray-100 text-gray-600",
};

const getQualityBadge = (score: number | null): { label: string; color: string } => {
  if (score === null) return { label: "—", color: "bg-gray-100 text-gray-500" };
  if (score >= 20) return { label: `${score}`, color: "bg-emerald-100 text-emerald-800" };
  if (score >= 10) return { label: `${score}`, color: "bg-yellow-100 text-yellow-800" };
  return { label: `${score}`, color: "bg-red-100 text-red-800" };
};

export function FormsDialog({ open, onOpenChange, month }: FormsDialogProps) {
  // Parse month for date range
  const [monthName, year] = month.split(" ");
  const monthDate = new Date(`${monthName} 1, ${year}`);
  const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["form-submission-contacts", month],
    queryFn: async (): Promise<FormContact[]> => {
      // First get all Paid Search contacts
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .select("id, first_name, last_name, email, phone_number, company_name, lead_status, quality_score, message, hubspot_create_date, traffic_source_drill_down_1, raw_data")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString())
        .order("hubspot_create_date", { ascending: false });

      if (error) throw error;

      // Filter to only form submissions
      const formContacts = (data || []).filter((c) => {
        const incomingSource = (c.raw_data as Record<string, unknown>)?.["Incoming Lead Source"];
        return incomingSource === "Form Submission";
      });

      return formContacts;
    },
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Form Submissions — {month}
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {contacts?.length || 0} forms
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Paid Search contacts who submitted a form (from HubSpot)
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
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Campaign</TableHead>
                  <TableHead className="font-semibold text-center">Score</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No form submissions found for this month
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts?.map((contact) => {
                    const quality = getQualityBadge(contact.quality_score);
                    const statusColor = leadStatusColors[contact.lead_status || ""] || "bg-gray-100 text-gray-600";

                    return (
                      <TableRow key={contact.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          {contact.first_name || ""} {contact.last_name || "Unknown"}
                        </TableCell>
                        <TableCell>
                          {contact.company_name ? (
                            <div className="flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate max-w-[150px]">{contact.company_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {contact.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <span className="truncate max-w-[150px]">{contact.email}</span>
                              </div>
                            )}
                            {contact.phone_number && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{contact.phone_number}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.traffic_source_drill_down_1 ? (
                            <div className="flex items-center gap-1.5">
                              <Target className="w-3.5 h-3.5 text-blue-400" />
                              <span className="text-xs text-blue-600 font-medium truncate max-w-[120px]">
                                {contact.traffic_source_drill_down_1}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={quality.color}>
                            {quality.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contact.lead_status ? (
                            <Badge variant="secondary" className={statusColor}>
                              {contact.lead_status}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                          {contact.hubspot_create_date 
                            ? new Date(contact.hubspot_create_date).toLocaleDateString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
