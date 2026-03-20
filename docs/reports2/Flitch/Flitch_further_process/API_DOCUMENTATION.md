# Flitch Item Further Process Report — API Documentation

## Endpoint

**POST** `/api/V1/reports2/flitch/download-excel-flitch-item-further-process-report`

---

## Request Body

```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31",
  "filter": {
    "item_name": "AMERICAN WALNUT",
    "inward_id": 3,
    "flitch_no": "L0702A1"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `startDate` | string (YYYY-MM-DD) | Yes | Start of flitch inward date range |
| `endDate` | string (YYYY-MM-DD) | Yes | End of flitch inward date range (inclusive, to 23:59:59) |
| `filter.item_name` | string | No | Filter by wood species name |
| `filter.inward_id` | number | No | Filter by `flitch_invoice_details.inward_sr_no` |
| `filter.flitch_no` | string | No | Filter by specific flitch code |

> All filter fields are optional and can be combined. Date range is always required.

---

## Response

### Success (200)
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Flitch item further process report generated successfully",
  "result": "http://your-server/public/upload/reports/reports2/Flitch/Flitch-Item-Further-Process-Report-1234567890.xlsx"
}
```

### Error Responses

| Status | Condition |
|---|---|
| 400 | `startDate` or `endDate` missing |
| 400 | Invalid date format (not parseable) |
| 400 | `startDate` is after `endDate` |
| 404 | No flitch data found for the selected period / filters |
| 500 | Database query error or Excel generation failure |

---

## Report Structure

### Title Rows

| Row | Content | Condition |
|---|---|---|
| Row 1 | `Flitch Further Process Report` | Always |
| Row 2 | `Date: DD/MM/YYYY  To  DD/MM/YYYY` | Always (both start and end dates) |
| Row 3 | `Inward Id :- {n}` or `Flitch No :- {x}` | Only when filter is provided, else empty |
| Row 4 | Section group headers (merged) | Always |
| Row 5 | Individual column headers | Always |

---

## Column Structure — 45 Columns

### Col 1 — (standalone)
| Col | Header | Source |
|---|---|---|
| 1 | Item Name | `flitch_inventory_items_details.item_name` |

### Cols 2–5 — Flitch Inward in(CMT)
| Col | Header | Source |
|---|---|---|
| 2 | Flitch No. | `flitch_inventory_items_details.flitch_code` |
| 3 | REC CMT | `flitch_inventory_items_details.flitch_cmt` |
| 4 | Issue For Slicing/Peeling | Sum of `cmt` from `issued_for_slicings` (where `flitch_inventory_item_id` = flitch) + sum of `cmt` from `issues_for_peelings` (where `log_no_code` matches flitch) |
| 5 | Issue Status | `flitch_inventory_items_details.issue_status` |

### Cols 6–9 — Slicing Issue in(CMT)
| Col | Header | Source |
|---|---|---|
| 6 | Side | `slicing_done_items.log_no_code` |
| 7 | Process Cmt | `issued_for_slicings.cmt - balance_cmt` (via `slicing_done_other_details.issue_for_slicing_id`) |
| 8 | Balance Cmt | If `issued_for_slicings.type === "balance_flitch"` then `issue_for_slicing_available_details.cmt`, else `0` |
| 9 | REC (Leaf) | `slicing_done_items.no_of_leaves` |

### Cols 10–13 — Peeling
| Col | Header | Source |
|---|---|---|
| 10 | Process | `peeling_done_items.output_type` |
| 11 | Balance Rostroller | *(placeholder — not tracked in schema)* |
| 12 | Output | `peeling_done_items.no_of_leaves` |
| 13 | Rec (Leaf) | `peeling_done_items.no_of_leaves` |

### Cols 14–16 — Dressing
| Col | Header | Source |
|---|---|---|
| 14 | Rec Sq. Mtr. | `SUM(dressing_done_items.sqm)` grouped by `log_no_code` |
| 15 | Issue (Sq.Mtr.) | `SUM(sqm WHERE issue_status IS NOT NULL)` |
| 16 | Issue Status | `dressing_done_items.issue_status` |

### Cols 17–19 — Smoking/Dying
| Col | Header | Source |
|---|---|---|
| 17 | Process | `process_done_items_details.process_name` |
| 18 | Issue (Sq.Mtr.) | `SUM(process_done_items_details.sqm)` grouped by `log_no_code` |
| 19 | Issue Status | `process_done_items_details.issue_status` |

### Cols 20–27 — Clipping/Grouping
| Col | Header | Source |
|---|---|---|
| 20 | New Group Number | `grouping_done_items_details.group_no` |
| 21 | Rec Sheets | `grouping_done_items_details.no_of_sheets` |
| 22 | Rec Sq.Mtr. | `grouping_done_items_details.sqm` |
| 23 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 24 | Issue (Sq.Mtr.) | `sqm - available_details.sqm` |
| 25 | Issue Status | *(placeholder — not tracked in schema)* |
| 26 | Balance (Sheets) | `grouping_done_items_details.available_details.no_of_sheets` |
| 27 | Balance Sq. Mtr. | `grouping_done_items_details.available_details.sqm` |

### Cols 28–34 — Splicing
| Col | Header | Source |
|---|---|---|
| 28 | Rec Machine (Sq.mtr.) | `SUM(tapping.sqm WHERE splicing_type = 'MACHINE SPLICING')` |
| 29 | Rec Hand (Sq.Mtr.) | `SUM(tapping.sqm WHERE splicing_type = 'HAND SPLICING')` |
| 30 | Splicing Sheets | `SUM(tapping_done_items_details.no_of_sheets)` |
| 31 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 32 | Issue Status | `tapping_done_items_details.issued_for` |
| 33 | Balance (Sheets) | `SUM(tapping_done_items_details.available_details.no_of_sheets)` |
| 34 | Balance (Sq. Mtr.) | `SUM(tapping_done_items_details.available_details.sqm)` |

### Cols 35–41 — Pressing
| Col | Header | Source |
|---|---|---|
| 35 | Pressing (Sheets) | `SUM(pressing_done_details.no_of_sheets)` grouped by `group_no` |
| 36 | Pressing (Sq.mtr.) | `SUM(pressing_done_details.sqm)` |
| 37 | Issue (Sheets) | `no_of_sheets - available_details.no_of_sheets` |
| 38 | Issue (Sq. Mtr.) | `sqm - available_details.sqm` |
| 39 | Issue Status | `pressing_done_details.issued_for` |
| 40 | Balance (Sheets) | `SUM(pressing_done_details.available_details.no_of_sheets)` |
| 41 | Balance (Sq. Mtr.) | `SUM(pressing_done_details.available_details.sqm)` |

### Cols 42–43 — CNC
| Col | Header | Source |
|---|---|---|
| 42 | Cnc Type | `cnc_done_details.product_type` |
| 43 | REC (Sheets) | `SUM(cnc_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 44 — COLOUR
| Col | Header | Source |
|---|---|---|
| 44 | REC (Sheets) | `SUM(color_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 45 — Sales
| Col | Header | Source |
|---|---|---|
| 45 | REC (Sheets) | *(placeholder — schema not yet identified)* |

---

## Row Granularity

Each data row represents one leaf-level entity:
- A `grouping_done_items_details` record (most common path)
- A `slicing_done_items` side not yet in grouping
- A `peeling_done_items` item (peeling path)
- The flitch itself when no further processing has occurred

Parent-level columns (Item Name, Flitch cols) are **merged vertically** across consecutive rows that share the same parent. Slicing side + Dressing + Smoking columns are merged per side.

---

## Data Linking Chain

```
flitch_inventory_items_details (flitch_code, log_no)
  └─► slicing_done_items     (log_no_code matches ^{flitch_code}[A-Z]+$)
        └─► dressing_done_items          (log_no_code = slicing log_no_code)
        └─► process_done_items_details   (log_no_code)
        └─► grouping_done_items_details  (log_no_code → group_no)
              └─► tapping_done_items_details (group_no)
              └─► pressing_done_details      (group_no)
                    └─► cnc_done_details    (pressing_details_id)
                    └─► color_done_details  (pressing_details_id)
  └─► peeling_done_items     (log_no_code matches ^{flitch_code}[A-Z]+$)
```

---

## Query Strategy

All stage data is fetched in bulk using `$in` queries:

1. Fetch all flitches matching date range + filters from `flitch_inventory_items_view_model`
2. Collect all `flitch_code` values from those flitches
3. Bulk-fetch slicing sides and peeling items using `log_no IN flitchCodes` (slicing/peeling store flitch code in `log_no`)
4. In-memory: link each side/peel to its parent flitch via `buildChildPattern(flitch_code)`
5. Collect all leaf `log_no_code` values
6. Bulk-fetch dressing, smoking, grouping for those codes
7. Collect all `group_no` values from grouping
8. Bulk-fetch tapping (with splicing type lookup) and pressing
9. Collect all pressing `_id` values
10. Bulk-fetch CNC and colour

---

## Excel File Details

| Property | Value |
|---|---|
| Location | `public/upload/reports/reports2/Flitch/` |
| Filename | `Flitch-Item-Further-Process-Report-{timestamp}.xlsx` |
| Sheet name | `Flitch Further Process` |
| Total columns | 45 |
| Frozen pane | Column 2, Row 5 |
| Numeric format | `#,##0.000` (3 decimal places) |
| Per-flitch total | Orange fill, `Total {flitch_no}` label |
| Per-item total | Orange fill, `Total {item_name}` label |
| Grand total | Yellow fill, `Total` label |
| Empty cells | Stages not reached = blank (not `0`) |

---

## File Locations

| Purpose | Path |
|---|---|
| Controller | `topl_backend/controllers/reports2/Flitch/flitchItemFurtherProcess.js` |
| Excel Generator | `topl_backend/config/downloadExcel/reports2/Flitch/flitchItemFurtherProcess.js` |
| Route | `topl_backend/routes/report/reports2/Flitch/flitch.routes.js` |

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
  "filter": { "inward_id": 3 }
}
```

### Filter by flitch number
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-31",
  "filter": { "flitch_no": "L0702A1" }
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
