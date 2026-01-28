import { useMemo } from "react";
import { decemberDeals, locationPerformance } from "@/data/deals";

export function MetricFlow() {
  const flowSteps = useMemo(() => {
    // Total clicks from location performance (December data)
    const totalClicks = locationPerformance.reduce((sum, loc) => sum + loc.clicks, 0);

    // Total conversions from location performance (December data)
    const totalConversions = locationPerformance.reduce((sum, loc) => sum + loc.conversions, 0);

    // Total contacts = December deals only
    const totalContacts = decemberDeals.length;

    // Number of deals (Closed Won) in December
    const closedWonDeals = decemberDeals.filter((deal) => deal.dealStage === "Closed Won").length;

    return [
      { label: "Clicks", value: totalClicks.toLocaleString(), sublabel: "Google Ads" },
      { label: "Conversions", value: totalConversions.toString(), sublabel: "Forms + Calls" },
      { label: "Contacts", value: totalContacts.toString(), sublabel: "CTM Logged" },
      { label: "Deals", value: closedWonDeals.toString(), sublabel: "Closed Won" },
    ];
  }, []);

  return (
    <div className="data-card p-5">
      <h3 className="section-title">Metrics</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {flowSteps.map((step) => (
          <div key={step.label} className="text-center p-4 bg-muted/30 rounded-lg">
            <p className="text-3xl font-bold text-foreground">{step.value}</p>
            <p className="text-sm font-medium text-primary">{step.label}</p>
            <p className="text-xs text-muted-foreground">{step.sublabel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
