# Log Wise TappingORClipping Report – Implementation Plan

> **Purpose:** Preserve the implementation plan alongside the API documentation so future developers can see how the feature was scoped and built.

---

## Goal

Implement the **Clipping Item Stock Register** (Log Wise TappingORClipping) report that:

- Shows one row per **(Item Group Name, Item Name, Clipping Date, Log X)** with columns matching the reference layout
- Includes Opening Balance, Received (Sq. Mtr.), Issue (Sq. Mtr.), Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance
- Adds **one Total row** at the end summing all numeric columns
- Accepts `startDate` and `endDate` (and optional `filter`) in request body, consistent with other reports2 APIs

## Report Columns (in order)

1. Item Group Name  
2. Item Name  
3. Clipping Date  
4. Log X  
5. Opening Balance  
6. Received (Sq. Mtr.)  
7. Issue (Sq. Mtr.)  
8. Issue For (in Sq. Mtr.) — merged over:  
   - Hand Splicing  
   - Splicing  
   - Clipped Packing  
   - Damaged  
   - Cal Ply Production  
9. Closing Balance  

## Schema and Data Sources

**Relevant collections:**

- **tapping_done.schema.js**  
  - `tapping_done_other_details`: `tapping_date`, `_id`.  
  - `tapping_done_items_details`: `item_sub_category_name`, `item_name`, `log_no_code`, `sqm`, `tapping_done_other_details_id`.
- **tapping_done_history.schema.js**  
  - `tapping_done_history`: `log_no_code`, `item_name`, `item_sub_category_name`, `sqm`, `updatedAt`, `issue_status` (e.g. `pressing`).

**Column mapping:**

| Column | Source / note |
|--------|----------------|
| Item Group Name | `tapping_done_items_details.item_sub_category_name` |
| Item Name | `tapping_done_items_details.item_name` |
| Clipping Date | `tapping_done_other_details.tapping_date` (join via `tapping_done_other_details_id`) |
| Log X | `tapping_done_items_details.log_no_code` |
| Opening Balance | For first date of log in range: received before start − issued before start. For later dates: previous row’s closing. |
| Received | Sum of `sqm` from tapping_done for that (log, item, tapping_date) in range |
| Issue | Sum of `sqm` from tapping_done_history for that (log, item) on that date (updatedAt in range) |
| Issue For | Splicing = issue (pressing); Hand Splicing, Clipped Packing, Damaged, Cal Ply = 0 in current schema |
| Closing Balance | Opening + Received − Issue (per row) |

## File and Route Layout

- **Controller:** `topl_backend/controllers/reports2/TappingORClipping/logWiseTappingORClipping.js`
- **Excel config:** `topl_backend/config/downloadExcel/reports2/TappingORClipping/logWiseTappingORClipping.js`
- **Route:** `topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js`  
  - Path: `POST /download-excel-log-wise-tapping-or-clipping-report`  
  - Full URL: `POST /api/V1/report/download-excel-log-wise-tapping-or-clipping-report`  
- **Request body:** `{ startDate, endDate, filter?: { item_name?, item_group_name? } }`

## Mount

TappingORClipping router is mounted in `topl_backend/routes/report/reports2.routes.js` (no separate mount needed for this report).
