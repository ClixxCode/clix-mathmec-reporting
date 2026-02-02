

# Conversion Breakdown Enhancement & Interactive Cards

## Understanding the Data Gap

You're right - the numbers are:
- **Google Ads Conversions**: 40 (pixel-tracked intent signals)
- **Forms (HubSpot)**: 18 Paid Search contacts with "Form Submission" as incoming source
- **Calls (CTM)**: 36 Google Ads-attributed calls
- **Total Forms + Calls**: 54

The gap goes the **opposite direction** - we're seeing **more** conversions in our systems than Google reports. This happens because:

1. **Click-to-Call ads**: Users call from a Google Ads call extension but Google may not fire a pixel conversion
2. **CTM tracking scope**: CTM tracks ALL calls to your tracking numbers, including repeat callers and calls from people who found you via Google but didn't click an ad
3. **Attribution differences**: CTM marks calls as "Google Ads" based on tracking number routing, not necessarily a confirmed ad click

## Plan

### 1. Add Smart Reconciliation Notice

Display a dynamic disclaimer in the conversion breakdown that:
- Shows when there's a gap (either direction)
- Explains the specific scenario (forms+calls > conversions OR conversions > forms+calls)
- For the "CTM higher" case, explain click-to-call dynamics

### 2. Refresh the Breakdown Styling

Options to consider:
- **Option A - Inline accordion**: Smoother animation with Radix Collapsible, subtle gradient background
- **Option B - Slide-out drawer**: More dramatic, good for detailed data
- **Option C - Refined in-place expand**: Keep current approach but with cleaner typography, better spacing, progress bars showing percentages

I'll implement **Option C** with:
- Cleaner card layout with icons
- Visual progress bars for form/call split
- The reconciliation message integrated naturally
- Smooth animation using Collapsible primitive

### 3. Add Click-to-View for Contacts & Deals Cards

Make the "Contacts" and "Deals" cards clickable:
- **Contacts card**: Opens existing `ContactsDialog` modal showing the detailed contact list
- **Deals card**: Opens a new `DealsDialog` modal showing deal details (similar pattern)

This provides drill-down capability consistent with the Conversions breakdown.

---

## Technical Approach

### File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/FunnelMetrics.tsx` | Add reconciliation logic, improve ConversionBreakdown styling with Collapsible, wire up Contacts/Deals click handlers |
| `src/components/dashboard/DealsDialog.tsx` | New component - modal showing deal details for selected month |
| `src/hooks/use-funnel-metrics.tsx` | No changes needed |

### Reconciliation Logic

```text
if (forms + calls) > googleConversions:
  "CTM captures all calls to tracking numbers, including repeat callers 
   and click-to-call ads that may not trigger Google's pixel."
   
if googleConversions > (forms + calls):
  "Some Google Ads conversions may not result in CRM records due to 
   abandoned forms, spam filtering, or tracking delays."
```

### Styling Improvements

- Replace inline expand with `Collapsible` for smoother animation
- Add percentage progress bars for visual context
- Subtle background gradient transition when expanded
- Remove harsh ring border, use softer shadow instead
- Add "tap to expand" hint on hover

### Contacts/Deals Interactivity

- Reuse existing `ContactsDialog` for Contacts card
- Create parallel `DealsDialog` component for Deals card
- Add visual affordance (subtle hover state, optional chevron)
- Pass current month context to dialogs

