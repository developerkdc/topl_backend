# Tapping Stock Register Thickness Wise — Implementation Plan

## Overview

A new "Splicing Item Stock Register sales name - thickness wise" API added to the existing `Tapping/Stock_Register` folder. This report extends the sales-name-wise stock register by grouping at the log level, adding **Thickness**, **Log No**, and **Date** columns.

---

## Feasibility

**HIGH** — All required fields exist in schemas. Logic mirrors the "sales name wise" controller with a more granular grouping key (adds `thickness` and `log_no_code`). Follows the existing Tapping folder pattern.

---

## File Structure

### New Files

```
controllers/reports2/Tapping/Stock_Register/
    tappingStockRegisterThicknessWise.js        ← Controller

config/downloadExcel/reports2/Tapping/Stock_Register/
    tappingStockRegisterThicknessWise.js        ← Excel generator

docs/reports2/Tapping/Stock_Register/Thickness_Wise/
    TAPPING_STOCK_REGISTER_THICKNESS_WISE_API.md
    TAPPING_STOCK_REGISTER_THICKNESS_WISE_PLAN.md
```

### Modified Files

```
routes/report/reports2/Tapping/tapping.routes.js    ← 2 lines added (import + router.post)
```

---

## Endpoint

```
POST /api/V1/report/download-excel-tapping-stock-register-thickness-wise
```

Request body:

```json
{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }
```

---

## Controller Logic

### Step 1 — Distinct Tuples

Aggregate `tapping_done_items_details` (joined to `tapping_done_other_details`) to get distinct `(item_sub_category_name, item_name, thickness, log_no_code)` plus `min(tapping_date)`.

### Step 2 — Per-Tuple: 5 Parallel Aggregations

For each tuple, run `Promise.all` with:

1. **currentAvailable** — sum `available_details.sqm` for this (item, thickness, log) from `tapping_done_items_details`
2. **tappingHand** — sum `sqm` in date range where `splicing_type IN ['HAND', 'HAND SPLICING']`
3. **tappingMachine** — sum `sqm` in date range where `splicing_type IN ['MACHINE', 'MACHINE SPLICING']`
4. **issuePressing** — sum `sqm` from `tapping_done_history` in date range, matched by (item, thickness, log)
5. **processWaste** — sum `sqm` from `issue_for_tapping_wastage` joined to `issue_for_tappings`, matched by item

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
Report -1
Splicing Item Stock Register sales name - thickness wise - DD/MM/YYYY and DD/MM/YYYY
```

### Headers (2-row, 12 columns)

| Col  | Row 1 label     | Row 2 label    |
| ---- | --------------- | -------------- |
| 1    | Item Name       | (merged ↕)     |
| 2    | Sales Item Name | (merged ↕)     |
| 3    | Thickness       | (merged ↕)     |
| 4    | Log No          | (merged ↕)     |
| 5    | Date            | (merged ↕)     |
| 6    | Opening Balance | (merged ↕)     |
| 7–8  | Tapping →       | Hand / Machine |
| 9    | Issue           | Pressing       |
| 10   | Process Waste   | (merged ↕)     |
| 11   | Sales           | (merged ↕)     |
| 12   | Closing Balance | (merged ↕)     |

---

## Todos

- [x] `tw-controller` — Create `tappingStockRegisterThicknessWise.js` controller
- [x] `tw-excel`      — Create `tappingStockRegisterThicknessWise.js` Excel generator
- [x] `tw-routes`     — Add route to `tapping.routes.js`
- [x] `tw-docs`       — Create API and Plan documentation
