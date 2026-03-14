# Grouping Stock Register Group Wise — Implementation Plan

## Overview

Add a new **Grouping Stock Register Group Wise** API to the existing `Grouping` folder. This is the fourth and most consolidated Grouping stock register, grouping by **(item_sub_category_name, thickness)** only — 2 group keys, 16 output columns (each quantity in Sheets and SQM). A **Total** row appears at the bottom.

---

## Objectives

1. Create the controller with a 2-key MongoDB aggregation pipeline (sheets + SQM).
2. Create the Excel generator for the 16-column layout with two-level (Sheets/SQM) header.
3. Register the route in the existing `grouping.routes.js`.
4. Create API reference and plan documentation.

---

## File Structure

```
NEW:
  controllers/reports2/Grouping/Stock_Register/groupingStockRegisterGroupWise.js
  config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegisterGroupWise.js
  docs/reports2/Grouping/Stock_Register_Group_Wise/GROUPING_STOCK_REGISTER_GROUP_WISE_API.md
  docs/reports2/Grouping/Stock_Register_Group_Wise/GROUPING_STOCK_REGISTER_GROUP_WISE_PLAN.md

MODIFIED:
  routes/report/reports2/Grouping/grouping.routes.js  (add 4th route)
```

---

## Endpoint

```
POST /report/download-excel-grouping-stock-register-group-wise
```

Request body:
```json
{ "startDate": "2025-07-01", "endDate": "2026-02-12" }
```

---

## Report Layout

**Title:** `Grouping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY`

**16 columns, two-level header:** Row 1 (super-header): Item Group Name | Thickness | Opening Balance (merged 2 cols) | Grouping Done (merged) | Issue for tapping (merged) | Issue for Challan (merged) | Issue Sales (merged) | Damage (merged) | Closing Balance (merged). Row 2 (sub-header): cols 1–2 blank; cols 3–16 = "Sheets" and "SQM" repeated for each quantity.

**Column mapping:** 1–2 = Item Group Name, Thickness; 3–4 = Opening Balance (Sheets, SQM); 5–6 = Grouping Done (Sheets, SQM); 7–8 = Issue for tapping (Sheets, SQM); 9–10 = Issue for Challan (Sheets, SQM); 11–12 = Issue Sales (Sheets, SQM); 13–14 = Damage (Sheets, SQM); 15–16 = Closing Balance (Sheets, SQM).

**vs. thickness-wise:** "Sales Item Name" column removed.

**Total row** — gray fill, bold.

---

## Aggregation Pipeline

### Stage 1 — `$match`
Filter `grouping_done_details` by `grouping_done_date` in `[startDate, endDate]`.

### Stage 2 — `$lookup` + `$unwind`
Join `grouping_done_items_details` via `grouping_done_other_details_id`.

### Stage 3 — `$lookup`
Join `grouping_done_history` via `grouping_done_item_id`.

### Stage 4 — `$addFields`
Compute per-item issue totals (sheets + SQM) using `$filter` + `$sum`:
- `item_issue_tapping`, `item_issue_tapping_sqm` — history with `issue_status = 'tapping'` (no_of_sheets, sqm)
- `item_issue_challan`, `item_issue_challan_sqm` — history with `issue_status = 'challan'`
- `item_issue_sales`, `item_issue_sales_sqm`   — history with `issue_status = 'order'`

### Stage 5 — `$group` (2-key)
```javascript
_id: {
  item_sub_category_name: '$items.item_sub_category_name',
  thickness: '$items.thickness',
}
```
Accumulate (sheets + SQM):
- `grouping_done`, `grouping_done_sqm` — `$sum: '$items.no_of_sheets'`, `$sum: '$items.sqm'`
- `current_available`, `current_available_sqm` — `$sum: '$items.available_details.no_of_sheets'`, `$sum: '$items.available_details.sqm'`
- `damage`, `damage_sqm` — `$cond(is_damaged, no_of_sheets, 0)`, `$cond(is_damaged, sqm, 0)`
- `issue_tapping`, `issue_tapping_sqm` — `$sum: '$item_issue_tapping'`, `$sum: '$item_issue_tapping_sqm'`
- `issue_challan`, `issue_challan_sqm` — `$sum: '$item_issue_challan'`, `$sum: '$item_issue_challan_sqm'`
- `issue_sales`, `issue_sales_sqm` — `$sum: '$item_issue_sales'`, `$sum: '$item_issue_sales_sqm'`

### Stage 6 — `$sort`
```javascript
{ '_id.item_sub_category_name': 1, '_id.thickness': 1 }
```

---

## Balance Formulas (JavaScript post-aggregation)

**Sheets:**
```
issued_in_period = issue_tapping + issue_challan + issue_sales
opening_balance  = current_available + issued_in_period − grouping_done
closing_balance  = opening_balance + grouping_done − issue_tapping − issue_challan − issue_sales − damage
```

**SQM:**
```
issued_in_period_sqm = issue_tapping_sqm + issue_challan_sqm + issue_sales_sqm
opening_balance_sqm  = current_available_sqm + issued_in_period_sqm − grouping_done_sqm
closing_balance_sqm  = opening_balance_sqm + grouping_done_sqm − issue_tapping_sqm − issue_challan_sqm − issue_sales_sqm − damage_sqm
```

Balances may be negative.

---

## Output

| Property  | Value                                                           |
|-----------|-----------------------------------------------------------------|
| Directory | `public/reports/Grouping/`                                      |
| Filename  | `grouping_stock_register_group_wise_{timestamp}.xlsx`           |

---

## Comparison of All 4 Grouping Stock Registers

| Register         | Cols | Group Keys                            |
|------------------|------|---------------------------------------|
| Date-wise        | 19   | group, name, date, log, thickness     |
| Thickness-wise   | 10   | group, name, thickness                |
| **Group-wise**   | **16**| **group, thickness**                  |

---

## Checklist

- [x] Controller created with 2-key `$group` aggregation
- [x] Excel generator created with 16-column layout, two-level (Sheets/SQM) header, and gray Total row
- [x] Route added to `grouping.routes.js`
- [x] API documentation created
- [x] Plan documentation created
