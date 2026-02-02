
# Two-Row Connected Funnel Metrics

## Overview
Replace the current fragmented 4-card metrics section with a connected two-row funnel visualization that tells the complete Google Ads performance story from spend to revenue.

## Visual Design

### Row 1: Top of Funnel (Google Ads Platform)
A horizontal flow showing ad platform metrics with arrows connecting each stage:

```text
+----------+     +------------+     +--------+     +-------------+
|  Spend   | --> | Impressions| --> | Clicks | --> | Conversions |
|  $2,814  |     |   15,092   |     |   982  |     |     19      |
|          |     |   6.51%    |     | $2.87  |     |   1.93%     |
+----------+     +------------+     +--------+     +-------------+
                     CTR              CPC           Conv. Rate
```

### Row 2: Bottom of Funnel (Business Outcomes)
A horizontal flow showing CRM/revenue metrics with arrows:

```text
+----------+     +---------+     +------------+     +-------------+
| Contacts | --> |  Deals  | --> | Won Deals  | --> | Revenue Won |
|   223    |     |    73   |     |     11     |     |   $77,476   |
| Paid Src |     |  32.7%  |     |   15.1%    |     | $7,043 avg  |
+----------+     +---------+     +------------+     +-------------+
                  Deal Rate       Win Rate          Avg Deal Size
```

### Key Design Elements
- **Visual Connectors**: Chevron arrows (or gradient lines) between cards showing flow direction
- **Conversion Rates**: Display drop-off percentages between stages
- **Row Labels**: "Google Ads Performance" and "Business Outcomes" headers
- **Consistent Styling**: White cards with subtle shadows, matching current MetricCard aesthetic
- **Color Coding**: 
  - Top row: Blue tones (ad spend theme)
  - Bottom row: Green tones (revenue/success theme)

## Data Sources

### Top of Funnel (Static for now - pending Google Ads API)
From `campaign_report.csv` / `locationPerformance` data:
- Spend: $2,813.85
- Impressions: 15,092
- Clicks: 982
- Conversions: 19

### Bottom of Funnel (Live from database)
- Contacts: Query `hubspot_contacts` filtered by date + "Paid Search"
- Deals: Query `hubspot_deals` (all deals have linked contacts)
- Won Deals: Query where `deal_stage ILIKE '%won%'`
- Revenue: Sum of `amount` from won deals

## Technical Implementation

### New Component
Create `src/components/dashboard/FunnelMetrics.tsx`:
- Accept props or use hooks for both static (ads) and live (CRM) data
- New hook `useFunnelMetrics()` that combines:
  - Static campaign totals
  - Live contact/deal queries from Supabase
- Responsive grid: 4 columns on desktop, 2x2 on tablet, stacked on mobile

### Component Structure
```
FunnelMetrics
├── FunnelRow (Google Ads Performance)
│   ├── FunnelCard (Spend)
│   ├── FunnelConnector (arrow)
│   ├── FunnelCard (Impressions)
│   ├── FunnelConnector
│   ├── FunnelCard (Clicks)
│   ├── FunnelConnector
│   └── FunnelCard (Conversions)
└── FunnelRow (Business Outcomes)
    ├── FunnelCard (Contacts)
    ├── FunnelConnector
    ├── FunnelCard (Deals)
    ├── FunnelConnector
    ├── FunnelCard (Won)
    └── FunnelConnector
    └── FunnelCard (Revenue)
```

### Files to Modify
1. **Create**: `src/components/dashboard/FunnelMetrics.tsx` - New connected funnel component
2. **Create**: `src/hooks/use-funnel-metrics.tsx` - Hook combining ad data + CRM data
3. **Update**: `src/pages/Index.tsx` - Replace current MetricCards with FunnelMetrics
4. **Keep**: Existing MetricCard component (may be useful elsewhere)

### Month Filter Integration
- Top row: Will use static data (Google Ads API pending)
- Bottom row: Will filter by selected month using existing `useDashboardFilters` context

## Benefits
- **Story-Driven**: Shows clear cause-and-effect from ad spend to revenue
- **Connected Flow**: Visual arrows make the funnel relationship obvious
- **Conversion Insights**: Drop-off rates between stages highlight optimization opportunities
- **Live Data Ready**: Bottom row pulls from database, ready for dynamic filtering
