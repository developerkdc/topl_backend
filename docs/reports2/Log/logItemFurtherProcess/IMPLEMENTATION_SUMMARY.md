# Implementation Summary — Inward Log Item Further Process Report

## Overview

Tracks every inward log through its complete factory journey — from log receipt to the final
pressing / CNC / colour stage. The report is hierarchical: one row per leaf-level entity
(grouping item, peeling item, or unprocessed slicing side), with parent columns merged
vertically in Excel.

---

## Files

| File | Lines | Purpose |
|---|---|---|
| `controllers/reports2/Log/logItemFurtherProcess.js` | ~825 | Bulk-fetch, tree-build, row-flatten |
| `config/downloadExcel/reports2/Log/logItemFurtherProcess.js` | ~610 | 56-column Excel with vertical merges |
| `routes/report/reports2/Log/log.routes.js` | 22 | Route registration (unchanged) |

---

## Architecture

### Row Granularity
Each data row = **one leaf entity**:
- `grouping_done_items_details` record (most common path)
- `slicing_done_items` record not yet in grouping
- `peeling_done_items` record (peeling path)
- The log itself when no further processing exists

Parent columns (Item Name / Log / CrossCut / Flitch / Slicing Side / Dressing / Smoking)
are **blanked on non-first rows** and **merged vertically** in the Excel output.

### Data Flow (Bulk Queries)

```
1. Logs          ← log_inventory_items_view_model  (date range + filters)
2. CrossCuts     ← crosscutting_done               (log_no IN logNos)
3. Flitches      ← flitchings                      (log_no IN logNos)
4. Slicing sides ← slicing_done_items              (log_no IN logNos)
5. Peeling items ← peeling_done_items              (log_no IN logNos)
6. Dressing      ← dressing_done_items             (log_no_code IN allLeafCodes)
7. Smoking/Dying ← process_done_items_details      (log_no_code IN allLeafCodes)
8. Grouping      ← grouping_done_items_details     (log_no_code IN allLeafCodes)
9. Tapping       ← tapping_done_items_details      (group_no IN groupNos)
                    + $lookup tapping_done_other_details (splicing_type)
10. Pressing     ← pressing_done_details           (group_no IN groupNos)
11. CNC          ← cnc_done_details                (pressing_details_id IN pressingIds)
12. Colour       ← color_done_details              (pressing_details_id IN pressingIds)
```

All queries within each tier run via `Promise.all` for parallel execution.

### Key Linking Fields

| From | To | Field |
|---|---|---|
| Log | CrossCut | `crosscutting_done.log_no = log.log_no` |
| CrossCut | Flitch | `flitchings.crosscut_done_id = crosscut._id` |
| Flitch | Slicing side | `slicing.log_no_code` matches regex `^{flitch_code}[A-Z]+$` |
| Flitch | Peeling item | `peeling.log_no_code` matches same regex |
| Slicing/Peeling | Dressing | `dressing_done_items.log_no_code = side.log_no_code` |
| Slicing/Peeling | Smoking | `process_done_items_details.log_no_code = side.log_no_code` |
| Slicing/Peeling | Grouping | `grouping_done_items_details.log_no_code = side.log_no_code` |
| Grouping | Tapping | `tapping_done_items_details.group_no = grouping.group_no` |
| Grouping | Pressing | `pressing_done_details.group_no = grouping.group_no` |
| Pressing | CNC | `cnc_done_details.pressing_details_id = pressing._id` |
| Pressing | Colour | `color_done_details.pressing_details_id = pressing._id` |

### Child Pattern Matching

Slicing sides and peeling items are found using a compiled regex:
```
^{escaped_parent_code}[A-Z]+$
```
e.g. flitch `L0702A1` → matches `L0702A1A`, `L0702A1B` but NOT `L0702A10A`
(digit after code means different parent level).

---

## Supported Processing Paths

| Path | Condition |
|---|---|
| Log → CrossCut → Flitch → Slicing → ... | Standard veneer path |
| Log → CrossCut → Peeling | `crosscut.issue_status = 'peeling'` |
| Log → Flitch → Slicing → ... | No crosscut recorded |
| Log → Peeling | No crosscut or flitch recorded |
| Flitch → Slicing + Peeling | `flitch.issue_status = 'slicing_peeling'` |

For any stage not reached, the downstream columns are left **empty** (not zero).

---

## Column Summary — 56 Columns

| Range | Section | Key Fields |
|---|---|---|
| 1 | Item Name | Merged vertically per species |
| 2–6 | Inward in(CMT) | log_no, indian_cmt, physical_cmt, issue_status |
| 7–10 | Cross Cut Issue in(CMT) | log_no_code, crosscut_cmt, issue_status |
| 11–14 | Flitch Issue in(CMT) | flitch_code, flitch_cmt, issue_status |
| 15–18 | Slicing Issue in(CMT) | log_no_code (side), no_of_leaves |
| 19–22 | Peeling | output_type, no_of_leaves |
| 23–25 | Dressing | SUM(sqm), issue_status |
| 26–28 | Smoking/Dying | process_name, SUM(sqm), issue_status |
| 29–36 | Clipping/Grouping | group_no, no_of_sheets, sqm, available balances |
| 37–43 | Splicing | machine/hand sqm, sheets, available balances |
| 44–50 | Pressing | no_of_sheets, sqm, available balances, issued_for |
| 51–52 | CNC | product_type, no_of_sheets |
| 53 | COLOUR | no_of_sheets |
| 54 | Sales | placeholder |
| 55 | Job Work Challan | placeholder |
| 56 | Adv Work Challan | placeholder |

---

## Filters Supported

| Filter | Request field | Match against |
|---|---|---|
| Date range | `startDate`, `endDate` | `log_invoice_details.inward_date` |
| Species | `filter.item_name` | `log_inventory_items_details.item_name` |
| Inward ID | `filter.inward_id` | `log_invoice_details.inward_sr_no` (Number) |
| Log number | `filter.log_no` | `log_inventory_items_details.log_no` |

The `inward_id` / `log_no` values are shown in **Row 2** of the report title area.

---

## Excel Output Details

| Property | Value |
|---|---|
| Sheet name | `Log Further Process` |
| Total columns | 56 |
| Header rows | 5 (title, date range, filter label, section groups, column names) |
| Frozen pane | Column 2, Row 5 |
| Numeric format | `#,##0.000` |
| Per-log total | Orange fill, `Total {log_no}` label |
| Per-item total | Orange fill, `Total {item_name}` label |
| Grand total | Yellow fill, `Total` label |
| Empty vs zero | Stages not reached = blank cell (not `0`) |
| Vertical merges | Item Name, Log cols, CrossCut cols, Flitch cols, Slicing side + Dressing + Smoking cols |

---

## Bugs Fixed vs Previous Version

| Stage | Old (broken) | Fixed |
|---|---|---|
| Slicing quantity | `$sum: '$natural_cmt'` (field doesn't exist) | `no_of_leaves` |
| Dressing match | `log_no_code: logNo` (used log_no value) | `log_no_code` of each slicing side |
| Dressing sum | `$sum: '$natural_sqm'` | `$sum: '$sqm'` |
| Smoking match | `log_no: logNo` | `log_no_code` |
| Smoking sum | `$sum: '$natural_sqm'` | `$sum: '$sqm'` |
| Tapping match | `log_no: logNo` | `log_no_code` |
| Tapping sum | `$sum: '$natural_sqm'` | `$sum: '$sqm'` |
| Pressing match | `log_no: logNo` (field doesn't exist on pressing schema) | Via `group_no` from grouping |
| Missing stages | Grouping, CNC, Colour not included | All 3 now included |
| Architecture | One flat row per log (summary) | One row per leaf entity (hierarchical) |
| Query strategy | N+1 queries (one set per log) | Bulk `$in` queries for all logs at once |

---

## Known Placeholders

| Column | Reason blank |
|---|---|
| Slicing: Process Cmt (col 16) | No CMT-per-side field in `slicing_done_items` schema |
| Slicing: Balance Cmt (col 17) | Same — no per-side CMT tracking |
| Peeling: Balance Rostroller (col 20) | No roller-balance field in `peeling_done_items` schema |
| Grouping: Issue Status (col 34) | Not tracked in `grouping_done_items_details` schema |
| Sales (col 54) | Schema/model not yet identified |
| Job Work Challan (col 55) | Schema/model not yet identified |
| Adv Work Challan (col 56) | Schema/model not yet identified |

---

## Route

```
POST /api/V1/reports2/log/download-excel-log-item-further-process-report
```

Registered in `topl_backend/routes/report/reports2/Log/log.routes.js`:
```javascript
router.post(
  '/download-excel-log-item-further-process-report',
  LogItemFurtherProcessReportExcel
);
```
