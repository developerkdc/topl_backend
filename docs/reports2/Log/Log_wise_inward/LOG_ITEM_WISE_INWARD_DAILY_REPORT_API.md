# Log Item Wise Inward Daily Report API

## Overview

The Log Item Wise Inward Daily Report API generates an Excel report that tracks the **complete journey of individual logs** from inward receipt through crosscutting, flitching, peeling, and sales. The report shows **one row per log** with item grouping: rows are grouped by Item Name, with a **Total** row after each item group and a **Total** row at the end. All CMT values use **3 decimal places**.

**Concepts:**

- **Round log details** (Invoice, Indian, Actual) come from the log at inward; the report includes only logs whose **inward_date** (from invoice) falls within the selected date range.
- **Issue for CC** = round log CMT issued for crosscutting during the period (`issue_status === 'crosscutting'` and `updatedAt` in period).
- **CC Received** = crosscut output for that log during the period (`crosscutting_done.createdAt` in period; sum of `crosscut_cmt`).
- **Flitching / Peel** = crosscut pieces from this log issued for flitching/peeling during the period (`crosscutting_done.issue_status` and `updatedAt` in period).
- **Sales** = log direct sales + crosscut sales + flitch sales for this log during the period (order/challan issue_status and updatedAt in period).
- **Opening Balance** = 0 for logs received in the period (this report is for logs inward in the period).
- **Closing Stock CMT** = Opening + Actual − Issue for CC + CC Received − Flitching − Sawing − Wooden Tile − UnEdge − Peel − Sales (non-negative).

## Endpoint

```
POST /api/V1/report/download-excel-log-item-wise-inward-daily-report
```

## Authentication

- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

## Request Body

### Required Parameters

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31"
}
```

### Optional Parameters

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "ASH"
  }
}
```

- **filter.item_name** (optional): When provided, only logs for that item are included.

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log item wise inward report generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Log/Log-Item-Wise-Inward-Report-1706432891234.xlsx"
}
```

- **result**: Full URL to download the generated Excel file (GET or open in browser).

### Error Responses

#### 400 Bad Request – Missing dates

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request – Invalid date format

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request – Invalid date range

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No log data found for the selected period"
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

---

## Report Structure

### Excel File Format

- **File name pattern**: `Log-Item-Wise-Inward-Report-{timestamp}.xlsx`
- **Sheet name**: "Log Item Wise Inward Report"
- **Save path**: `public/upload/reports/reports2/Log/`

### Row 1: Report Title

Merged across all 16 columns.

**Format:**

```
Inward Item and Log Wise Stock Details Between DD/MM/YYYY and DD/MM/YYYY
```

**Example:**

```
Inward Item and Log Wise Stock Details Between 01/03/2025 and 31/03/2025
```

### Row 2: Empty (spacing)

### Row 3: Group Headers

Grouped column headers (merged cells):

- **ROUND LOG DETAIL CMT** (columns 4–6: Invoice, Indian, Actual)
- **Cross Cut Details CMT** (columns 7–9: Issue For CC, CC Received, DIFF)
- **CrossCut Log Issue For CMT** (columns 10–14: Flitch, Sawing, Wooden Tile, UnEdge, Peel)

### Row 4: Column Headers

| # | Column             | Description                                    |
|---|--------------------|------------------------------------------------|
| 1 | ItemName           | Item name (grouped; merged vertically per item)|
| 2 | Log No             | Log number                                    |
| 3 | Opening Bal. CMT   | Opening balance (0 for logs inward in period)  |
| 4 | Invoice            | ROUND LOG – Invoice CMT                       |
| 5 | Indian             | ROUND LOG – Indian CMT                        |
| 6 | Actual             | ROUND LOG – Physical/Actual CMT               |
| 7 | Issue For CC       | Round log issued for crosscutting              |
| 8 | CC Received        | Crosscut output for this log                   |
| 9 | DIFF               | Issue For CC − CC Received                     |
|10 | Flitch             | Crosscut issued for flitching                 |
|11 | Sawing             | Placeholder (0.000)                            |
|12 | Wooden Tile        | Placeholder (0.000)                            |
|13 | UnEdge             | Placeholder (0.000)                            |
|14 | Peel               | Crosscut issued for peeling                   |
|15 | Sales              | Log + crosscut + flitch sales                  |
|16 | Closing Stock CMT  | Calculated closing balance                     |

### Data Rows

- One row per log; logs grouped by **ItemName** (item name cell merged vertically for the group).
- After each item group: one **Total** row (same columns, totals for that item).
- After all data: one **Total** row (grand totals).

---

## How Data Is Brought Together

The report is built in two steps: **data aggregation** (controller) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

1. **Source**: MongoDB view **`log_inventory_items_view`** (view on `log_inventory_items_details` with `$lookup` to `log_inventory_invoice_details` as `log_invoice_details`).

2. **Match logs in period**  
   - `log_invoice_details.inward_date` between start and end of date range (start 00:00:00, end 23:59:59.999).  
   - If `filter.item_name` is provided: `item_name` must equal that value.

3. **Sort**  
   - By `item_name` (asc), then `log_no` (asc).

4. **For each log**, the controller computes (with parallel `Promise.all`):
   - **Round log**: `invoice_cmt`, `indian_cmt`, `physical_cmt` from the log document (from view).
   - **Current log status**: `log_inventory_items_view_model.findOne({ log_no })` for latest `issue_status` and `updatedAt`.
   - **Issue for CC**: If `issue_status === 'crosscutting'` and `updatedAt` in period → `actualCmt`, else 0.
   - **CC Received**: `crosscutting_done_model.aggregate` — match `log_no`, `createdAt` in period; `$sum` of `crosscut_cmt`.
   - **Diff**: Issue for CC − CC Received.
   - **Flitching**: `crosscutting_done_model.aggregate` — match `log_no`, `issue_status: 'flitching'`, `updatedAt` in period; `$sum` of `crosscut_cmt`.
   - **Sawing / Wooden Tile / UnEdge**: Placeholder 0 (data source TBD).
   - **Peel**: `crosscutting_done_model.aggregate` — match `log_no`, `issue_status: 'peeling'`, `updatedAt` in period; `$sum` of `crosscut_cmt`.
   - **Sales**:  
     - Log direct: if `issue_status` in ['order','challan'] and `updatedAt` in period → `actualCmt`, else 0.  
     - Crosscut sales: `crosscutting_done_model` — `log_no`, `issue_status` in ['order','challan'], `updatedAt` in period; sum `crosscut_cmt`.  
     - Flitch sales: `flitching_done_model` — `log_no`, `deleted_at: null`, `issue_status` in ['order','challan'], `updatedAt` in period; sum `flitch_cmt`.  
     - Total sales = log + crosscut sales + flitch sales.
   - **Opening balance**: 0 (logs received in period).
   - **Closing balance**: Opening + Actual − Issue for CC + CC Received − Flitching − Sawing − Wooden Tile − UnEdge − Peel − Sales; then `Math.max(0, value)`.

5. **Output**: Array of objects, one per log, with keys: `item_name`, `log_no`, `opening_balance_cmt`, `invoice_cmt`, `indian_cmt`, `actual_cmt`, `issue_for_cc`, `cc_received`, `diff`, `flitching`, `sawing`, `wooden_tile`, `unedge`, `peel`, `sales`, `closing_stock_cmt`. This array is passed to the Excel generator.

### Step 2: Excel Generation (Config)

- **Input**: Aggregated array, `startDate`, `endDate`, `filter`.
- **Title**: "Inward Item and Log Wise Stock Details Between " + formatted start + " and " + formatted end.
- **Group headers**: Row 3 with merged cells (ROUND LOG DETAIL CMT, Cross Cut Details CMT, CrossCut Log Issue For CMT).
- **Column headers**: Row 4 (ItemName, Log No, Opening Bal. CMT, Invoice, Indian, Actual, Issue For CC, CC Received, DIFF, Flitch, Sawing, Wooden Tile, UnEdge, Peel, Sales, Closing Stock CMT).
- **Data**: Group by `item_name`; for each item, one row per log (item name only on first row of group, then merged vertically). Each numeric field from aggregated object, formatted to 3 decimal places.
- **Item total row**: After each item group; "Total" in Log No column; sums of all numeric columns for that item.
- **Grand total row**: Last row; "Total" in ItemName; sums of all numeric columns.
- **File**: Written to `public/upload/reports/reports2/Log/Log-Item-Wise-Inward-Report-{timestamp}.xlsx`; return full URL.

---

## Field Mapping (Excel Column → Source)

| # | Report column      | Source (controller output) | DB / view / model | Field / logic | Notes |
|---|--------------------|-----------------------------|--------------------|----------------|--------|
| 1 | ItemName           | `item_name`                 | log_inventory_items_view | item_name | From view (log_inventory_items_details) |
| 2 | Log No             | `log_no`                    | log_inventory_items_view | log_no | From view |
| 3 | Opening Bal. CMT   | `opening_balance_cmt`       | Calculated         | 0 for logs inward in period | |
| 4 | Invoice            | `invoice_cmt`               | log_inventory_items_view | invoice_cmt | Round log |
| 5 | Indian             | `indian_cmt`                | log_inventory_items_view | indian_cmt | Round log |
| 6 | Actual             | `actual_cmt`                | log_inventory_items_view | physical_cmt | Round log (actualCmt in code) |
| 7 | Issue For CC       | `issue_for_cc`              | log_inventory_items_view + period | issue_status, updatedAt, physical_cmt | If issue_status === 'crosscutting' and updatedAt in period |
| 8 | CC Received        | `cc_received`               | crosscutting_done  | crosscut_cmt, createdAt in period | Sum by log_no |
| 9 | DIFF               | `diff`                      | Calculated         | issue_for_cc − cc_received | |
|10 | Flitch             | `flitching`                 | crosscutting_done  | crosscut_cmt, issue_status: 'flitching', updatedAt in period | Sum by log_no |
|11 | Sawing             | `sawing`                    | —                  | — | Placeholder 0; data source TBD |
|12 | Wooden Tile        | `wooden_tile`               | —                  | — | Placeholder 0; data source TBD |
|13 | UnEdge             | `unedge`                    | —                  | — | Placeholder 0; data source TBD |
|14 | Peel               | `peel`                      | crosscutting_done  | crosscut_cmt, issue_status: 'peeling', updatedAt in period | Sum by log_no |
|15 | Sales              | `sales`                     | log view + crosscutting_done + flitching_done | order/challan issue_status, updatedAt in period | Log CMT + crosscut_cmt + flitch_cmt |
|16 | Closing Stock CMT  | `closing_stock_cmt`         | Calculated         | Opening + Actual − Issue for CC + CC Received − Flitching − Sawing − Wooden Tile − UnEdge − Peel − Sales | Math.max(0, value) |

---

## Data Sources and Relationships

### Database collections / views used

1. **log_inventory_items_view** (MongoDB view)
   - **View definition**: View on `log_inventory_items_details` with `$lookup` to `log_inventory_invoice_details` (as `log_invoice_details`).
   - **Purpose**: One document per log item with latest state and invoice details (including `inward_date`).
   - **Key fields**: `log_no`, `item_name`, `invoice_cmt`, `indian_cmt`, `physical_cmt`, `issue_status`, `updatedAt`, `invoice_id`, and `log_invoice_details` (array, unwound to one object with `inward_date`).
   - **Period filter**: `log_invoice_details.inward_date` between start and end of selected range.

2. **log_inventory_items_details** (underlying collection for view)
   - Source of: `log_no`, `item_name`, `invoice_cmt`, `indian_cmt`, `physical_cmt`, `issue_status`, `updatedAt`, `invoice_id`, etc.

3. **log_inventory_invoice_details**
   - **Relationship**: Joined to log items via `invoice_id` in the view pipeline.
   - **Key field**: `inward_date` — used to select logs “inward” in the report period.

4. **crosscutting_done**
   - **Key fields**: `log_no`, `crosscut_cmt`, `issue_status`, `createdAt`, `updatedAt`.
   - **Usage**: CC Received (createdAt in period), Flitching (issue_status 'flitching', updatedAt in period), Peel (issue_status 'peeling', updatedAt in period), Sales from crosscut (issue_status order/challan, updatedAt in period).

5. **flitching_done**
   - **Key fields**: `log_no`, `flitch_cmt`, `issue_status`, `deleted_at`, `updatedAt`.
   - **Usage**: Sales from flitch (issue_status order/challan, deleted_at null, updatedAt in period).

### Join / flow (conceptual)

```
log_inventory_items_details
    └── log_inventory_invoice_details (via invoice_id)  →  inward_date, period filter

log_inventory_items_view (view)
    → logs with inward_date in period

For each log:
    → log_inventory_items_view (current status)
    → crosscutting_done (by log_no): CC Received, Flitching, Peel, Crosscut Sales
    → flitching_done (by log_no): Flitch Sales
```

---

## Calculations

- **Opening balance**: 0 for all rows (only logs received in the selected period).
- **Issue for CC**: From log’s `issue_status` and `updatedAt` in period; value = `physical_cmt` or 0.
- **CC Received**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `createdAt` in period.
- **DIFF**: Issue for CC − CC Received.
- **Flitching**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `issue_status === 'flitching'` and `updatedAt` in period.
- **Sawing, Wooden Tile, UnEdge**: 0 (placeholders).
- **Peel**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `issue_status === 'peeling'` and `updatedAt` in period.
- **Sales**: Log direct (if issue_status order/challan and updatedAt in period) + crosscut sales (same from `crosscutting_done`) + flitch sales (from `flitching_done`, `deleted_at` null).
- **Closing Stock CMT**:  
  `Opening + Actual − Issue for CC + CC Received − Flitching − Sawing − Wooden Tile − UnEdge − Peel − Sales`  
  then `Math.max(0, value)`.

---

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-log-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### With item filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-log-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31",
    "filter": { "item_name": "ASH" }
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-excel-log-item-wise-inward-daily-report',
  {
    startDate: '2025-03-01',
    endDate: '2025-03-31',
    filter: { item_name: 'ASH' }  // optional
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.result;
window.open(downloadUrl, '_blank');
```

---

## Notes

- Only logs whose **inward_date** (from invoice) falls within the date range are included.
- Opening balance is always 0 for this report (logs inward in period).
- Sawing, Wooden Tile, and UnEdge are placeholders (0) until data sources are defined.
- All CMT values are formatted to 3 decimal places and closing balance is non-negative.
- Excel files are timestamped; directory: `public/upload/reports/reports2/Log/`.

---

## File Storage

- **Directory**: `public/upload/reports/reports2/Log/`
- **Filename pattern**: `Log-Item-Wise-Inward-Report-{timestamp}.xlsx`

---

## Technical Implementation

| Component        | Path |
|-----------------|------|
| Controller      | `topl_backend/controllers/reports2/Log/logItemWiseInward.js` |
| Excel generator | `topl_backend/config/downloadExcel/reports2/Log/logItemWiseInward.js` |
| Routes          | `topl_backend/routes/report/reports2/Log/log.routes.js` (POST `/download-excel-log-item-wise-inward-daily-report`) |
| Report router   | `topl_backend/routes/report/reports2.routes.js` (log routes mounted with no prefix) |
| Full URL        | `POST /api/V1/report/download-excel-log-item-wise-inward-daily-report` |

### Main dependencies (controller)

- `log_inventory_items_view_model` from `database/schema/inventory/log/log.schema.js`
- `crosscutting_done_model` from `database/schema/factory/crossCutting/crosscutting.schema.js`
- `flitching_done_model` from `database/schema/factory/flitching/flitching.schema.js`
- `createLogItemWiseInwardReportExcel` from `config/downloadExcel/reports2/Log/logItemWiseInward.js`

---

## Pending Clarifications

1. **Sawing** – Data source and business meaning.
2. **Wooden Tile** – Data source (sub-category, output, or issue destination).
3. **UnEdge** – Data source (sub-category, output, or issue destination).
