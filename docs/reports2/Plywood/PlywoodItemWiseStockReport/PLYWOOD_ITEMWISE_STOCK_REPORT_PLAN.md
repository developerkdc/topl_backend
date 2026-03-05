# Plywood Item-Wise Stock Report – Implementation Plan

## Objective

Implement the **Plywood Item-Wise Stock Report** API under reports2 that generates an Excel report for a user-selected date range. The report shows opening stock, receives, consumption, sales, issue for recalibration, and closing stock, grouped by **item name**, then **plywood sub-type**, **thickness**, and **size**. Same columns as the Plywood Stock Report with **Item Name** as the first column.

## Implementation Approach

- Same data sources and calculation logic as the Plywood Stock Report; grouping adds **item_name** so that the view is aggregated per (item_name, sub-type, thickness, length, width). Receives and history aggregations also filter/group by item_name where applicable.
- Data is anchored on **plywood_inventory_items_view_modal**; for each unique (item_name, sub-type, thickness, length, width), period receives and history aggregates are computed, then opening/closing are derived.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** MongoDB aggregations over plywood view, item details, invoice details, and plywood history.
- **Grouping:** Item Name → Thickness → Size; subtotal per thickness; grand total.
- **Columns:** Item Name, Plywood Sub Type, Thickness, Size, Opening (sheets + sq m), Receive, Consume, Sales, Issue For Rec Ply/Cal (sheets + sq m), Closing (sheets + sq m).

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/Plywood/plywoodStockReport.js`

**Function:** `plywoodItemWiseStockReportCsv`

**Request body:**

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "GURJAN",
    "item_name": "SOME_ITEM"
  }
}
```

**Processing steps:**

1. Read `startDate`, `endDate` from `req.body`; if missing, return 400.
2. Parse dates; validate format and that start ≤ end; else 400.
3. Build `itemFilter` from `req.body.filter` (e.g. `item_sub_category_name`, `item_name`).
4. **Current inventory:** Aggregate `plywood_inventory_items_view_modal`: match `deleted_at: null` and `...itemFilter`; group by (item_name, sub-type, thickness, length, width); sum `available_sheets`, `available_sqm`; collect `item_ids`.
5. For each group:
   - **Receives:** Aggregate `plywood_inventory_items_details` (match on item_name, sub-type, thickness, length, width, `deleted_at: null`) → `$lookup` invoice → match `invoice.inward_date` in [start, end] → sum `sheets`, `total_sq_meter`.
   - **Consumption / Sales / Issue for recal:** Same as stock report, using item_ids and date range.
   - Compute **opening** and **closing**; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, sales, closing.
7. If no rows, return 404 "No stock data found for the selected period".
8. Call `GeneratePlywoodItemWiseStockReportExcel(aggregatedData, startDate, endDate, filter)`.
9. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/Plywood/plywoodStockReport.js`

**Function:** `GeneratePlywoodItemWiseStockReportExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/Plywood` exists.
- Create workbook, sheet "Plywood Stock Report Item Wise".
- Title row: "Plywood Type (Item Wise) [ category ] [ Item: item_name ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (from filters when present).
- First column: item_name; then same numeric columns as stock report (plywood_sub_type, thickness, size, opening_sheets, opening_sqm, …).
- Group data by item_name → thickness; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `Plywood-Stock-Report-ItemWise-{timestamp}.xlsx`; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/PlywoodItemWiseStockReport/plywoodItemWiseStockReport.routes.js`

- Import `plywoodItemWiseStockReportCsv` from the controller.
- `router.post('/download-stock-report-plywood-item-wise', plywoodItemWiseStockReportCsv)`.
- Export default router.

### 4. Report router registration

**File:** `topl_backend/routes/report/reports2.routes.js`

- Import: `import plywoodItemWiseStockReportRoutes from './reports2/PlywoodItemWiseStockReport/plywoodItemWiseStockReport.routes.js';`
- Mount: `router.use(plywoodItemWiseStockReportRoutes);` (comment: Plywood Item-Wise Stock Report).

**API path:** `POST /api/{version}/report/download-stock-report-plywood-item-wise`

## Data aggregation logic

### Schema reference

Same as Plywood Stock Report; **item_name** is used in view and item details for grouping and filtering.

| Collection / model                  | Key fields used |
|-------------------------------------|------------------|
| plywood_inventory_items_view_modal  | item_name, item_sub_category_name, thickness, length, width, available_sheets, available_sqm, _id (for item_ids) |
| plywood_inventory_items_details     | item_name, item_sub_category_name, thickness, length, width, invoice_id, sheets, total_sq_meter, deleted_at |
| plywood_inventory_invoice_details   | _id, inward_date |
| plywood_history (plywood_history_model) | plywood_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation

Same formulas as Plywood Stock Report. Receives and history aggregations are scoped per (item_name, sub-type, thickness, length, width) via the grouped item_ids and item details match.

### Pipeline structure (conceptual)

1. **Current inventory:** `plywood_inventory_items_view_modal` → match (deleted_at, filters including item_name) → group by (item_name, sub-type, thickness, length, width) → sum available_sheets/sqm, push _id as item_ids.
2. **Per group:** Receives from item details (with item_name in match) + invoice lookup; Consumption / Sales / Issue recal from plywood_history_model (item_ids, issue_status, date range).
3. **Compute** opening and closing; build row object (item_name, plywood_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; pass to Excel generator.

## Excel report structure

### Columns

1. Item Name  
2. Plywood Sub Type  
3. Thickness  
4. Size (length X width)  
5. Opening (sheets)  
6. Op Metres  
7. Receive (sheets)  
8. Rec Mtrs  
9. Consume (sheets)  
10. Cons Mtrs  
11. Sales (sheets)  
12. Sales Mtrs  
13. Issue For Rec Ply/Cal Sheet  
14. Issue For Rec Ply/Cal Sq Met  
15. Closing (sheets)  
16. Cl Metres  

### Row hierarchy

- Row 1: Title (merged), bold.  
- Row 2: Empty.  
- Row 3: Header row (gray background, bold).  
- Data rows grouped by item_name → thickness; after each thickness group, a "Total" row; at the end a "Total" grand total row (bold, optional gray).

## API contract summary

| Aspect | Value |
|--------|--------|
| Method | POST |
| Path   | `/report/download-stock-report-plywood-item-wise` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name, item_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Item-wise stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-plywood-item-wise (body: startDate, endDate, filter?)
  → plywoodItemWiseStockReport.routes.js
  → plywoodItemWiseStockReportCsv (controller)
  → plywood_inventory_items_view_modal aggregate (with item_name) + per-group receives/history aggregates
  → GeneratePlywoodItemWiseStockReportExcel(...) (config)
  → Excel to public/upload/reports/reports2/Plywood/ (ItemWise filename)
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `plywoodStockReport.js` – `plywoodItemWiseStockReportCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/Plywood/plywoodStockReport.js` – `GeneratePlywoodItemWiseStockReportExcel` implemented.
- **Routes:** `PlywoodItemWiseStockReport/plywoodItemWiseStockReport.routes.js` – POST route registered.
- **Documentation:** `PLYWOOD_ITEMWISE_STOCK_REPORT_API.md` (API), `PLYWOOD_ITEMWISE_STOCK_REPORT_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
