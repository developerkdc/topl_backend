# Grouping Stock Register Group Wise — Implementation Plan

## Overview

Add a new **Grouping Stock Register Group Wise** API to the existing `Grouping` folder. This is the fourth and most consolidated Grouping stock register, grouping by **(item_sub_category_name, thickness)** only — 2 group keys, 9 output columns.

---

## Objectives

1. Create the controller with a 2-key MongoDB aggregation pipeline.
2. Create the Excel generator for the 9-column layout.
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

**9 Columns:**

| # | Column Name        | Notes                                  |
|---|--------------------|----------------------------------------|
| 1 | Item Group Name    | `item_sub_category_name`               |
| 2 | Thickness          | numeric `0.00`                         |
| 3 | Opening Balance    | computed, `0.00`                       |
| 4 | Grouping Done      | sum of `no_of_sheets`, `0.00`          |
| 5 | Issue for tapping  | from history, `0.00`                   |
| 6 | Issue for Challan  | from history, `0.00`                   |
| 7 | Issue Sales        | from history, `0.00`                   |
| 8 | Damage             | `is_damaged` items, `0.00`             |
| 9 | Closing Balance    | computed, `0.00`                       |

**vs. thickness-wise:** "Sales Item Name" column removed.

**Total row** — yellow fill (`FFFFD700`), bold.

---

## Aggregation Pipeline

### Stage 1 — `$match`
Filter `grouping_done_details` by `grouping_done_date` in `[startDate, endDate]`.

### Stage 2 — `$lookup` + `$unwind`
Join `grouping_done_items_details` via `grouping_done_other_details_id`.

### Stage 3 — `$lookup`
Join `grouping_done_history` via `grouping_done_item_id`.

### Stage 4 — `$addFields`
Compute per-item issue totals using `$filter` + `$sum`:
- `item_issue_tapping` — history records with `issue_status = 'tapping'`
- `item_issue_challan` — history records with `issue_status = 'challan'`
- `item_issue_sales`   — history records with `issue_status = 'order'`

### Stage 5 — `$group` (2-key)
```javascript
_id: {
  item_sub_category_name: '$items.item_sub_category_name',
  thickness: '$items.thickness',
}
```
Accumulate:
- `grouping_done`    — `$sum: '$items.no_of_sheets'`
- `current_available` — `$sum: '$items.available_details.no_of_sheets'`
- `damage`          — `$sum: $cond(is_damaged, no_of_sheets, 0)`
- `issue_tapping`   — `$sum: '$item_issue_tapping'`
- `issue_challan`   — `$sum: '$item_issue_challan'`
- `issue_sales`     — `$sum: '$item_issue_sales'`

### Stage 6 — `$sort`
```javascript
{ '_id.item_sub_category_name': 1, '_id.thickness': 1 }
```

---

## Balance Formulas (JavaScript post-aggregation)

```
issued_in_period = issue_tapping + issue_challan + issue_sales
opening_balance  = current_available + issued_in_period − grouping_done
closing_balance  = opening_balance + grouping_done − issue_tapping − issue_challan − issue_sales − damage
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
| Date-wise        | 12   | group, name, date, log, thickness     |
| Thickness-wise   | 10   | group, name, thickness                |
| **Group-wise**   | **9**| **group, thickness**                  |

---

## Checklist

- [x] Controller created with 2-key `$group` aggregation
- [x] Excel generator created with 9-column layout and yellow Total row
- [x] Route added to `grouping.routes.js`
- [x] API documentation created
- [x] Plan documentation created
