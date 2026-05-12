import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import { managementFeeBetween, fmtUSD } from "@/lib/investment";
import { DollarSign, TrendingUp, Users, Briefcase, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type PeriodKey = "month" | "quarter" | "all";

function startOfQuarter(d: Date) {
  const m = d.getUTCMonth();
  const qStart = m - (m % 3);
  return new Date(Date.UTC(d.getUTCFullYear(), qStart, 1));
}
function startOfNextMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
}
function startOfMonth(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

async function fetchPeriod(start: Date, end: Date) {
  // end is exclusive in our calc; queries below need inclusive bounds.
  const startIso = isoDate(start);
  // end exclusive -> endInclusive = end - 1 day for date columns
  const endExclusiveIso = isoDate(end);

  const [ads, contacts, deals] = await Promise.all([
    supabase
      .from("google_ads_performance")
      .select("cost")
      .gte("date", startIso)
      .lt("date", endExclusiveIso),
    supabase
      .from("hubspot_contacts")
      .select("record_id", { count: "exact", head: true })
      .eq("original_traffic_source", "Paid Search")
      .gte("hubspot_create_date", start.toISOString())
      .lt("hubspot_create_date", end.toISOString()),
    supabase
      .from("hubspot_deals")
      .select("amount, deal_stage")
      .gte("create_date", start.toISOString())
      .lt("create_date", end.toISOString()),
  ]);

  if (ads.error) throw ads.error;
  if (contacts.error) throw contacts.error;
  if (deals.error) throw deals.error;

  const adSpend = (ads.data || []).reduce((s, r) => s + (Number(r.cost) || 0), 0);
  const dealRows = deals.data || [];
  const pipeline = dealRows.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const wonRevenue = dealRows
    .filter((d) => (d.deal_stage || "").toLowerCase().includes("won"))
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return {
    adSpend,
    pipeline,
    wonRevenue,
    contacts: contacts.count ?? 0,
    fee: managementFeeBetween(start, end),
  };
}

export function InvestmentReturns() {
  const { filters } = useDashboardFilters();
  const [period, setPeriod] = useState<PeriodKey>("month");

  const range = useMemo(() => {
    const sel = filters.selectedMonth;
    if (period === "month") {
      const start = startOfMonth(sel);
      return { start, end: startOfNextMonth(sel), label: "Selected month" };
    }
    if (period === "quarter") {
      const start = startOfQuarter(sel);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 3, 1));
      return { start, end, label: "Quarter to date" };
    }
    // all time since fee start
    const start = new Date(Date.UTC(2025, 9, 1));
    const end = startOfNextMonth(sel);
    return { start, end, label: "All time (since Oct 2025)" };
  }, [filters.selectedMonth, period]);

  const { data, isLoading } = useQuery({
    queryKey: ["investment-returns", isoDate(range.start), isoDate(range.end)],
    queryFn: () => fetchPeriod(range.start, range.end),
  });

  const investment = (data?.adSpend ?? 0) + (data?.fee ?? 0);
  const roas = investment > 0 ? (data?.wonRevenue ?? 0) / investment : 0;
  const pipelineRatio = investment > 0 ? (data?.pipeline ?? 0) / investment : 0;
  const cpc = (data?.contacts ?? 0) > 0 ? investment / (data!.contacts) : 0;

  return (
    <section className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground text-lg">Investment & Returns</h3>
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground">
                    <Info className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Total investment = Google Ads spend + Mathews management fee
                  ($1,355.04 for Oct 2025, $1,750/month from Nov 2025 onward, pro-rated by day).
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{range.label}</p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
          {(
            [
              { k: "month", label: "Month" },
              { k: "quarter", label: "Quarter" },
              { k: "all", label: "All time" },
            ] as { k: PeriodKey; label: string }[]
          ).map((p) => (
            <button
              key={p.k}
              onClick={() => setPeriod(p.k)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition",
                period === p.k
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Total Investment"
          icon={DollarSign}
          value={fmtUSD(investment)}
          sub={`Ads ${fmtUSD(data?.adSpend ?? 0)} + Mgmt ${fmtUSD(data?.fee ?? 0)}`}
          loading={isLoading}
        />
        <Stat
          label="ROAS (Won)"
          icon={TrendingUp}
          value={`${roas.toFixed(2)}x`}
          sub={`Won revenue ${fmtUSD(data?.wonRevenue ?? 0)}`}
          loading={isLoading}
        />
        <Stat
          label="Pipeline / Invest."
          icon={Briefcase}
          value={`${pipelineRatio.toFixed(2)}x`}
          sub={`Pipeline ${fmtUSD(data?.pipeline ?? 0)}`}
          loading={isLoading}
        />
        <Stat
          label="Cost per Contact"
          icon={Users}
          value={cpc > 0 ? fmtUSD(cpc) : "—"}
          sub={`${(data?.contacts ?? 0).toLocaleString()} paid search contacts`}
          loading={isLoading}
        />
      </div>
    </section>
  );
}

function Stat({
  label, icon: Icon, value, sub, loading,
}: {
  label: string;
  icon: any;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground mb-2">
        <Icon className="w-3.5 h-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-2xl font-bold text-foreground">
        {loading ? "…" : value}
      </div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}