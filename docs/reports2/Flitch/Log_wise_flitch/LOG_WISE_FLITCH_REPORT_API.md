# Log Wise Flitch Report API Documentation (v3.0)

## Overview

The Log Wise Flitch Report generates the **"Inward Item & Log Wise Report"** as an Excel file, tracking the complete journey of individual flitch logs through factory stages (flitching → slicing) with inventory-flow-based stock calculations. Uses 19-column multi-level layout aligned to Item Wise Flitch v4 logic: Slicing instead of Peeling, LOG/CROSSCUT source differentiation, and comprehensive wastage aggregation.

## API Endpoint

**POST** `/api/V1/report/download-excel-log-wise-flitch-report`

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
  │col 1│col 2│col 3│col 4│col 5│col 6│col 7│  Received Flitch  │   Flitch Details CMT   │ Slicing Details CMT │Round log+CrossCu│col19│
  │     │     │     │     │     │     │     │   Detail CMT (8-9) │       (10–12)           │      (13–15)        │ (Cc+Fl+Sl)(16-18)│     │
  └──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Row 4 (sub-headers):
  Item Name | Flitch Log No. | Inward Date | Status | Opening Stock CMT | Recovered From rejected | Invoice |
  Indian | Actual |
  Issue for Flitch | Flitch Received | Flitch Diff |
  Issue for Slicing | Slicing Received | Slicing Diff |
  Issue for Sq.Edge | Sales | Rejected |
  Closing Stock CMT
```

### Column Definitions

| # | Key | Header | Description |
|---|-----|--------|-------------|
| 1  | `item_name`             | Item Name               | Species/item (vertically merged per group) |
| 2  | `log_no`                | Flitch Log No.          | Individual flitch log number |
| 3  | `inward_date`           | Inward Date             | Earliest invoice inward date (DD/MM/YY) |
| 4  | `status`                | Status                  | Derived: Stock / Flitch / Slicing / Sales / Rejected |
| 5  | `op_bal`                | Opening Stock CMT       | Opening balance from `flitching_done` with `issue_status=null` before period |
| 6  | `recover_from_rejected` | Recovered From rejected | Placeholder – 0.000 (data source TBD) |
| 7  | `invoice_cmt`           | Invoice                 | LOG source: `log_inventory_items_details.invoice_cmt` |
| 8  | `indian_cmt`            | Indian                  | LOG source: `log_inventory_items_details.indian_cmt` |
| 9  | `actual_cmt`            | Actual (Round Log Detail) | LOG: `log_data.physical_cmt` + CROSSCUT: `crosscut_done.crosscut_cmt` in period |
| 10 | `issue_for_flitch`      | Issue for Flitch        | Total CMT issued from flitch stock in period |
| 11 | `flitch_received`       | Flitch Received         | Total flitch CMT received in period (= Actual) |
| 12 | `flitch_diff`           | Flitch Diff             | Issue for Flitch − Flitch Received |
| 13 | `issue_for_slicing`     | Issue for Slicing       | CMT issued from `issued_for_slicing_model` in period |
| 14 | `slicing_received`      | Slicing Received        | CMT from `slicing_done_other_details_model` in period |
| 15 | `slicing_diff`          | Slicing Diff            | Issue for Slicing − Slicing Received |
| 16 | `issue_for_sqedge`      | Issue for Sq.Edge       | Placeholder – 0.000 (data source TBD) |
| 17 | `sales`                 | Sales                   | CMT issued for order/challan in period |
| 18 | `rejected`              | Rejected                | Flitch wastage (`wastage_info.wastage_sqm`) + Slicing wastage (`issue_for_slicing_wastage.cmt`) in period |
| 19 | `fl_closing`            | Closing Stock CMT       | Closing balance (CMT) |

---

## Data Sources

| Collection | Model | Fields used |
|------------|-------|-------------|
| `flitch_inventory_items_details` | `flitch_inventory_items_model` | `log_no`, `item_name`, `flitch_cmt`, `issue_status`, `is_rejected`, `invoice_id`, `updatedAt` |
| `flitch_inventory_invoice_details` | (via `$lookup`) | `inward_date`, `inward_sr_no` |
| `flitchings` | `flitching_done_model` | `log_no`, `item_name`, `flitch_cmt`, `issue_status`, `is_rejected`, `worker_details.flitching_date`, `crosscut_done_id`, `deleted_at`, `updatedAt`, `wastage_info.wastage_sqm` |
| `log_inventory_items_details` | (via `$lookup`) | `invoice_cmt`, `indian_cmt`, `physical_cmt` |
| `crosscutting_done` | (via `$lookup`) | `crosscut_cmt` |
| `issued_for_slicing` | `issued_for_slicing_model` | `log_no`, `cmt`, `date_of_issued` |
| `slicing_done_other_details` | `slicing_done_other_details_model` | `log_no`, `total_cmt`, `slicing_date` |
| `issue_for_slicing_wastage` | `issue_for_slicing_wastage_model` | `log_no`, `cmt`, `created_at` |

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

### Actual CMT (col 9) — Round Log Detail from LOG/CROSSCUT sources

Separated by `crosscut_done_id` field:
- **LOG sources** (`crosscut_done_id = null`): SUM(`log_inventory_items_details.physical_cmt`) where `worker_details.flitching_date` in period
- **CROSSCUT sources** (`crosscut_done_id != null`): SUM(`crosscutting_done.crosscut_cmt`) where `worker_details.flitching_date` in period

**Actual CMT = LOG Actual + CROSSCUT Actual**

### Invoice & Indian CMT (cols 7–8) — Round Log Detail from LOG sources only
- **Invoice CMT**: `log_inventory_items_details.invoice_cmt` (LOG sources only)
- **Indian CMT**: `log_inventory_items_details.indian_cmt` (LOG sources only)

### Flitch Received (col 11)
Sum of `flitch_cmt` from:
- `flitch_inventory_items_model` where `invoice.inward_date` in period (inventory)
- `flitching_done_model` where `worker_details.flitching_date` in period (CC/factory)

### Issue for Flitch (col 10)
Sum of `flitch_cmt` from both sources where `issue_status IN ['order','challan','slicing','slicing_peeling']` and `updatedAt` in period.

### Flitch Diff (col 12)
```
Flitch Diff = Issue for Flitch − Flitch Received
```

### Issue for Slicing (col 13)
Sum of `cmt` from `issued_for_slicing_model` matched by `log_no` and `date_of_issued` in period.

### Slicing Received (col 14)
Sum of `total_cmt` from `slicing_done_other_details_model` where `slicing_date` in period.

### Slicing Diff (col 15)
```
Slicing Diff = Issue for Slicing − Slicing Received
```

### Sales (col 17)
Sum of `flitch_cmt` from both sources where `issue_status IN ['order','challan']` and `updatedAt` in period.

### Rejected (col 18)
```
Rejected = Flitch Wastage + Slicing Wastage
```
- **Flitch Wastage**: SUM(`wastage_info.wastage_sqm`) from `flitching_done` where `worker_details.flitching_date` in period
- **Slicing Wastage**: SUM(`cmt`) from `issue_for_slicing_wastage_model` where `created_at` in period

### Opening Stock CMT (col 5)
```
Opening Stock = SUM(flitching_done.flitch_cmt) 
  WHERE worker_details.flitching_date < start_date 
    AND issue_status = null 
    AND deleted_at = null
```
Represents inventory available before the period (not issued, not rejected).

### Closing Stock CMT (col 19)
```
Closing Stock = MAX(0, Opening Stock + Flitch Received − Issue for Flitch − Sales)
```
Inventory-flow formula representing true ending balance (consumption accounts for all outflows: flitch issue + sales).

---

## Placeholder Columns

| Column | Status | Notes |
|--------|--------|-------|
| Recovered From rejected (col 6) | Placeholder 0 | No "recovered" flag in schema; future source TBD |
| Issue for Sq.Edge (col 16) | Placeholder 0 | No square-edge tracking in current factory module; future source TBD |

*Note: Invoice & Indian CMT (cols 7–8) are now sourced from `log_inventory_items_details` model (no longer placeholders).*

---

## Active Log Filter

A log is included in the report only if at least one of the following is non-zero:
- Opening balance, Flitch Received, Issue for Flitch, Closing Stock CMT, Slicing Received, Sales, Rejected

---

## Sample Report Output

```
Inward Item & Log Wise Report From 01/04/2025 To 15/07/2025

                    │         │ Received Flitch   │      Flitch Details CMT      │    Slicing Details CMT     │ Round log+Cross Cu │
Item Name│Log No.│Date│Status │ Op.Stock│RecovRej│Inv│ Indian│ Actual │IssFlitch│FlRecvd│FlDiff │IssSlic│SlicRecvd│SlicDiff│IssSqEdge│Sales│Rej│ClStock
─────────┼───────┼────┼───────┼─────────┼────────┼───┼───────┼────────┼─────────┼───────┼───────┼────────┼─────────┼────────┼─────────┼─────┼───┼───────
Red Oak  │ L1    │... │ Stock │  0.000  │  0.000 │ 1 │ 0.000 │ 0.357  │  0.000  │ 0.357 │-0.357 │  0.000 │  0.000  │  0.000 │  0.000  │0.000│0.0│ 0.357
         │ L2    │... │ Slicing│ 0.000  │  0.000 │ 1 │ 0.000 │ 0.270  │  0.270  │ 0.270 │ 0.000 │  0.270 │  0.230  │  0.040 │  0.000  │0.000│0.0│ 0.000
─────────┼───────┼────┼───────┼─────────┼────────┼───┼───────┼────────┼─────────┼───────┼───────┼────────┼─────────┼────────┼─────────┼─────┼───┼───────
Total    │       │    │       │ 0.000   │  0.000 │   │ 0.000 │ 0.627  │  0.270  │ 0.627 │-0.357 │  0.270 │  0.230  │  0.040 │  0.000  │0.000│0.0│ 0.357
```

---

## Files

| File | Purpose |
|------|---------|
| `topl_backend/controllers/reports2/Flitch/logWiseFlitch.js` | Data aggregation and business logic |
| `topl_backend/config/downloadExcel/reports2/Flitch/logWiseFlitch.js` | Excel generation (19-col multi-level headers) |
| `topl_backend/routes/report/reports2/Flitch/flitch.routes.js` | Route: `POST /api/V1/report/download-excel-log-wise-flitch-report` |

---

## Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0.0   | 2025-02-03 | Initial implementation (11 flat columns) |
| 2.0.0   | 2026-03-06 | Restructured to 19-column multi-level layout; added Inward Date, Status, Invoice, Indian/Actual, Issue/Diff for Flitch and Peeling |
| 3.0.0   | 2026-03-20 | Aligned to Item Wise v4: replaced Peeling with Slicing; inventory-flow opening/closing; LOG/CROSSCUT Round Log sourcing; wastage aggregation (flitch+slicing) in Rejected |
