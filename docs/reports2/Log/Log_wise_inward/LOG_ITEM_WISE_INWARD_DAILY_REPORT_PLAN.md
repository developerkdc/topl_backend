# Log Item Wise Inward Daily Report – Implementation Plan

**Overview:** The Log Item Wise Inward Daily Report API produces an Excel report with **one row per log** (logs inward in the selected date range), grouped by Item Name, with ROUND LOG details, Cross Cut details, CrossCut Log Issue For (Flitch, Sawing, Wooden Tile, UnEdge, Peel), Sales, and Opening/Closing CMT. Data is sourced from `log_inventory_items_view`, `crosscutting_done`, and `flitching_done`.

---

## Report layout

- **Title:** "Inward Item and Log Wise Stock Details Between DD/MM/YYYY and DD/MM/YYYY"
- **Group headers (row 3):** ROUND LOG DETAIL CMT (cols 4–6), Cross Cut Details CMT (cols 7–9), CrossCut Log Issue For CMT (cols 10–14)
- **Column headers (row 4):** ItemName, Log No, Opening Bal. CMT, Invoice, Indian, Actual, Issue For CC, CC Received, DIFF, Flitch, Sawing, Wooden Tile, UnEdge, Peel, Sales, Closing Stock CMT
- **Data:** One row per log; item name merged vertically per item; item total row after each item group; grand total row at end
- **Numeric format:** 3 decimal places; closing balance ≥ 0

## Data sources

| Source | Role |
|--------|------|
| **log_inventory_items_view** | Logs with inward in period (`log_invoice_details.inward_date`); provides item_name, log_no, invoice_cmt, indian_cmt, physical_cmt, issue_status, updatedAt |
| **log_inventory_invoice_details** | Inward date (via view lookup) |
| **crosscutting_done** | CC Received (createdAt in period), Flitching, Peel, Crosscut Sales (by log_no, issue_status, updatedAt) |
| **flitching_done** | Flitch Sales (by log_no, issue_status order/challan, deleted_at null, updatedAt in period) |

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
2. Match logs: `log_inventory_items_view` where `log_invoice_details.inward_date` in [start, end]; optional `item_name` filter.
3. For each log (Promise.all): compute opening (0), round log fields, issue for CC, CC received, diff, flitching, sawing/wooden tile/unedge (0), peel, sales (log + crosscut + flitch), closing CMT.
4. Call `createLogItemWiseInwardReportExcel(logData, startDate, endDate, filter)`.
5. Return 200 with download URL in `result`.

## Pending

- **Sawing, Wooden Tile, UnEdge:** Data source and business rules to be defined (currently 0).
