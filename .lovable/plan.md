

# Fix CSV Parser for Quoted Fields with Commas

## Problem
The Google Ads CSV import splits lines by comma naively. Values like `"1,181"` (quoted numbers with commas) get split incorrectly, shifting columns and causing cost to be recorded as $0 for affected rows. This accounts for the $161.19 discrepancy.

## Changes

### 1. Update edge function: `supabase/functions/import-google-ads-performance/index.ts`

Add a `parseCSVLine` helper function that tracks whether the parser is inside quotes, preventing splits on commas within quoted values.

Replace both `.split(delimiter)` calls (header parsing and data row parsing) with the new function.

### 2. Add RLS policies for UPDATE on `google_ads_performance`

The table currently lacks UPDATE and DELETE policies. The edge function uses the service role key so it bypasses RLS, but the upsert needs the ability to update existing rows. Since the service role bypasses RLS this should already work, but we should add UPDATE/DELETE policies for completeness.

### 3. Re-import

After deploying the fix, you'll re-upload the same February CSV. The upsert on `(date, campaign)` will overwrite the three broken rows with correct values.

## Technical Detail

```text
Before: line.split(delimiter)
  "2026-02-09,PMAX - Mathews,\"1,181\",22,..." 
  -> ["2026-02-09", "PMAX - Mathews", "\"1", "181\"", "22", ...]
  -> columns shift, cost = 0

After: parseCSVLine(line, delimiter)  
  -> ["2026-02-09", "PMAX - Mathews", "1181", "22", ...]
  -> columns correct, cost parsed properly
```

