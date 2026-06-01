import { useQualityInsights } from "@/hooks/use-quality-insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Sparkles, AlertTriangle, ShieldCheck, Info, FlaskConical } from "lucide-react";

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;

export function QualityInsights() {
  const { rows, sourceRows, totals, topContactReasons, topLeadReasons, isLoading } = useQualityInsights();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  // All-source totals (broader signal)
  const allContacts = sourceRows.reduce((a, r) => a + r.contacts, 0);
  const allQualified = sourceRows.reduce((a, r) => a + r.qualified, 0);
  const allDisqualified = sourceRows.reduce((a, r) => a + r.disqualified, 0);
  const allSpam = sourceRows.reduce((a, r) => a + r.spam, 0);
  const allScored = allQualified + allDisqualified + allSpam;
  const qualifiedRate = allScored > 0 ? allQualified / allScored : 0;
  const costPerQualified = totals.qualified > 0 ? totals.spend / totals.qualified : null;

  // Ranked rows for best/worst (only ones with spend and ≥3 contacts to avoid noise)
  const ranked = rows.filter((r) => r.spend > 0 && r.contacts >= 3);
  const bestCPQ = [...ranked]
    .filter((r) => r.costPerQualified !== null)
    .sort((a, b) => (a.costPerQualified! - b.costPerQualified!))[0];
  const worstCPQ = [...ranked]
    .filter((r) => r.costPerQualified !== null)
    .sort((a, b) => (b.costPerQualified! - a.costPerQualified!))[0];
  const highestDisqual = [...ranked].sort((a, b) => b.disqualified - a.disqualified)[0];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Beta banner */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <FlaskConical className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Beta:</strong> Quality is derived from sales-confirmed lead stages when available, otherwise from
            AI-inferred buckets based on form messages and call transcripts. Treat as directional, not absolute.
          </div>
        </div>

        {/* Headline stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="All Contacts" value={allContacts.toString()} sub="Across every traffic source" />
          <StatCard
            label="Qualified Rate"
            value={fmtPct(qualifiedRate)}
            sub={`${allQualified} qualified · ${allDisqualified} disqualified · ${allSpam} spam`}
          />
          <StatCard label="Paid Spend" value={fmtCurrency(totals.spend)} sub={`${totals.contacts} paid contacts`} />
          <StatCard
            label="Cost per Qualified"
            value={costPerQualified !== null ? fmtCurrency(costPerQualified) : "—"}
            sub={totals.qualified === 0 ? "No qualified paid contacts yet" : "Paid spend ÷ paid qualified"}
          />
        </div>

        {/* Insights */}
        {(bestCPQ || worstCPQ || highestDisqual) && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-semibold">Quick Reads</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {bestCPQ && (
                <Insight
                  icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
                  title="Most efficient"
                  body={
                    <>
                      <span className="font-medium">{bestCPQ.campaign}</span> is delivering qualified contacts at{" "}
                      <span className="font-semibold text-emerald-600">{fmtCurrency(bestCPQ.costPerQualified!)}</span>{" "}
                      each ({bestCPQ.qualified} of {bestCPQ.contacts}).
                    </>
                  }
                />
              )}
              {worstCPQ && bestCPQ && worstCPQ.campaign !== bestCPQ.campaign && (
                <Insight
                  icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
                  title="Most expensive"
                  body={
                    <>
                      <span className="font-medium">{worstCPQ.campaign}</span> is at{" "}
                      <span className="font-semibold text-amber-700">{fmtCurrency(worstCPQ.costPerQualified!)}</span>{" "}
                      per qualified contact — worth a creative or targeting review.
                    </>
                  }
                />
              )}
              {highestDisqual && highestDisqual.disqualified > 0 && (
                <Insight
                  icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
                  title="Most disqualifications"
                  body={
                    <>
                      <span className="font-medium">{highestDisqual.campaign}</span> produced{" "}
                      <span className="font-semibold text-rose-600">{highestDisqual.disqualified}</span> disqualified
                      contacts ({fmtPct(highestDisqual.disqualified / Math.max(1, highestDisqual.contacts))} of total).
                    </>
                  }
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Per-source quality (all traffic sources) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Quality by Traffic Source</CardTitle>
            <p className="text-sm text-muted-foreground">
              Every contact in the selected month, classified by sales-confirmed lead stage when available, otherwise the AI bucket.
            </p>
          </CardHeader>
          <CardContent>
            {sourceRows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No contact data for this month</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Source</TableHead>
                      <TableHead className="text-right">Contacts</TableHead>
                      <TableHead className="text-right text-emerald-700">Qualified</TableHead>
                      <TableHead className="text-right text-rose-700">Disqualified</TableHead>
                      <TableHead className="text-right text-gray-500">Spam</TableHead>
                      <TableHead className="text-right text-gray-500">
                        <ColHeaderHelp label="Unscored" help="Contact has no sales stage and no AI bucket yet — usually offline/imported leads or contacts without a message or call." />
                      </TableHead>
                      <TableHead className="text-right">Qualified Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sourceRows.map((r) => {
                      const scored = r.qualified + r.disqualified + r.spam;
                      const rate = scored > 0 ? r.qualified / scored : 0;
                      return (
                        <TableRow key={r.source}>
                          <TableCell className="font-medium">{r.source}</TableCell>
                          <TableCell className="text-right">{r.contacts}</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">{r.qualified || "—"}</TableCell>
                          <TableCell className="text-right text-rose-600 font-medium">{r.disqualified || "—"}</TableCell>
                          <TableCell className="text-right text-gray-500">{r.spam || "—"}</TableCell>
                          <TableCell className="text-right text-gray-500">{(r.insufficient + r.unscored) || "—"}</TableCell>
                          <TableCell className="text-right font-medium">
                            {scored > 0 ? fmtPct(rate) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-campaign quality */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Paid Search Campaign Breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">
              Paid Search contacts grouped by Google Ads campaign (the only source with spend attribution).
            </p>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No campaign or contact data for this month</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Campaign</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Contacts</TableHead>
                      <TableHead className="text-right text-emerald-700">Qualified</TableHead>
                      <TableHead className="text-right text-rose-700">Disqualified</TableHead>
                      <TableHead className="text-right text-gray-500">Spam</TableHead>
                      <TableHead className="text-right text-gray-500">
                        <ColHeaderHelp label="Unclear" help="Not enough info (no message, no call transcript) for the AI to bucket the lead." />
                      </TableHead>
                      <TableHead className="text-right">
                        <ColHeaderHelp label="Avg Score" help="AI quality score 0–30 averaged across scored contacts." />
                      </TableHead>
                      <TableHead className="text-right">
                        <ColHeaderHelp label="Cost / Qualified" help="Spend divided by qualified contacts. Lower is better." />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.campaign}>
                        <TableCell className="font-medium max-w-[240px] truncate" title={r.campaign}>
                          {r.campaign}
                        </TableCell>
                        <TableCell className="text-right">{r.spend > 0 ? fmtCurrency(r.spend) : "—"}</TableCell>
                        <TableCell className="text-right">{r.contacts || "—"}</TableCell>
                        <TableCell className="text-right text-emerald-600 font-medium">
                          {r.qualified || "—"}
                        </TableCell>
                        <TableCell className="text-right text-rose-600 font-medium">
                          {r.disqualified || "—"}
                        </TableCell>
                        <TableCell className="text-right text-gray-500">{r.spam || "—"}</TableCell>
                        <TableCell className="text-right text-gray-500">
                          {(r.insufficient + r.unscored) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {r.avgScore !== null ? r.avgScore.toFixed(1) : "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {r.costPerQualified !== null ? fmtCurrency(r.costPerQualified) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disqualification reasons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ReasonsCard
            title="Sales-confirmed disqualification reasons"
            subtitle="From HubSpot lead records updated by the sales team"
            empty="No sales-confirmed reasons yet for this month."
            reasons={topLeadReasons}
            accent="emerald"
          />
          <ReasonsCard
            title="AI-inferred disqualification reasons"
            subtitle="From form messages and call transcripts (overridden by sales when updated)"
            empty="No AI-inferred reasons yet for this month."
            reasons={topContactReasons}
            accent="amber"
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider text-gray-500">{label}</div>
        <div className="text-2xl font-bold mt-1">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Insight({ icon, title, body }: { icon: React.ReactNode; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
        {icon}
        {title}
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{body}</p>
    </div>
  );
}

function ReasonsCard({
  title,
  subtitle,
  empty,
  reasons,
  accent,
}: {
  title: string;
  subtitle: string;
  empty: string;
  reasons: { reason: string; count: number }[];
  accent: "emerald" | "amber";
}) {
  const badgeClass =
    accent === "emerald"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {reasons.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {reasons.slice(0, 10).map((r) => (
              <li key={r.reason} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-gray-700 leading-snug">{r.reason}</span>
                <Badge variant="outline" className={badgeClass}>
                  {r.count}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ColHeaderHelp({ label, help }: { label: string; help: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1">
      {label}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3 w-3 text-gray-400" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">{help}</TooltipContent>
      </Tooltip>
    </span>
  );
}