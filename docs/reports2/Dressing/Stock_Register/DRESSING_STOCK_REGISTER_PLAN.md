# Dressing Stock Register API Plan

**Overview:** Add a Dressing Stock Register report API under reports2 that matches the image: date range, Item Group Name, Item Name, Opening Balance, Purchase, Receipt, Issue Sq Mtr, Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing, Sale, Closing Balance, and a Total row. Implementation follows existing Log/Flitch report patterns and uses dressing_done data with placeholder columns where schema has no source yet.

---

## Goal

Implement a **Dressing Stock Register** report that matches the provided image: title "Dressing Stock Register - DD/MM/YYYY-DD/MM/YYYY", table with Item Group Name, Item Name, Opening Balance, Purchase, Receipt, Issue Sq Mtr, Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing, Sale, Closing Balance, and a **Total** row at the bottom.

## Data source and schema

- **Primary source**: `topl_backend/database/schema/factory/dressing/dressing_done/dressing.done.schema.js`
  - **dressing_done_other_details**: `dressing_date` (used to filter "Receipt" in period).
  - **dressing_done_items**: `item_name`, `item_sub_category_name`, `sqm`, `issue_status` (enum: `grouping`, `order`, `smoking_dying`), and link via `dressing_done_other_details_id`.
- **Mixmatch source**: `topl_backend/database/schema/factory/dressing/dressing_done/dressing.machine.mismatch.data.schema.js` — collection `dressing_miss_match_data` with `dressing_date`, `item_name`, `item_sub_category_name`, `sqm`. Use for **Mixmatch** column.
- **Item Group Name**: Use `item_sub_category_name` from `dressing_done_items` (no separate "item group" master in codebase).
- **Item Name**: `item_name` from `dressing_done_items`.

**Mapping to report columns (from current schema):**

| Report column   | Source / logic                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item Group Name | `item_sub_category_name`                                                                                                                                    |
| Item Name       | `item_name`                                                                                                                                                 |
| Opening Balance | Closing balance at end of day before date range. Receipt and issue before start aggregated by (item_sub_category_name, item_name, day); then day-by-day closing = max(0, prev + receipt_day − issue_day). Opening = closing after last day. |
| Purchase        | **No schema** → use **0** (or later: purchase/inward of dressing if such collection exists)                                                                 |
| Receipt         | Sum of `sqm` where `dressing_done_other_details.dressing_date` in [startDate, endDate]                                                                      |
| Issue Sq Mtr    | Sum of `sqm` where `issue_status === 'order'` + `issue_status === 'grouping'` and issue happened in period (`updatedAt` in range)                           |
| Clipping        | Issue to Grouping: sum of `sqm` where `issue_status === 'grouping'` and issue in period (`updatedAt` in range)                                            |
| Dyeing          | Sum of `sqm` where `issue_status === 'smoking_dying'` and issue in period                                                                                   |
| Mixmatch        | Sum of `sqm` from **dressing_miss_match_data** where `dressing_date` in [startDate, endDate], grouped by (item_sub_category_name, item_name)                |
| Edgebanding     | **No schema** → use **0**                                                                                                                                   |
| Lipping         | **No schema** → use **0**                                                                                                                                   |
| Redressing      | **No schema** → use **0**                                                                                                                                   |
| Sale            | **No schema** → use **0**                                                                                                                                   |
| Closing Balance | Opening + Purchase + Receipt − (Issue Sq Mtr + Clipping + Dyeing + Mixmatch + Edgebanding + Lipping + Redressing + Sale)                                    |

**Period logic (align with Flitch):**

- **Receipt in period**: Join `dressing_done_items` → `dressing_done_other_details`, filter `dressing_date` in [start, end], sum `sqm` by (item_sub_category_name, item_name).
- **Mixmatch in period**: From `dressing_miss_match_data`, filter `dressing_date` in [start, end], sum `sqm` by (item_sub_category_name, item_name).
- **Issued in period**: Filter `dressing_done_items` by `updatedAt` in [start, end] and `issue_status` in ['order','grouping','smoking_dying'], sum `sqm` by (item_sub_category_name, item_name) and by issue type (order + grouping → Issue Sq Mtr, grouping → Clipping, smoking_dying → Dyeing).
- **Opening**: Closing balance at end of (startDate − 1). Aggregate receipt and issue **per (item_sub_category_name, item_name) per day** before start; for each pair sort days and compute running closing = max(0, running_closing + receipt_day − issue_day). Opening = running closing after last day.
- **Closing** = opening + receipt − all issues (or equivalently opening + purchase + receipt − all issue columns − sale).

## File and route layout

- **Controller**: New file `topl_backend/controllers/reports2/Dressing/dressingStockRegister.js` (single export, e.g. `DressingStockRegisterExcel`).
- **Config (Excel)**: New file `topl_backend/config/downloadExcel/reports2/Dressing/dressingStockRegister.js` (single export, e.g. `GenerateDressingStockRegisterExcel`).
- **Routes**: Add one POST route in existing `topl_backend/routes/report/reports2/Dressing/dressing.routes.js` (do **not** create under Flitch; user reference to "Flitch folder" is likely a typo; routes file they pointed to is Dressing).

Reference patterns:

- **Route pattern**: `topl_backend/routes/report/reports2/Log/log.routes.js` (multiple report endpoints on same router).
- **Controller + balance logic**: `topl_backend/controllers/reports2/Flitch/itemWiseFlitch.js` (startDate/endDate, filter, opening/closing, then call Excel generator).
- **Excel structure**: `topl_backend/config/downloadExcel/reports2/Flitch/itemWiseFlitch.js` (title with date range, header row, data rows, total row, gray header style, numeric formatting).

## Request/response

- **Request**: `POST` with body `{ startDate, endDate, filter?: { item_name?, item_group_name? } }` (same style as Flitch/Log reports).
- **Response**: Same as existing reports2: 200 with download link; 400 for validation (missing/invalid dates, start > end); 404 when no data.

## Implementation steps

1. **Controller** (`dressingStockRegister.js`)
   - Validate `startDate` and `endDate` (required, valid format, start ≤ end).
   - Optional filter by `item_name` and/or `item_group_name` (match `item_sub_category_name`).
   - Get distinct (item_sub_category_name, item_name) from `dressing_done_items` (with optional filter).
   - **Opening balance**: Aggregate receipt and issue before start **by (item_sub_category_name, item_name, day)**; for each pair compute day-by-day closing up to (startDate − 1); opening = that closing. Store in map keyed by pair.
   - For each pair:
     - Opening = from precomputed opening map (closing of day before date range).
     - Receipt in period: join to `dressing_done_other_details`, filter by `dressing_date` in range, sum `sqm`.
     - Issued in period: filter by `updatedAt` in range, split by `issue_status`: order + grouping → Issue Sq Mtr, grouping → Clipping, smoking_dying → Dyeing.
     - Mixmatch in period: aggregate `dressing_miss_match_data` by (item_sub_category_name, item_name), `dressing_date` in range, sum `sqm`.
     - Set Purchase, Edgebanding, Lipping, Redressing, Sale = 0.
     - Compute Closing = opening + purchase + receipt − all issue columns.
   - Filter out rows where all numeric columns are 0 (optional, to avoid empty-looking report).
   - Call `GenerateDressingStockRegisterExcel(rows, startDate, endDate, filter)` and return download link.
2. **Excel config** (`dressingStockRegister.js`)
   - Title: `Dressing Stock Register - DD/MM/YYYY-DD/MM/YYYY` (use existing `formatDate` style from other reports).
   - Single header row: Item Group Name, Item Name, Opening Balance, Purchase, Receipt, Issue Sq Mtr, Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing, Sale, Closing Balance.
   - Data rows: one per (item_sub_category_name, item_name) with numeric columns formatted (e.g. 2 decimal places).
   - Total row: bold, sum of all numeric columns (excluding first two).
   - Styling: header with gray fill and borders; optional column widths for readability.
3. **Routes**
   - In `dressing.routes.js`: import `DressingStockRegisterExcel` and add:
     - `router.post('/download-excel-dressing-stock-register', DressingStockRegisterExcel);`
   - No change to `reports2.routes.js` (dressing router already mounted).

## Clarifications and assumptions

- **Placeholder columns**: Purchase, Edgebanding, Lipping, Redressing, Sale are not present in current dressing/veneer schemas; they will be 0 until you add sources. **Mixmatch** is sourced from `dressing_miss_match_data` (dressing mismatch). **Clipping** is sourced from issue to Grouping (`issue_status === 'grouping'`).
- **Opening balance**: Closing balance at end of (startDate − 1), computed day-by-day per (item_sub_category_name, item_name). **Grouping**: `issue_status === 'grouping'` is included in Issue Sq Mtr and also shown in the Clipping column.
- **Location**: All new/updated code is under **reports2/Dressing** (controller, config, routes); nothing under Flitch folder.

## Optional later enhancements

- Support filter by `item_group_name` (match `item_sub_category_name`).
- If Purchase/Sale/other movements get a schema later, add aggregates and wire them into the same Excel columns.
