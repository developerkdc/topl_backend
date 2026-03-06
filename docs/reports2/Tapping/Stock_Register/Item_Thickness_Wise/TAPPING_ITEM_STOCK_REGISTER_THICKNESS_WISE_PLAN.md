# Tapping Item Stock Register Thickness Wise (Report -2) — Implementation Plan

## Overview

A new "Splicing Item Stock Register thickness wise" (Report -2) API added to the existing `Tapping/Stock_Register` folder. This is a simplified variant of Report -1 that removes the "Sales Item Name" column and groups only by `(item_sub_category_name, thickness, log_no_code)`.

---

## Feasibility

**HIGH** — All data sources are identical to Report -1. The only differences are the group key (drops `item_name`), the Excel column count (11 vs 12), and the title labels.

---

## File Structure

### New Files

```
controllers/reports2/Tapping/Stock_Register/
    tappingItemStockRegisterThicknessWise.js        ← Controller

config/downloadExcel/reports2/Tapping/Stock_Register/
    tappingItemStockRegisterThicknessWise.js        ← Excel generator

docs/reports2/Tapping/Stock_Register/Item_Thickness_Wise/
    TAPPING_ITEM_STOCK_REGISTER_THICKNESS_WISE_API.md
    TAPPING_ITEM_STOCK_REGISTER_THICKNESS_WISE_PLAN.md
```

### Modified Files

```
routes/report/reports2/Tapping/tapping.routes.js    ← 2 lines added (import + router.post)
```

---

## Endpoint

```
POST /api/V1/report/download-excel-tapping-item-stock-register-thickness-wise
```

Request body:

```json
{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
```

---

## Controller Logic

### Step 1 — Distinct Tuples

Aggregate `tapping_done_items_details` (joined to `tapping_done_other_details`) to get distinct `(item_sub_category_name, thickness, log_no_code)` plus `min(tapping_date)`.

Group key (vs Report -1):
```javascript
$group: {
  _id: {
    item_sub_category_name: '$item_sub_category_name',
    // item_name REMOVED
    thickness: '$thickness',
    log_no_code: '$log_no_code',
  },
  tapping_date: { $min: '$session.tapping_date' },
}
```

### Step 2 — Per-Tuple: 5 Parallel Aggregations

Match filter (vs Report -1):
```javascript
const matchItem = {
  item_sub_category_name,
  thickness,
  log_no_code,
  // item_name REMOVED
};
```

All 5 aggregations identical to Report -1 otherwise:
1. **currentAvailable** — sum `available_details.sqm`
2. **tappingHand** — sum `sqm` in date range, `splicing_type IN ['HAND', 'HAND SPLICING']`
3. **tappingMachine** — sum `sqm` in date range, `splicing_type IN ['MACHINE', 'MACHINE SPLICING']`
4. **issuePressing** — sum `sqm` from `tapping_done_history` in date range
5. **processWaste** — sum `sqm` from `issue_for_tapping_wastage` joined to `issue_for_tappings`, matched by `item_sub_category_name`

### Step 3 — Calculations

```
tappingReceived   = tappingHand + tappingMachine
openingBalance    = currentAvailable + issuePressing − tappingReceived
closingBalance    = openingBalance + tappingReceived − issuePressing − processWaste − sales
sales             = 0  (placeholder)
```

### Step 4 — Filter

Exclude rows where all numeric values are 0.

---

## Excel Layout

### Titles

```
Report -2
Splicing Item Stock Register thickness wise - DD/MM/YYYY and DD/MM/YYYY
```

### Headers (2-row, 11 columns)

| Col  | Row 1 label     | Row 2 label    |
| ---- | --------------- | -------------- |
| 1    | Item Name       | (merged ↕)     |
| 2    | Thickness       | (merged ↕)     |
| 3    | Log No          | (merged ↕)     |
| 4    | Date            | (merged ↕)     |
| 5    | Opening Balance | (merged ↕)     |
| 6–7  | Tapping →       | Hand / Machine |
| 8    | Issue           | Pressing       |
| 9    | Process Waste   | (merged ↕)     |
| 10   | Sales           | (merged ↕)     |
| 11   | Closing Balance | (merged ↕)     |

---

## Todos

- [x] `tit-controller` — Create `tappingItemStockRegisterThicknessWise.js` controller
- [x] `tit-excel`      — Create `tappingItemStockRegisterThicknessWise.js` Excel generator
- [x] `tit-routes`     — Add route to `tapping.routes.js`
- [x] `tit-docs`       — Create API and Plan documentation
