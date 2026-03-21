# Plywood Stock Report – Implementation Plan

## Objective

Implement the **Plywood Stock Report** API under reports2 that generates an Excel report for a user-selected date range. The report shows opening stock, receives, consumption (total of challan, order, resizing, pressing), challan, order, issue for ply resizing, issue for pressing, and closing stock, grouped by **plywood sub-category**, **thickness**, and **size**.

## Implementation Approach

- Reuse the same pattern as other reports2 stock reports (e.g. MDF): date-range filter, aggregation from plywood inventory view + item details + invoice + history, then Excel generation with grouped rows and totals.
- Data is anchored on **plywood_inventory_items_view_modal** (current stock); for each unique combination (sub-type, thickness, length, width), period receives come from **plywood_inventory_items_details** + **plywood_inventory_invoice_details**, and consumption/sales/issue-for-recal from **plywood_history**.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** MongoDB aggregations over plywood view, item details, invoice details, and plywood history.
- **Grouping:** Plywood Sub Category → Thickness → Size; subtotal per thickness; grand total.
- **Columns:** Plywood Sub Category, Thickness, Size, Opening (sheets + sq m), Received, Consumed, Challan, Order, Issue For Ply Resizing (sheets + sq m), Issue For Pressing (sheets + sq m), Closing (sheets + sq m).

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/Plywood/plywoodStockReport.js`

**Function:** `plywoodStockReportCsv`

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
4. **Current inventory:** Aggregate `plywood_inventory_items_view_modal`: match `deleted_at: null` and `...itemFilter`; group by (sub-type, thickness, length, width); sum `available_sheets`, `available_sqm`; collect `item_ids`.
5. For each group:
   - **Receives:** Aggregate `plywood_inventory_items_details` (match on sub-type, thickness, length, width, `deleted_at: null`) → `$lookup` `plywood_inventory_invoice_details` on `invoice_id` → match `invoice.inward_date` in [start, end] → sum `sheets`, `total_sq_meter`.
   - **Challan:** Aggregate `plywood_history_model`: match `plywood_item_id` in item_ids, `issue_status: 'challan'`, `createdAt` in [start, end] → sum `issued_sheets`, `issued_sqm`.
   - **Order:** Same collection; `issue_status: 'order'`, same date range.
   - **Issue for ply resizing:** Same collection; `issue_status: 'plywood_resizing'`, same date range.
   - **Issue for pressing:** Same collection; `issue_status: 'pressing'`, same date range.
   - **Consumed** = challan + order + issue for ply resizing + issue for pressing (computed).
   - Compute **opening** = current + consume - receive (sheets and sq m); **closing** = opening + receive - consume; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, challan, order, closing.
7. If no rows, return 404 "No stock data found for the selected period".
8. Call `GeneratePlywoodStockReportExcel(aggregatedData, startDate, endDate, filter)`.
9. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/Plywood/plywoodStockReport.js`

**Function:** `GeneratePlywoodStockReportExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/Plywood` exists.
- Create workbook, sheet "Plywood Stock Report".
- Title row: "Plywood Type [ filter ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (filter from `filters.item_sub_category_name` or "ALL").
- Define columns: plywood_sub_type, thickness, size, opening_sheets, opening_sqm, receive_sheets, receive_sqm, consume_sheets, consume_sqm, challan_sheets, challan_sqm, order_sheets, order_sqm, issue_for_ply_resizing_sheets, issue_for_ply_resizing_sqm, issue_for_pressing_sheets, issue_for_pressing_sqm, closing_sheets, closing_sqm.
- Group data by plywood_sub_type → thickness; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `Plywood-Stock-Report-{timestamp}.xlsx` in the same folder; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/PlywoodStockReport/plywoodStockReport.routes.js`

- Import `plywoodStockReportCsv` from the controller.
- `router.post('/download-stock-report-plywood', plywoodStockReportCsv)`.
- Export default router.

### 4. Report router registration

**File:** `topl_backend/routes/report/reports2.routes.js`

- Import: `import plywoodStockReportRoutes from './reports2/PlywoodStockReport/plywoodStockReport.routes.js';`
- Mount: `router.use(plywoodStockReportRoutes);` (comment: Plywood Stock Report).

**API path:** `POST /api/{version}/report/download-stock-report-plywood`

## Data aggregation logic

### Schema reference

| Collection / model                  | Key fields used |
|-------------------------------------|------------------|
| plywood_inventory_items_view_modal   | item_sub_category_name, thickness, length, width, available_sheets, available_sqm, _id (for item_ids) |
| plywood_inventory_items_details     | item_sub_category_name, thickness, length, width, invoice_id, sheets, total_sq_meter, deleted_at |
| plywood_inventory_invoice_details   | _id, inward_date |
| plywood_history (plywood_history_model) | plywood_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation

- **Receives (period):** Items where `inward_date` ∈ [start, end] (end date includes 23:59:59.999 UTC); group by (sub-type, thickness, length, width). Sum `sheets`, `total_sq_meter`.
- **Challan:** History where `issue_status === 'challan'`, `createdAt` ∈ [start, end]. Sum `issued_sheets`, `issued_sqm`.
- **Order:** History where `issue_status === 'order'`, same date range.
- **Issue for ply resizing:** History where `issue_status === 'plywood_resizing'`, same date range.
- **Issue for pressing:** History where `issue_status === 'pressing'`, same date range.
- **Consumed:** `challan_sheets + order_sheets + issue_for_ply_resizing_sheets + issue_for_pressing_sheets` (and same for sq m).
- **Opening:** `current_sheets + consume_sheets - receive_sheets` (and same for sq m). Then `Math.max(0, ...)`.
- **Closing:** `opening + receive - consume` (sheets and sq m). Then `Math.max(0, ...)`.

### Pipeline structure (conceptual)

1. **Current inventory:** `plywood_inventory_items_view_modal` → match (deleted_at, filters) → group by (sub-type, thickness, length, width) → sum available_sheets/sqm, push _id as item_ids.
2. **Per group:** Receives from item details + invoice lookup; Challan / Order / Issue for ply resizing / Issue for pressing from plywood_history_model (item_ids, issue_status, date range). Consumed = sum of all four.
3. **Compute** opening and closing; build row object (plywood_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; pass to Excel generator.

## Excel report structure

### Columns

1. Plywood Sub Category  
2. Thickness  
3. Size (length X width)  
4. Opening Sheets  
5. Opening Metres  
6. Received Sheets  
7. Received Mtrs  
8. Consumed Sheets  
9. Consumed Mtrs  
10. Challan Sheets  
11. Challan Mtrs  
12. Order Sheets  
13. Order Mtrs  
14. Issue For Ply Resizing Sheet  
15. Issue For Ply Resizing Sq Met  
16. Issue For Pressing  
17. Issue For Pressing Sq Met  
18. Closing sheets  
19. Closing Metres  

### Row hierarchy

- Row 1: Title (merged), bold.  
- Row 2: Empty.  
- Row 3: Header row (gray background, bold).  
- Data rows grouped by sub-type → thickness; after each thickness group, a "Total" row; at the end a "Total" grand total row (bold, optional gray).

## API contract summary

| Aspect | Value |
|--------|--------|
| Method | POST |
| Path   | `/report/download-stock-report-plywood` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-plywood (body: startDate, endDate, filter?)
  → plywoodStockReport.routes.js
  → plywoodStockReportCsv (controller)
  → plywood_inventory_items_view_modal aggregate + per-group receives/history aggregates
  → GeneratePlywoodStockReportExcel(...) (config)
  → Excel to public/upload/reports/reports2/Plywood/
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `plywoodStockReport.js` – `plywoodStockReportCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/Plywood/plywoodStockReport.js` – `GeneratePlywoodStockReportExcel` implemented.
- **Routes:** `PlywoodStockReport/plywoodStockReport.routes.js` – POST route registered.
- **Documentation:** `PLYWOOD_STOCK_REPORT_API.md` (API), `PLYWOOD_STOCK_REPORT_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
