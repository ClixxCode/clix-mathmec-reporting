import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "./use-dashboard-filters";

export type QualityBucket =
  | "likely_qualified"
  | "likely_disqualified"
  | "likely_spam"
  | "insufficient_context"
  | "unscored";

export interface CampaignQualityRow {
  campaign: string;
  spend: number;
  contacts: number;
  qualified: number;
  disqualified: number;
  spam: number;
  insufficient: number;
  unscored: number;
  avgScore: number | null;
  costPerQualified: number | null;
  qualifiedRate: number;
}

export interface DisqualReason {
  reason: string;
  count: number;
  source: "contact_ai" | "lead_sales";
}

const normalize = (name: string) => (name || "").toLowerCase().trim();

export function useQualityInsights() {
  const { filters } = useDashboardFilters();
  const selectedMonth = filters.selectedMonth;
  const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
  const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0, 23, 59, 59);

  const { data: ads, isLoading: l1 } = useQuery({
    queryKey: ["qi-ads", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("google_ads_performance")
        .select("campaign, cost")
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0]);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contacts, isLoading: l2 } = useQuery({
    queryKey: ["qi-contacts", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_contacts")
        .select("record_id, traffic_source_drill_down_1, quality_score, quality_analysis, lifecycle_stage, lead_status")
        .ilike("original_traffic_source", "Paid Search")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  const { data: leads, isLoading: l3 } = useQuery({
    queryKey: ["qi-leads", startDate.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hubspot_leads")
        .select("associated_contact_id, lead_stage, disqualification_reason, hubspot_create_date")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString());
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = l1 || l2 || l3;

  // Build lead lookup by contact id
  const leadByContact = new Map<string, { stage?: string | null; disqual?: string | null }>();
  (leads || []).forEach((l) => {
    if (!l.associated_contact_id) return;
    leadByContact.set(l.associated_contact_id, {
      stage: l.lead_stage,
      disqual: l.disqualification_reason,
    });
  });

  const adsByCampaign = new Map<string, number>();
  (ads || []).forEach((a) => {
    const key = normalize(a.campaign);
    adsByCampaign.set(key, (adsByCampaign.get(key) || 0) + Number(a.cost || 0));
  });

  const displayNames = new Map<string, string>();
  (ads || []).forEach((a) => {
    const key = normalize(a.campaign);
    if (!displayNames.has(key)) displayNames.set(key, a.campaign);
  });

  const byCampaign = new Map<string, CampaignQualityRow>();
  const ensureRow = (key: string, display: string): CampaignQualityRow => {
    let row = byCampaign.get(key);
    if (!row) {
      row = {
        campaign: display,
        spend: adsByCampaign.get(key) || 0,
        contacts: 0,
        qualified: 0,
        disqualified: 0,
        spam: 0,
        insufficient: 0,
        unscored: 0,
        avgScore: null,
        costPerQualified: null,
        qualifiedRate: 0,
      };
      byCampaign.set(key, row);
    }
    return row;
  };

  // Seed rows with campaigns that have spend
  adsByCampaign.forEach((_, key) => ensureRow(key, displayNames.get(key) || key));

  const scoreSums = new Map<string, { sum: number; n: number }>();
  const contactDisqualReasons: Record<string, number> = {};
  const leadDisqualReasons: Record<string, number> = {};

  (contacts || []).forEach((c) => {
    const display = c.traffic_source_drill_down_1 || "Unknown";
    const key = normalize(display);
    if (!displayNames.has(key)) displayNames.set(key, display);
    const row = ensureRow(key, displayNames.get(key) || display);
    row.contacts += 1;

    // Prefer lead stage when present, else use AI bucket
    const lead = leadByContact.get(c.record_id);
    let bucket: QualityBucket = "unscored";
    const qa = (c.quality_analysis as { bucket?: QualityBucket; reason?: string; source?: string } | null) || null;

    if (lead?.stage) {
      const s = lead.stage.toLowerCase();
      if (s.includes("qualif") && !s.includes("dis")) bucket = "likely_qualified";
      else if (s.includes("disqualif") || s.includes("unqualif")) bucket = "likely_disqualified";
      else if (s.includes("spam")) bucket = "likely_spam";
    }
    if (bucket === "unscored" && qa?.bucket) bucket = qa.bucket;

    if (bucket === "likely_qualified") row.qualified += 1;
    else if (bucket === "likely_disqualified") row.disqualified += 1;
    else if (bucket === "likely_spam") row.spam += 1;
    else if (bucket === "insufficient_context") row.insufficient += 1;
    else row.unscored += 1;

    if (typeof c.quality_score === "number") {
      const s = scoreSums.get(key) || { sum: 0, n: 0 };
      s.sum += c.quality_score;
      s.n += 1;
      scoreSums.set(key, s);
    }

    if (bucket === "likely_disqualified" && qa?.reason) {
      contactDisqualReasons[qa.reason] = (contactDisqualReasons[qa.reason] || 0) + 1;
    }
    if (lead?.disqual) {
      leadDisqualReasons[lead.disqual] = (leadDisqualReasons[lead.disqual] || 0) + 1;
    }
  });

  const rows: CampaignQualityRow[] = [];
  byCampaign.forEach((row, key) => {
    const ss = scoreSums.get(key);
    row.avgScore = ss && ss.n > 0 ? ss.sum / ss.n : null;
    row.costPerQualified = row.qualified > 0 ? row.spend / row.qualified : null;
    row.qualifiedRate = row.contacts > 0 ? row.qualified / row.contacts : 0;
    if (row.spend > 0 || row.contacts > 0) rows.push(row);
  });
  rows.sort((a, b) => b.spend - a.spend);

  const topContactReasons: DisqualReason[] = Object.entries(contactDisqualReasons)
    .map(([reason, count]) => ({ reason, count, source: "contact_ai" as const }))
    .sort((a, b) => b.count - a.count);
  const topLeadReasons: DisqualReason[] = Object.entries(leadDisqualReasons)
    .map(([reason, count]) => ({ reason, count, source: "lead_sales" as const }))
    .sort((a, b) => b.count - a.count);

  // Top-line stats
  const totals = rows.reduce(
    (acc, r) => {
      acc.spend += r.spend;
      acc.contacts += r.contacts;
      acc.qualified += r.qualified;
      acc.disqualified += r.disqualified;
      acc.spam += r.spam;
      acc.insufficient += r.insufficient;
      acc.unscored += r.unscored;
      return acc;
    },
    { spend: 0, contacts: 0, qualified: 0, disqualified: 0, spam: 0, insufficient: 0, unscored: 0 }
  );

  return {
    isLoading,
    rows,
    totals,
    topContactReasons,
    topLeadReasons,
  };
}