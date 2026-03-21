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
| Row 3 | `Inward Id :- {n}` or `Flitch Code :- {x}` | Only when filter is provided, else empty |
| Row 4 | Section group headers (merged) | Always |
| Row 5 | Individual column headers | Always |

---

## Column Structure — 41 Columns

### Col 1 — (standalone)
| Col | Header | Source |
|---|---|---|
| 1 | Item Name | `flitch_inventory_items_details.item_name` |

### Cols 2–5 — Flitch Inward in(CMT)
| Col | Header | Source |
|---|---|---|
| 2 | LogNo | `flitch_inventory_items_details.log_no` |
| 3 | REC CMT | `flitch_inventory_items_details.flitch_cmt` |
| 4 | Issue For Slicing/Peeling/Sales | Sum of CMT across **two** sources: (a) `issued_for_slicings.cmt` for all rows where `flitch_inventory_item_id` = this flitch, **plus** (b) `issued_for_order_items.item_details.flitch_cmt` (or `.cmt` / `.physical_cmt` as fallback) for all rows where `issued_from = FLITCH` and the flitch code matches. Values are summed and rounded to 3 d.p. Blank when neither source has data. |
| 5 | Issue Status | `flitch_inventory_items_details.issue_status` |

### Cols 6–9 — Slicing Issue in(CMT)
| Col | Header | Source |
|---|---|---|
| 6 | Side | `slicing_done_items.log_no_code` |
| 7 | Process Cmt | Slicing done CMT for the side: per-item `cmt` when present, else `slicing_done_other_details.total_cmt` ÷ items in that slicing batch; **summed** across all slicing sessions (initial + re-slicing / history) for the same `log_no_code` |
| 8 | Balance Cmt | Remaining CMT: `max(0, issued cmt from linked issued_for_slicing − process CMT)` |
| 9 | REC (Leaf) | `slicing_done_items.no_of_leaves` |

### Cols 10–12 — Dressing
| Col | Header | Source |
|---|---|---|
| 10 | Rec Sq. Mtr. | `SUM(dressing_done_items.sqm)` grouped by `log_no_code` |
| 11 | Issue (Sq.Mtr.) | `SUM(sqm WHERE issue_status IS NOT NULL)` |
| 12 | Issue Status | `dressing_done_items.issue_status` |

### Cols 13–15 — Smoking/Dying

Aligned with the **log item further process** report: quantities are SQM-based; “Process” is total throughput, not `process_name`.

| Col | Header | Source |
|---|---|---|
| 13 | Process | Total SQM processed: `SUM(process_done_items_details.sqm)` for all rows with this `log_no_code`, rounded to 3 decimal places |
| 14 | Issue (Sq.Mtr.) | `SUM(sqm)` only for rows where `issue_status` is set; rounded to 3 d.p.; blank if nothing issued |
| 15 | Issue Status | `issue_status` from the first **issued** row (same filter as col 14) |

### Cols 16–23 — Clipping/Grouping
| Col | Header | Source |
|---|---|---|
| 16 | New Group Number | `grouping_done_items_details.group_no` |
| 17 | Rec Sheets | `grouping_done_items_details.no_of_sheets` |
| 18 | Rec Sq.Mtr. | `grouping_done_items_details.sqm` |
| 19 | Issue (Sheets) | `max(0, no_of_sheets − available_details.no_of_sheets)` |
| 20 | Issue (Sq.Mtr.) | `max(0, sqm − available_details.sqm)` |
| 21 | Issue Status | Latest `issued_for` from `grouping_done_history` for this `grouping_done_items_details._id` (`ORDER`, `STOCK`, `SAMPLE`) |
| 22 | Balance (Sheets) | `grouping_done_items_details.available_details.no_of_sheets` |
| 23 | Balance Sq. Mtr. | `grouping_done_items_details.available_details.sqm` |

### Cols 24–30 — Splicing
| Col | Header | Source |
|---|---|---|
| 24 | Rec Machine (Sq.mtr.) | `SUM(tapping.sqm WHERE splicing_type = 'MACHINE SPLICING')` |
| 25 | Rec Hand (Sq.Mtr.) | `SUM(tapping.sqm WHERE splicing_type = 'HAND SPLICING')` |
| 26 | Splicing Sheets | `SUM(tapping_done_items_details.no_of_sheets)` |
| 27 | Issue (Sheets) | `max(0, Σ no_of_sheets − Σ available_details.no_of_sheets)` per group |
| 28 | Issue Status | Tapping → pressing: latest row in `tapping_done_history` per `tapping_done_items_details._id` — formatted as `issue_status` / `issued_for` (e.g. `Pressing / ORDER`) |
| 29 | Balance (Sheets) | `SUM(tapping_done_items_details.available_details.no_of_sheets)` |
| 30 | Balance (Sq. Mtr.) | `SUM(tapping_done_items_details.available_details.sqm)` |

### Cols 31–37 — Pressing
| Col | Header | Source |
|---|---|---|
| 31 | Pressing (Sheets) | `SUM(pressing_done_details.no_of_sheets)` grouped by `group_no` |
| 32 | Pressing (Sq.mtr.) | `SUM(pressing_done_details.sqm)` |
| 33 | Issue (Sheets) | `max(0, Σ no_of_sheets − Σ available_details.no_of_sheets)` per group |
| 34 | Issue (Sq. Mtr.) | `max(0, Σ sqm − Σ available_details.sqm)` per group |
| 35 | Issue Status | Only when issued from pressing to the next factory: latest `pressing_done_history` row per `pressing_done_details._id` (`issued_item_id`) — `issue_status` / `issued_for` (e.g. `CNC / ORDER`). Blank if not issued further. |
| 36 | Balance (Sheets) | `SUM(pressing_done_details.available_details.no_of_sheets)` |
| 37 | Balance (Sq. Mtr.) | `SUM(pressing_done_details.available_details.sqm)` |

### Cols 38–39 — CNC
| Col | Header | Source |
|---|---|---|
| 38 | Cnc Type | `cnc_done_details.product_type` |
| 39 | REC (Sheets) | `SUM(cnc_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 40 — COLOUR
| Col | Header | Source |
|---|---|---|
| 40 | REC (Sheets) | `SUM(color_done_details.no_of_sheets)` via `pressing_details_id` |

### Col 41 — Sales
| Col | Header | Source |
|---|---|---|
| 41 | Sales (CBM / SQM) | Order line quantity formatted as **`{value} CBM`** or **`{value} SQM`** (3 d.p.), sourced from the resolved `order_item_id`'s record across `raw_order_item_details`, `decorative_order_item_details`, or `series_product_order_item_details`. Resolution priority (most-downstream first): Colour → CNC → Pressing → Tapping → Grouping; falls back to a direct flitch → order link (`issued_for_order_items` where `issued_from = FLITCH`). Unit suffix is chosen by `unit_name` field (SQM/CBM keywords), falling back to `raw_material` type, then whichever of CBM/SQM is non-zero. Blank when no order is associated. |

---

## Non-negative difference fields

Any column whose value is computed as **one quantity minus another** (remaining balance after processing, or “issued” / moved quantity derived from received minus still-available stock) is **floored at zero** in the generated Excel. Negative values are never shown, including when source data is inconsistent (for example, available stock recorded higher than received). This applies at least to:

| Col(s) | Section | Formula (conceptual) |
|--------|---------|----------------------|
| 8 | Slicing | `max(0, issued CMT − process CMT)` |
| 19–20 | Grouping | `max(0, received − available)` for sheets and sqm |
| 27 | Splicing | `max(0, total tapping sheets − total available sheets)` for the group |
| 33–34 | Pressing | `max(0, received − available)` for sheets and sqm |

Implementation uses a shared `nonNegativeDiff` helper in `flitchItemFurtherProcess.js` for these subtractions.

Subtotal and grand total rows **sum** these already non-negative cell values per numeric column.

---

## Row Granularity

Each data row represents one leaf-level entity:
- A `grouping_done_items_details` record (most common path)
- A `slicing_done_items` side not yet in grouping
- The flitch itself when no further processing has occurred

Parent-level columns (Item Name, Flitch cols) are **merged vertically** across consecutive rows that share the same parent. Slicing side + Dressing + Smoking columns are merged per side.

---

## Data Linking Chain

```
flitch_inventory_items_details (_id, flitch_code, log_no)
  ├─► issued_for_slicings (flitch_inventory_item_id)   ← contributes to col 4 (Issue CMT)
  │     └─► slicing_done_other_details (issue_for_slicing_id)
  │           └─► slicing_done_items (slicing_done_other_details_id, log_no_code)
  │                 └─► dressing_done_items / process_done / grouping_done (log_no_code)
  │                       └─► tapping / pressing (group_no)
  │                             └─► cnc_done / color_done (pressing_details_id)
  │                                   └─► finished_ready_for_packing (pressing_details_id)  ← col 41 Sales (primary)
  └─► issued_for_order_items (issued_from=FLITCH, item_details.flitch_code)
        ├─► contributes item_details.flitch_cmt to col 4 (Issue CMT)
        └─► order_item_id → raw/decorative/series_order_item_details → col 41 Sales (fallback)
```

---

## Query Strategy

All stage data is fetched in bulk using `$in` queries:

1. Fetch all flitches matching date range + filters from `flitch_inventory_items_view_model`
2. Resolve `issued_for_slicing._id` values for those flitches (`flitch_inventory_item_id`); sum CMT per flitch for col 4
3. Bulk-fetch slicing rows: `slicing_done_items` → `slicing_done_other_details` where `issue_for_slicing_id` is in that set
4. Group slicing rows in memory by `flitch_inventory_item_id`
5. Collect all leaf `log_no_code` values
6. Bulk-fetch dressing and smoking for those codes
7. Collect all `group_no` values from grouping
8. Bulk-fetch tapping (with splicing type lookup) and pressing
9. Collect all pressing `_id` values
10. Bulk-fetch CNC and colour
11. Query `finished_ready_for_packing_details` by pressing `_id` to resolve `order_item_id` per stage (Colour / CNC / Pressing) — primary Sales source
12. Query history models (`grouping_done_history`, `tapping_done_history`, `pressing_done_history`) for `order_item_id` fallback resolution
13. Query `issued_for_order_items` where `issued_from = FLITCH` and flitch code in report set — provides both the col 4 direct-order CMT and the Sales fallback `order_item_id`
14. Bulk-fetch order item documents (`raw_order_item_details`, `decorative_order_item_details`, `series_product_order_item_details`) by all resolved `order_item_id` values for col 41

---

## Excel File Details

| Property | Value |
|---|---|
| Location | `public/upload/reports/reports2/Flitch/` |
| Filename | `Flitch-Item-Further-Process-Report-{timestamp}.xlsx` |
| Sheet name | `Flitch Further Process` |
| Total columns | 41 |
| Frozen pane | Column 2, Row 5 |
| Numeric format | `#,##0.000` (3 decimal places) |
| Per-log total | Orange fill, `Total {log_no}` label |
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
