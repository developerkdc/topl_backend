# Tapping OR Clipping Stock Register API

## Overview

The Tapping OR Clipping Stock Register API generates an Excel report that shows clipping (tapping) stock movements by **Item Group Name** and **Item Name** over a date range. The report includes Opening Balance, Received Sq. Mtr., Issue Sq. Mtr., Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), and Closing Balance, with a **Total** row at the bottom. Negative values are shown in parentheses.

Data is sourced from `tapping_done_items_details`, `tapping_done_other_details` (for received by tapping date), `tapping_done_history` (for issue to pressing and issue-for breakdown by splicing_type), and `issue_for_tapping_wastage` joined to `issue_for_tappings` (for Damaged).

## Endpoint

```
POST /api/V1/report/download-excel-tapping-or-clipping-stock-register
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
  "message": "Tapping/Clipping stock register generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/TappingORClipping/Clipping-Stock-Register-1738234567890.xlsx"
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
  "message": "No tapping/clipping data found for the selected period"
}
```

or when all rows are filtered out:

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No tapping/clipping stock data found for the selected period"
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

- We take **distinct (item_sub_category_name, item_name)** from the collection **tapping_done_items_details** (optionally filtered by `filter.item_name` and `filter.item_group_name` → `item_sub_category_name`).
- There is **exactly one report row per** such pair. If an item has no activity in the period, it still appears if it exists in tapping_done_items_details, unless it is dropped in step 6 below.

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **tapping_done_items_details** | Clipping items (receipt when tapping done; current available from available_details.sqm) | `tapping_done_other_details_id`, `item_name`, `item_sub_category_name`, `sqm`, `available_details.sqm` |
| **tapping_done_other_details** | Session header; provides **tapping_date** and **splicing_type** for "received in period" and issue-for breakdown | `_id`, `tapping_date`, `splicing_type` |
| **tapping_done_history** | Items issued to pressing in period; provides issue total and (via join) Hand Splicing / Splicing by splicing_type | `item_name`, `item_sub_category_name`, `sqm`, `tapping_done_item_id`, `createdAt` |
| **issue_for_tapping_wastage** | Wastage/damaged at tapping; linked to issue_for_tappings for item | `issue_for_tapping_item_id`, `sqm`, `createdAt` |
| **issue_for_tappings** | Item details for wastage rows (item_sub_category_name, item_name) | `_id`, `item_name`, `item_sub_category_name` |

- **Join (received)**: `tapping_done_items_details.tapping_done_other_details_id` → `tapping_done_other_details._id` (to get `tapping_date`).
- **Join (issue-for)**: `tapping_done_history.tapping_done_item_id` → `tapping_done_items_details._id` → `tapping_done_other_details_id` → `tapping_done_other_details._id` (to get `splicing_type`).
- **Join (damaged)**: `issue_for_tapping_wastage.issue_for_tapping_item_id` → `issue_for_tappings._id` (to get item for filtering).

### 4. Per-row aggregates (for each item_sub_category_name + item_name)

All of the following are **sums of `sqm`** (or 0 if no rows), scoped to that pair.

| Quantity | Collection(s) | Filter | Meaning |
|----------|---------------|--------|---------|
| **Current available** | tapping_done_items_details | Match item | Sum of `available_details.sqm` (stock still in tapping). |
| **Received** | tapping_done_items_details + tapping_done_other_details | Join; then `tapping_date` ∈ [start, end] | Clipping production **received** in the report period (by tapping date). |
| **Issue total** | tapping_done_history | Match item; `createdAt` ∈ [start, end] | SQM issued to pressing in the period. |
| **Hand Splicing** | tapping_done_history + tapping_done_items_details + tapping_done_other_details | Same as issue total; then `splicing_type === 'HAND SPLICING'` | Issue in period where batch was hand splicing. |
| **Splicing** | Same join | Same as issue total; then `splicing_type` ∈ ['MACHINE SPLICING', 'SPLICING'] | Issue in period where batch was machine splicing. |
| **Damaged** | issue_for_tapping_wastage + issue_for_tappings | Wastage `createdAt` ∈ [start, end]; match item via lookup | Wastage SQM in the period. |
| **Clipped Packing** | — | No schema | **0**. |
| **Cal Ply Production** | — | No schema | **0**. |

### 5. Formulas (calculations)

For each (item_sub_category_name, item_name):

```
Opening Balance = Current available  +  Issued in period  −  Received

Closing Balance = Opening Balance  +  Received  −  Issue total

where:
  Issued in period = Issue total   (from tapping_done_history in period)
```

So:

- **Opening** = what would have been "current" at start of period if we reverse the period's receipts and add back the period's issues.
- **Closing** = opening + received − issue total.
- Neither is floored at 0 (negative balances are allowed and shown in parentheses in Excel).

### 6. Which rows are returned in the Excel

- After computing the above for every distinct (item_sub_category_name, item_name), we **drop rows where every numeric column is 0** (opening_balance, received, issue_total, hand_splicing, splicing, clipped_packing, damaged, cal_ply_production, closing_balance).
- If no rows remain, the API responds with **404** and message `"No tapping/clipping stock data found for the selected period"`.
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a **URL** to the Excel file (e.g. `http://localhost:5000/public/upload/reports/reports2/TappingORClipping/Clipping-Stock-Register-<timestamp>.xlsx`). The client can GET this URL to download the file.
- The Excel contains one sheet: title row with date range, two header rows (main headers and sub-headers for Issue For), one data row per (Item Group Name, Item Name) that passed the non-zero filter, then one **Total** row (sum of each numeric column). Negative numbers use format `0.00;(0.00)` (parentheses).
- **400**: Invalid request (missing/invalid dates or start > end).
- **404**: No distinct (item_sub_category_name, item_name) in tapping_done_items_details, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Clipping Item Stock Register between 01/03/2025 and 31/03/2025`

### Column Headers (two rows)

**Row 1:** Item Group Name | Item Name | Opening | Received | Issue | Issue For (in Sq. Mtr.) [merged over 5 cols] | Closing  

**Row 2:** (empty) | (empty) | Balance | Sq. Mtr. | Sq. Mtr. | Hand Splicing | Splicing | Clipped Packing | Damaged | Cal Ply Production | Balance

| Column | Description |
|--------|-------------|
| Item Group Name | Item sub-category name |
| Item Name | Item name |
| Opening Balance | Stock at start of period (SQM) |
| Received Sq. Mtr. | Clipping production received in period (SQM) |
| Issue Sq. Mtr. | Issued to pressing in period (SQM) |
| Hand Splicing | Issue in period where splicing_type = HAND SPLICING (SQM) |
| Splicing | Issue in period where splicing_type = MACHINE SPLICING or SPLICING (SQM) |
| Clipped Packing | Currently 0 (no schema) |
| Damaged | Wastage from issue_for_tapping_wastage in period (SQM) |
| Cal Ply Production | Currently 0 (no schema) |
| Closing Balance | Opening + Received − Issue total (SQM) |

### Data Rows

- One row per distinct **(Item Group Name, Item Name)** from tapping done items.
- Sorted by Item Group Name, then Item Name.
- Numeric columns use two decimal places; negatives shown in parentheses.

### Total Row

- Last row is **Total**, with sums of all numeric columns (Opening Balance through Closing Balance).

## Implementation References

- **Controller**: `topl_backend/controllers/reports2/TappingORClipping/tappingORClippingStockRegister.js`
- **Excel config**: `topl_backend/config/downloadExcel/reports2/TappingORClipping/tappingORClippingStockRegister.js`
- **Routes**: `topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js`
- **Plan** (design and implementation steps): [TAPPING_OR_CLIPPING_STOCK_REGISTER_PLAN.md](./TAPPING_OR_CLIPPING_STOCK_REGISTER_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the data is brought together](#how-the-data-is-brought-together)** above.
