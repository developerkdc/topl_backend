# Log Wise Crosscut Report – Implementation Plan

> **Purpose:** Preserve the implementation plan alongside the API documentation so future developers can see how the feature was scoped and built.

---

## Goal

Implement the **Log Wise Crosscut** report that:

- Shows one row per **log** (`log_no`) with columns exactly as in the reference image
- Groups rows by **Item Name** (with merged cell for item name where multiple logs share the same item)
- Adds **one Totals row** after each Item Name group (subtotal) and **one Total row** at the end (grand total)
- Accepts `startDate` and `endDate` (and optional `filter.item_name`) in request body, consistent with Log/Flitch/Dressing reports

## Reference image columns (in order)

1. Item Name
2. Log No
3. Invoice CMT
4. Indian CMT
5. Physical CMT
6. Op Bal
7. CC Received
8. CC Issued
9. CC Closing
10. Physical Length
11. CC Length
12. Flitch Received
13. SQ Received
14. UN Received
15. Peel Received

## Schema and data sources

**Relevant collections:**

- **issuedForCutting.schema.js** (`topl_backend/database/schema/factory/crossCutting/issuedForCutting.schema.js`)
  - `issues_for_crosscutting`: `log_no`, `item_name`, `invoice_cmt`, `indian_cmt`, `physical_length`, `physical_cmt`, `createdAt`.
- **crosscutting.schema.js** (`topl_backend/database/schema/factory/crossCutting/crosscutting.schema.js`)
  - `crosscutting_done`: `log_no`, `item_name`, `length`, `crosscut_cmt`, `issue_status` (flitching, peeling), `worker_details.crosscut_date`, `createdAt`, `updatedAt`, `deleted_at`.

**Column mapping (with current schema):**

| Column | Source / note |
|--------|----------------|
| Item Name, Log No | From distinct (log_no, item_name). |
| Invoice CMT, Indian CMT, Physical CMT, Physical Length | From `issues_for_crosscutting`: one representative row per log (e.g. `$first` after sort by `createdAt`). |
| Op Bal | Crosscut stock at period start: sum of `crosscut_cmt` from `crosscutting_done` where log+item match, `issue_status` null, `worker_details.crosscut_date` < start. |
| CC Received | Sum `crosscut_cmt` from `crosscutting_done` for that log where `worker_details.crosscut_date` in [start, end]. |
| CC Issued | Sum `physical_cmt` from `issues_for_crosscutting` for that log where `createdAt` in [start, end]. |
| CC Closing | Op Bal + CC Received − CC Issued (capped at 0). |
| CC Length | Sum of `length` from `crosscutting_done` for that log in period (same date filter as CC Received). |
| Flitch Received | Sum `crosscut_cmt` from `crosscutting_done` for that log where `issue_status === 'flitching'` and `updatedAt` in [start, end]. |
| SQ Received, UN Received | No schema source; use **0**. |
| Peel Received | Sum `crosscut_cmt` from `crosscutting_done` for that log where `issue_status === 'peeling'` and `updatedAt` in [start, end]. |

## File and route layout

- **Controller:** `topl_backend/controllers/reports2/Crosscut/logWiseCrosscut.js`
- **Excel config:** `topl_backend/config/downloadExcel/reports2/Crosscut/logWiseCrosscut.js`
- **Route:** Add one POST in `topl_backend/routes/report/reports2/Crosscut/crosscut.routes.js`

Route path: `POST .../report/download-excel-log-wise-crosscut-report`  
Request body: `{ startDate, endDate, filter?: { item_name? } }`.

## Implementation steps

### 1. Controller – controllers/reports2/Crosscut/logWiseCrosscut.js

- Validate `startDate`/`endDate`, parse dates, apply optional `filter.item_name`.
- Get distinct `(log_no, item_name)` from `issues_for_crosscutting` and `crosscutting_done` (merge and dedupe).
- One aggregation on `issues_for_crosscutting`: `$group` by log_no+item_name with `$first` for invoice_cmt, indian_cmt, physical_cmt, physical_length (after `$sort` by createdAt).
- For each log: Op Bal (crosscutting_done, issue_status null, crosscut_date < start), CC Received (crosscut_date in period), CC Issued (issues_for_crosscutting createdAt in period), CC Closing (formula), CC Length (sum length in period), Flitch/Peel Received (issue_status + updatedAt in period). SQ/UN = 0.
- Sort rows by item_name then log_no; call Excel generator with (rows, startDate, endDate, filter); return download link.

### 2. Excel config – config/downloadExcel/reports2/Crosscut/logWiseCrosscut.js

- Title: "Logwise Crosscut between DD/MM/YYYY and DD/MM/YYYY".
- Single header row with 15 column names; group data by item_name; merge item_name vertically per group.
- For each item group: data rows (one per log), then **Totals** row (subtotal). After all groups: **Total** row (grand total). All numeric 3 decimals; Totals/Total rows bold and styled.
- Save to `public/upload/reports/reports2/Crosscut/LogWiseCrosscut_{timestamp}.xlsx`; return APP_URL + path.

### 3. Route – routes/report/reports2/Crosscut/crosscut.routes.js

- Import: `import { LogWiseCrosscutReportExcel } from '../../../../controllers/reports2/Crosscut/logWiseCrosscut.js';`
- Add: `router.post('/download-excel-log-wise-crosscut-report', LogWiseCrosscutReportExcel);`

## References

- **Log-wise aggregation and totals:** logWiseFlitch.js (controller + config), logItemWiseInward.js (item totals + grand total).
- **Crosscut schema:** issuedForCutting.schema.js, crosscutting.schema.js.

## Assumptions and notes

- **SQ Received, UN Received:** No source in crosscut schema; columns shown with 0. Can be wired later if a source is added.
- **Totals:** One "Totals" row after each Item Name group (subtotal); one "Total" row at the end (grand total), matching the reference image.
