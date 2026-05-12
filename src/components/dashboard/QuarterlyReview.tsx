import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownRight, ArrowUpRight, Users, DollarSign, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuarterStats {
  contacts: number;
  paidContacts: number;
  deals: number;
  pipeline: number;
  bySource: Record<string, number>;
}

async function fetchQuarter(start: string, end: string): Promise<QuarterStats> {
  async function fetchAll<T>(
    table: "hubspot_contacts" | "hubspot_deals",
    columns: string,
    dateCol: string
  ): Promise<T[]> {
    const pageSize = 1000;
    let from = 0;
    const out: T[] = [];
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .gte(dateCol, start)
        .lt(dateCol, end)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const rows = (data ?? []) as T[];
      out.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }
    return out;
  }

  const [contacts, deals] = await Promise.all([
    fetchAll<{ original_traffic_source: string | null }>(
      "hubspot_contacts",
      "original_traffic_source",
      "hubspot_create_date"
    ),
    fetchAll<{ amount: number | null }>("hubspot_deals", "amount", "create_date"),
  ]);

  const bySource: Record<string, number> = {};
  for (const c of contacts) {
    const k = c.original_traffic_source ?? "Unknown";
    bySource[k] = (bySource[k] ?? 0) + 1;
  }

  return {
    contacts: contacts.length,
    paidContacts: bySource["Paid Search"] ?? 0,
    deals: deals.length,
    pipeline: deals.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    bySource,
  };
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function pctChange(curr: number, prev: number) {
  if (!prev) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function ComparisonCard({
  label, icon: Icon, current, previous, format,
}: {
  label: string;
  icon: any;
  current: number;
  previous: number;
  format: (n: number) => string;
}) {
  const change = pctChange(current, previous);
  const positive = change >= 0;
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="w-4 h-4" />
          <span>{label}</span>
        </div>
        <div className={cn(
          "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
          positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
        )}>
          {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change).toFixed(1)}%
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Q1 2026</div>
          <div className="text-3xl font-bold text-foreground">{format(current)}</div>
        </div>
        <div className="pt-3 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Q1 2025</div>
          <div className="text-lg font-semibold text-muted-foreground">{format(previous)}</div>
        </div>
      </div>
    </div>
  );
}

export function QuarterlyReview() {
  const { data: q1_2026 } = useQuery({
    queryKey: ["quarter", "2026Q1"],
    queryFn: () => fetchQuarter("2026-01-01", "2026-04-01"),
  });
  const { data: q1_2025 } = useQuery({
    queryKey: ["quarter", "2025Q1"],
    queryFn: () => fetchQuarter("2025-01-01", "2025-04-01"),
  });

  if (!q1_2026 || !q1_2025) {
    return <div className="text-muted-foreground text-sm">Loading quarterly comparison…</div>;
  }

  const sources = Array.from(
    new Set([...Object.keys(q1_2026.bySource), ...Object.keys(q1_2025.bySource)])
  ).sort((a, b) => (q1_2026.bySource[b] ?? 0) - (q1_2026.bySource[a] ?? 0));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Q1 2026 vs Q1 2025</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Year-over-year comparison across contacts and pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComparisonCard
          label="Total Contacts"
          icon={Users}
          current={q1_2026.contacts}
          previous={q1_2025.contacts}
          format={(n) => n.toLocaleString()}
        />
        <ComparisonCard
          label="Paid Search Contacts"
          icon={TrendingUp}
          current={q1_2026.paidContacts}
          previous={q1_2025.paidContacts}
          format={(n) => n.toLocaleString()}
        />
        <ComparisonCard
          label="Pipeline Value"
          icon={DollarSign}
          current={q1_2026.pipeline}
          previous={q1_2025.pipeline}
          format={fmtMoney}
        />
        <ComparisonCard
          label="Deals Created"
          icon={Briefcase}
          current={q1_2026.deals}
          previous={q1_2025.deals}
          format={(n) => n.toLocaleString()}
        />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="font-semibold text-foreground text-lg mb-4">Contacts by Traffic Source</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 px-4 font-medium text-right">Q1 2025</th>
                <th className="py-2 px-4 font-medium text-right">Q1 2026</th>
                <th className="py-2 pl-4 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => {
                const prev = q1_2025.bySource[src] ?? 0;
                const curr = q1_2026.bySource[src] ?? 0;
                const change = pctChange(curr, prev);
                const positive = change >= 0;
                return (
                  <tr key={src} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 text-foreground">{src}</td>
                    <td className="py-3 px-4 text-right text-muted-foreground">{prev.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-medium text-foreground">{curr.toLocaleString()}</td>
                    <td className={cn(
                      "py-3 pl-4 text-right font-semibold",
                      positive ? "text-emerald-700" : "text-red-700"
                    )}>
                      {positive ? "+" : ""}{change.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Note:</strong> Quarterly data spans all traffic sources from HubSpot (contacts and deals). Pipeline value sums the deal amount of all deals created in the quarter.
      </div>
    </div>
  );
}
