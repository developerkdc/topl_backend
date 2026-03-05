# Tapping OR Clipping Stock Register API Plan

**Overview:** Add a Tapping OR Clipping (Clipping) Stock Register report API under reports2 that matches the image: date range, Item Group Name, Item Name, Opening Balance, Received Sq. Mtr., Issue Sq. Mtr., Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance, and a Total row. Implementation follows existing Dressing/Grouping Stock Register patterns and uses tapping_done, tapping_done_history, and issue_for_tapping_wastage data with placeholder columns (Clipped Packing, Cal Ply Production) where schema has no source yet.

---

## Goal

Implement a **Clipping Item Stock Register** report that matches the provided layout: title "Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY", table with Item Group Name, Item Name, Opening Balance, Received Sq. Mtr., Issue Sq. Mtr., Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production), Closing Balance, and a **Total** row at the bottom. Negative balances shown in parentheses.

## Data source and schema

- **Primary source**: `topl_backend/database/schema/factory/tapping/tapping_done/tapping_done.schema.js`
  - **tapping_done_other_details**: `tapping_date` (used to filter "Received" in period), `splicing_type` (HAND SPLICING, MACHINE SPLICING, SPLICING) for issue-for breakdown.
  - **tapping_done_items_details**: `item_name`, `item_sub_category_name`, `sqm`, `available_details.sqm`, `tapping_done_other_details_id`.
- **Issue (to pressing)**: `topl_backend/database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js` — `tapping_done_history` with `item_name`, `item_sub_category_name`, `sqm`, `tapping_done_item_id`, `createdAt`. Join to tapping_done_items_details then tapping_done_other_details to get `splicing_type` for Hand Splicing vs Splicing.
- **Damaged/wastage**: `topl_backend/database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js` — `issue_for_tapping_wastage` with `issue_for_tapping_item_id`, `sqm`, `createdAt`. Join to `issue_for_tappings` for `item_sub_category_name`, `item_name`.
- **Item Group Name**: Use `item_sub_category_name` from `tapping_done_items_details` (or `issue_for_tappings` for wastage join).
- **Item Name**: `item_name` from same.

**Mapping to report columns (from current schema):**

| Report column   | Source / logic                                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Item Group Name | `item_sub_category_name`                                                                                                                       |
| Item Name       | `item_name`                                                                                                                                    |
| Opening Balance | Current available (sum `available_details.sqm`) + issued in period − received in period                                                         |
| Received        | Sum of `sqm` where `tapping_done_other_details.tapping_date` in [startDate, endDate]                                                           |
| Issue Sq. Mtr.  | Sum of `sqm` from `tapping_done_history` where `createdAt` in [startDate, endDate]                                                             |
| Hand Splicing   | Same history, join to tapping_done_other_details; filter `splicing_type === 'HAND SPLICING'`, sum sqm                                            |
| Splicing        | Same join; filter `splicing_type` in ['MACHINE SPLICING', 'SPLICING'], sum sqm                                                                  |
| Clipped Packing  | **No schema** → use **0**                                                                                                                      |
| Damaged         | Sum of `sqm` from **issue_for_tapping_wastage** (createdAt in range) joined to **issue_for_tappings** by item                                  |
| Cal Ply Production | **No schema** → use **0**                                                                                                                   |
| Closing Balance | Opening + Received − Issue total                                                                                                               |

**Period logic (align with Dressing/Grouping):**

- **Received in period**: Join `tapping_done_items_details` → `tapping_done_other_details`, filter `tapping_date` in [start, end], sum `sqm` by (item_sub_category_name, item_name).
- **Issue total in period**: From `tapping_done_history`, filter `createdAt` in [start, end], sum `sqm` by (item_sub_category_name, item_name).
- **Issue For Hand Splicing / Splicing**: Same history, join to tapping_done_items_details (tapping_done_item_id) then tapping_done_other_details; filter by splicing_type, sum sqm.
- **Damaged in period**: From `issue_for_tapping_wastage`, filter `createdAt` in [start, end], lookup `issue_for_tappings`, sum `sqm` by (item_sub_category_name, item_name).
- **Current available**: Sum `available_details.sqm` from `tapping_done_items_details` by item.
- **Opening** = current available + issued in period − received.
- **Closing** = opening + received − issue total (no floor at 0; negatives allowed).

## File and route layout

- **Controller**: New file `topl_backend/controllers/reports2/TappingORClipping/tappingORClippingStockRegister.js` (single export `TappingORClippingStockRegisterExcel`).
- **Config (Excel)**: New file `topl_backend/config/downloadExcel/reports2/TappingORClipping/tappingORClippingStockRegister.js` (single export `GenerateTappingORClippingStockRegisterExcel`).
- **Routes**: Add one POST route in existing `topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js`.

Reference patterns:

- **Route pattern**: `topl_backend/routes/report/reports2/Dressing/dressing.routes.js` (stock register alongside daily report).
- **Controller + balance logic**: `topl_backend/controllers/reports2/Dressing/dressingStockRegister.js` (startDate/endDate, filter, opening/closing, filter active rows, call Excel generator).
- **Excel structure**: `topl_backend/config/downloadExcel/reports2/Grouping_Splicing/groupingSplicingStockRegister.js` (two-row header with merged "Issue For", total row, numeric format with parentheses for negatives).

## Request/response

- **Request**: `POST` with body `{ startDate, endDate, filter?: { item_name?, item_group_name? } }` (same style as Dressing/Grouping stock registers).
- **Response**: Same as existing reports2: 200 with download link; 400 for validation (missing/invalid dates, start > end); 404 when no data or all rows filtered out.

## Implementation steps (completed)

1. **Controller** (`tappingORClippingStockRegister.js`)
   - Validate `startDate` and `endDate` (required, valid format, start ≤ end).
   - Optional filter by `item_name` and/or `item_group_name` (match `item_sub_category_name`).
   - Get distinct (item_sub_category_name, item_name) from `tapping_done_items_details` (with optional filter).
   - For each pair: current available, received in period, issue total, hand_splicing, splicing (via history + join to other_details), damaged (wastage + lookup issue_for_tappings), clipped_packing and cal_ply_production = 0; compute opening and closing.
   - Filter out rows where all numeric columns are 0.
   - Call `GenerateTappingORClippingStockRegisterExcel(rows, startDate, endDate, filter)` and return download link.
2. **Excel config** (`tappingORClippingStockRegister.js`)
   - Title: `Clipping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY`.
   - Two header rows: row1 with merged "Issue For (in Sq. Mtr.)" over cols 6–10; row2 with Balance, Sq. Mtr., Sq. Mtr., Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production, Balance.
   - Data rows: one per (item_sub_category_name, item_name); numFmt `0.00;(0.00)` for negatives.
   - Total row: bold, gray fill, sum of all numeric columns.
3. **Routes**
   - In `TappingORClipping.js`: import `TappingORClippingStockRegisterExcel` and add `router.post('/download-excel-tapping-or-clipping-stock-register', TappingORClippingStockRegisterExcel)`.

## Clarifications and assumptions

- **Placeholder columns**: Clipped Packing and Cal Ply Production have no tapping-level source in current schema; they are 0 until product adds a source.
- **Wastage = Damaged**: `issue_for_tapping_wastage` is used for the Damaged column; if wastage and damaged are later distinguished, the report can be split.
- **Splicing type values**: HAND SPLICING, MACHINE SPLICING, SPLICING (consistent with logItemFurtherProcess and tapping_done_other_details).
- **Location**: All code under **reports2/TappingORClipping** (controller, config, routes).

## Optional later enhancements

- If Clipped Packing or Cal Ply Production get a schema (e.g. issue type or separate collection), add aggregates and wire them into the same Excel columns.
