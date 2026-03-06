# Inward Log Item Further Process Report — API Documentation

## Endpoint

**POST** `/api/V1/reports2/log/download-excel-log-item-further-process-report`

---

## Request Body

```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "filter": {
    "item_name": "AMERICAN WALNUT",
    "inward_id": 5,
    "log_no": "L0702"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startDate` | string (YYYY-MM-DD) | Yes | Start of inward date range |
| `endDate` | string (YYYY-MM-DD) | Yes | End of inward date range (inclusive, to 23:59:59) |
| `filter.item_name` | string | No | Filter by wood species name |
| `filter.inward_id` | number | No | Filter by `log_invoice_details.inward_sr_no` |
| `filter.log_no` | string | No | Filter by specific log number |

> All filter fields are optional and can be combined. Date range is always required.

---

## Response

### Success (200)
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Log item further process report generated successfully",
  "result": "http://your-server/public/upload/reports/reports2/Log/Log-Item-Further-Process-Report-1234567890.xlsx"
}
```

### Error Responses

| Status | Condition |
|---|---|
| 400 | `startDate` or `endDate` missing |
| 400 | Invalid date format (not parseable) |
| 400 | `startDate` is after `endDate` |
| 404 | No log data found for the selected period / filters |
| 500 | Database query error or Excel generation failure |

---

## Report Structure

### Title Rows

| Row | Content | Condition |
|---|---|---|
| Row 1 | `Inward Log Further Process Report` | Always |
| Row 2 | `Date: DD/MM/YYYY  To  DD/MM/YYYY` | Always (both start and end dates) |
| Row 3 | `Inward Id :- {inward_id}` or `Log No :- {log_no}` | Only when filter is provided, else empty |
| Row 4 | Section group headers (merged) | Always |
| Row 5 | Individual column headers | Always |

---

## Column Structure — 56 Columns

### Col 1 — (no group header)
| Col | Header | Source |
|---|---|---|
| 1 | Item Name | `log_inventory_items_details.item_name` |

### Cols 2–6 — Inward in(CMT)
| Col | Header | Source |
|---|---|---|
| 2 | LogNo | `log_inventory_items_details.log_no` |
| 3 | Indian CMT | `log_inventory_items_details.indian_cmt` |
| 4 | RECE CMT | `log_inventory_items_details.physical_cmt` |
| 5 | Issue For Cross cut/Flitch/Peeling/Sales | `physical_cmt` (total issued) |
| 6 | Issue Status | `log_inventory_items_details.issue_status` (crosscutting / flitching / peeling) |

### Cols 7–10 — Cross Cut Issue in(CMT)
| Col | Header | Source |
|---|---|---|
| 7 | Cross Cut Log No | `crosscutting_done.log_no_code` |
| 8 | CC REC | `crosscutting_done.crosscut_cmt` |
| 9 | Issue For Flitch/Peeling | `crosscut_cmt` (whole piece issued) |
| 10 | Status | `crosscutting_done.issue_status` (flitching / peeling) |

### Cols 11–14 — Flitch Issue in(CMT)
| Col | Header | Source |
|---|---|---|
| 11 | Flitch No. | `flitchings.flitch_code` |
| 12 | REC | `flitchings.flitch_cmt` |
| 13 | Issue For Slicing/Peeling | `flitch_cmt` (whole flitch issued) |
| 14 | Status | `flitchings.issue_status` (slicing / slicing_peeling / order / challan) |

### Cols 15–18 — Slicing Issue in(CMT)
| Col | Header | Source |
|---|---|---|
| 15 | Side | `slicing_done_items.log_no_code` |
| 16 | Process Cmt | *(not yet available in schema — blank)* |
| 17 | Balance Cmt | *(not yet available in schema — blank)* |
| 18 | REC (Leaf) | `slicing_done_items.no_of_leaves` |

### Cols 19–22 — Peeling
| Col | Header | Source |
|---|---|---|
| 19 | Process | `peeling_done_items.output_type` (veneer / face / core) |
| 20 | Balance Rostroller | *(not yet available — blank)* |
| 21 | Output | `peeling_done_items.no_of_leaves` |
| 22 | Rec (Leaf) | `peeling_done_items.no_of_leaves` |

### Cols 23–25 — Dressing
| Col | Header | Source |
|---|---|---|
| 23 | Rec Sq. Mtr. | `SUM(dressing_done_items.sqm)` grouped by `log_no_code` |
| 24 | Issue (Sq.Mtr.) | `SUM(dressing_done_items.sqm WHERE issue_status IS NOT NULL)` |
| 25 | Issue Status | `dressing_done_items.issue_status` (grouping / order / smoking_dying) |

### Cols 26–28 — Smoking/Dying
| Col | Header | Source |
|---|---|---|
| 26 | Process | `process_done_items_details.process_name` |
| 27 | Issue (Sq.Mtr.) | `SUM(process_done_items_details.sqm)` grouped by `log_no_code` |
| 28 | Issue Status | `process_done_items_details.issue_status` (grouping) |

### Cols 29–36 — Clipping/Grouping
| Col | Header | Source |
|---|---|---|
| 29 | New Group Number | `grouping_done_items_details.group_no` |
| 30 | Rec Sheets | `grouping_done_items_details.no_of_sheets` |
| 31 | Rec Sq.Mtr. | `grouping_done_items_details.sqm` |
| 32 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 33 | Issue (Sq.Mtr.) | `sqm - available_details.sqm` |
| 34 | Issue Status | *(not tracked in grouping schema — blank)* |
| 35 | Balance (Sheets) | `grouping_done_items_details.available_details.no_of_sheets` |
| 36 | Balance Sq. Mtr. | `grouping_done_items_details.available_details.sqm` |

### Cols 37–43 — Splicing
| Col | Header | Source |
|---|---|---|
| 37 | Rec Machine (Sq.mtr.) | `SUM(tapping_done_items_details.sqm WHERE splicing_type = 'MACHINE SPLICING')` |
| 38 | Rec Hand (Sq.Mtr.) | `SUM(tapping_done_items_details.sqm WHERE splicing_type = 'HAND SPLICING')` |
| 39 | Splicing Sheets | `SUM(tapping_done_items_details.no_of_sheets)` |
| 40 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 41 | Issue Status | `tapping_done_items_details.issued_for` |
| 42 | Balance (Sheets) | `SUM(tapping_done_items_details.available_details.no_of_sheets)` |
| 43 | Balance (Sq. Mtr.) | `SUM(tapping_done_items_details.available_details.sqm)` |

> Splicing type is looked up from `tapping_done_other_details.splicing_type` via `tapping_done_other_details_id`.

### Cols 44–50 — Pressing
| Col | Header | Source |
|---|---|---|
| 44 | Pressing (Sheets) | `SUM(pressing_done_details.no_of_sheets)` grouped by `group_no` |
| 45 | Pressing (Sq.mtr.) | `SUM(pressing_done_details.sqm)` |
| 46 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 47 | Issue (Sq. Mtr.) | `sqm - available_details.sqm` |
| 48 | Issue Status | `pressing_done_details.issued_for` |
| 49 | Balance (Sheets) | `SUM(pressing_done_details.available_details.no_of_sheets)` |
| 50 | Balance (Sq. Mtr.) | `SUM(pressing_done_details.available_details.sqm)` |

### Cols 51–52 — CNC
| Col | Header | Source |
|---|---|---|
| 51 | Cnc Type | `cnc_done_details.product_type` |
| 52 | REC (Sheets) | `SUM(cnc_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 53 — COLOUR
| Col | Header | Source |
|---|---|---|
| 53 | REC (Sheets) | `SUM(color_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 54 — Sales
| Col | Header | Source |
|---|---|---|
| 54 | REC (Sheets) | *(placeholder — schema not yet identified)* |

### Col 55 — Job Work Challan
| Col | Header | Source |
|---|---|---|
| 55 | Veneer | *(placeholder — schema not yet identified)* |

### Col 56 — Adv Work Challan
| Col | Header | Source |
|---|---|---|
| 56 | Pressing Sheets | *(placeholder — schema not yet identified)* |

---

## Row Granularity

Each data row represents **one leaf-level entity**:
- A **grouping item** (`grouping_done_items_details` record) — most common
- A **slicing side** that hasn't reached grouping yet
- A **peeling item** (`peeling_done_items`) for the peeling path
- The **log itself** when no further processing has occurred

Parent-level columns (Item Name, log data, crosscut, flitch, slicing side) are **merged vertically** across consecutive rows that share the same parent.

---

## Data Linking Chain

```
log_inventory_items_details (log_no)
  └─► crosscutting_done          (log_no → log_no_code = crosscut identifier)
        └─► flitchings            (crosscut_done_id → flitch_code)
              └─► slicing_done_items  (log_no_code starts with flitch_code)
                    └─► dressing_done_items     (log_no_code = slicing log_no_code)
                    └─► process_done_items_details  (log_no_code)
                    └─► grouping_done_items_details (log_no_code → group_no)
                          └─► tapping_done_items_details (group_no)
                          └─► pressing_done_details      (group_no)
                                └─► cnc_done_details    (pressing_details_id)
                                └─► color_done_details  (pressing_details_id)
```

Alternative paths also supported:
- Log → Flitch directly (no crosscut)
- Log → Peeling directly
- Crosscut → Peeling (no flitch)
- Flitch → Peeling (issue_status = slicing_peeling)

---

## Query Strategy

All stage data is fetched in **bulk** (not N+1 per log) using `$in` queries:

1. Fetch all logs matching date range + filters
2. Collect all `log_no` values
3. Bulk-fetch crosscuts, flitches, slicing sides, peeling items for those `log_no`s
4. Collect all leaf `log_no_code` values (slicing + peeling)
5. Bulk-fetch dressing, smoking, grouping for those codes
6. Collect all `group_no` values from grouping
7. Bulk-fetch tapping (with lookup for splicing type), pressing for those group_nos
8. Collect all `pressing._id` values
9. Bulk-fetch CNC and colour for those pressing IDs

---

## Excel File Details

- **Location**: `public/upload/reports/reports2/Log/`
- **Filename**: `Log-Item-Further-Process-Report-{timestamp}.xlsx`
- **Sheet name**: `Log Further Process`
- **Frozen panes**: Column 2, Row 4 (freeze through column headers)
- **Total rows summary**: Per-log total (orange), Per-item total (orange), Grand total (yellow)
- **Numeric format**: `#,##0.000` (3 decimal places)
- **Empty cells**: Stages not reached are left **blank** (not zero)

---

## File Locations

| Purpose | Path |
|---|---|
| Controller | `topl_backend/controllers/reports2/Log/logItemFurtherProcess.js` |
| Excel Generator | `topl_backend/config/downloadExcel/reports2/Log/logItemFurtherProcess.js` |
| Route | `topl_backend/routes/report/reports2/Log/log.routes.js` |

---

## Sample Requests

### Filter by date range only
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31"
}
```

### Filter by inward ID
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-31",
  "filter": { "inward_id": 5 }
}
```

### Filter by log number
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-31",
  "filter": { "log_no": "L0702" }
}
```

### Filter by species
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "filter": { "item_name": "AMERICAN WALNUT" }
}
```

---

## Performance Notes

- All stage data is fetched in parallel using `Promise.all` where possible
- Uses `Map`-based lookups for O(1) linking between stages
- Child-to-parent matching uses compiled regex patterns (`^{code}[A-Z]+$`) to correctly differentiate depth levels
- For large date ranges, consider adding a date range limit or pagination
