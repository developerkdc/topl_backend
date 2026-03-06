# Grouping/Splicing Stock Register API

## Overview

The Grouping/Splicing Stock Register API (Splicing Item Stock Register) generates an Excel report that shows grouping/splicing stock movements by **Item Group Name** and **Item Name** over a date range. The report includes Opening Balance, Purchase Sq. Mtr, **Received SqMtr** (Hand Splice, Machine Splice), **Issue Sqmtr** (Pressing, Demage, Sale, Issue For Cal Ply Pressing Sq Mtr), Process Waste, and Closing Balance, with a **Total** row at the bottom. Balances may be negative.

Data is sourced from `grouping_done_items_details`, `grouping_done_details` (for receipt by grouping date), and `grouping_done_history` (for issue columns by status).

## Endpoint

```
POST /api/V1/report/download-excel-grouping-splicing-stock-register
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
    "item_name": "AFRICAN CHERRY",
    "item_group_name": "AFRICAN CHERRY"
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
  "message": "Grouping/splicing stock register generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Grouping_Splicing/Grouping-Splicing-Stock-Register-1738234567890.xlsx"
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
  "message": "No grouping/splicing data found for the selected period"
}
```

or when all rows are filtered out:

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No grouping/splicing stock data found for the selected period"
}
```

---

## How the data is brought together

A new developer should be able to understand the report from this section without reading the controller code.

### 1. Report period

- **start**: `new Date(startDate)` at 00:00:00.000  
- **end**: `new Date(endDate)` at 23:59:59.999  
- All "in period" logic uses this inclusive range.

### 2. Which rows appear in the report

- We take **distinct (item_sub_category_name, item_name)** from the collection **grouping_done_items_details** (optionally filtered by `filter.item_name` and `filter.item_group_name` → `item_sub_category_name`).
- There is **exactly one report row per** such pair. If an item has no activity in the period, it still appears if it exists in grouping_done_items_details, unless it is dropped in step 6 below.

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **grouping_done_items_details** | Grouping/splicing items (receipt when done; available stock; damage) | `grouping_done_other_details_id`, `item_name`, `item_sub_category_name`, `sqm`, `available_details.sqm`, `process_name`, `is_damaged`, `updatedAt` |
| **grouping_done_details** | Session header; provides **grouping_done_date** for "receipt in period" | `_id`, `grouping_done_date` |
| **grouping_done_history** | Issue records; drives Pressing, Sale, Issue For Cal Ply Pressing by **issue_status** | `item_name`, `item_sub_category_name`, `sqm`, `issue_status` (order, challan, tapping), `updatedAt` |

- **Join**: `grouping_done_items_details.grouping_done_other_details_id` → `grouping_done_details._id` (used to get `grouping_done_date` for receipt).

### 4. Per-row aggregates (for each item_sub_category_name + item_name)

All of the following are **sums of `sqm`** (or 0 if no rows), scoped to that pair.

| Quantity | Collection(s) | Filter | Meaning |
|----------|---------------|--------|---------|
| **Current available** | grouping_done_items_details | — | Sum of `available_details.sqm` (stock still on hand). |
| **Receipt (total)** | grouping_done_items_details + grouping_done_details | Join by `grouping_done_other_details_id` → `_id`; then `grouping_done_date` ∈ [start, end] | Grouping/splicing production **received** in the report period. |
| **Hand Splice** | Same as receipt | Same join/date; `process_name` matches `/HAND/i` | Receipt where process is hand splice. |
| **Machine Splice** | — | Computed | Receipt total − Hand Splice. |
| **Pressing** | grouping_done_history | `issue_status === 'order'` and `updatedAt` ∈ [start, end] | SQM issued for order (pressing) in the period. |
| **Sale** | grouping_done_history | `issue_status === 'challan'` and `updatedAt` ∈ [start, end] | SQM issued for challan/sale in the period. |
| **Issue For Cal Ply Pressing** | grouping_done_history | `issue_status === 'tapping'` and `updatedAt` ∈ [start, end] | SQM issued for tapping (cal ply pressing) in the period. |
| **Demage** | grouping_done_items_details | `is_damaged === true` and `updatedAt` ∈ [start, end] | SQM marked as damaged in the period. |

- **Issued in period** (internal) = Pressing + Sale + Issue For Cal Ply Pressing (used in opening balance formula).

Placeholder columns (no source yet): **Purchase**, **Process Waste** → both **0**.

### 5. Formulas (calculations)

For each (item_sub_category_name, item_name):

```
Opening Balance =  Current available  +  Issued in period  −  Receipt total
                   (not floored; may be negative)

Closing Balance =  Opening Balance  +  Purchase  +  (Hand Splice + Machine Splice)
                   −  (Pressing + Demage + Sale + Issue For Cal Ply Pressing)  −  Process Waste
```

So:

- **Opening** = what would have been "current" at start of period if we reverse the period's receipts and add back the period's issues.  
- **Closing** = opening + inflows (purchase + hand splice + machine splice) − all outflows (pressing, demage, sale, issue for cal ply pressing, process waste).  
- Neither is floored at 0; negative balances are allowed.

### 6. Which rows are returned in the Excel

- After computing the above for every distinct (item_sub_category_name, item_name), we **drop rows where every numeric column is 0** (opening_balance, purchase, hand_splice, machine_splice, pressing, demage, sale, issue_for_cal_ply_pressing, process_waste, closing_balance).  
- If no rows remain, the API responds with **404** and message `"No grouping/splicing stock data found for the selected period"`.  
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a **URL** to the Excel file (e.g. `http://localhost:5000/public/upload/reports/reports2/Grouping_Splicing/Grouping-Splicing-Stock-Register-<timestamp>.xlsx`). The client can GET this URL to download the file.  
- The Excel contains one sheet: title row with date range, two header rows (grouped headers: Received SqMtr with Hand Splice/Machine Splice, Issue Sqmtr with Pressing/Demage/Sale/Issue For Cal Ply Pressing Sq Mtr), one data row per (Item Group Name, Item Name) that passed the non-zero filter, then one **Total** row (sum of each numeric column).  
- **400**: Invalid request (missing/invalid dates or start > end).  
- **404**: No distinct (item_sub_category_name, item_name) in grouping_done_items_details, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Splicing Item Stock Register - DD/MM/YYYY and DD/MM/YYYY
```

Example: `Splicing Item Stock Register - 01/03/2025 and 31/03/2025`

### Column Headers

Two header rows: the first has main column titles with merged cells for **Received SqMtr** and **Issue Sqmtr**; the second has sub-headers under those groups.

| Column | Description |
|--------|-------------|
| Item Group Name | Item sub-category name |
| Item Name | Item name |
| Opening Balance | Stock at start of period (SQM); may be negative |
| Purchase Sq. Mtr | Purchase in period (currently 0) |
| **Received SqMtr** | *(grouped header)* |
| → Hand Splice | Receipt in period where process is hand splice (SQM) |
| → Machine Splice | Receipt in period where process is machine splice (SQM) |
| **Issue Sqmtr** | *(grouped header)* |
| → Pressing | Issued for order (pressing) in period (SQM) |
| → Demage | Marked as damaged in period (SQM) from grouping_done_items_details |
| → Sale | Issued for challan/sale in period (SQM) |
| → Issue For Cal Ply Pressing Sq Mtr | Issued for tapping in period (SQM) |
| Process Waste | Process waste in period (currently 0) |
| Closing Balance | Opening + Purchase + Received − all issue columns − Process Waste (SQM); may be negative |

### Data Rows

- One row per distinct **(Item Group Name, Item Name)** from grouping done items.
- Sorted by Item Group Name, then Item Name.
- Numeric columns use two decimal places.

### Total Row

- Last row is **Total**, with sums of all numeric columns (Opening Balance through Closing Balance).

## Implementation References

- **Controller**: `topl_backend/controllers/reports2/Grouping_Splicing/groupingSplicingStockRegister.js`
- **Excel config**: `topl_backend/config/downloadExcel/reports2/Grouping_Splicing/groupingSplicingStockRegister.js`
- **Routes**: `topl_backend/routes/report/reports2/Grouping_Splicing/grouping_splicing.routes.js`

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the data is brought together](#how-the-data-is-brought-together)** above.
