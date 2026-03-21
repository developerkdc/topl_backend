# Item wise inward report — implementation plan

## Scope

Date-range, **item-aggregated** inward / process / sales / rejection movements with opening and closing balances in CMT.

## Code map

| Step | Location |
|------|----------|
| Handler | `controllers/reports2/Log/itemWiseInward.js` → `ItemWiseInwardDailyReportExcel` |
| Route | `routes/report/reports2/Log/log.routes.js` |
| Excel | `config/downloadExcel/reports2/Log/itemWiseInward.js` → `createItemWiseInwardReportExcel` |

## Data sources (by step)

All keys are grouped by `{ item_id, item_name }` unless noted.

| Step | Intent | Primary models / collections |
|------|--------|------------------------------|
| 1 | Universe of items | `log_inventory_items_model` — distinct `item_id` + `item_name` (optional `item_name` filter) |
| 3 | **Current available CMT** (“live” closing if period includes today) | Sum of: round logs (`physical_cmt`, `issue_status` null/absent), `crosscutting_done` (`crosscut_cmt`, same), `flitching_done` (`flitch_cmt`, `deleted_at` null, same issue rule) |
| 3a | Logs received in period | `log_inventory_items_model` + lookup `log_inventory_invoice_details`; filter `invoice.inward_date` ∈ range; sums `invoice_cmt`, `indian_cmt`, `physical_cmt` |
| 4 | Issue for crosscut | `log_inventory_items_model`: `issue_status === 'crosscutting'`, `createdAt` ∈ range |
| 5 | Crosscut issued onward | `crosscutting_done_model`: `createdAt` ∈ range, `issue_status != null` — sums `crosscut_cmt` |
| 6 | Crosscut received | `crosscutting_done_model`: `createdAt` ∈ range — sums `crosscut_cmt` |
| 7 | Flitch issued | `issues_for_flitching_model`: `createdAt` ∈ range — sums `cmt` |
| 8 | Flitch received | `flitching_done_model`: `createdAt` ∈ range — sums `flitch_cmt` |
| 9 | Peeling issued | `issues_for_peeling_model`: `createdAt` ∈ range — sums `cmt` |
| 10 | Peeling received | `peeling_done_other_details_model` + items from `peeling_done_items`; allocates `total_cmt` to each line by share of `items.cmt`; groups by item |
| 10a | Sales vs job work | `issue_status === 'order'` → column `sales`; `issue_status === 'challan'` → `job_work_challan` on log, crosscut done, and flitching done (with `deleted_at` null on flitch) |
| 10b | Rejected | `rejected_crosscutting_model` (`rejected_quantity.physical_cmt`); flitch wastage as `wastage_sqm * sqm_factor`; `issues_for_peeling_wastage_model` joined to issue for peeling (filter by `item_name` when set) |
| 10c | Past periods | If `end < now`, recompute period-end closing: `currentAvailable − receivedAfter + issuedAfter` using aggregates with `inward_date` / `createdAt` / `updatedAt` **after** `end` (see controller for exact splits) |

## Core formulas (controller comments + code)

- **Received (for opening formula):** `actual_cmt` = sum of physical CMT from logs whose inward falls in the period.
- **Issued (for opening formula):**  
  `issue_for_cc + flitch_issued + peeling_issued + sales + job_work_challan + rejected`
- **Period-end closing:**  
  - If `endDate >= now`: use summed **current available** map.  
  - Else: `max(0, currentAvailable − receivedAfter + issuedAfter)`.
- **Opening:** `max(0, periodEndClosing + issued − received)`
- **Closing:** `opening + received − issued`

## Row inclusion rules

Final keys = items in `itemsInPeriod` (from step 3a) that also appear in `reportMap` or `currentAvailableMap` for that key. Items with movement but **no inward in range** are excluded.

## Placeholders

`recover_from_rejected` and `issue_for_sqedge` are carried in the map as **0** (reserved for future use).

## Assumptions and caveats

- **Timestamps:** Mix of `createdAt` and `updatedAt` across steps — intentional; e.g. issue-for-CC uses **`createdAt`**, while the older commented implementation used `updatedAt` for some flows. Align any bugfix with business meaning of each event.
- **Flitch “issued”** uses **`issues_for_flitching`** totals, not crosscut `issue_status: 'flitching'` (contrast with log-item-wise report).
- **Peeling received** uses **`peeling_done_other_details.createdAt`** in range, not peeling date field.
- **Item filter:** Applied on collections that expose `item_id`/`item_name`; peeling-only paths apply extra `$match` on embedded item when `filter.item_name` is set.

## Excel layer

`createItemWiseInwardReportExcel` receives the final array of row objects (opening, invoice/indian/actual, CC/flitch/peeling columns, diffs, sales, job work challan, rejected, closing). Column order and labels are defined only in the Excel module — adjust there for layout changes.

## Testing suggestions

- Range spanning “today” vs fully historical (triggers 10c).
- Item with inward only vs item with only downstream activity (expect exclusion for latter).
- Single-day vs multi-month range for aggregate correctness.

## Docs in this folder

| File | Role |
|------|------|
| `ITEM_WISE_INWARD_REPORT_API.md` | Endpoint, request/response |
| `ITEM_WISE_INWARD_REPORT_PLAN.md` | This file — aggregations and formulas |
