# Smoking&Dying Stock Register API

## Overview

The Smoking&Dying Stock Register API generates an Excel report that shows smoking/dyeing stock movements by **Item Group Name** and **Item Name** over a date range. The report includes Opening Balance, Direct Dye, DR Dyed, Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, and Closing Balance, with a **Total** row at the bottom.

Data is sourced from `process_done_items_details` and `process_done_details` (smoking/dying done sessions). Receipt in period is split by `process_name` into **Direct Dye** and **DR Dyed** columns.

## Endpoint

```
POST /api/V1/report/download-excel-smoking-dying-stock-register
```

## Request Body

### Required Parameters

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

### Optional Parameters

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filter": {
    "item_name": "ASH",
    "item_group_name": "ASH"
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by item name |
| `filter.item_group_name` | String | No | Filter by item group (maps to item sub-category name) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Smoking & dying stock register generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Smoking&Dying/Smoking-Dying-Stock-Register-1738234567890.xlsx"
}
```

### Error Responses

#### 400 Bad Request - Missing Parameters

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request - Invalid Date Format

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request - Invalid Date Range

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found - No Data

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No smoking & dying data found for the selected period"
}
```

or when all rows are filtered out:

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No smoking & dying stock data found for the selected period"
}
```

---

## How the data is brought together

A new developer should be able to understand the report from this section without reading the controller code.

### 1. Report period

- **start**: `new Date(startDate)` at 00:00:00.000  
- **end**: `new Date(endDate)` at 23:59:59.999  
- All “in period” logic uses this inclusive range.

### 2. Which rows appear in the report

- We take **distinct (item_sub_category_name, item_name)** from the collection **process_done_items_details** (optionally filtered by `filter.item_name` and `filter.item_group_name` → `item_sub_category_name`).
- There is **exactly one report row per** such pair. If an item has no activity in the period, it still appears if it exists in process_done_items_details, unless it is dropped in step 6 below.

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **process_done_items_details** | Line items (receipt when done; issues when status/updatedAt set) | `process_done_id`, `item_name`, `item_sub_category_name`, `sqm`, `process_name`, `issue_status`, `updatedAt` |
| **process_done_details** | Session header; provides **process_done_date** and **process_name** for “receipt in period” and Direct Dye / DR Dyed split | `_id`, `process_done_date`, `process_name` |

- **Join**: `process_done_items_details.process_done_id` → `process_done_details._id` (used to get `process_done_date` and `process_name` for receipt in period).

### 4. Per-row aggregates (for each item_sub_category_name + item_name)

All of the following are **sums of `sqm`** (or 0 if no rows), scoped to that pair.

| Quantity | Collection(s) | Filter | Meaning |
|----------|---------------|--------|---------|
| **Current available** | process_done_items_details | `issue_status` is `null` or not present | Stock still “on hand” (not yet issued to grouping). |
| **Receipt in period (Direct Dye)** | process_done_items_details + process_done_details | Join by `process_done_id` → `_id`; then `process_done_date` ∈ [start, end]; then `process_name` maps to “Direct Dye” (e.g. DIRECT DYE, DIRECT DYEING) | SQM received in period via Direct Dye process. |
| **Receipt in period (DR Dyed)** | process_done_items_details + process_done_details | Same join and date filter; then `process_name` maps to “DR Dyed” (e.g. DR DYED, DR DYE) | SQM received in period via DR Dyed process. |
| **Issue Sq Mtr** | process_done_items_details | `issue_status === 'grouping'` and `updatedAt` ∈ [start, end] | SQM issued for grouping in the period. |

- **Receipt in period** (internal) = Direct Dye + DR Dyed (used in opening balance formula).
- **Issued in period** (internal) = Issue Sq Mtr (used in opening balance formula).

Placeholder columns (no schema yet): **Clipping**, **Mixmatch**, **Edgebanding**, **Lipping**, **Sale** → all **0**.

### 5. Formulas (calculations)

For each (item_sub_category_name, item_name):

```
Opening Balance = max(0,  Current available  +  Issued in period  −  Receipt in period  )

Closing Balance = max(0,  Opening Balance  +  Direct Dye  +  DR Dyed  −  Total issues  )

where:
  Receipt in period = Direct Dye + DR Dyed   (from process_done_items_details + process_done_details, in period)
  Issued in period  = Issue Sq Mtr            (from process_done_items_details only, in period)
  Total issues      = Issue Sq Mtr + Clipping + Mixmatch + Edgebanding + Lipping + Sale
```

So:

- **Opening** = what would have been “current” at start of period if we reverse the period’s receipts and add back the period’s issues.  
- **Closing** = opening + Direct Dye + DR Dyed − all outflows (Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale).  
- Both are floored at 0.

### 6. Which rows are returned in the Excel

- After computing the above for every distinct (item_sub_category_name, item_name), we **drop rows where every numeric column is 0** (opening_balance, direct_dye, dr_dyed, issue_sq_mtr, clipping, mixmatch, edgebanding, lipping, sale, closing_balance).  
- If no rows remain, the API responds with **404** and message `"No smoking & dying stock data found for the selected period"`.  
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a **URL** to the Excel file (e.g. `http://localhost:5000/public/upload/reports/reports2/Smoking&Dying/Smoking-Dying-Stock-Register-<timestamp>.xlsx`). The client can GET this URL to download the file.  
- The Excel contains one sheet: title row with date range, one header row (column names), one data row per (Item Group Name, Item Name) that passed the non-zero filter, then one **Total** row (sum of each numeric column).  
- **400**: Invalid request (missing/invalid dates or start &gt; end).  
- **404**: No distinct (item_sub_category_name, item_name) in process_done_items_details, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Smoking&Dying Stock Register - DD/MM/YYYY-DD/MM/YYYY
```

Example: `Smoking&Dying Stock Register - 01/03/2025-31/03/2025`

### Column Headers

| Column | Description |
|--------|-------------|
| Item Group Name | Item sub-category name |
| Item Name | Item name |
| Opening Balance | Stock at start of period (SQM) |
| Direct Dye | Receipt in period via Direct Dye process (SQM) |
| DR Dyed | Receipt in period via DR Dyed process (SQM) |
| Issue Sq Mtr | Issued for grouping in period (SQM) |
| Clipping | Clipping in period (currently 0) |
| Mixmatch | Mixmatch in period (currently 0) |
| Edgebanding | Edgebanding in period (currently 0) |
| Lipping | Lipping in period (currently 0) |
| Sale | Sale in period (currently 0) |
| Closing Balance | Opening + Direct Dye + DR Dyed − all issue columns (SQM) |

### Data Rows

- One row per distinct **(Item Group Name, Item Name)** from process done items details.
- Sorted by Item Group Name, then Item Name.
- Numeric columns use two decimal places.

### Total Row

- Last row is **Total**, with sums of all numeric columns (Opening Balance through Closing Balance).

## Implementation References

- **Controller**: `topl_backend/controllers/reports2/Smoking&Dying/smokingDyingStockRegister.js`
- **Excel config**: `topl_backend/config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js`
- **Routes**: `topl_backend/routes/report/reports2/Smoking&Dying/smoking_dying.routes.js`
- **Plan** (design and implementation steps): [SMOKING_DYING_STOCK_REGISTER_PLAN.md](./SMOKING_DYING_STOCK_REGISTER_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the data is brought together](#how-the-data-is-brought-together)** above.
