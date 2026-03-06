# Implementation Summary — Flitch Item Further Process Report

## Overview

Tracks every inward flitch through its downstream factory journey — from flitch receipt to the
final pressing / CNC / colour stage. Analogous to the Log Item Further Process Report but starts
from flitch inventory instead of log inventory, removing the CrossCut and Flitch tiers.

---

## Files

| File | Lines | Purpose |
|---|---|---|
| `controllers/reports2/Flitch/flitchItemFurtherProcess.js` | ~330 | Bulk-fetch, tree-build, row-flatten |
| `config/downloadExcel/reports2/Flitch/flitchItemFurtherProcess.js` | ~340 | 47-column Excel with vertical merges |
| `routes/report/reports2/Flitch/flitch.routes.js` | 22 | Route registration (4th flitch route) |

---

## Architecture

### Row Granularity
Each data row = one leaf entity:
- `grouping_done_items_details` record (most common path)
- `slicing_done_items` record not yet in grouping
- `peeling_done_items` record (peeling path)
- The flitch itself when no further processing exists

Parent columns (Item Name / Flitch / Slicing Side + Dressing + Smoking) are **blanked on
non-first rows** and **merged vertically** in Excel.

### Comparison with Log Further Process Report

| Aspect | Log Report | Flitch Report |
|---|---|---|
| Root entity | `log_inventory_items_view_model` | `flitch_inventory_items_view_model` |
| Date filter | `log_invoice_details.inward_date` | `flitch_invoice_details.inward_date` |
| Tiers removed | — | Log Inward, CrossCut |
| Columns | 56 | 47 |
| Per-subtotal grouping | per log_no | per flitch_code |
| Merge levels | Item / Log / CrossCut / Flitch / Side | Item / Flitch / Side |

### Data Flow

```
1. Flitches     ← flitch_inventory_items_view_model  (date range + filters)
2. Slicing      ← slicing_done_items                 (log_no IN flitchLogNos)
   Peeling      ← peeling_done_items                 (log_no IN flitchLogNos)
   [in-memory link via buildChildPattern(flitch_code)]
3. Dressing     ← dressing_done_items                (log_no_code IN allLeafCodes)
   Smoking      ← process_done_items_details         (log_no_code IN allLeafCodes)
   Grouping     ← grouping_done_items_details        (log_no_code IN allLeafCodes)
4. Tapping      ← tapping_done_items_details         (group_no IN groupNos)
                    + $lookup tapping_done_other_details (splicing_type)
   Pressing     ← pressing_done_details              (group_no IN groupNos)
5. CNC          ← cnc_done_details                   (pressing_details_id IN pressingIds)
   Colour       ← color_done_details                 (pressing_details_id IN pressingIds)
```

All queries within each wave run via `Promise.all` for parallel execution.

### Child Pattern Matching

Slicing sides and peeling items are linked to their parent flitch using:
```
^{escaped_flitch_code}[A-Z]+$
```
e.g. flitch `L0702A1` → matches `L0702A1A`, `L0702A1B` but NOT `L0702A10A`.

---

## Column Summary — 47 Columns

| Range | Section | Key Fields |
|---|---|---|
| 1 | Item Name | Merged vertically per species |
| 2–5 | Flitch Inward in(CMT) | flitch_code, flitch_cmt, issue_status |
| 6–9 | Slicing Issue in(CMT) | log_no_code (side), no_of_leaves |
| 10–13 | Peeling | output_type, no_of_leaves |
| 14–16 | Dressing | SUM(sqm), issue_status |
| 17–19 | Smoking/Dying | process_name, SUM(sqm), issue_status |
| 20–27 | Clipping/Grouping | group_no, no_of_sheets, sqm, available balances |
| 28–34 | Splicing | machine/hand sqm, sheets, available balances |
| 35–41 | Pressing | no_of_sheets, sqm, available balances, issued_for |
| 42–43 | CNC | product_type, no_of_sheets |
| 44 | COLOUR | no_of_sheets |
| 45 | Sales | placeholder |
| 46 | Job Work Challan | placeholder |
| 47 | Adv Work Challan | placeholder |

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
| Total columns | 47 |
| Header rows | 5 (title, date range, filter label, section groups, column names) |
| Frozen pane | Column 2, Row 5 |
| Numeric format | `#,##0.000` |
| Per-flitch total | Orange fill, `Total {flitch_no}` label |
| Per-item total | Orange fill, `Total {item_name}` label |
| Grand total | Yellow fill, `Total` label |
| Empty vs zero | Stages not reached = blank cell (not `0`) |
| Vertical merges | Item Name, Flitch cols (2–5), Slicing Side + Dressing + Smoking cols |

---

## Known Placeholders

| Column | Reason blank |
|---|---|
| Slicing: Process Cmt (col 7) | No CMT-per-side field in `slicing_done_items` schema |
| Slicing: Balance Cmt (col 8) | Same — no per-side CMT tracking |
| Peeling: Balance Rostroller (col 11) | No roller-balance field in `peeling_done_items` schema |
| Grouping: Issue Status (col 25) | Not tracked in `grouping_done_items_details` schema |
| Sales (col 45) | Schema/model not yet identified |
| Job Work Challan (col 46) | Schema/model not yet identified |
| Adv Work Challan (col 47) | Schema/model not yet identified |

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
