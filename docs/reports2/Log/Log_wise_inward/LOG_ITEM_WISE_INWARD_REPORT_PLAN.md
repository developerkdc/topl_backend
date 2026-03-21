# Log item wise inward report — implementation plan

## Scope

Per-**log** inward and process trail for logs inwarded in a date range; exported as Excel.

## Code map

| Step | Location |
|------|----------|
| Handler | `controllers/reports2/Log/logItemWiseInward.js` → `LogItemWiseInwardDailyReportExcel` |
| Route | `routes/report/reports2/Log/log.routes.js` |
| Excel | `config/downloadExcel/reports2/Log/logItemWiseInward.js` |

## Entry filter

- Aggregate on `log_inventory_items_model`: lookup `log_inventory_invoice_details`, `inward_date` ∈ `[start, end]`, optional `item_name` match.
- Build `Map(log_no → item_name)`; if empty → 404.

## Per-log data sources

For each `log_no` (and associated `item_name` from the map):

| Metric | Source / rule |
|--------|----------------|
| Display invoice / Indian / actual | Latest `log_inventory_items_view_model.findOne({ log_no }).sort({ updatedAt: -1 })` |
| Current available | Sum of available CMT on round log + `crosscutting_done` + `flitching_done` (same `issue_status` null/absent rules as item-wise) |
| Received in period | Log lines for `log_no` with inward date in range → sum `physical_cmt` |
| Issue for CC | `log_inventory_items`: `issue_status === 'crosscutting'`, **`updatedAt`** in range |
| CC received | `crosscutting_done`: `createdAt` in range |
| CC issued (onward) | `crosscutting_done`: `createdAt` in range, `issue_status != null` |
| Issue for flitch | **`crosscutting_done`**: `issue_status === 'flitching'`, **`updatedAt`** in range — sum `crosscut_cmt` (not `issues_for_flitching`) |
| Flitch received | `flitching_done`: `createdAt` in range, `deleted_at` null |
| Peeling issued | **`crosscutting_done`**: `issue_status === 'peeling'`, **`updatedAt`** in range |
| Peeling received | `peeling_done_other_details` with **`peeling_date`** in range; join `peeling_done_items`, filter `items.log_no`; allocate `total_cmt` by share of CMT for that log within the batch |
| Sales / job work challan | Same split as item-wise (`order` vs `challan`) on log / crosscut / flitch with **`updatedAt`** in range |
| Rejected | Same three sources as item-wise but scoped by `log_no` on each collection / join |

## Opening / closing

- **Period-end closing:** If `end >= now`, use current available; else reconstruct with “after end” aggregates (inward after end, issues/sales/rejections with `updatedAt` or `createdAt` > end as in controller).
- **Total issued:** `issueForCc + flitchingCmt + peelCmt + salesCmt + jobWorkChallan + rejected`
- **Opening:** `max(0, periodEndClosing + totalIssued − receivedCmt)`
- **Closing:** `opening + receivedCmt − totalIssued` (then `max(0, ...)` on stored closing column)

## Active row filter

Keeps a row if any of: opening, received, issue_for_cc, closing, cc_received, flitch/peeling/sales/rejected columns > 0 (see `activeLogs` in controller). **Does not** require `invoice_cmt` / `indian_cmt` alone to qualify.

## Placeholders

`sawingCmt`, `woodenTileCmt`, `unedgeCmt`, `recoverFromRejected`, `issueForSqedge` are **0** or empty in the returned row object.

## Differences vs item-wise inward report (important)

| Topic | Item wise (`itemWiseInward.js`) | Log item wise (`logItemWiseInward.js`) |
|-------|--------------------------------|----------------------------------------|
| Grain | One row per `item_id` + `item_name` | One row per `log_no` |
| Issue for flitch | `issues_for_flitching` by `createdAt` | Crosscut rows with `issue_status === 'flitching'` by `updatedAt` |
| Issue for peeling | `issues_for_peeling` by `createdAt` | Crosscut rows with `issue_status === 'peeling'` by `updatedAt` |
| Issue for CC | `createdAt` on log line | `updatedAt` on log line |
| Peeling received date field | `peeling_done_other_details.createdAt` | `peeling_done_other_details.peeling_date` |
| Performance | Bulk aggregations | **Per-log** `Promise.all` of many queries — can be slow for large log counts |

## Assumptions

- `log_no` is unique enough within the filtered set for the map; if duplicates map to one item name, last wins in iteration order (Map insertion).
- View document used for invoice/indian/actual reflects “current” log state, not necessarily historical at period end.

## Excel layer

`createLogItemWiseInwardReportExcel` defines column headers and grouping; keep controller field names in sync when adding metrics.

## Docs in this folder

| File | Role |
|------|------|
| `LOG_ITEM_WISE_INWARD_REPORT_API.md` | Endpoint, request/response |
| `LOG_ITEM_WISE_INWARD_REPORT_PLAN.md` | This file — per-log logic and comparisons |
