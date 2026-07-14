import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowDownRight, ArrowUpRight, Users, DollarSign, Briefcase, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { managementFeeBetween, fmtUSD } from "@/lib/investment";
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
  adSpend: number;
  wonRevenue: number;
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

  const { data: adsData, error: adsErr } = await supabase
    .from("google_ads_performance")
    .select("cost")
    .gte("date", start)
    .lt("date", end);
  if (adsErr) throw adsErr;
  const adSpend = (adsData || []).reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const wonRevenue = deals
    .filter((d) => (d.deal_stage || "").toLowerCase().includes("won"))
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);

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
    adSpend,
    wonRevenue,
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
  label, icon: Icon, current, previous, format, onClick, currentLabel, previousLabel,
}: {
  label: string;
  icon: any;
  current: number;
  previous: number;
  format: (n: number) => string;
  onClick?: () => void;
  currentLabel: string;
  previousLabel: string;
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
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{currentLabel}</div>
          <div className="text-3xl font-bold text-foreground">{format(current)}</div>
        </div>
        <div className="pt-3 border-t border-border">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{previousLabel}</div>
          <div className="text-lg font-semibold text-muted-foreground">{format(previous)}</div>
        </div>
      </div>
    </button>
  );
}

type QuarterKey = "2026Q1" | "2026Q2";

interface QuarterConfig {
  key: QuarterKey;
  label: string;         // e.g. "Q2 2026"
  prevLabel: string;     // e.g. "Q2 2025"
  currStart: string;
  currEnd: string;       // exclusive
  prevStart: string;
  prevEnd: string;       // exclusive
  months: string[];      // 3 short month names
  monthOffset: number;   // 0=Jan-Mar, 3=Apr-Jun...
}

const QUARTERS: Record<QuarterKey, QuarterConfig> = {
  "2026Q1": {
    key: "2026Q1",
    label: "Q1 2026",
    prevLabel: "Q1 2025",
    currStart: "2026-01-01",
    currEnd: "2026-04-01",
    prevStart: "2025-01-01",
    prevEnd: "2025-04-01",
    months: ["Jan", "Feb", "Mar"],
    monthOffset: 0,
  },
  "2026Q2": {
    key: "2026Q2",
    label: "Q2 2026",
    prevLabel: "Q2 2025",
    currStart: "2026-04-01",
    currEnd: "2026-07-01",
    prevStart: "2025-04-01",
    prevEnd: "2025-07-01",
    months: ["Apr", "May", "Jun"],
    monthOffset: 3,
  },
};

export function QuarterlyReview() {
  const [quarterKey, setQuarterKey] = useState<QuarterKey>("2026Q2");
  const cfg = QUARTERS[quarterKey];

  const { data: qCurr } = useQuery({
    queryKey: ["quarter", cfg.key],
    queryFn: () => fetchQuarter(cfg.currStart, cfg.currEnd),
  });
  const { data: qPrev } = useQuery({
    queryKey: ["quarter", cfg.prevLabel],
    queryFn: () => fetchQuarter(cfg.prevStart, cfg.prevEnd),
  });

  const [drill, setDrill] = useState<null | "contacts" | "paid" | "pipeline" | "deals">(null);

  const quarterTabs: QuarterKey[] = ["2026Q1", "2026Q2"];

  if (!qCurr || !qPrev) {
    return (
      <div className="space-y-4">
        <QuarterTabs value={quarterKey} onChange={setQuarterKey} options={quarterTabs} />
        <div className="text-muted-foreground text-sm">Loading quarterly comparison…</div>
      </div>
    );
  }

  const sources = Array.from(
    new Set([...Object.keys(qCurr.bySource), ...Object.keys(qPrev.bySource)])
  ).sort((a, b) => (qCurr.bySource[b] ?? 0) - (qCurr.bySource[a] ?? 0));

  const monthlyData = buildMonthly(qCurr, qPrev, cfg);
  const currYear = cfg.currStart.slice(0, 4);
  const prevYear = cfg.prevStart.slice(0, 4);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{cfg.label} vs {cfg.prevLabel}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Year-over-year comparison across contacts and pipeline.
          </p>
        </div>
        <QuarterTabs value={quarterKey} onChange={setQuarterKey} options={quarterTabs} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ComparisonCard
          label="Total Contacts"
          icon={Users}
          current={qCurr.contacts.length}
          previous={qPrev.contacts.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("contacts")}
          currentLabel={cfg.label}
          previousLabel={cfg.prevLabel}
        />
        <ComparisonCard
          label="Paid Search Contacts"
          icon={TrendingUp}
          current={qCurr.paidContacts.length}
          previous={qPrev.paidContacts.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("paid")}
          currentLabel={cfg.label}
          previousLabel={cfg.prevLabel}
        />
        <ComparisonCard
          label="Pipeline Value"
          icon={DollarSign}
          current={qCurr.pipeline}
          previous={qPrev.pipeline}
          format={fmtMoney}
          onClick={() => setDrill("pipeline")}
          currentLabel={cfg.label}
          previousLabel={cfg.prevLabel}
        />
        <ComparisonCard
          label="Deals Created"
          icon={Briefcase}
          current={qCurr.deals.length}
          previous={qPrev.deals.length}
          format={(n) => n.toLocaleString()}
          onClick={() => setDrill("deals")}
          currentLabel={cfg.label}
          previousLabel={cfg.prevLabel}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyBarChart
          title="Contacts by Month"
          data={monthlyData.contacts}
          format={(n) => n.toLocaleString()}
          prevYear={prevYear}
          currYear={currYear}
        />
        <MonthlyBarChart
          title="Pipeline Value by Month"
          data={monthlyData.pipeline}
          format={fmtMoney}
          prevYear={prevYear}
          currYear={currYear}
        />
      </div>

      <InvestmentSection
        qCurr={qCurr}
        qPrev={qPrev}
        cfg={cfg}
      />

      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h3 className="font-semibold text-foreground text-lg mb-4">Contacts by Traffic Source</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 px-4 font-medium text-right">{cfg.prevLabel}</th>
                <th className="py-2 px-4 font-medium text-right">{cfg.label}</th>
                <th className="py-2 pl-4 font-medium text-right">Change</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((src) => {
                const prev = qPrev.bySource[src] ?? 0;
                const curr = qCurr.bySource[src] ?? 0;
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
        qCurr={qCurr}
        qPrev={qPrev}
        cfg={cfg}
      />
    </div>
  );
}

function QuarterTabs({
  value, onChange, options,
}: {
  value: QuarterKey;
  onChange: (v: QuarterKey) => void;
  options: QuarterKey[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-card p-1 shadow-sm">
      {options.map((k) => (
        <button
          key={k}
          onClick={() => onChange(k)}
          className={cn(
            "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            value === k
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {QUARTERS[k].label}
        </button>
      ))}
    </div>
  );
}

function DrillDialog({
  drill, onClose, qCurr, qPrev, cfg,
}: {
  drill: null | "contacts" | "paid" | "pipeline" | "deals";
  onClose: () => void;
  qCurr: QuarterStats;
  qPrev: QuarterStats;
  cfg: QuarterConfig;
}) {
  const open = drill !== null;

  let title = "";
  let description = "";
  let content: React.ReactNode = null;

  if (drill === "contacts" || drill === "paid") {
    const isPaid = drill === "paid";
    title = isPaid ? "Paid Search Contacts" : "All Contacts";
    description = `${cfg.label} vs ${cfg.prevLabel} — click an email to follow up.`;
    const curr = isPaid ? qCurr.paidContacts : qCurr.contacts;
    const prev = isPaid ? qPrev.paidContacts : qPrev.contacts;
    content = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactList title={`${cfg.label} (${curr.length})`} rows={curr} />
        <ContactList title={`${cfg.prevLabel} (${prev.length})`} rows={prev} />
      </div>
    );
  } else if (drill === "pipeline" || drill === "deals") {
    title = drill === "pipeline" ? "Pipeline Value Detail" : "Deals Created";
    description = `${cfg.label} vs ${cfg.prevLabel} — sorted by amount.`;
    const curr = [...qCurr.deals].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    const prev = [...qPrev.deals].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    content = (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DealList title={`${cfg.label} (${curr.length} • ${fmtMoney(qCurr.pipeline)})`} rows={curr} />
        <DealList title={`${cfg.prevLabel} (${prev.length} • ${fmtMoney(qPrev.pipeline)})`} rows={prev} />
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

function buildMonthly(qCurr: QuarterStats, qPrev: QuarterStats, cfg: QuarterConfig) {
  const months = cfg.months;
  const offset = cfg.monthOffset;
  const bucket = <T extends { date: string | null }>(rows: T[]) => {
    const out = [0, 0, 0];
    for (const r of rows) {
      if (!r.date) continue;
      const m = new Date(r.date).getUTCMonth();
      const idx = m - offset;
      if (idx >= 0 && idx <= 2) out[idx] += 1;
    }
    return out;
  };
  const sumBucket = (rows: DealRow[]) => {
    const out = [0, 0, 0];
    for (const d of rows) {
      if (!d.create_date) continue;
      const m = new Date(d.create_date).getUTCMonth();
      const idx = m - offset;
      if (idx >= 0 && idx <= 2) out[idx] += Number(d.amount) || 0;
    }
    return out;
  };
  const currYear = cfg.currStart.slice(0, 4);
  const prevYear = cfg.prevStart.slice(0, 4);
  const cCurr = bucket(qCurr.paidContacts.map((c) => ({ date: c.hubspot_create_date })));
  const cPrev = bucket(qPrev.paidContacts.map((c) => ({ date: c.hubspot_create_date })));
  const pCurr = sumBucket(qCurr.deals);
  const pPrev = sumBucket(qPrev.deals);
  return {
    contacts: months.map((m, i) => ({ month: m, [prevYear]: cPrev[i], [currYear]: cCurr[i] })),
    pipeline: months.map((m, i) => ({ month: m, [prevYear]: pPrev[i], [currYear]: pCurr[i] })),
  };
}

function MonthlyBarChart({
  title, data, format, prevYear, currYear,
}: {
  title: string;
  data: Array<Record<string, string | number>>;
  format: (n: number) => string;
  prevYear: string;
  currYear: string;
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
            <Bar dataKey={prevYear} fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            <Bar dataKey={currYear} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function fmtDate(s: string | null) {
  // formatted date helper
  if (!s) return "—";
  const d = new Date(s);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function InvestmentSection({
  qCurr, qPrev, cfg,
}: {
  qCurr: QuarterStats;
  qPrev: QuarterStats;
  cfg: QuarterConfig;
}) {
  const rangeCurr = { start: new Date(cfg.currStart + "T00:00:00Z"), end: new Date(cfg.currEnd + "T00:00:00Z") };
  const rangePrev = { start: new Date(cfg.prevStart + "T00:00:00Z"), end: new Date(cfg.prevEnd + "T00:00:00Z") };
  const feeCurr = managementFeeBetween(rangeCurr.start, rangeCurr.end);
  const feePrev = managementFeeBetween(rangePrev.start, rangePrev.end);
  const invCurr = qCurr.adSpend + feeCurr;
  const invPrev = qPrev.adSpend + feePrev;
  const roasCurr = invCurr > 0 ? qCurr.wonRevenue / invCurr : 0;
  const roasPrev = invPrev > 0 ? qPrev.wonRevenue / invPrev : 0;
  const pipeCurr = invCurr > 0 ? qCurr.pipeline / invCurr : 0;
  const pipePrev = invPrev > 0 ? qPrev.pipeline / invPrev : 0;
  const cpcCurr = qCurr.paidContacts.length > 0 ? invCurr / qCurr.paidContacts.length : 0;
  const cpcPrev = qPrev.paidContacts.length > 0 ? invPrev / qPrev.paidContacts.length : 0;

  const fmtPct = (curr: number, prev: number, lowerIsBetter = false) => {
    if (!prev) return { text: curr > 0 ? "—" : "—", positive: true, neutral: true };
    const change = ((curr - prev) / prev) * 100;
    const positive = lowerIsBetter ? change <= 0 : change >= 0;
    return {
      text: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
      positive,
      neutral: false,
    };
  };

  const rows = [
    { label: "Total Investment", a: fmtUSD(invPrev), b: fmtUSD(invCurr),
      change: fmtPct(invCurr, invPrev, true),
      sub: `Ads + Mgmt fee (${cfg.prevLabel} fee: ${fmtUSD(feePrev)} • ${cfg.label} fee: ${fmtUSD(feeCurr)})` },
    { label: "Won Revenue", a: fmtUSD(qPrev.wonRevenue), b: fmtUSD(qCurr.wonRevenue),
      change: fmtPct(qCurr.wonRevenue, qPrev.wonRevenue) },
    { label: "ROAS (Won ÷ Investment)", a: `${roasPrev.toFixed(2)}x`, b: `${roasCurr.toFixed(2)}x`,
      change: fmtPct(roasCurr, roasPrev) },
    { label: "Pipeline ÷ Investment", a: `${pipePrev.toFixed(2)}x`, b: `${pipeCurr.toFixed(2)}x`,
      change: fmtPct(pipeCurr, pipePrev) },
    { label: "Cost per Paid Search Contact",
      a: cpcPrev > 0 ? fmtUSD(cpcPrev) : "—",
      b: cpcCurr > 0 ? fmtUSD(cpcCurr) : "—",
      change: fmtPct(cpcCurr, cpcPrev, true) },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
      <h3 className="font-semibold text-foreground text-lg mb-1">Investment & Returns</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Investment = Google Ads spend + Mathews management fee ($1,750/month from Nov 2025; $1,355.04 for Oct 2025).
        No management fee applied to quarters before Oct 2025 (engagement began Oct 2025).
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Metric</th>
              <th className="py-2 px-4 font-medium text-right">{cfg.prevLabel}</th>
              <th className="py-2 px-4 font-medium text-right">{cfg.label}</th>
              <th className="py-2 pl-4 font-medium text-right">Change</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-border last:border-0 align-top">
                <td className="py-3 pr-4 text-foreground">
                  <div>{r.label}</div>
                  {r.sub && <div className="text-xs text-muted-foreground mt-0.5">{r.sub}</div>}
                </td>
                <td className="py-3 px-4 text-right text-muted-foreground whitespace-nowrap">{r.a}</td>
                <td className="py-3 px-4 text-right font-semibold text-foreground whitespace-nowrap">{r.b}</td>
                <td className={cn(
                  "py-3 pl-4 text-right font-semibold whitespace-nowrap",
                  r.change.neutral ? "text-muted-foreground" : r.change.positive ? "text-emerald-700" : "text-red-700"
                )}>{r.change.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
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
