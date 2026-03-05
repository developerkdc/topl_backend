# Log Wise TappingORClipping Report API Documentation

## Overview

The Log Wise TappingORClipping Report API generates an Excel report **Clipping Item Stock Register** that shows one row per (Item Group Name, Item Name, Clipping Date, Log X) with opening balance, received (Sq. Mtr.), issue (Sq. Mtr.), issue-for breakdown (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), and closing balance for a specified date range. A single **Total** row is added at the end.

**Concepts a developer must know:**

- **Received** = clipping/tapping output: when tapping is done, `sqm` is added to stock. The date used is **tapping_date** from `tapping_done_other_details`.
- **Issue** = when that stock is later issued (e.g. for pressing). The date used is **updatedAt** on `tapping_done_history`.
- **Opening balance** = stock for that log at the **start** of the report period (received before start − issued before start). For subsequent dates of the same log in the range, opening = previous row’s closing.
- **Closing balance** = opening + received in that row − issue in that row (per date).
- All quantities are in **SQM** (square metres).

## API Endpoint

**POST** `/api/V1/report/download-excel-log-wise-tapping-or-clipping-report`

## Request Body

```json
{
  "startDate": "2024-04-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "AFRICAN CHERRY",
    "item_group_name": "MOABI"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by specific item name |
| `filter.item_group_name` | String | No | Filter by item group (maps to `item_sub_category_name`) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log wise tapping/clipping report generated successfully",
  "result": "http://localhost:8765/public/upload/reports/reports2/TappingORClipping/LogWiseTappingORClipping_1738598745123.xlsx"
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
  "message": "No clipping data found for the selected criteria"
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

- **File Name**: `LogWiseTappingORClipping_[timestamp].xlsx`
- **Sheet Name**: "Clipping Item Stock Register"
- **Save Path**: `public/upload/reports/reports2/TappingORClipping/`

### Report Columns (14 columns)

| Column # | Column Name | Description | Data Type |
|----------|-------------|-------------|-----------|
| 1 | Item Group Name | Item sub-category | String |
| 2 | Item Name | Item name | String |
| 3 | Clipping Date | Tapping date for the row (DD/MM/YYYY) | String |
| 4 | Log X | Log code (`log_no_code`) | String |
| 5 | Opening Balance | Balance at start of day for that log (SQM) | Decimal (2 places) |
| 6 | Received (Sq. Mtr.) | Tapping done (receipt) for that log on that date (SQM) | Decimal (2 places) |
| 7 | Issue (Sq. Mtr.) | Issued (e.g. for pressing) for that log on that date (SQM) | Decimal (2 places) |
| 8 | (Issue For merged) | Parent header over columns 9–13 | — |
| 9 | Hand Splicing | Issue for hand splicing (currently 0) | Decimal (2 places) |
| 10 | Splicing | Issue for splicing / pressing (SQM) | Decimal (2 places) |
| 11 | Clipped Packing | Issue for clipped packing (currently 0) | Decimal (2 places) |
| 12 | Damaged | Issue as damaged (currently 0) | Decimal (2 places) |
| 13 | Cal Ply Production | Issue for cal ply production (currently 0) | Decimal (2 places) |
| 14 | Closing Balance | Balance at end of row (SQM) | Decimal (2 places) |

### Report Layout

1. **Title Row**: "Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY"
2. **Empty Row**: Spacing
3. **Header Row 1**: Main column names; "Issue For (in Sq. Mtr.)" merged over columns 9–13
4. **Header Row 2**: Sub-headers for Issue For: Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production
5. **Data Rows**: One row per (Item Group Name, Item Name, Clipping Date, Log X), sorted by item_group_name, item_name, log_no_code, tapping_date
6. **Total Row**: One row at the end with "Total" and summed numeric columns (bold, highlighted)

## Data Sources

### Primary Models

1. **Tapping Done Items Details** (`tapping_done_items_details_model`)
   - Collection: `tapping_done_items_details`
   - Fields used: `item_sub_category_name`, `item_name`, `log_no_code`, `sqm`, `tapping_done_other_details_id`

2. **Tapping Done Other Details** (`tapping_done_other_details_model`)
   - Collection: `tapping_done_other_details`
   - Fields used: `tapping_date`, `_id` (for join)

3. **Tapping Done History** (`tapping_done_history_model`)
   - Collection: `tapping_done_history`
   - Fields used: `log_no_code`, `item_name`, `item_sub_category_name`, `sqm`, `updatedAt`, `issue_status` (currently only `pressing`)

### Issue For Mapping (current schema)

- **Splicing** column receives all issue (from `tapping_done_history` with `issue_status: 'pressing'`).
- **Hand Splicing**, **Clipped Packing**, **Damaged**, **Cal Ply Production** are implemented as columns but filled with **0** unless future schema/features add these issue types.

## How the Report Data Is Brought Together

1. **Received in period**: Aggregate `tapping_done_items_details` with `$lookup` to `tapping_done_other_details`; filter by `tapping_date` in [start, end]. Group by (item_sub_category_name, item_name, log_no_code, tapping_date), sum `sqm`.
2. **Issue in period**: Aggregate `tapping_done_history` by (log_no_code, item_name, date from updatedAt) in range; sum `sqm`. Build a map keyed by log|item|date.
3. **Distinct rows**: Build sorted list of (item_group, item_name, log_no_code, tapping_date) from the received aggregation.
4. **Opening at period start**: For each (log_no_code, item_name), compute received before start (tapping_done with tapping_date &lt; start) minus issued before start (history with updatedAt &lt; start). Store in a map.
5. **Build rows**: For each (item_group, item_name, log_no_code, tapping_date) in sorted order: opening = running closing from previous row for that log (or opening at period start for first date of that log). Received = from step 1. Issue = from step 2 map for that log|item|date. Closing = opening + received − issue. Next row’s opening = this closing.
6. **Excel**: Pass rows to config; add Total row summing all numeric columns.

## Exact Calculation Formulas (per row)

| Column | Formula / source |
|--------|-------------------|
| **Opening Balance** | Previous row’s closing for same log; or at period start: `max(0, received_before_start − issued_before_start)` |
| **Received (Sq. Mtr.)** | Sum of `tapping_done_items_details.sqm` for that (log, item, tapping_date) where `tapping_date` in [start, end] |
| **Issue (Sq. Mtr.)** | Sum of `tapping_done_history.sqm` for that (log, item) where `updatedAt` date = row’s clipping date |
| **Closing Balance** | `max(0, opening_balance + received − issue)` |
| **Hand Splicing, Clipped Packing, Damaged, Cal Ply Production** | **0** (no source in current schema) |
| **Splicing** | Same as **Issue** (all issue currently maps to pressing/splicing) |

## Example Usage

### Request with Date Range Only

```bash
curl -X POST http://localhost:8765/api/V1/report/download-excel-log-wise-tapping-or-clipping-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-04-01",
    "endDate": "2025-03-31"
  }'
```

### Request with Item Filter

```bash
curl -X POST http://localhost:8765/api/V1/report/download-excel-log-wise-tapping-or-clipping-report \
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
| Controller | `topl_backend/controllers/reports2/TappingORClipping/logWiseTappingORClipping.js` |
| Excel config | `topl_backend/config/downloadExcel/reports2/TappingORClipping/logWiseTappingORClipping.js` |
| Route | `topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js` |

**Implementation plan:** [LOG_WISE_TAPPING_OR_CLIPPING_REPORT_PLAN.md](./LOG_WISE_TAPPING_OR_CLIPPING_REPORT_PLAN.md)

## Related APIs

- [Clipping Daily Report API](../Daily_Clipping/CLIPPING_DAILY_REPORT_API.md)
