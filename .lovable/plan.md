

# HubSpot Contacts Database & Analytics Implementation

## Overview
Building a flexible contact management system that stores HubSpot exports with a hybrid schema approach - fixed columns for key analytics fields plus a JSONB column for complete data preservation and future-proofing.

---

## Phase 1: Database Migration

### Create `hubspot_contacts` Table

**Fixed Columns (for fast queries and analytics):**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `record_id` | text | HubSpot Record ID (unique) |
| `first_name`, `last_name`, `email` | text | Contact identity |
| `phone_number`, `company_name` | text | Contact details |
| `city`, `state_region`, `country` | text | Location |
| `original_traffic_source` | text | Key filter field |
| `traffic_source_drill_down_1` | text | Campaign name |
| `traffic_source_drill_down_2` | text | Keyword |
| `lifecycle_stage`, `lead_status` | text | HubSpot status |
| `message` | text | Form submission (for AI analysis) |
| `hubspot_create_date` | timestamptz | When created in HubSpot |
| `quality_score` | integer | AI-calculated score |
| `quality_analysis` | jsonb | Detailed AI reasoning |
| `raw_data` | jsonb | Complete CSV row for flexibility |

**Indexes:** On `original_traffic_source`, `hubspot_create_date`, `quality_score`, and `record_id`

**RLS Policy:** Public access for internal admin use (no auth required)

---

## Phase 2: CSV Import Edge Function

### `import-hubspot-contacts` Function

**Behavior:**
- Accepts multipart form data with CSV file
- Parses CSV headers dynamically
- Maps known headers to fixed columns
- Stores entire row in `raw_data` JSONB
- Upserts based on `record_id` (updates existing, inserts new)

**Header Mapping:**
```text
CSV Header                           -> Database Column
"Record ID"                          -> record_id
"First Name"                         -> first_name
"Last Name"                          -> last_name
"Email"                              -> email
"Phone Number"                       -> phone_number
"Company Name"                       -> company_name
"City"                               -> city
"State/Region"                       -> state_region
"Country/Region"                     -> country
"Original Traffic Source"            -> original_traffic_source
"Original Traffic Source Drill-Down 1" -> traffic_source_drill_down_1
"Original Traffic Source Drill-Down 2" -> traffic_source_drill_down_2
"Lifecycle Stage"                    -> lifecycle_stage
"Lead Status"                        -> lead_status
"Message"                            -> message
"Create Date"                        -> hubspot_create_date
(all columns)                        -> raw_data (complete JSON)
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "total_rows": 12656,
    "inserted": 12656,
    "updated": 0,
    "errors": 0
  }
}
```

---

## Phase 3: Analytics Edge Function

### `contact-analytics` Function

**Query Parameters:**
- `source` - Filter by traffic source (e.g., "Paid Search")
- `start_date`, `end_date` - Date range filter
- `group_by` - "month" or "source"

**Example Response:**
```json
{
  "total_contacts": 245,
  "paid_search_contacts": 156,
  "by_month": [
    { "month": "2025-12", "count": 42, "paid_search": 28 },
    { "month": "2025-11", "count": 38, "paid_search": 25 }
  ],
  "by_source": {
    "Paid Search": 156,
    "Organic Search": 89
  }
}
```

---

## Phase 4: Admin UI Updates

### Add "HubSpot Contacts" Card to Admin Panel

**Features:**
- File upload dropzone for CSV imports
- Import progress indicator
- Summary of last import (records count, date)
- Link to view contacts analytics

**Visual Layout:**
```text
+------------------------------------------+
|  📋 HubSpot Contacts                     |
|  ----------------------------------------|
|  [Drop CSV here or click to upload]      |
|                                          |
|  Last import: Jan 30, 2026               |
|  Total contacts: 12,656                  |
|  Paid Search: 1,247                      |
|                                          |
|  [View Analytics]  [Run AI Scoring]      |
+------------------------------------------+
```

---

## Phase 5: AI Quality Scoring (Future)

### `analyze-contact-quality` Function

**Uses Lovable AI (no API key required):**
- Analyzes contacts with `message` content
- Scores 0-30 based on service fit, project specificity, commercial intent
- Returns confidence level (High/Medium/Low)
- Can be triggered manually from Admin panel

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/[timestamp].sql` | Create | hubspot_contacts table with indexes and RLS |
| `supabase/functions/import-hubspot-contacts/index.ts` | Create | CSV parsing and upsert logic |
| `supabase/functions/contact-analytics/index.ts` | Create | Aggregation queries with filters |
| `supabase/config.toml` | Update | Add new function configurations |
| `src/pages/Admin.tsx` | Update | Add HubSpot Contacts card with upload UI |

---

## Querying New Fields Example

If HubSpot adds a new column called "Lead Score" in a future export:

```sql
-- Query the new field from raw_data
SELECT 
  first_name,
  last_name,
  raw_data->>'Lead Score' as lead_score
FROM hubspot_contacts
WHERE raw_data->>'Lead Score' IS NOT NULL;
```

This works immediately without any schema changes.

