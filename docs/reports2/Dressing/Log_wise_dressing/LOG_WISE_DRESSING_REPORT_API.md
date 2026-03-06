# Log Wise Dressing Report API Documentation

## Overview

The Log Wise Dressing Report API generates an Excel report **Dressing Stock Register By LogX** that shows one row per log (`log_no_code`) with opening/closing balances, receipt, issue, sale, and process columns for a specified date range. Rows are grouped by Item Group Name and Item Name, with a single **Total** row at the end.

**Concepts a developer must know:**

- **Receipt** = dressing output: when a bundle is “dressing done”, its `sqm` is added to stock. The date used is **dressing_date** from the session (`dressing_done_other_details`).
- **Issue** = when that same bundle is later issued (e.g. for grouping, order, or smoking_dying). The date used is **updatedAt** on `dressing_done_items` (when `issue_status` is set).
- **Opening balance** = stock for that log at the **start** of the report period (receipts before start − issues before start).
- **Closing balance** = stock at the **end** of the period (opening + receipt in period − issue in period).
- All quantities are in **SQM** (square metres).

## API Endpoint

**POST** `/api/V1/reports2/dressing/download-excel-log-wise-dressing-report`

## Request Body

```json
{
  "startDate": "2024-04-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "AFRICAN CHERRY",
    "item_sub_category_name": "MOABI"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by specific item name (uppercase) |
| `filter.item_sub_category_name` | String | No | Filter by item sub-category (Item Group) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log wise dressing report generated successfully",
  "result": "http://localhost:8765/public/upload/reports/reports2/Dressing/Dressing-Stock-Register-LogX_1738598745123.xlsx"
}
```

### Error Responses

#### 400 Bad Request - Missing Required Parameters

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
  "message": "No dressing data found for the selected period"
}
```

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "success": false,
  "message": "Failed to generate report"
}
```

## Report Structure

### Excel File Format

- **File Name**: `Dressing-Stock-Register-LogX_[timestamp].xlsx`
- **Sheet Name**: "Dressing Stock Register By LogX"
- **Save Path**: `public/upload/reports/reports2/Dressing/`

### Report Columns (20 columns)

| Column # | Column Name | Description | Data Type |
|----------|-------------|-------------|-----------|
| 1 | Item Group Name | Item sub-category (grouped with vertical merge) | String |
| 2 | Item Name | Item name (grouped with vertical merge) | String |
| 3 | Dressing Date | Dressing date for the log (DD/MM/YYYY) | String |
| 4 | Log X | Log code (`log_no_code`) | String |
| 5 | Opening Balance | Balance at start of period (SQM) | Decimal (2 places) |
| 6 | Purchase | Purchase in period (placeholder, always 0) | Decimal (2 places) |
| 7 | Receipt | Dressing done (receipt) in period (SQM) | Decimal (2 places) |
| 8 | Issue Sq Mtr | Issued for grouping/order/smoking_dying in period (SQM) | Decimal (2 places) |
| 9 | Clipping | Clipping in period (placeholder, always 0) | Decimal (2 places) |
| 10 | Dyeing | Dyeing in period (placeholder, always 0) | Decimal (2 places) |
| 11 | Mixmatch | Mixmatch in period (placeholder, always 0) | Decimal (2 places) |
| 12 | Edgebanding | Edgebanding in period (placeholder, always 0) | Decimal (2 places) |
| 13 | Lipping | Lipping in period (placeholder, always 0) | Decimal (2 places) |
| 14 | Redressing | Redressing in period (placeholder, always 0) | Decimal (2 places) |
| 15 | Sale | Issued for order in period (SQM) | Decimal (2 places) |
| 16 | Closing Balance | Balance at end of period (SQM) | Decimal (2 places) |
| 17 | Issue From Old Balance | Issued before period (SQM) | Decimal (2 places) |
| 18 | Closing Balance Old | Opening balance (same as Opening Balance) | Decimal (2 places) |
| 19 | Issue From New Balance | Issued in period (same as Issue Sq Mtr) | Decimal (2 places) |
| 20 | Closing Balance New | Closing balance (same as Closing Balance) | Decimal (2 places) |

### Report Layout

1. **Title Row**: "Dressing Stock Register By LogX - [DD/MM/YYYY]-[DD/MM/YYYY]"
2. **Empty Row**: Spacing
3. **Header Row**: All 20 column names with gray background and borders
4. **Data Rows**: One row per Log X, grouped by Item Group Name and Item Name
   - Item Group Name and Item Name cells are vertically merged for consecutive rows with the same group+item
   - Sorted by item_group_name, then item_name, then log_x
5. **Total Row**: One row at the end with "Total" and summed numeric columns (gray background, bold)

## Data Sources

### Primary Models

1. **Dressing Done Items** (`dressing_done_items_model`)
   - Collection: `dressing_done_items`
   - Fields used: `log_no_code`, `item_name`, `item_sub_category_name`, `sqm`, `issue_status`, `dressing_done_other_details_id`, `createdAt`, `updatedAt`

2. **Dressing Done Other Details** (`dressing_done_other_details_model`)
   - Collection: `dressing_done_other_details`
   - Fields used: `dressing_date`, `_id` (for join)

### Issue Status Values

- `grouping` – Issued for grouping
- `order` – Issued for order (counted as **Sale**)
- `smoking_dying` – Issued for smoking/dyeing
- `null` – Not yet issued (still in dressing stock)

---

## How the Report Data Is Brought Together

A new developer should understand: we do **not** compute the report in one query. We run **six separate aggregations** on the same collections, then **combine the results per log** using in-memory maps. The report is built from these combined values.

### Step 1: List of logs (and metadata)

**Goal:** Get every distinct `log_no_code` that appears in dressing, plus item labels and a dressing date to show in the report.

**Source:** `dressing_done_items` + **$lookup** `dressing_done_other_details` on `dressing_done_other_details_id` → `_id`.

**Pipeline:**

1. **$match** – Apply request filters (e.g. `item_name`, `item_sub_category_name` if provided).
2. **$lookup** – Join to `dressing_done_other_details` so each item has `details.dressing_date`.
3. **$unwind** – `details` (one document per item–session pair).
4. **$group** by `log_no_code` (`_id: '$log_no_code'`):
   - `item_name`: `$first`
   - `item_sub_category_name`: `$first`
   - `dressing_date_in_period`: `$max` of `details.dressing_date` **only when** that date is between `start` and `end`; else `null`.
   - `fallback_dressing_date`: `$max` of `details.dressing_date` (any date).
5. **$project** – Output: `log_no_code`, `item_name`, `item_sub_category_name`, and `dressing_date = dressing_date_in_period ?? fallback_dressing_date` (show date in period if any, else latest dressing date).

**Result:** One document per log with display fields. If this list is empty, the API returns **404** “No dressing data found for the selected period”.

---

### Step 2: Receipt in period (by log)

**Goal:** For each `log_no_code`, sum the **sqm** that was “dressing done” **during** the report period. “Dressing done” is tied to the **session** date, not the item’s `updatedAt`.

**Source:** `dressing_done_items` + **$lookup** `dressing_done_other_details` (same join as Step 1).

**Pipeline:**

1. **$lookup** – Same as Step 1.
2. **$unwind** – `details`.
3. **$match** – Same item filters (if any) **and** `details.dressing_date >= start` **and** `details.dressing_date <= end` (end is end-of-day).
4. **$group** by `_id: '$log_no_code'`, `total: { $sum: '$sqm' }`.

**Result:** Array of `{ _id: log_no_code, total: number }`. Stored in a **Map**: `receiptMap.get(log_no_code)` = receipt in period for that log (0 if missing).

---

### Step 3: Issue in period (by log)

**Goal:** For each `log_no_code`, sum the **sqm** that was **issued** (moved out of dressing stock) **during** the report period. “Issued” means `issue_status` is set; we use **updatedAt** as the issue time.

**Source:** `dressing_done_items` only (no lookup).

**Pipeline:**

1. **$match** – Same item filters **and** `issue_status` in `['grouping','order','smoking_dying']` **and** `updatedAt >= start` and `updatedAt <= end`.
2. **$group** by `_id: '$log_no_code'`, `total: { $sum: '$sqm' }`.

**Result:** Array of `{ _id, total }`. Stored in **issueMap**. This is the **Issue Sq Mtr** (and **Issue From New Balance**) column.

---

### Step 4: Sale in period (by log)

**Goal:** Same as Issue in period, but only rows where `issue_status === 'order'`.

**Source:** `dressing_done_items` only.

**Pipeline:** Same as Step 3 but **$match** includes `issue_status: 'order'` (and same date range on `updatedAt`). **$group** by `log_no_code`, `$sum: '$sqm'`.

**Result:** Array → **saleMap**. This is the **Sale** column.

---

### Step 5: Receipt before period (by log)

**Goal:** For each log, sum **sqm** that was dressing done **before** the report start. Used for opening balance.

**Source:** Same as Step 2 (items + lookup to other_details).

**Pipeline:** Same structure as Step 2, but **$match** uses `details.dressing_date < start` (no upper bound).

**Result:** Array → **receiptBeforeMap**.

---

### Step 6: Issue before period (by log)

**Goal:** For each log, sum **sqm** that was issued **before** the report start. Used for opening balance.

**Source:** `dressing_done_items` only.

**Pipeline:** Same as Step 3 but **$match** uses `updatedAt < start` (no lower bound). Same `issue_status` in `['grouping','order','smoking_dying']`.

**Result:** Array → **issueBeforeMap**. This is the **Issue From Old Balance** column.

---

### Step 7: Build one row per log

For **each** document from **Step 1** (each `log_no_code`):

- **Receipt** = `receiptMap.get(log_no_code) ?? 0`
- **Issue** = `issueMap.get(log_no_code) ?? 0`
- **Sale** = `saleMap.get(log_no_code) ?? 0`
- **Receipt before** = `receiptBeforeMap.get(log_no_code) ?? 0`
- **Issue before** = `issueBeforeMap.get(log_no_code) ?? 0`

Then apply the formulas below to get Opening Balance, Closing Balance, and the “Old/New” columns. Item Group Name = `item_sub_category_name` or `item_name`; Dressing Date = formatted from Step 1’s `dressing_date`. Placeholder columns (Purchase, Clipping, Dyeing, etc.) are set to **0**.

**Sort:** Rows are sorted by `item_group_name`, then `item_name`, then `log_x` (string sort).

---

### Step 8: Excel and Total row

The sorted rows are passed to the Excel generator. The generator adds a **Total** row at the end: for each numeric column (Opening Balance, Purchase, Receipt, Issue Sq Mtr, Clipping, … Closing Balance New), the Total = **sum of that column** over all data rows. The first four columns (Item Group Name, Item Name, Dressing Date, Log X) show “Total” or blank in the Total row.

---

## Exact Calculation Formulas (per log)

All of the following use the **per-log** values from the maps (Step 7). Dates: `start` = start of report date (00:00:00), `end` = end of report date (23:59:59.999).

| Column | Formula / source |
|--------|-------------------|
| **Opening Balance** | `max(0, receipt_before − issue_before)` |
| **Receipt** | From **receiptMap**: sum of `sqm` where `dressing_date ∈ [start, end]` (via join). |
| **Issue Sq Mtr** | From **issueMap**: sum of `sqm` where `issue_status ∈ ['grouping','order','smoking_dying']` and `updatedAt ∈ [start, end]`. |
| **Sale** | From **saleMap**: same as Issue but only `issue_status === 'order'`. |
| **Closing Balance** | `max(0, opening_balance + receipt − issue)` |
| **Issue From Old Balance** | From **issueBeforeMap**: sum of `sqm` where `issue_status` set and `updatedAt < start`. |
| **Closing Balance Old** | Same value as **Opening Balance**. |
| **Issue From New Balance** | Same value as **Issue Sq Mtr**. |
| **Closing Balance New** | Same value as **Closing Balance**. |
| **Purchase, Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing** | **0** (no source in schema). |

**Summary equation:**

```
Opening Balance  = max(0, Receipt before start − Issue before start)
Closing Balance  = max(0, Opening Balance + Receipt in period − Issue in period)
```

### Quick reference: where each number comes from

| Metric | Collection(s) | Date field | Condition |
|--------|----------------|------------|-----------|
| Receipt (period) | dressing_done_items + dressing_done_other_details | dressing_date | `dressing_date` between start and end |
| Receipt (before) | dressing_done_items + dressing_done_other_details | dressing_date | `dressing_date` &lt; start |
| Issue (period) | dressing_done_items | updatedAt | `issue_status` in grouping/order/smoking_dying and `updatedAt` between start and end |
| Issue (before) | dressing_done_items | updatedAt | `issue_status` set and `updatedAt` &lt; start |
| Sale (period) | dressing_done_items | updatedAt | `issue_status === 'order'` and `updatedAt` between start and end |

All aggregations are **grouped by** `log_no_code` and **sum** the field `sqm`.

---

## Understanding the API Response

- **Success (200):**  
  - `result` is a **full URL** to the generated Excel file (e.g. `http://localhost:8765/public/upload/reports/reports2/Dressing/Dressing-Stock-Register-LogX_<timestamp>.xlsx`).  
  - The file is **one-time generated**; the API does not return the rows as JSON. To “understand the response”, you open this Excel.

- **What’s inside the Excel:**  
  - **One data row per log** (per `log_no_code`). Each row has the 20 columns described in Report Structure.  
  - **Numeric columns** are SQM with 2 decimal places.  
  - **Total row:** one row at the bottom; numeric cells are the **sum** of that column across all data rows. So “Total Receipt” = sum of all logs’ Receipt; “Total Closing Balance” = sum of all logs’ Closing Balance, etc.  
  - **Order:** Rows are sorted by Item Group Name, then Item Name, then Log X. Item Group Name and Item Name are merged vertically when consecutive rows share the same group and item.

- **No data (404):** If there are no dressing items (after optional filters), Step 1 returns an empty list and the API responds with 404 and does not generate a file.

## Business Logic (quick reference)

- **Receipt** uses **dressing_date** (from `dressing_done_other_details`); **Issue** and **Sale** use **updatedAt** on `dressing_done_items`. End date is inclusive (time set to 23:59:59.999).
- **Sort:** `item_sub_category_name` → `item_name` → `log_no_code`. In Excel, Item Group Name and Item Name are vertically merged for consecutive rows with the same group+item.
- **Dressing Date column:** For each log we show the latest dressing date **in the report period** if any; otherwise the latest dressing date ever for that log.

## Example Usage

### Request with Date Range Only

```bash
curl -X POST http://localhost:8765/api/V1/reports2/dressing/download-excel-log-wise-dressing-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-04-01",
    "endDate": "2025-03-31"
  }'
```

### Request with Item Filter

```bash
curl -X POST http://localhost:8765/api/V1/reports2/dressing/download-excel-log-wise-dressing-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-04-01",
    "endDate": "2025-03-31",
    "filter": {
      "item_name": "AFRICAN CHERRY"
    }
  }'
```

## Implementation Files

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Flitch/logWiseDressingReport.js` |
| Excel config | `topl_backend/config/downloadExcel/reports2/Flitch/logWiseDressingReport.js` |
| Route | `topl_backend/routes/report/reports2/Dressing/dressing.routes.js` |

Route is registered in Dressing routes; controller and Excel config live under the Flitch folder per project convention for this report.

**Implementation plan:** [LOG_WISE_DRESSING_REPORT_PLAN.md](./LOG_WISE_DRESSING_REPORT_PLAN.md) – original scoping and build steps (stored from `.cursor/plans`).

## Related APIs

- [Dressing Daily Report API](../Daily_Dressing/DRESSING_DAILY_REPORT_API.md)
- Log Wise Flitch Report: `/api/V1/reports2/flitch/download-excel-log-wise-flitch-report`
