# Implementation Summary — Flitch Item Further Process Report

## Overview

Tracks every inward flitch through its downstream factory journey — from flitch receipt to the
final pressing / CNC / colour stage. Analogous to the Log Item Further Process Report but starts
from flitch inventory instead of log inventory, removing the CrossCut and Flitch tiers (and peeling process data).

---

## Files

| File | Lines | Purpose |
|---|---|---|
| `controllers/reports2/Flitch/flitchItemFurtherProcess.js` | ~305 | Bulk-fetch, tree-build, row-flatten (no peeling) |
| `config/downloadExcel/reports2/Flitch/flitchItemFurtherProcess.js` | ~320 | 41-column Excel with vertical merges |
| `routes/report/reports2/Flitch/flitch.routes.js` | 22 | Route registration (4th flitch route) |

---

## Architecture

### Row Granularity
Each data row = one leaf entity:
- `grouping_done_items_details` record (most common path)
- `slicing_done_items` record not yet in grouping
- The flitch itself when no further processing exists

Parent columns (Item Name / Flitch / Slicing Side + Dressing + Smoking) are **blanked on
non-first rows** and **merged vertically** in Excel.

### Comparison with Log Further Process Report

| Aspect | Log Report | Flitch Report |
|---|---|---|
| Root entity | `log_inventory_items_view_model` | `flitch_inventory_items_view_model` |
| Date filter | `log_invoice_details.inward_date` | `flitch_invoice_details.inward_date` |
| Tiers removed | — | Log Inward, CrossCut, Peeling |
| Columns | 56 | 41 |
| Per-subtotal grouping | per log_no | per flitch_code |
| Merge levels | Item / Log / CrossCut / Flitch / Side | Item / Flitch / Side |

### Data Flow

```
1. Flitches     ← flitch_inventory_items_view_model  (date range + filters)
   Issue For Slicing ← issued_for_slicings (flitch_inventory_item_id)
2. Slicing      ← slicing_done_items via `slicing_done_other_details.issue_for_slicing_id`
                 where `issued_for_slicing.flitch_inventory_item_id` is this flitch row
                 (per-item cmt or total_cmt ÷ batch size; merged by flitch id + log_no_code)
3. Dressing     ← dressing_done_items                (log_no_code IN allLeafCodes)
   Smoking      ← process_done_items_details         (log_no_code IN allLeafCodes)
   Grouping     ← grouping_done_items_details        (log_no_code IN allLeafCodes)
4. Tapping      ← tapping_done_items_details         (group_no IN groupNos)
                    + $lookup tapping_done_other_details (splicing_type)
                 Splicing “Issue Status” (col 28) ← `tapping_done_history` per `tapping_done_item_id`
                 (`issue_status` + `issued_for` → e.g. Pressing / ORDER), not grouping
   Pressing     ← pressing_done_details              (group_no IN groupNos)
5. CNC          ← cnc_done_details                   (pressing_details_id IN pressingIds)
   Colour       ← color_done_details                 (pressing_details_id IN pressingIds)
```

All queries within each wave run via `Promise.all` for parallel execution.

## Column Summary — 41 Columns

| Range | Section | Key Fields |
|---|---|---|
| 1 | Item Name | Merged vertically per species |
| 2–5 | Flitch Inward in(CMT) | log_no (original log number), flitch_cmt, Issue For Slicing (from issued_for_slicings), issue_status |
| 6–9 | Slicing Issue in(CMT) | log_no_code (side), process_cmt (slicing done cmt), balance_cmt (remaining cmt), no_of_leaves |
| 10–12 | Dressing | SUM(sqm), issue_status |
| 13–15 | Smoking/Dying | process_name, SUM(sqm), issue_status |
| 16–23 | Clipping/Grouping | group_no, no_of_sheets, sqm, available balances |
| 24–30 | Splicing | machine/hand sqm, sheets, balances; issue status from tapping→pressing history |
| 31–37 | Pressing | no_of_sheets, sqm, balances; issue status from `pressing_done_history` when issued to CNC/COLOR/etc. |
| 38–39 | CNC | product_type, no_of_sheets |
| 40 | COLOUR | no_of_sheets |
| 41 | Sales | placeholder |

---

## Filters Supported

| Filter | Request field | Match against |
|---|---|---|
| Date range | `startDate`, `endDate` | `flitch_invoice_details.inward_date` |
| Species | `filter.item_name` | `flitch_inventory_items_details.item_name` |
| Inward ID | `filter.inward_id` | `flitch_invoice_details.inward_sr_no` (Number) |
| Flitch number | `filter.flitch_no` | `flitch_inventory_items_details.flitch_code` |

The `inward_id` / `flitch_no` values are shown in **Row 3** of the report title area.

---

## Excel Output Details

| Property | Value |
|---|---|
| Sheet name | `Flitch Further Process` |
| Total columns | 41 |
| Header rows | 5 (title, date range, filter label, section groups, column names) |
| Frozen pane | Column 2, Row 5 |
| Numeric format | `#,##0.000` |
| Per-log total | Orange fill, `Total {log_no}` label (original log number) |
| Per-item total | Orange fill, `Total {item_name}` label |
| Grand total | Yellow fill, `Total` label |
| Empty vs zero | Stages not reached = blank cell (not `0`) |
| Difference columns | Any “received − available” or “issued − processed” style value is floored at **0** (`nonNegativeDiff` in the controller); see API doc “Non-negative difference fields”. |
| Vertical merges | Item Name, Flitch cols (2–5), Slicing Side + Dressing + Smoking cols |

---

## Known Placeholders

| Column | Reason blank |
|---|---|
| Grouping: Issue Status (col 21) | `issued_for` from latest `grouping_done_history` row per `grouping_done_item_id` (ORDER / STOCK / SAMPLE) |
| Sales (col 41) | Schema/model not yet identified |

---

## Route

```
POST /api/V1/reports2/flitch/download-excel-flitch-item-further-process-report
```

Registered in `topl_backend/routes/report/reports2/Flitch/flitch.routes.js` as the 4th route:
```javascript
router.post(
  '/download-excel-flitch-item-further-process-report',
  FlitchItemFurtherProcessReportExcel
);
```
