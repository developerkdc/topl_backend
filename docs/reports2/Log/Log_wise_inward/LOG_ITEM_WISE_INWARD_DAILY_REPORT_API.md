# Log Item Wise Inward Daily Report API

## Overview

The Log Item Wise Inward Daily Report API generates an Excel report that tracks the **complete journey of individual logs** from inward receipt through crosscutting, flitching, peeling, and sales. The report shows **one row per log** with item grouping: rows are grouped by Item Name, with a **Total** row after each item group and a **Total** row at the end. All CMT values use **3 decimal places**.

**Concepts:**

- **Round log details** (Invoice, Indian, Actual) come from the log at inward; the report includes only logs whose **inward_date** (from invoice) falls within the selected date range.
- **Issue for CC** = round log CMT issued for crosscutting during the period (`issue_status === 'crosscutting'` and `updatedAt` in period).
- **CC Received** = crosscut output for that log during the period (`crosscutting_done.createdAt` in period; sum of `crosscut_cmt`).
- **CC Issued** = crosscut pieces forwarded ahead (from `crosscutting_done` where `issue_status` is not null, `createdAt` in period).
- **CC Diff** = Issue for CC − CC Received.
- **Issue for Flitch** = crosscut pieces issued for flitching during the period (`crosscutting_done.issue_status: 'flitching'`, `updatedAt` in period).
- **Flitch Received** = flitch output (`flitching_done.createdAt` in period; sum of `flitch_cmt`).
- **Flitch Diff** = Issue for Flitch − Flitch Received.
- **Issue for SqEdge** = placeholder (0) awaiting data source clarification.
- **Peeling Issued** = crosscut pieces issued for peeling during the period (`crosscutting_done.issue_status: 'peeling'`, `updatedAt` in period).
- **Peeling Received** = same value as Peeling Issued (pending actual peeling_done aggregation).
- **Peeling Diff** = 0 (placeholder).
- **Sales** = log direct sales + crosscut sales + flitch sales for this log during the period (order/challan issue_status, `updatedAt` in period).
- **Rejected** = rejected CMT across crosscutting + flitching + peeling stages.
- **Opening Balance** = 0 for logs received in the period.
- **Closing Stock CMT** = Opening + Actual − Issue for CC + CC Received − Issue for Flitch − Issue for SqEdge − Peeling Issued − Sales (non-negative).

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

Merged across all columns.

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

- **ROUND LOG DETAIL CMT** (Invoice, Indian, Actual)
- **Cross Cut Details CMT** (Issue For CC, CC Received, CC Issued, CC Diff)
- **Flitch Details CMT** (Issue For Flitch, Flitch Received, Flitch Diff)
- **CrossCut Log Issue For CMT** (Issue For SqEdge, Peeling Issued, Peeling Received, Peeling Diff)

### Row 4: Column Headers

| #  | Column               | Description                                              |
|----|----------------------|----------------------------------------------------------|
| 1  | ItemName             | Item name (grouped; merged vertically per item)          |
| 2  | Log No               | Log number                                               |
| 3  | Inward Date          | Date the log was received (from invoice)                 |
| 4  | Status               | Current issue status of the log                          |
| 5  | Opening Bal. CMT     | Opening balance (0 for logs inward in period)            |
| 6  | Invoice              | ROUND LOG – Invoice CMT                                  |
| 7  | Indian               | ROUND LOG – Indian CMT                                   |
| 8  | Actual               | ROUND LOG – Physical/Actual CMT                          |
| 9  | Recover From Rejected| Placeholder (0.000)                                      |
| 10 | Issue For CC         | Round log issued for crosscutting                        |
| 11 | CC Received          | Crosscut output for this log                             |
| 12 | CC Issued            | Crosscut pieces forwarded to next stage                  |
| 13 | CC Diff              | Issue For CC − CC Received                               |
| 14 | Issue For Flitch     | Crosscut issued for flitching                            |
| 15 | Flitch Received      | Flitch output from flitching_done                        |
| 16 | Flitch Diff          | Issue For Flitch − Flitch Received                       |
| 17 | Issue For SqEdge     | Placeholder (0.000)                                      |
| 18 | Peeling Issued       | Crosscut issued for peeling                              |
| 19 | Peeling Received     | Peeling output (currently same as Peeling Issued)        |
| 20 | Peeling Diff         | Placeholder (0.000)                                      |
| 21 | Sales                | Log + crosscut + flitch sales                            |
| 22 | Job Work Challan     | Placeholder (0.000)                                      |
| 23 | Rejected             | Rejected CMT across all stages                           |
| 24 | Closing Stock CMT    | Calculated closing balance                               |

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
   - **CC Issued**: `crosscutting_done_model.aggregate` — match `log_no`, `createdAt` in period, `issue_status` not null; `$sum` of `crosscut_cmt`.
   - **CC Diff**: Issue for CC − CC Received.
   - **Issue for Flitch**: `crosscutting_done_model.aggregate` — match `log_no`, `issue_status: 'flitching'`, `updatedAt` in period; `$sum` of `crosscut_cmt`.
   - **Flitch Received**: `flitching_done_model.aggregate` — match `log_no`, `deleted_at: null`, `createdAt` in period; `$sum` of `flitch_cmt`.
   - **Flitch Diff**: Issue for Flitch − Flitch Received.
   - **Issue for SqEdge**: Placeholder 0.
   - **Peeling Issued**: `crosscutting_done_model.aggregate` — match `log_no`, `issue_status: 'peeling'`, `updatedAt` in period; `$sum` of `crosscut_cmt`.
   - **Peeling Received**: Same value as Peeling Issued (pending actual peeling_done implementation).
   - **Peeling Diff**: 0 (placeholder).
   - **Sales**:
     - Log direct: if `issue_status` in ['order','challan'] and `updatedAt` in period → `actualCmt`, else 0.
     - Crosscut sales: `crosscutting_done_model` — `log_no`, `issue_status` in ['order','challan'], `updatedAt` in period; sum `crosscut_cmt`.
     - Flitch sales: `flitching_done_model` — `log_no`, `deleted_at: null`, `issue_status` in ['order','challan'], `updatedAt` in period; sum `flitch_cmt`.
     - Total sales = log + crosscut + flitch.
   - **Rejected**:
     - Crosscut rejected: `crosscutting_done_model` — `log_no`, `createdAt` in period, `is_rejected: true`; sum `crosscut_cmt`.
     - Flitch rejected: `flitching_done_model` — `log_no`, `deleted_at: null`, `createdAt` in period, `is_rejected: true`; sum `flitch_cmt`.
     - Peeling rejected: `crosscutting_done_model` — `log_no`, `issue_status: 'peeling'`, `is_rejected: true`, `updatedAt` in period; sum `crosscut_cmt`.
   - **Recover from Rejected**: Placeholder 0.
   - **Job Work Challan**: Placeholder 0.
   - **Opening balance**: 0 (logs received in period).
   - **Closing balance**: Opening + Actual − Issue for CC + CC Received − Issue for Flitch − Issue for SqEdge − Peeling Issued − Sales; then `Math.max(0, value)`.

5. **Output**: Array of objects, one per log, with keys: `item_name`, `log_no`, `inward_date`, `status`, `opening_balance_cmt`, `invoice_cmt`, `indian_cmt`, `actual_cmt`, `recover_from_rejected`, `issue_for_cc`, `cc_received`, `cc_issued`, `cc_diff`, `issue_for_flitch`, `flitch_received`, `flitch_diff`, `issue_for_sqedge`, `peeling_issued`, `peeling_received`, `peeling_diff`, `sales`, `job_work_challan`, `rejected`, `closing_stock_cmt`. This array is passed to the Excel generator.

### Step 2: Excel Generation (Config)

- **Input**: Aggregated array, `startDate`, `endDate`, `filter`.
- **Title**: "Inward Item and Log Wise Stock Details Between " + formatted start + " and " + formatted end.
- **Group headers**: Row 3 with merged cells (ROUND LOG DETAIL CMT, Cross Cut Details CMT, Flitch Details CMT, CrossCut Log Issue For CMT).
- **Column headers**: Row 4 (24 columns as listed above).
- **Data**: Group by `item_name`; for each item, one row per log (item name only on first row of group, then merged vertically). Each numeric field from aggregated object, formatted to 3 decimal places.
- **Item total row**: After each item group; "Total" in Log No column; sums of all numeric columns for that item.
- **Grand total row**: Last row; "Total" in ItemName; sums of all numeric columns.
- **File**: Written to `public/upload/reports/reports2/Log/Log-Item-Wise-Inward-Report-{timestamp}.xlsx`; return full URL.

---

## Field Mapping (Excel Column → Source)

| #  | Report column        | Source (controller output)  | DB / view / model       | Field / logic                                                  | Notes                                          |
|----|----------------------|-----------------------------|-------------------------|----------------------------------------------------------------|------------------------------------------------|
| 1  | ItemName             | `item_name`                 | log_inventory_items_view | item_name                                                     |                                                |
| 2  | Log No               | `log_no`                    | log_inventory_items_view | log_no                                                        |                                                |
| 3  | Inward Date          | `inward_date`               | log_inventory_items_view | log_invoice_details.inward_date                               |                                                |
| 4  | Status               | `status`                    | log_inventory_items_view | issue_status                                                  |                                                |
| 5  | Opening Bal. CMT     | `opening_balance_cmt`       | Calculated              | 0 for logs inward in period                                    |                                                |
| 6  | Invoice              | `invoice_cmt`               | log_inventory_items_view | invoice_cmt                                                   | Round log                                      |
| 7  | Indian               | `indian_cmt`                | log_inventory_items_view | indian_cmt                                                    | Round log                                      |
| 8  | Actual               | `actual_cmt`                | log_inventory_items_view | physical_cmt                                                  | Round log                                      |
| 9  | Recover From Rejected| `recover_from_rejected`     | —                       | —                                                              | Placeholder 0; data source TBD                |
| 10 | Issue For CC         | `issue_for_cc`              | log_inventory_items_view | issue_status === 'crosscutting' and updatedAt in period       |                                                |
| 11 | CC Received          | `cc_received`               | crosscutting_done       | crosscut_cmt, createdAt in period                              | Sum by log_no                                  |
| 12 | CC Issued            | `cc_issued`                 | crosscutting_done       | crosscut_cmt, issue_status != null, createdAt in period        | Pieces forwarded ahead from crosscutting stage |
| 13 | CC Diff              | `cc_diff`                   | Calculated              | issue_for_cc − cc_received                                     |                                                |
| 14 | Issue For Flitch     | `issue_for_flitch`          | crosscutting_done       | crosscut_cmt, issue_status: 'flitching', updatedAt in period   | Sum by log_no                                  |
| 15 | Flitch Received      | `flitch_received`           | flitching_done          | flitch_cmt, deleted_at: null, createdAt in period              | Sum by log_no                                  |
| 16 | Flitch Diff          | `flitch_diff`               | Calculated              | issue_for_flitch − flitch_received                             |                                                |
| 17 | Issue For SqEdge     | `issue_for_sqedge`          | —                       | —                                                              | Placeholder 0; data source TBD                |
| 18 | Peeling Issued       | `peeling_issued`            | crosscutting_done       | crosscut_cmt, issue_status: 'peeling', updatedAt in period     | Sum by log_no                                  |
| 19 | Peeling Received     | `peeling_received`          | —                       | Currently same value as peeling_issued                         | Pending actual peeling_done implementation     |
| 20 | Peeling Diff         | `peeling_diff`              | Calculated              | 0 (placeholder)                                                |                                                |
| 21 | Sales                | `sales`                     | log view + crosscutting_done + flitching_done | order/challan issue_status, updatedAt in period | Log CMT + crosscut_cmt + flitch_cmt |
| 22 | Job Work Challan     | `job_work_challan`          | —                       | —                                                              | Placeholder 0; data source TBD                |
| 23 | Rejected             | `rejected`                  | crosscutting_done + flitching_done | is_rejected: true, createdAt in period           | Sum of crosscut + flitch + peeling rejections  |
| 24 | Closing Stock CMT    | `closing_stock_cmt`         | Calculated              | Opening + Actual − Issue for CC + CC Received − Issue for Flitch − Issue for SqEdge − Peeling Issued − Sales | Math.max(0, value) |

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
   - **Key field**: `inward_date` — used to select logs "inward" in the report period.

4. **crosscutting_done**
   - **Key fields**: `log_no`, `crosscut_cmt`, `issue_status`, `is_rejected`, `createdAt`, `updatedAt`.
   - **Usage**: CC Received (createdAt in period), CC Issued (issue_status not null, createdAt in period), Issue for Flitch (issue_status 'flitching', updatedAt in period), Issue for SqEdge (placeholder), Peeling Issued (issue_status 'peeling', updatedAt in period), Sales from crosscut (issue_status order/challan, updatedAt in period), Rejected crosscut (is_rejected true, createdAt in period).

5. **flitching_done**
   - **Key fields**: `log_no`, `flitch_cmt`, `issue_status`, `deleted_at`, `is_rejected`, `updatedAt`, `createdAt`.
   - **Usage**: Flitch Received (deleted_at null, createdAt in period), Sales from flitch (issue_status order/challan, deleted_at null, updatedAt in period), Rejected flitch (is_rejected true, deleted_at null, createdAt in period).

### Join / flow (conceptual)

```
log_inventory_items_details
    └── log_inventory_invoice_details (via invoice_id)  →  inward_date, period filter

log_inventory_items_view (view)
    → logs with inward_date in period

For each log:
    → log_inventory_items_view (current status)
    → crosscutting_done (by log_no): CC Received, CC Issued, Issue for Flitch, Peeling Issued, Crosscut Sales, Rejected
    → flitching_done (by log_no): Flitch Received, Flitch Sales, Rejected flitch
```

---

## Calculations

- **Opening balance**: 0 for all rows (only logs received in the selected period).
- **Issue for CC**: From log's `issue_status` and `updatedAt` in period; value = `physical_cmt` or 0.
- **CC Received**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `createdAt` in period.
- **CC Issued**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `issue_status` is not null and `createdAt` in period.
- **CC Diff**: Issue for CC − CC Received.
- **Issue for Flitch**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `issue_status === 'flitching'` and `updatedAt` in period.
- **Flitch Received**: Sum of `flitch_cmt` in `flitching_done` for that `log_no` where `deleted_at` is null and `createdAt` in period.
- **Flitch Diff**: Issue for Flitch − Flitch Received.
- **Issue for SqEdge**: 0 (placeholder).
- **Peeling Issued**: Sum of `crosscut_cmt` in `crosscutting_done` for that `log_no` where `issue_status === 'peeling'` and `updatedAt` in period.
- **Peeling Received**: Same as Peeling Issued (pending proper peeling_done aggregation).
- **Peeling Diff**: 0 (placeholder).
- **Sales**: Log direct (if issue_status order/challan and updatedAt in period) + crosscut sales (same from `crosscutting_done`) + flitch sales (from `flitching_done`, `deleted_at` null).
- **Job Work Challan**: 0 (placeholder).
- **Rejected**: Rejected CMT from crosscutting_done (is_rejected, createdAt in period) + flitching_done (is_rejected, deleted_at null, createdAt in period) + crosscutting_done peeling (is_rejected, issue_status 'peeling', updatedAt in period).
- **Closing Stock CMT**:
  `Opening + Actual − Issue for CC + CC Received − Issue for Flitch − Issue for SqEdge − Peeling Issued − Sales`
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
- All CMT values are formatted to 3 decimal places and closing balance is non-negative.
- Excel files are timestamped; directory: `public/upload/reports/reports2/Log/`.

### Placeholder Columns (currently 0.000)

1. **Recover From Rejected** – Data source and business meaning TBD.
2. **Issue For SqEdge** – Data source and business rules TBD (replaces previous Sawing/Wooden Tile/UnEdge).
3. **Peeling Received** – Currently echoes Peeling Issued; actual `peeling_done` model aggregation pending.
4. **Peeling Diff** – Will be meaningful once Peeling Received is properly implemented.
5. **Job Work Challan** – Data source TBD.

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
