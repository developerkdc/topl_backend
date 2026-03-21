# Log Wise Dressing Report – Implementation Plan

> **Stored from:** `.cursor/plans/log_wise_dressing_report_51e856ad.plan.md`  
> **Purpose:** Preserve the original implementation plan alongside the API documentation so future developers can see how the feature was scoped and built.

---

## Goal

Implement the **Dressing Stock Register By LogX** report that:

- Shows one row per **Log X** (`log_no_code`) with columns exactly as in the reference image
- Groups rows by **Item Group Name** / **Item Name** (with merged cell for item group where multiple logs share the same item)
- Adds **one Total row** at the end summing all numeric columns
- Accepts `startDate` and `endDate` (and optional `filter`) in request body, consistent with Log/Flitch reports

## Reference image columns (in order)

1. Item Group Name
2. Item Name
3. Dressing Date
4. Log X
5. Opening Balance
6. Purchase
7. Receipt
8. Issue Sq Mtr
9. Clipping
10. Dyeing
11. Mixmatch
12. Edgebanding
13. Lipping
14. Redressing
15. Sale
16. Closing Balance
17. Issue From Old Balance
18. Closing Balance Old
19. Issue From New Balance
20. Closing Balance New

## Schema and data sources

**Relevant collections:**

- **dressing.done.schema.js** (`topl_backend/database/schema/factory/dressing/dressing_done/dressing.done.schema.js`)
  - `dressing_done_other_details`: `dressing_date`, `_id`.
  - `dressing_done_items`: `log_no_code`, `item_name`, `item_sub_category_name`, `sqm`, `issue_status` (enum: `grouping`, `order`, `smoking_dying`), `dressing_done_other_details_id`, `createdAt`, `updatedAt`.

**No separate "dressing inventory" table** – stock is derived from:

- **Receipt**: dressing done in period = sum of `dressing_done_items.sqm` where the linked `dressing_done_other_details.dressing_date` is within `[startDate, endDate]`.
- **Issue**: sum of `sqm` where `issue_status` is set and `updatedAt` (or issue date) falls in period. **Sale** = issue where `issue_status === 'order'`.

**Column mapping (with current schema):**

| Column | Source / note |
|--------|----------------|
| Item Group Name | `dressing_done_items.item_sub_category_name` (or fallback `item_name` if no group) |
| Item Name | `dressing_done_items.item_name` |
| Dressing Date | From `dressing_done_other_details.dressing_date` – for log-wise, use one date per log (e.g. first or last dressing date for that `log_no_code` in the period) |
| Log X | `dressing_done_items.log_no_code` |
| Opening Balance | Closing balance at end of the day before the date range. Compute day-by-day: for each day up to (startDate − 1), closing = max(0, previous closing + receipt that day − issue that day); opening = that closing after the last day. Requires receipt/issue per log per day before start. |
| Purchase | Not in dressing flow; use **0** unless another source is added. |
| Receipt | Sum of `sqm` for that log where dressing was done in period (join with `dressing_done_other_details`, filter by `dressing_date` in range). |
| Issue Sq Mtr | Sum of `sqm` for that log where `issue_status` is set and issue happened in period (e.g. `updatedAt` in range). |
| Clipping | Issue to Grouping: sum of `sqm` for that log where `issue_status === 'grouping'` and issue in period (`updatedAt` in range). |
| Dyeing | Issue to Smoking/Dyeing: sum of `sqm` for that log where `issue_status === 'smoking_dying'` and issue in period (`updatedAt` in range). |
| Mixmatch | Dressing mismatch: sum of `sqm` from **dressing_miss_match_data** for that log where `dressing_date` in report period (`dressing_miss_match_data` has `log_no_code`). |
| Edgebanding, Lipping, Redressing | Not present in dressing schema; use **0** unless you provide another source (e.g. from another module). |
| Sale | Subset of Issue where `issue_status === 'order'`. |
| Closing Balance | Opening + Receipt − Issue (or equivalent end-of-period balance). |
| Issue From Old Balance / Closing Balance Old / Issue From New Balance / Closing Balance New | Define: "Old" = before period, "New" = within period. Derive from same receipt/issue aggregates. |

**Recommendation:** Implement Opening/Closing and "Old"/"New" using the same receipt/issue logic as in logWiseFlitch.js (opening = current + issued − received; closing = opening + received − issued), adapted to dressing (receipt = dressing done in period, issue = issued for grouping/order/smoking_dying in period).

## File and route layout

- **Controller:** `topl_backend/controllers/reports2/Flitch/logWiseDressingReport.js` (new)
- **Excel config:** `topl_backend/config/downloadExcel/reports2/Flitch/logWiseDressingReport.js` (new)
- **Route:** Add one POST in `topl_backend/routes/report/reports2/Dressing/dressing.routes.js`, importing the controller from the Flitch folder.

Route path: `POST .../dressing/download-excel-log-wise-dressing-report`  
Request body: `{ startDate, endDate, filter?: { item_name?, ... } }`.

## Implementation steps

### 1. Controller – controllers/reports2/Flitch/logWiseDressingReport.js

- Follow pattern of logWiseFlitch.js and logItemWiseInward.js: validate `startDate`/`endDate`, parse dates, apply optional `filter` (e.g. `item_name`).
- Get distinct `log_no_code` (+ item_name, item_sub_category_name) from `dressing_done_items`, joining `dressing_done_other_details` for `dressing_date`.
- For each log:
  - **Receipt (period):** aggregate `dressing_done_items.sqm` where `dressing_done_other_details.dressing_date` in `[start, end]`.
  - **Issue (period):** aggregate `dressing_done_items.sqm` where `issue_status` is not null and `updatedAt` in `[start, end]` (and Sale = same where `issue_status === 'order'`).
  - **Opening balance:** closing balance at end of (startDate − 1). Aggregate receipt and issue **per log per day** before start; then for each log, sort days and compute running closing = max(0, running_closing + receipt_day − issue_day). Opening = running closing after last day.
  - **Closing balance:** opening + receipt − issue (for period).
  - **Dressing date:** e.g. min or max `dressing_date` for that log in period (or first dressing date in period).
  - Set Purchase, Edgebanding, Lipping, Redressing to 0 unless another source is specified. Clipping = issue to Grouping; Dyeing = issue to Smoking/Dyeing; Mixmatch = sum of `sqm` from `dressing_miss_match_data` by log, `dressing_date` in period.
  - Compute Issue From Old/New Balance and Closing Balance Old/New from the same receipt/issue breakdown (old = before period, new = in period).
- Build array of row objects with the 20 fields; sort by item group / item name / log_no_code.
- Call Excel generator with rows, startDate, endDate, filter; return download link in response (same response shape as Log/Flitch reports).

### 2. Excel config – config/downloadExcel/reports2/Flitch/logWiseDressingReport.js

- Follow logWiseFlitch.js and logItemWiseInward.js: ExcelJS workbook, title "Dressing Stock Register By LogX - &lt;startDate&gt;-&lt;endDate&gt;" (format dates as DD/MM/YYYY).
- Define 20 columns to match the image; set column widths and header row with same headers as above.
- Group rows by Item Group Name / Item Name (merge cell for first column for same item group/item, like logItemWiseInward).
- Add data rows from the controller payload; format numbers (e.g. 2 decimal places for sqm/balances).
- Add **one Total row** at the end: sum all numeric columns (leave Item Group Name / Item Name / Dressing Date / Log X as "Total" or empty as appropriate).
- Save to `public/upload/reports/reports2/Dressing/` with a unique filename; return download URL.

### 3. Route – routes/report/reports2/Dressing/dressing.routes.js

- Import: `import { LogWiseDressingReportExcel } from '../../../../controllers/reports2/Flitch/logWiseDressingReport.js';`
- Add: `router.post('/download-excel-log-wise-dressing-report', LogWiseDressingReportExcel);`

## References

- **Log report (structure, validation, body):** log.routes.js, logItemWiseInward.js (controller + config).
- **Log-wise aggregation and total row:** logWiseFlitch.js (controller + config).
- **Dressing schema:** dressing.done.schema.js.

## Assumptions and notes

- **Item Group Name:** Mapped from `item_sub_category_name`; if null/empty, use `item_name` so the report always has a label.
- **Clipping** and **Dyeing** are wired to issue data: Clipping = issue to Grouping (`issue_status === 'grouping'`), Dyeing = issue to Smoking/Dyeing (`issue_status === 'smoking_dying'`), both using `updatedAt` in the report period.
- **Mixmatch** is wired to **dressing_miss_match_data**: aggregate by `log_no_code`, `dressing_date` in period, sum `sqm`.
- **Purchase, Edgebanding, Lipping, Redressing:** Kept as 0 unless another source is added.
- **Old/New balance columns:** Implemented as "before period" vs "in period"; if your existing report uses different rules, those can be applied in the controller once defined.
- **One Total row:** Single summary row at the end of the sheet (no per-item subtotals unless you add them later).
