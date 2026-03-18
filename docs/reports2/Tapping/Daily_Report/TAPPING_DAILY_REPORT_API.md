# Tapping (Splicing) Daily Report API

## Overview

The Tapping Daily Report API generates an Excel "Splicing Details Report" for a specific date. It shows tapping/splicing production details grouped by Item Name, with a three-level column header that breaks down production into Machine Splicing and Hand Splicing quantities. A "Summery" section at the bottom compares Issue (raw material issued) vs Production (tapped output) by item dimensions.

The existing Clipping Daily Report (`/download-excel-clipping-daily-report`) is unchanged.

## Endpoint

```
POST /report/download-excel-tapping-daily-report
```

Full path: `POST /api/V1/report/download-excel-tapping-daily-report`

## Authentication

- Requires: Standard report authentication (as per reports2 pattern)

## Request Body

### Required Parameters

```json
{
  "filters": {
    "reportDate": "2025-02-04"
  }
}
```

- **reportDate** (required): Date for the report in `YYYY-MM-DD` format.

## Response

### Success Response (200 OK)

```json
{
  "result": "http://localhost:5000/public/reports/Tapping/tapping_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Tapping daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request – Missing report date

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No tapping data found for the selected date"
}
```

---

## Report Structure

### Row 1: Report Title

```
Splicing Details Report Date: DD/MM/YYYY
```

### Main Data Table (14 columns, 3-row header)

#### Header Structure

| Header Row | Cols 1–6 | Cols 7–10 | Cols 11–14 |
|------------|----------|-----------|------------|
| Row 1 | Item Name \| Thickness \| LogX \| Length \| Width \| Sheets | `Tapping received (In Sq. Mtr.)` ← merged | Character \| Pattern \| Series \| Remarks |
| Row 2 | ↕ (merged vertically from Row 1) | `Machine Splicing` ← merged (7–8) \| `Hand Splicing` ← merged (9–10) | ↕ (merged vertically from Row 1) |
| Row 3 | ↕ (merged vertically from Row 1) | Sheets \| SQ Mtr \| Sheets \| SQ Mtr | ↕ (merged vertically from Row 1) |

#### Column Definitions

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | Item Name | `items.item_name` | Shown only on first row per group |
| 2 | Thickness | `items.thickness` | `tapping_done_items_details.thickness` |
| 3 | LogX | `items.log_no_code` | Log identifier |
| 4 | Length | `items.length` | Formatted 2 dp |
| 5 | Width | `items.width` | Formatted 2 dp |
| 6 | Sheets | `items.no_of_sheets` | Total sheets for this log entry |
| 7 | Machine Splicing — Sheets | `items.no_of_sheets` if `splicing_type` IN ['MACHINE','MACHINE SPLICING'], else 0 | |
| 8 | Machine Splicing — SQ Mtr | `items.sqm` if `splicing_type` IN ['MACHINE','MACHINE SPLICING'], else 0 | |
| 9 | Hand Splicing — Sheets | `items.no_of_sheets` if `splicing_type` IN ['HAND','HAND SPLICING'], else 0 | |
| 10 | Hand Splicing — SQ Mtr | `items.sqm` if `splicing_type` IN ['HAND','HAND SPLICING'], else 0 | |
| 11 | Character | `items.character_name` | |
| 12 | Pattern | `items.pattern_name` | |
| 13 | Series | `items.series_name` | |
| 14 | Remarks | `items.remark` | |

#### Grouping and Totals

- Data is **grouped by Item Name**. For each item: one row per LogX, then a **Total** row (bold) showing summed Sheets, Machine Sheets/SQMtr, Hand Sheets/SQMtr.
- After all items: a grand **Total** row.

### Summery Section

Placed below the main table. Label "Summery" appears as a bold title row.

#### Header Structure (2 rows)

| Header Row | Cols 1–4 | Cols 5–6 | Cols 7–8 |
|------------|----------|----------|----------|
| Row 1 | Item Name \| Tickness \| Length \| Width | `Issue` ← merged | `Production` ← merged |
| Row 2 | ↕ (merged from Row 1) | Sheets \| SQ Mtr | Sheets \| SQ Mtr |

#### Column Definitions

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | Item Name | `items.item_name` | |
| 2 | Tickness | `items.thickness` | Client spelling preserved |
| 3 | Length | `items.length` | |
| 4 | Width | `items.width` | |
| 5 | Issue — Sheets | `issueSource[0].no_of_sheets` | From `issue_for_tappings` |
| 6 | Issue — SQ Mtr | `issueSource[0].sqm` | From `issue_for_tappings` |
| 7 | Production — Sheets | `items.no_of_sheets` | From `tapping_done_items_details` |
| 8 | Production — SQ Mtr | `items.sqm` | From `tapping_done_items_details` |

- One row per unique (item_name, thickness, length, width).
- **Total** row at the bottom with summed Issue and Production quantities.

---

## How Data Is Brought Together

### Aggregation Pipeline (Controller)

**Source collection:** `tapping_done_other_details`

**Stage 1 – $match**
```javascript
{ tapping_date: { $gte: startOfDay, $lte: endOfDay } }
```

**Stage 2 – $lookup (issue_for_tappings)**
```javascript
{
  from: 'issue_for_tappings',
  localField: 'issue_for_tapping_item_id',
  foreignField: '_id',
  as: 'issueSource'
}
```

**Stage 3 – $lookup (tapping_done_items_details)**
```javascript
{
  from: 'tapping_done_items_details',
  localField: '_id',
  foreignField: 'tapping_done_other_details_id',
  as: 'items'
}
```

**Stage 4 – $unwind (items)**
```javascript
{ path: '$items', preserveNullAndEmptyArrays: false }
```

**Stage 5 – $sort**
```javascript
{ 'items.item_name': 1, 'items.log_no_code': 1 }
```

**Result shape:** Each document has session-level fields (`splicing_type`, `issueSource[]`) plus one `items` object (one `tapping_done_items_details` row).

### Key Note on issueSource

`issueSource` is joined **before** the `$unwind` of items, so `issueSource[0]` (the issue record) is the same for all item rows belonging to the same session. This is intentional — the issue was made at session level.

---

## Field Mapping

### Main Table

| Report column | DB collection | DB field | Notes |
|--------------|---------------|----------|-------|
| Item Name | tapping_done_items_details | item_name | |
| Thickness | tapping_done_items_details | thickness | |
| LogX | tapping_done_items_details | log_no_code | |
| Length | tapping_done_items_details | length | |
| Width | tapping_done_items_details | width | |
| Sheets | tapping_done_items_details | no_of_sheets | |
| Machine Splicing Sheets | tapping_done_items_details | no_of_sheets | Only if splicing_type IN ['MACHINE','MACHINE SPLICING'] |
| Machine Splicing SQ Mtr | tapping_done_items_details | sqm | Only if splicing_type IN ['MACHINE','MACHINE SPLICING'] |
| Hand Splicing Sheets | tapping_done_items_details | no_of_sheets | Only if splicing_type IN ['HAND','HAND SPLICING'] |
| Hand Splicing SQ Mtr | tapping_done_items_details | sqm | Only if splicing_type IN ['HAND','HAND SPLICING'] |
| Character | tapping_done_items_details | character_name | |
| Pattern | tapping_done_items_details | pattern_name | |
| Series | tapping_done_items_details | series_name | |
| Remarks | tapping_done_items_details | remark | |

### Summery Table

| Report column | DB collection | DB field | Notes |
|--------------|---------------|----------|-------|
| Item Name | tapping_done_items_details | item_name | |
| Tickness | tapping_done_items_details | thickness | |
| Length | tapping_done_items_details | length | |
| Width | tapping_done_items_details | width | |
| Issue Sheets | issue_for_tappings | no_of_sheets | Via issueSource[0] |
| Issue SQ Mtr | issue_for_tappings | sqm | Via issueSource[0] |
| Production Sheets | tapping_done_items_details | no_of_sheets | |
| Production SQ Mtr | tapping_done_items_details | sqm | |

---

## Database Collections Used

1. **tapping_done_other_details** — One document per tapping/splicing session. Key fields: `_id`, `tapping_date`, `splicing_type`, `issue_for_tapping_item_id`.
2. **tapping_done_items_details** — One document per tapped item in a session. Linked by `tapping_done_other_details_id`.
3. **issue_for_tappings** — Raw material issued to tapping. Linked by `issue_for_tapping_item_id` on the session.

```
tapping_done_other_details (1)
    │ issue_for_tapping_item_id  ──→  issue_for_tappings (1)
    │ _id
    └── tapping_done_items_details (N)  via tapping_done_other_details_id
```

---

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Tapping/Daily_Report/tappingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Tapping/Daily_Report/tappingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Tapping/tapping.routes.js
```

---

## File Storage

**Directory:** `public/reports/Tapping/`

**Filename pattern:** `tapping_daily_report_{timestamp}.xlsx`

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-tapping-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2026-02-12"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
const response = await axios.post(
  '/api/V1/report/download-excel-tapping-daily-report',
  { filters: { reportDate: '2026-02-12' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
window.open(response.data.result, '_blank');
```

---

## Troubleshooting

### No Data Found
- Verify `reportDate` is in `YYYY-MM-DD` format.
- Confirm tapping sessions exist in `tapping_done_other_details` for that date.

### Machine/Hand Columns All Zero
- Check that `splicing_type` is populated on `tapping_done_other_details` documents. Supported values: `'MACHINE'`, `'MACHINE SPLICING'`, `'HAND'`, or `'HAND SPLICING'` (uppercase).

### Issue Columns All Zero
- Check that `issue_for_tapping_item_id` is populated on `tapping_done_other_details` and the referenced `issue_for_tappings` document exists.
