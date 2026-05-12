import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownRight, ArrowUpRight, Users, DollarSign, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface ContactRow {
  record_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  company_name: string | null;
  original_traffic_source: string | null;
  hubspot_create_date: string | null;
  lifecycle_stage: string | null;
}

interface DealRow {
  deal_id: string;
  deal_name: string | null;
  amount: number | null;
  deal_stage: string | null;
  create_date: string | null;
  original_traffic_source: string | null;
}

interface QuarterStats {
  contacts: ContactRow[];
  deals: DealRow[];
  bySource: Record<string, number>;
  pipeline: number;
  paidContacts: ContactRow[];
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
    fetchAll<ContactRow>(
      "hubspot_contacts",
      "record_id, first_name, last_name, email, company_name, original_traffic_source, hubspot_create_date, lifecycle_stage",
      "hubspot_create_date"
    ),
    fetchAll<DealRow>(
      "hubspot_deals",
      "deal_id, deal_name, amount, deal_stage, create_date, original_traffic_source",
      "create_date"
    ),
  ]);

  const bySource: Record<string, number> = {};
  for (const c of contacts) {
    const k = c.original_traffic_source ?? "Unknown";
    bySource[k] = (bySource[k] ?? 0) + 1;
  }

  return {
    contacts,
    deals,
    bySource,
    pipeline: deals.reduce((s, d) => s + (Number(d.amount) || 0), 0),
    paidContacts: contacts.filter((c) => c.original_traffic_source === "Paid Search"),
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
  label, icon: Icon, current, previous, format, onClick,
}: {
  label: string;
  icon: any;
  current: number;
  previous: number;
  format: (n: number) => string;
  onClick?: () => void;
}) {
  const change = pctChange(current, previous);
  const positive = change >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "text-left bg-card rounded-2xl border border-border p-6 shadow-sm transition",
        onClick && "hover:border-primary/40 hover:shadow-md cursor-pointer"
      )}
    >
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
    </button>
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

  const [drill, setDrill] = useState<null | "contacts" | "paid" | "pipeline" | "deals">(null);

  if (!q1_2026 || !q1_2025) {
    return <div className="text-muted-foreground text-sm">Loading quarterly comparison…</div>;
  }

  const sources = Array.from(
    new Set([...Object.keys(q1_2026.bySource), ...Object.keys(q1_2025.bySource)])
  ).sort((a, b) => (q1_2026.bySource[b] ?? 0) - (q1_2026.bySource[a] ?? 0));

  const monthlyData = buildMonthly(q1_2026, q1_2025);

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
          current={q1_2026.contacts.length}
          previous={q1_2025.contacts.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("contacts")}
        />
        <ComparisonCard
          label="Paid Search Contacts"
          icon={TrendingUp}
          current={q1_2026.paidContacts.length}
          previous={q1_2025.paidContacts.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("paid")}
        />
        <ComparisonCard
          label="Pipeline Value"
          icon={DollarSign}
          current={q1_2026.pipeline}
          previous={q1_2025.pipeline}
          format={fmtMoney}
          onClick={() => setDrill("pipeline")}
        />
        <ComparisonCard
          label="Deals Created"
          icon={Briefcase}
          current={q1_2026.deals.length}
          previous={q1_2025.deals.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("deals")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyBarChart
          title="Contacts by Month"
          data={monthlyData.contacts}
          format={(n) => n.toLocaleString()}
        />
        <MonthlyBarChart
          title="Pipeline Value by Month"
          data={monthlyData.pipeline}
          format={fmtMoney}
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

      <DrillDialog
        drill={drill}
        onClose={() => setDrill(null)}
        q2026={q1_2026}
        q2025={q1_2025}
      />
    </div>
  );
}

function DrillDialog({
  drill, onClose, q2026, q2025,
}: {
  drill: null | "contacts" | "paid" | "pipeline" | "deals";
  onClose: () => void;
  q2026: QuarterStats;
  q2025: QuarterStats;
}) {
  const open = drill !== null;

  let title = "";
  let description = "";
  let content: React.ReactNode = null;

  if (drill === "contacts" || drill === "paid") {
    const isPaid = drill === "paid";
    title = isPaid ? "Paid Search Contacts" : "All Contacts";
    description = "Q1 2026 vs Q1 2025 — click an email to follow up.";
    const curr = isPaid ? q2026.paidContacts : q2026.contacts;
    const prev = isPaid ? q2025.paidContacts : q2025.contacts;
    content = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactList title={`Q1 2026 (${curr.length})`} rows={curr} />
        <ContactList title={`Q1 2025 (${prev.length})`} rows={prev} />
      </div>
    );
  } else if (drill === "pipeline" || drill === "deals") {
    title = drill === "pipeline" ? "Pipeline Value Detail" : "Deals Created";
    description = "Q1 2026 vs Q1 2025 — sorted by amount.";
    const curr = [...q2026.deals].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    const prev = [...q2025.deals].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    content = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DealList title={`Q1 2026 (${curr.length} • ${fmtMoney(q2026.pipeline)})`} rows={curr} />
        <DealList title={`Q1 2025 (${prev.length} • ${fmtMoney(q2025.pipeline)})`} rows={prev} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 min-h-0 pr-2 h-full">
          {content}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function buildMonthly(q2026: QuarterStats, q2025: QuarterStats) {
  const months = ["Jan", "Feb", "Mar"];
  const bucket = <T extends { date: string | null }>(rows: T[]) => {
    const out = [0, 0, 0];
    for (const r of rows) {
      if (!r.date) continue;
      const m = new Date(r.date).getUTCMonth();
      if (m >= 0 && m <= 2) out[m] += 1;
    }
    return out;
  };
  const sumBucket = (rows: DealRow[]) => {
    const out = [0, 0, 0];
    for (const d of rows) {
      if (!d.create_date) continue;
      const m = new Date(d.create_date).getUTCMonth();
      if (m >= 0 && m <= 2) out[m] += Number(d.amount) || 0;
    }
    return out;
  };
  const c2026 = bucket(q2026.contacts.map((c) => ({ date: c.hubspot_create_date })));
  const c2025 = bucket(q2025.contacts.map((c) => ({ date: c.hubspot_create_date })));
  const p2026 = sumBucket(q2026.deals);
  const p2025 = sumBucket(q2025.deals);
  return {
    contacts: months.map((m, i) => ({ month: m, "2025": c2025[i], "2026": c2026[i] })),
    pipeline: months.map((m, i) => ({ month: m, "2025": p2025[i], "2026": p2026[i] })),
  };
}

function MonthlyBarChart({
  title, data, format,
}: {
  title: string;
  data: Array<{ month: string; "2025": number; "2026": number }>;
  format: (n: number) => string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <h3 className="font-semibold text-foreground text-lg mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => format(Number(v))} width={80} />
            <Tooltip formatter={(v: number) => format(Number(v))} />
            <Legend />
            <Bar dataKey="2025" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="2026" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fmtDate(s: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ContactList({ title, rows }: { title: string; rows: ContactRow[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{title}</div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Source</th>
              <th className="py-2 px-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} className="py-4 px-3 text-center text-muted-foreground">No contacts</td></tr>
            )}
            {rows.map((c) => {
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "—";
              return (
                <tr key={c.record_id} className="border-t border-border">
                  <td className="py-2 px-3">
                    <div className="font-medium text-foreground">{name}</div>
                    {c.email && <div className="text-xs text-muted-foreground">{c.email}</div>}
                    {c.company_name && <div className="text-xs text-muted-foreground">{c.company_name}</div>}
                  </td>
                  <td className="py-2 px-3 text-muted-foreground">{c.original_traffic_source ?? "—"}</td>
                  <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{fmtDate(c.hubspot_create_date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DealList({ title, rows }: { title: string; rows: DealRow[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">{title}</div>
      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 px-3 font-medium">Deal</th>
              <th className="py-2 px-3 font-medium">Stage</th>
              <th className="py-2 px-3 font-medium text-right">Amount</th>
              <th className="py-2 px-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={4} className="py-4 px-3 text-center text-muted-foreground">No deals</td></tr>
            )}
            {rows.map((d) => (
              <tr key={d.deal_id} className="border-t border-border">
                <td className="py-2 px-3">
                  <div className="font-medium text-foreground">{d.deal_name ?? "—"}</div>
                  {d.original_traffic_source && (
                    <div className="text-xs text-muted-foreground">{d.original_traffic_source}</div>
                  )}
                </td>
                <td className="py-2 px-3 text-muted-foreground">{d.deal_stage ?? "—"}</td>
                <td className="py-2 px-3 text-right font-medium text-foreground whitespace-nowrap">
                  {fmtMoney(Number(d.amount) || 0)}
                </td>
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap">{fmtDate(d.create_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
