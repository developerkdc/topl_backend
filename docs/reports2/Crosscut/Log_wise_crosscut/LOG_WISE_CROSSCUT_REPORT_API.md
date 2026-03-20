# Log Wise Crosscut Report API Documentation

## Overview

The Log Wise Crosscut Report API generates an Excel report **Logwise Crosscut** that shows one row per log (`log_no`) with Invoice CMT, Indian CMT, Physical CMT, opening/closing crosscut balances, CC Received/Issued, Physical Length, CC Length, and downstream received (Flitch, SQ, UN, Peel) for a specified date range. Rows are grouped by Item Name, with a **Totals** row after each item group and a **Total** row at the end.

**Concepts a developer must know:**

- **CC Received** = crosscut output: when a piece is “crosscut done”, its `crosscut_cmt` is added. The date used is **worker_details.crosscut_date** on `crosscutting_done`.
- **CC Issued** = crosscut pieces issued further (sales, challan, flitching, peeling). The date used is **updatedAt** on `crosscutting_done`; we sum `crosscut_cmt` for that log where `issue_status` is one of `order`, `challan`, `flitching`, `peeling`.
- **Op Bal** = crosscut stock for that log at the **start** of the report period (pieces not yet issued, crosscut before start).
- **CC Closing** = crosscut stock at the **end** of the period (Op Bal + CC Received − CC Issued).
- **Flitch Received / Peel Received** = crosscut pieces issued for flitching/peeling during the period (`issue_status` + `updatedAt` on `crosscutting_done`).
- All CMT/length values use **3 decimal places**.

## API Endpoint

**POST** `/api/V1/report/download-excel-log-wise-crosscut-report`

## Request Body

```json
{
  "startDate": "2025-02-28",
  "endDate": "2025-05-29",
  "filter": {
    "item_name": "AMERICAN WALNUT"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by specific item name (e.g. AMERICAN WALNUT, ASH) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log wise crosscut report generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Crosscut/LogWiseCrosscut_1738598745123.xlsx"
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

#### 400 Bad Request - Future Date

```json
{
  "statusCode": 400,
  "success": false,
  "message": "End date cannot be in the future"
}
```

#### 404 Not Found - No Data

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No crosscut data found for the selected criteria"
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

- **File Name**: `LogWiseCrosscut_[timestamp].xlsx`
- **Sheet Name**: "Log Wise Crosscut Report"
- **Save Path**: `public/upload/reports/reports2/Crosscut/`

### Report Columns (15 columns)

| Column # | Column Name | Description | Data Type |
|----------|-------------|-------------|-----------|
| 1 | Item Name | Item name (grouped with vertical merge) | String |
| 2 | Log No | Log number | String |
| 3 | Invoice CMT | Invoice CMT from issues_for_crosscutting | Decimal (3 places) |
| 4 | Indian CMT | Indian CMT from issues_for_crosscutting | Decimal (3 places) |
| 5 | Physical CMT | Physical CMT from issues_for_crosscutting | Decimal (3 places) |
| 6 | Op Bal | Opening crosscut balance at start of period (CMT) | Decimal (3 places) |
| 7 | CC Received | Crosscut done in period (CMT) | Decimal (3 places) |
| 8 | CC Issued | Crosscut pieces issued further (sales, challan, flitching, peeling) in period (CMT) | Decimal (3 places) |
| 9 | CC Closing | Closing crosscut balance (Op Bal + CC Received − CC Issued) | Decimal (3 places) |
| 10 | Physical Length | Physical length from issues_for_crosscutting (meters) | Decimal (3 places) |
| 11 | CC Length | Sum of piece lengths from crosscutting_done in period (meters) | Decimal (3 places) |
| 12 | Flitch Received | Crosscut pieces issued for flitching in period (CMT) | Decimal (3 places) |
| 13 | SQ Received | Placeholder (no source; 0) | Decimal (3 places) |
| 14 | UN Received | Placeholder (no source; 0) | Decimal (3 places) |
| 15 | Peel Received | Crosscut pieces issued for peeling in period (CMT) | Decimal (3 places) |

### Report Layout

1. **Title Row**: "Logwise Crosscut between [DD/MM/YYYY] and [DD/MM/YYYY]"
2. **Empty Row**: Spacing
3. **Header Row**: All 15 column names with gray background and borders
4. **Data Rows**: One row per log, grouped by Item Name
   - Item Name cell is vertically merged for consecutive rows with the same item
   - Sorted by item_name, then log_no
5. **Totals Row (per item)**: After each item group, one row with "Totals" in Log No column and subtotals for that item (gray background, bold)
6. **Total Row (grand)**: One row at the end with "Total" and summed numeric columns (yellow background, bold)

## Data Sources

### Primary Models

1. **Issues For Crosscutting** (`issues_for_crosscutting_model`)
   - Collection: `issues_for_crosscuttings`
   - Fields used: `log_no`, `item_name`, `invoice_cmt`, `indian_cmt`, `physical_length`, `physical_cmt`, `createdAt`

2. **Crosscutting Done** (`crosscutting_done_model`)
   - Collection: `crosscutting_dones`
   - Fields used: `log_no`, `item_name`, `length`, `crosscut_cmt`, `issue_status`, `worker_details.crosscut_date`, `createdAt`, `updatedAt`, `deleted_at`

### Issue Status Values (crosscutting_done)

- `null` – Not yet issued (in crosscut stock)
- `order` – Issued for sales (**CC Issued**)
- `challan` – Issued for challan (**CC Issued**)
- `flitching` – Issued for flitching (**CC Issued**, **Flitch Received**)
- `peeling` – Issued for peeling (**CC Issued**, **Peel Received**)

**Note:** The schema may currently only allow `flitching` and `peeling`. If `order` and `challan` are added to the schema, they will be included in CC Issued automatically.

---

## How the Report Data Is Brought Together

The report is built by getting a distinct list of logs (from both collections), then for each log running several aggregations and combining the results into one row.

### Step 1: List of logs

**Goal:** Every distinct `(log_no, item_name)` that appears in `issues_for_crosscutting` or `crosscutting_done` (with `deleted_at: null`).

**Sources:** Two aggregates – `$group` by `log_no` + `item_name` on each collection; merge and dedupe by key `log_no|item_name`.

**Result:** Array of `{ log_no, item_name }`. If empty, API returns **404**.

---

### Step 2: Invoice/Indian/Physical CMT and Physical Length (per log)

**Goal:** One representative set of values per log from `issues_for_crosscutting`.

**Source:** `issues_for_crosscutting_model.aggregate` with `$match` (item filter), `$sort: { createdAt: 1 }`, `$group` by `log_no` + `item_name` with `$first` for `invoice_cmt`, `indian_cmt`, `physical_cmt`, `physical_length`.

**Result:** Map from `log_no|item_name` to `{ invoice_cmt, indian_cmt, physical_cmt, physical_length }`. Logs only in `crosscutting_done` get 0 for these.

---

### Step 3: Per-log metrics (Op Bal, CC Received, CC Issued, CC Closing, CC Length, Flitch/Peel Received)

For **each** log from Step 1:

- **Op Bal:** `crosscutting_done` where `log_no`, `item_name` match, `deleted_at: null`, `issue_status` null, `worker_details.crosscut_date` < start → sum `crosscut_cmt`.
- **CC Received:** `crosscutting_done` where same match, `worker_details.crosscut_date` in [start, end] → sum `crosscut_cmt`; same pipeline also sums `length` → **CC Length**.
- **CC Issued:** `crosscutting_done` where same match, `issue_status` in `['order','challan','flitching','peeling']`, `updatedAt` in [start, end] → sum `crosscut_cmt`.
- **CC Closing:** `max(0, Op Bal + CC Received − CC Issued)`.
- **Flitch Received:** `crosscutting_done` where same match, `issue_status: 'flitching'`, `updatedAt` in [start, end] → sum `crosscut_cmt`.
- **Peel Received:** `crosscutting_done` where same match, `issue_status: 'peeling'`, `updatedAt` in [start, end] → sum `crosscut_cmt`.
- **SQ Received, UN Received:** 0.

---

### Step 4: Build one row per log and sort

Each log from Step 1 gets one row object with all 15 fields (from Step 2 map and Step 3 metrics). Rows are **sorted** by `item_name`, then `log_no`.

---

### Step 5: Excel and Totals rows

The sorted rows are passed to the Excel generator. The generator:

- Groups by `item_name`; merges Item Name vertically per group.
- After each item group, adds a **Totals** row (subtotals for that item).
- At the end, adds a **Total** row (grand total of all numeric columns).

---

## Exact Calculation Formulas (per log)

| Column | Formula / source |
|--------|-------------------|
| **Invoice CMT, Indian CMT, Physical CMT, Physical Length** | From `issues_for_crosscutting` (first row per log by createdAt). |
| **Op Bal** | Sum of `crosscut_cmt` from `crosscutting_done` where `issue_status` null and `worker_details.crosscut_date` < start. |
| **CC Received** | Sum of `crosscut_cmt` from `crosscutting_done` where `worker_details.crosscut_date` in [start, end]. |
| **CC Issued** | Sum of `crosscut_cmt` from `crosscutting_done` where `issue_status` in `['order','challan','flitching','peeling']` and `updatedAt` in [start, end]. |
| **CC Closing** | `max(0, Op Bal + CC Received − CC Issued)`. |
| **CC Length** | Sum of `length` from `crosscutting_done` where `worker_details.crosscut_date` in [start, end]. |
| **Flitch Received** | Sum of `crosscut_cmt` from `crosscutting_done` where `issue_status === 'flitching'` and `updatedAt` in [start, end]. |
| **Peel Received** | Sum of `crosscut_cmt` from `crosscutting_done` where `issue_status === 'peeling'` and `updatedAt` in [start, end]. |
| **SQ Received, UN Received** | **0** (no source). |

**Summary equation:**

```
CC Closing = max(0, Op Bal + CC Received − CC Issued)
```

### Quick reference: where each number comes from

| Metric | Collection(s) | Date field | Condition |
|--------|----------------|------------|-----------|
| Invoice/Indian/Physical CMT, Physical Length | issues_for_crosscutting | — | First row per log (by createdAt) |
| Op Bal | crosscutting_done | worker_details.crosscut_date | `issue_status` null, date < start |
| CC Received | crosscutting_done | worker_details.crosscut_date | date between start and end |
| CC Length | crosscutting_done | worker_details.crosscut_date | same as CC Received; sum `length` |
| CC Issued | crosscutting_done | updatedAt | `issue_status` in order/challan/flitching/peeling, updatedAt in period |
| Flitch Received | crosscutting_done | updatedAt | `issue_status === 'flitching'`, updatedAt in period |
| Peel Received | crosscutting_done | updatedAt | `issue_status === 'peeling'`, updatedAt in period |

---

## Understanding the API Response

- **Success (200):**  
  - `result` is a **full URL** to the generated Excel file (e.g. `http://localhost:5000/public/upload/reports/reports2/Crosscut/LogWiseCrosscut_<timestamp>.xlsx`).  
  - The file is generated once; the API does not return the rows as JSON.

- **What’s inside the Excel:**  
  - **One data row per log** (per `log_no` within each item). Each row has the 15 columns described above.  
  - **Numeric columns** are CMT/length with 3 decimal places.  
  - **Totals row (per item):** After each item group; numeric cells are the **sum** for that item.  
  - **Total row (grand):** One row at the bottom; numeric cells are the **sum** of that column across all data rows.  
  - **Order:** Rows sorted by Item Name, then Log No. Item Name is merged vertically when consecutive rows share the same item.

- **No data (404):** If there are no crosscut-related logs (after optional filters), the API responds with 404 and does not generate a file.

## Example Usage

### Request with Date Range Only

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-log-wise-crosscut-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-02-28",
    "endDate": "2025-05-29"
  }'
```

### Request with Item Filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-log-wise-crosscut-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-02-28",
    "endDate": "2025-05-29",
    "filter": {
      "item_name": "AMERICAN WALNUT"
    }
  }'
```

## Implementation Files

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Crosscut/logWiseCrosscut.js` |
| Excel config | `topl_backend/config/downloadExcel/reports2/Crosscut/logWiseCrosscut.js` |
| Route | `topl_backend/routes/report/reports2/Crosscut/crosscut.routes.js` |

**Implementation plan:** [LOG_WISE_CROSSCUT_REPORT_PLAN.md](./LOG_WISE_CROSSCUT_REPORT_PLAN.md) – original scoping and build steps.

## Related APIs

- [Crosscut Daily Report API](../Daily_Crosscut/CROSSCUT_DAILY_REPORT_API.md)
- Log Wise Flitch Report: `POST /api/V1/report/download-excel-log-wise-flitch-report`
- Log Wise Dressing Report: `POST /api/V1/report/download-excel-log-wise-dressing-report`
