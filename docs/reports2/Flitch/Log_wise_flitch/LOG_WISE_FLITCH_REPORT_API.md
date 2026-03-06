# Log Wise Flitch Report API Documentation

## Overview

The Log Wise Flitch Report generates the **"Inward Item & Log Wise Report"** as an Excel file, tracking the complete journey of individual flitch logs across inward, stock, flitching, peeling, sales, and rejection stages. The layout uses multi-level column headers matching the client's required format.

## API Endpoint

**POST** `/api/V1/reports2/flitch/download-excel-log-wise-flitch-report`

## Request Body

```json
{
  "startDate": "2025-04-01",
  "endDate":   "2025-07-15",
  "filter": {
    "item_name": "RED OAK"
  }
}
```

### Parameters

| Parameter        | Type   | Required | Description                                      |
|------------------|--------|----------|--------------------------------------------------|
| `startDate`      | String | Yes      | Start date in YYYY-MM-DD format                  |
| `endDate`        | String | Yes      | End date in YYYY-MM-DD format                    |
| `filter.item_name` | String | No   | Filter by specific item name (uppercase)         |

## Response

### Success (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Log wise flitch report generated successfully",
  "result": "http://localhost:8765/public/upload/reports/reports2/Flitch/LogWiseFlitch_1738598745123.xlsx"
}
```

### Error Responses

| Code | Message |
|------|---------|
| 400  | Start date and end date are required |
| 400  | Invalid date format. Use YYYY-MM-DD |
| 400  | Start date cannot be after end date |
| 404  | No flitch data found for the selected period |
| 500  | Failed to generate report |

---

## Excel Report Structure

### File
- **Name**: `LogWiseFlitch_[timestamp].xlsx`
- **Sheet**: "Log Wise Flitch Report"
- **Header rows**: 4 rows (Title → Spacer → Group headers → Sub-column headers)

### Column Layout (19 columns)

```
Row 3 (group headers):
  ┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │col 1│col 2│col 3│col 4│col 5│col 6│col 7│  Received Flitch  │   Flitch Details CMT   │ Peeling Details CMT │Round log+CrossCu│col19│
  │     │     │     │     │     │     │     │   Detail CMT (8-9) │       (10–12)           │      (13–15)        │ (Cc+Fl+Pe)(16-18)│     │
  └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Row 4 (sub-headers):
  Item Name | Flitch Log No. | Inward Date | Status | Opening Stock CMT | Recovered From rejected | Invoice |
  Indian | Actual |
  Issue for Flitch | Flitch Received | Flitch Diff |
  Issue for Peeling | Peeling Received | Peeling Diff |
  Issue for Sq.Edge | Sales | Rejected |
  Closing Stock CMT
```

### Column Definitions

| # | Key | Header | Description |
|---|-----|--------|-------------|
| 1  | `item_name`             | Item Name               | Species/item (vertically merged per group) |
| 2  | `log_no`                | Flitch Log No.          | Individual flitch log number |
| 3  | `inward_date`           | Inward Date             | Earliest invoice inward date (DD/MM/YY) |
| 4  | `status`                | Status                  | Derived: Stock / Flitch / Peeling / Sales / Rejected |
| 5  | `op_bal`                | Opening Stock CMT       | Opening balance (CMT) |
| 6  | `recover_from_rejected` | Recovered From rejected | Placeholder – 0.000 (data source TBD) |
| 7  | `invoice_ref`           | Invoice                 | Inward SR number from inventory invoice |
| 8  | `indian_cmt`            | Indian                  | Placeholder – 0.000 (no Indian CMT in flitch schema) |
| 9  | `actual_cmt`            | Actual                  | Total flitch received (inventory + CC) in period |
| 10 | `issue_for_flitch`      | Issue for Flitch        | Total CMT issued from flitch stock in period |
| 11 | `flitch_received`       | Flitch Received         | Total flitch CMT received in period (= Actual) |
| 12 | `flitch_diff`           | Flitch Diff             | Issue for Flitch − Flitch Received |
| 13 | `issue_for_peeling`     | Issue for Peeling       | CMT issued with `slicing_peeling` status in period |
| 14 | `peel_received`         | Peeling Received        | Peeling output (face + core) CMT in period |
| 15 | `peeling_diff`          | Peeling Diff            | Issue for Peeling − Peeling Received |
| 16 | `issue_for_sqedge`      | Issue for Sq.Edge       | Placeholder – 0.000 (data source TBD) |
| 17 | `sales`                 | Sales                   | CMT issued for order/challan in period |
| 18 | `rejected`              | Rejected                | CMT with `is_rejected = true` in period |
| 19 | `fl_closing`            | Closing Stock CMT       | Closing balance (CMT) |

---

## Data Sources

| Collection | Model | Fields used |
|------------|-------|-------------|
| `flitch_inventory_items_details` | `flitch_inventory_items_model` | `log_no`, `item_name`, `flitch_cmt`, `issue_status`, `is_rejected`, `invoice_id`, `updatedAt` |
| `flitch_inventory_invoice_details` | (via `$lookup`) | `inward_date`, `inward_sr_no` |
| `flitchings` | `flitching_done_model` | `log_no`, `item_name`, `flitch_cmt`, `issue_status`, `is_rejected`, `worker_details.flitching_date`, `deleted_at`, `updatedAt` |
| `peeling_done_items` | `peeling_done_items_model` | `log_no`, `output_type`, `cmt`, `peeling_done_other_details_id` |
| `peeling_done_other_details` | (via `$lookup`) | `peeling_date` |

---

## Calculation Logic

### Inward Date
- Earliest `invoice.inward_date` from inventory invoices for that log.
- Falls back to earliest `worker_details.flitching_date` for factory-only logs.

### Invoice Reference
- `inward_sr_no` from the first matched inventory invoice.
- Empty for factory-only logs.

### Status (derived)
Checks the most recently updated flitch item for this log:

| Condition | Status |
|-----------|--------|
| `is_rejected = true` on factory item | Rejected |
| `issue_status = 'slicing_peeling'` | Peeling |
| `issue_status = 'slicing'` | Flitch |
| `issue_status IN ['order','challan']` | Sales |
| Otherwise | Stock |

### Actual CMT (col 9) = Flitch Received (col 11)
Sum of `flitch_cmt` from:
- `flitch_inventory_items_model` where `invoice.inward_date` in period (inventory)
- `flitching_done_model` where `worker_details.flitching_date` in period (CC/factory)

### Issue for Flitch (col 10)
Sum of `flitch_cmt` from both sources where `issue_status IN ['order','challan','slicing','slicing_peeling']` and `updatedAt` in period.

### Flitch Diff (col 12)
```
Flitch Diff = Issue for Flitch − Flitch Received
```

### Issue for Peeling (col 13)
Sum of `flitch_cmt` from both sources where `issue_status = 'slicing_peeling'` and `updatedAt` in period.

### Peeling Received (col 14)
Sum of `cmt` from `peeling_done_items` where `output_type IN ['face','core']` and `peeling_details.peeling_date` in period.

### Peeling Diff (col 15)
```
Peeling Diff = Issue for Peeling − Peeling Received
```

### Sales (col 17)
Sum of `flitch_cmt` from both sources where `issue_status IN ['order','challan']` and `updatedAt` in period.

### Rejected (col 18)
Sum of `flitch_cmt` from both sources where `is_rejected = true` and `updatedAt` in period.

### Opening Balance (col 5)
```
Opening = Current Available CMT + Total Issued (period) − Total Received (period)
```
Where *Current Available* = CMT with `issue_status = null` across both sources (all-time).

### Closing Stock CMT (col 19)
```
Closing = Opening + Received − Issued  (= Current Available CMT)
```

---

## Placeholder Columns

| Column | Reason | Future source |
|--------|--------|---------------|
| Recovered From rejected (col 6) | No "recovered" flag in flitch/peeling schema | TBD by client |
| Indian (col 8) | No `indian_cmt` field in flitch inventory schema | Schema change required |
| Issue for Sq.Edge (col 16) | No square-edge tracking in factory module | TBD by client |

---

## Active Log Filter

A log is included in the report only if at least one of the following is non-zero:
- Opening balance, Flitch Received, Issue for Flitch, Closing Stock CMT, Peeling Received, Sales, Rejected

---

## Sample Report Output

```
Inward Item & Log Wise Report From 01/04/2025 To 15/07/2025

                    │         │ Received Flitch   │      Flitch Details CMT      │    Peeling Details CMT     │ Round log+Cross Cu │
Item Name│Log No.│Date│Status │ Op.Stock│RecovRej│Inv│ Indian│ Actual │IssFlitch│FlRecvd│FlDiff │IssePeel│PeelRecvd│PeelDiff│IssSqEdge│Sales│Rej│ClStock
─────────┼───────┼────┼───────┼─────────┼────────┼───┼───────┼────────┼─────────┼───────┼───────┼────────┼─────────┼────────┼─────────┼─────┼───┼───────
Red Oak  │ L1    │... │ Stock │  0.000  │  0.000 │ 1 │ 0.000 │ 0.357  │  0.000  │ 0.357 │-0.357 │  0.000 │  0.000  │  0.000 │  0.000  │0.000│0.0│ 0.357
         │ L2    │... │ Peeling│ 0.000  │  0.000 │ 1 │ 0.000 │ 0.270  │  0.270  │ 0.270 │ 0.000 │  0.270 │  0.230  │  0.040 │  0.000  │0.000│0.0│ 0.000
─────────┼───────┼────┼───────┼─────────┼────────┼───┼───────┼────────┼─────────┼───────┼───────┼────────┼─────────┼────────┼─────────┼─────┼───┼───────
Total    │       │    │       │ 0.000   │  0.000 │   │ 0.000 │ 0.627  │  0.270  │ 0.627 │-0.357 │  0.270 │  0.230  │  0.040 │  0.000  │0.000│0.0│ 0.357
```

---

## Files

| File | Purpose |
|------|---------|
| `topl_backend/controllers/reports2/Flitch/logWiseFlitch.js` | Data aggregation and business logic |
| `topl_backend/config/downloadExcel/reports2/Flitch/logWiseFlitch.js` | Excel generation (19-col multi-level headers) |
| `topl_backend/routes/report/reports2/Flitch/flitch.routes.js` | Route: `POST /download-excel-log-wise-flitch-report` |

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2025-02-03 | Initial implementation (11 flat columns) |
| 2.0.0   | 2026-03-06 | Restructured to 19-column multi-level layout matching client image. Added Inward Date, Status, Invoice, Indian/Actual, Issue/Diff for Flitch and Peeling, Sales, Rejected columns. |
