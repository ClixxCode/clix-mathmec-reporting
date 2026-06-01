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

export interface SourceQualityRow {
  source: string;
  contacts: number;
  qualified: number;
  disqualified: number;
  spam: number;
  insufficient: number;
  unscored: number;
  avgScore: number | null;
  qualifiedRate: number;
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
        .select("record_id, original_traffic_source, traffic_source_drill_down_1, quality_score, quality_analysis, lifecycle_stage, lead_status")
        .gte("hubspot_create_date", startDate.toISOString())
        .lte("hubspot_create_date", endDate.toISOString())
        .limit(5000);
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

  // Source-level aggregation across ALL traffic sources
  const bySource = new Map<string, SourceQualityRow>();
  const sourceScoreSums = new Map<string, { sum: number; n: number }>();
  const ensureSourceRow = (display: string): SourceQualityRow => {
    let row = bySource.get(display);
    if (!row) {
      row = {
        source: display,
        contacts: 0,
        qualified: 0,
        disqualified: 0,
        spam: 0,
        insufficient: 0,
        unscored: 0,
        avgScore: null,
        qualifiedRate: 0,
      };
      bySource.set(display, row);
    }
    return row;
  };

  const classify = (
    leadStage: string | null | undefined,
    qa: { bucket?: QualityBucket; reason?: string } | null
  ): QualityBucket => {
    if (leadStage) {
      const s = leadStage.toLowerCase();
      if (s.includes("disqualif") || s.includes("unqualif")) return "likely_disqualified";
      if (s.includes("spam")) return "likely_spam";
      if (s.includes("qualif")) return "likely_qualified";
    }
    if (qa?.bucket) return qa.bucket;
    return "unscored";
  };

  (contacts || []).forEach((c) => {
    const sourceDisplay = c.original_traffic_source || "Unknown";
    const srcRow = ensureSourceRow(sourceDisplay);
    srcRow.contacts += 1;

    const lead = leadByContact.get(c.record_id);
    const qa = (c.quality_analysis as { bucket?: QualityBucket; reason?: string; source?: string } | null) || null;
    const bucket = classify(lead?.stage, qa);

    if (bucket === "likely_qualified") srcRow.qualified += 1;
    else if (bucket === "likely_disqualified") srcRow.disqualified += 1;
    else if (bucket === "likely_spam") srcRow.spam += 1;
    else if (bucket === "insufficient_context") srcRow.insufficient += 1;
    else srcRow.unscored += 1;

    if (typeof c.quality_score === "number") {
      const ss = sourceScoreSums.get(sourceDisplay) || { sum: 0, n: 0 };
      ss.sum += c.quality_score;
      ss.n += 1;
      sourceScoreSums.set(sourceDisplay, ss);
    }

    // Paid Search → also drill into campaigns
    const isPaid = (c.original_traffic_source || "").toLowerCase().includes("paid");
    if (!isPaid) return;

    const display = c.traffic_source_drill_down_1 || "Unknown";
    const key = normalize(display);
    if (!displayNames.has(key)) displayNames.set(key, display);
    const row = ensureRow(key, displayNames.get(key) || display);
    row.contacts += 1;

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
  });

  // Pull lead disqualification reasons from ALL leads in the month, not just paid search
  (leads || []).forEach((l) => {
    if (l.disqualification_reason) {
      leadDisqualReasons[l.disqualification_reason] =
        (leadDisqualReasons[l.disqualification_reason] || 0) + 1;
    }
  });

  const sourceRows: SourceQualityRow[] = [];
  bySource.forEach((row) => {
    const ss = sourceScoreSums.get(row.source);
    row.avgScore = ss && ss.n > 0 ? ss.sum / ss.n : null;
    row.qualifiedRate = row.contacts > 0 ? row.qualified / row.contacts : 0;
    sourceRows.push(row);
  });
  sourceRows.sort((a, b) => b.contacts - a.contacts);

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
    sourceRows,
    totals,
    topContactReasons,
    topLeadReasons,
  };
}