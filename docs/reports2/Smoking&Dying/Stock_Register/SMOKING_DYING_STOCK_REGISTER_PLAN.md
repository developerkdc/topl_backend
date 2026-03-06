# Smoking&Dying Stock Register API Plan

**Overview:** Add a Smoking&Dying Stock Register report API under reports2 that matches the image: date range, Item Group Name, Item Name, Opening Balance, Direct Dye, DR Dyed, Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, Closing Balance, and a Total row. Implementation follows existing Dressing Stock Register pattern and uses process_done_items_details and process_done_details with placeholder columns where schema has no source yet.

---

## Goal

Implement a **Smoking&Dying Stock Register** report that matches the provided image: title "Smoking&Dying Stock Register - DD/MM/YYYY-DD/MM/YYYY", table with Item Group Name, Item Name, Opening Balance, Direct Dye, DR Dyed, Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, Closing Balance, and a **Total** row at the bottom.

## Data source and schema

- **Primary source**: `topl_backend/database/schema/factory/smoking_dying/smoking_dying_done.schema.js`
  - **process_done_details**: `process_done_date`, `process_name` (used to filter "receipt in period" and to split into Direct Dye vs DR Dyed).
  - **process_done_items_details**: `item_name`, `item_sub_category_name`, `sqm`, `process_done_id`, `process_name`, `issue_status` (enum: `grouping` when issued out), `updatedAt`.
- **Item Group Name**: Use `item_sub_category_name` from `process_done_items_details`.
- **Item Name**: Use `item_name` from `process_done_items_details`.

**Mapping to report columns (from current schema):**

| Report column   | Source / logic                                                                                                                                              |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Item Group Name | `item_sub_category_name`                                                                                                                                    |
| Item Name       | `item_name`                                                                                                                                                 |
| Opening Balance | Current available SQM + issued in period − receipt in period (receipt = Direct Dye + DR Dyed in period)                                                    |
| Direct Dye       | Sum of `sqm` where join to `process_done_details`, `process_done_date` in [startDate, endDate], and `process_name` maps to “Direct Dye” (e.g. DIRECT DYE, DIRECT DYEING) |
| DR Dyed         | Sum of `sqm` where same join and date filter, and `process_name` maps to “DR Dyed” (e.g. DR DYED, DR DYE)                                                   |
| Issue Sq Mtr    | Sum of `sqm` where `issue_status === 'grouping'` and `updatedAt` in [startDate, endDate]                                                                    |
| Clipping        | **No schema** → use **0**                                                                                                                                   |
| Mixmatch        | **No schema** → use **0**                                                                                                                                   |
| Edgebanding     | **No schema** → use **0**                                                                                                                                   |
| Lipping         | **No schema** → use **0**                                                                                                                                   |
| Sale            | **No schema** → use **0**                                                                                                                                   |
| Closing Balance | Opening + Direct Dye + DR Dyed − (Issue Sq Mtr + Clipping + Mixmatch + Edgebanding + Lipping + Sale)                                                       |

**Period logic (align with Dressing Stock Register):**

- **Receipt in period**: Join `process_done_items_details` → `process_done_details`, filter `process_done_date` in [start, end], sum `sqm` by (item_sub_category_name, item_name); split by `process_name` into Direct Dye and DR Dyed.
- **Issued in period**: Filter `process_done_items_details` by `updatedAt` in [start, end] and `issue_status === 'grouping'`, sum `sqm` by (item_sub_category_name, item_name) → Issue Sq Mtr.
- **Current available**: Sum `sqm` where `issue_status` is null/not set.
- **Opening** = current available + issued in period − receipt in period.
- **Closing** = opening + Direct Dye + DR Dyed − all issues.

## File and route layout

- **Controller**: `topl_backend/controllers/reports2/Smoking&Dying/smokingDyingStockRegister.js` (single export, e.g. `SmokingDyingStockRegisterExcel`).
- **Config (Excel)**: `topl_backend/config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js` (single export, e.g. `GenerateSmokingDyingStockRegisterExcel`).
- **Routes**: One POST route in `topl_backend/routes/report/reports2/Smoking&Dying/smoking_dying.routes.js`; router mounted in `reports2.routes.js`.

Reference patterns:

- **Route pattern**: `topl_backend/routes/report/reports2/Dressing/dressing.routes.js`.
- **Controller + balance logic**: `topl_backend/controllers/reports2/Dressing/dressingStockRegister.js`.
- **Excel structure**: `topl_backend/config/downloadExcel/reports2/Dressing/dressingStockRegister.js` (title with date range, header row, data rows, total row, gray header style, numeric formatting).

## Request/response

- **Request**: `POST` with body `{ startDate, endDate, filter?: { item_name?, item_group_name? } }` (same style as Dressing reports).
- **Response**: Same as existing reports2: 200 with download link; 400 for validation (missing/invalid dates, start > end); 404 when no data.

## Implementation steps

1. **Controller** (`smokingDyingStockRegister.js`)
   - Validate `startDate` and `endDate` (required, valid format, start ≤ end).
   - Optional filter by `item_name` and/or `item_group_name` (match `item_sub_category_name`).
   - Get distinct (item_sub_category_name, item_name) from `process_done_items_details` (with optional filter).
   - For each pair:
     - Current available SQM (issue_status null/not set).
     - Receipt in period: join to `process_done_details`, filter by `process_done_date` in range, sum `sqm`; split by `process_name` into Direct Dye and DR Dyed (mapping via constants/config).
     - Issue Sq Mtr: filter by `updatedAt` in range and `issue_status === 'grouping'`, sum `sqm`.
     - Set Clipping, Mixmatch, Edgebanding, Lipping, Sale = 0.
     - Compute Opening and Closing as above.
   - Filter out rows where all numeric columns are 0.
   - Call `GenerateSmokingDyingStockRegisterExcel(rows, startDate, endDate, filter)` and return download link.
2. **Excel config** (`smokingDyingStockRegister.js`)
   - Title: `Smoking&Dying Stock Register - DD/MM/YYYY-DD/MM/YYYY`.
   - Single header row: Item Group Name, Item Name, Opening Balance, Direct Dye, DR Dyed, Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, Closing Balance.
   - Data rows: one per (item_sub_category_name, item_name) with numeric columns formatted (e.g. 2 decimal places).
   - Total row: bold, sum of all numeric columns (excluding first two).
   - Styling: header with gray fill and borders; column widths for readability.
3. **Routes**
   - In `smoking_dying.routes.js`: import `SmokingDyingStockRegisterExcel` and add:
     - `router.post('/download-excel-smoking-dying-stock-register', SmokingDyingStockRegisterExcel);`
   - `reports2.routes.js`: ensure `smokingDyingRoutes` is imported and mounted.

## Clarifications and assumptions

- **Placeholder columns**: Clipping, Mixmatch, Edgebanding, Lipping, Sale are not present in current smoking/dying schemas; they will be 0 until you add sources.
- **Direct Dye / DR Dyed**: `process_name` (uppercase in DB) is mapped via a small config: e.g. names containing "DIRECT" or matching "DIRECT DYE", "DIRECT DYEING" → Direct Dye; names containing "DR" and "DYED"/"DYE" → DR Dyed. Exact strings should be confirmed from process master/DB.
- **Location**: All new/updated code is under **reports2/Smoking&Dying** (controller, config, routes).

## Optional later enhancements

- Support filter by `item_group_name` (match `item_sub_category_name`) — already supported.
- If Clipping/Mixmatch/Edgebanding/Lipping/Sale get a schema later, add aggregates and wire them into the Excel columns.
