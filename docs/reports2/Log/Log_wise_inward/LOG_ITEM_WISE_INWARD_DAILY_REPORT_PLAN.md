# Log Item Wise Inward Daily Report – Implementation Plan

**Overview:** The Log Item Wise Inward Daily Report API produces an Excel report with **one row per log** (logs inward in the selected date range), grouped by Item Name, with ROUND LOG details, Cross Cut details, Flitch details, CrossCut Log Issue For (SqEdge, Peeling), Sales, Rejected, Recover From Rejected, Job Work Challan, and Opening/Closing CMT. Data is sourced from `log_inventory_items_view`, `crosscutting_done`, and `flitching_done`.

---

## Report layout

- **Title:** "Inward Item and Log Wise Stock Details Between DD/MM/YYYY and DD/MM/YYYY"
- **Group headers (row 3):** ROUND LOG DETAIL CMT (cols 6–8), Cross Cut Details CMT (cols 10–13), Flitch Details CMT (cols 14–16), CrossCut Log Issue For CMT (cols 17–20)
- **Column headers (row 4):** ItemName, Log No, Inward Date, Status, Opening Bal. CMT, Invoice, Indian, Actual, Recover From Rejected, Issue For CC, CC Received, CC Issued, CC Diff, Issue For Flitch, Flitch Received, Flitch Diff, Issue For SqEdge, Peeling Issued, Peeling Received, Peeling Diff, Sales, Job Work Challan, Rejected, Closing Stock CMT
- **Data:** One row per log; item name merged vertically per item; item total row after each item group; grand total row at end
- **Numeric format:** 3 decimal places; closing balance ≥ 0

## Data sources

| Source | Role |
|--------|------|
| **log_inventory_items_view** | Logs with inward in period (`log_invoice_details.inward_date`); provides item_name, log_no, invoice_cmt, indian_cmt, physical_cmt, issue_status, updatedAt |
| **log_inventory_invoice_details** | Inward date (via view lookup) |
| **crosscutting_done** | CC Received, CC Issued, Issue for Flitch, Peeling Issued, Crosscut Sales, Rejected crosscut (by log_no, issue_status, createdAt/updatedAt) |
| **flitching_done** | Flitch Received, Flitch Sales, Rejected flitch (by log_no, deleted_at null, createdAt/updatedAt) |

## API contract

- **Endpoint:** `POST /api/V1/report/download-excel-log-item-wise-inward-daily-report`
- **Request:** `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "filter": { "item_name": "..." } }` — filter optional
- **Success (200):** `{ result: "<APP_URL>/public/upload/reports/reports2/Log/Log-Item-Wise-Inward-Report-<timestamp>.xlsx", statusCode: 200, success: true, message: "..." }`
- **Errors:** 400 missing/invalid dates; 404 no log data for period

## File structure (implemented)

| Purpose | Path |
|---------|------|
| Controller | `controllers/reports2/Log/logItemWiseInward.js` |
| Excel generator | `config/downloadExcel/reports2/Log/logItemWiseInward.js` |
| Routes | `routes/report/reports2/Log/log.routes.js` — POST `/download-excel-log-item-wise-inward-daily-report` |
| Mount | `routes/report/reports2.routes.js` — log routes under `/api/V1/report` |

## Flow summary

1. Validate startDate/endDate; parse and set end to 23:59:59.999.
2. Match logs: `log_inventory_items_view` where `log_invoice_details.inward_date` in [start, end]; optional `item_name` filter; sort by item_name asc, log_no asc.
3. For each log (Promise.all): compute inward_date, status, opening (0), round log fields, recover_from_rejected (0), issue for CC, CC received, CC issued, CC diff, issue for flitch, flitch received, flitch diff, issue for sqedge (0), peeling issued, peeling received (= peeling issued), peeling diff (0), sales (log + crosscut + flitch), job_work_challan (0), rejected (crosscut + flitch + peeling), closing CMT.
4. Call `createLogItemWiseInwardReportExcel(logData, startDate, endDate, filter)`.
5. Return 200 with download URL in `result`.

## Placeholder columns (currently 0.000)

- **Recover From Rejected**: Data source and business rules to be defined.
- **Issue For SqEdge**: Data source and business rules to be defined (replaces previous Sawing/Wooden Tile/UnEdge).
- **Peeling Received**: Currently echoes Peeling Issued; actual peeling_done aggregation pending.
- **Peeling Diff**: Will be meaningful once Peeling Received is properly implemented.
- **Job Work Challan**: Data source to be defined.
