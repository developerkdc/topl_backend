# Plywood Stock Report by Pellet No. – Implementation Plan

## Objective

Implement the **Plywood Stock Report by Pellet No.** API under reports2 that generates an Excel report for a user-selected date range. The report has the same structure as the standard Plywood Stock Report but with **Pellet No.** (pallet_number) as the first column. Each row represents one pellet (one document in plywood_inventory_items_details). Data is grouped by **plywood sub-category** with subtotals and grand total.

## Implementation Approach

- Reuse the same calculation logic as the standard Plywood Stock Report (opening, receives, consumption, sales, issue for resizing, issue for pressing, closing).
- Data is anchored on **plywood_inventory_items_details** (individual pellets); for each item, period receives come from invoice lookup (inward_date in range), and consumption/sales/issue from **plywood_history** matched by `plywood_item_id`.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** plywood_inventory_items_details + plywood_inventory_invoice_details + plywood_history.
- **Grouping:** Plywood Sub Category; subtotal per category; grand total.
- **Columns:** Pellet No., Plywood Sub Category, Thickness, Size, Opening (sheets + sq m), Received, Consumed, Challan, Order, Issue For Ply Resizing (sheets + sq m), Issue For Pressing (sheets + sq m), Closing (sheets + sq m).

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/Plywood/plywoodStockReport.js`

**Function:** `plywoodStockReportByPelletCsv`

**Request body:**

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "GURJAN"
  }
}
```

**Processing steps:**

1. Read `startDate`, `endDate` from `req.body`; if missing, return 400.
2. Parse dates; validate format and that start ≤ end; else 400.
3. Build `itemFilter` from `req.body.filter` (e.g. `item_sub_category_name`).
4. **All items:** Aggregate `plywood_inventory_items_details`: match `deleted_at: null` and `...itemFilter`; `$lookup` invoice for `inward_date`; project pallet_number, item_sub_category_name, thickness, length, width, sheets, total_sq_meter, available_sheets, available_sqm.
5. For each item (each pellet):
   - **Receives:** If `invoice.inward_date` in [start, end], use `sheets` and `total_sq_meter`; else 0.
   - **Challan:** Aggregate `plywood_history_model`: match `plywood_item_id: item._id`, `issue_status: 'challan'`, `createdAt` in [start, end] → sum `issued_sheets`, `issued_sqm`.
   - **Order:** Same collection; `issue_status: 'order'`, same date range.
   - **Issue for ply resizing:** Same collection; `issue_status: 'plywood_resizing'`.
   - **Issue for pressing:** Same collection; `issue_status: 'pressing'`.
   - **Consumed** = challan + order + issue for ply resizing + issue for pressing (computed).
   - Compute **opening** = current + consume - receive; **closing** = opening + receive - consume; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, challan, order, closing.
7. Sort by item_sub_category_name, then pallet_number.
8. If no rows, return 404 "No stock data found for the selected period".
9. Call `GeneratePlywoodStockReportByPelletExcel(aggregatedData, startDate, endDate, filter)`.
10. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/Plywood/plywoodStockReport.js`

**Function:** `GeneratePlywoodStockReportByPelletExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/Plywood` exists.
- Create workbook, sheet "Plywood Stock Report (By Pellet No.)".
- Title row: "Plywood Type [ filter ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (filter from `filters.item_sub_category_name` or "ALL").
- Define columns: pellet_no, plywood_sub_type, thickness, size, opening_sheets, opening_sqm, receive_sheets, receive_sqm, consume_sheets, consume_sqm, challan_sheets, challan_sqm, order_sheets, order_sqm, issue_for_ply_resizing_sheets, issue_for_ply_resizing_sqm, issue_for_pressing_sheets, issue_for_pressing_sqm, closing_sheets, closing_sqm.
- Group data by plywood_sub_type; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `Plywood-Stock-Report-ByPellet-{timestamp}.xlsx` in the same folder; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/Plywood/plywood.routes.js`

- Import `plywoodStockReportByPelletCsv` from the controller.
- `router.post('/download-stock-report-plywood-by-pellet', plywoodStockReportByPelletCsv)`.

**API path:** `POST /api/{version}/report/download-stock-report-plywood-by-pellet`

## Data aggregation logic

### Schema reference

| Collection / model                  | Key fields used |
|-------------------------------------|------------------|
| plywood_inventory_items_details     | _id, pallet_number, item_sub_category_name, thickness, length, width, sheets, total_sq_meter, available_sheets, available_sqm, invoice_id, deleted_at |
| plywood_inventory_invoice_details   | _id, inward_date |
| plywood_history (plywood_history_model) | plywood_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation (per pellet)

- **Receives (period):** If item's invoice `inward_date` ∈ [start, end] (end includes 23:59:59.999 UTC), use item's `sheets` and `total_sq_meter`; else 0.
- **Challan:** History where `plywood_item_id === item._id`, `issue_status === 'challan'`, `createdAt` ∈ [start, end]. Sum `issued_sheets`, `issued_sqm`.
- **Order:** History where `plywood_item_id === item._id`, `issue_status === 'order'`, same date range.
- **Issue for ply resizing:** History where `plywood_item_id === item._id`, `issue_status === 'plywood_resizing'`, same date range.
- **Issue for pressing:** History where `plywood_item_id === item._id`, `issue_status === 'pressing'`, same date range.
- **Consumed:** `challan_sheets + order_sheets + issue_for_ply_resizing_sheets + issue_for_pressing_sheets` (and same for sq m).
- **Opening:** `current_sheets + consume_sheets - receive_sheets` (and same for sq m). Then `Math.max(0, ...)`.
- **Closing:** `opening + receive - consume` (sheets and sq m). Then `Math.max(0, ...)`.

### Pipeline structure (conceptual)

1. **All items:** `plywood_inventory_items_details` → match (deleted_at, filters) → lookup invoice → project needed fields.
2. **Per item:** Receives from inward_date check; Challan / Order / Issue for ply resizing / Issue for pressing from plywood_history_model (plywood_item_id = item._id, issue_status, date range). Consumed = sum of all four.
3. **Compute** opening and closing; build row object (pellet_no, plywood_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; **sort** by sub_category, pellet_no; pass to Excel generator.

## Excel report structure

### Columns

1. Pellet No.  
2. Plywood Sub Category  
3. Thickness  
4. Size (length X width)  
5. Opening Sheets  
6. Opening Metres  
7. Received Sheets  
8. Received Mtrs  
9. Consumed Sheets  
10. Consumed Mtrs  
11. Challan Sheets  
12. Challan Mtrs  
13. Order Sheets  
14. Order Mtrs  
15. Issue For Ply Resizing Sheet  
16. Issue For Ply Resizing Sq Met  
17. Issue For Pressing  
18. Issue For Pressing Sq Met  
19. Closing sheets  
20. Closing Metres  

### Row hierarchy

- Row 1: Title (merged), bold.  
- Row 2: Empty.  
- Row 3: Header row (gray background, bold).  
- Data rows grouped by Plywood Sub Category; after each category group, a "Total" row; at the end a "Total" grand total row (bold, optional gray).

## API contract summary

| Aspect | Value |
|--------|--------|
| Method | POST |
| Path   | `/report/download-stock-report-plywood-by-pellet` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Stock report by pellet generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-plywood-by-pellet (body: startDate, endDate, filter?)
  → plywood.routes.js
  → plywoodStockReportByPelletCsv (controller)
  → plywood_inventory_items_details aggregate + per-item receives/history aggregates
  → GeneratePlywoodStockReportByPelletExcel(...) (config)
  → Excel to public/upload/reports/reports2/Plywood/
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `plywoodStockReport.js` – `plywoodStockReportByPelletCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/Plywood/plywoodStockReport.js` – `GeneratePlywoodStockReportByPelletExcel` implemented.
- **Routes:** `plywood.routes.js` – POST route registered.
- **Documentation:** `PLYWOOD_STOCK_REPORT_BY_PELLET_API.md` (API), `PLYWOOD_STOCK_REPORT_BY_PELLET_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
