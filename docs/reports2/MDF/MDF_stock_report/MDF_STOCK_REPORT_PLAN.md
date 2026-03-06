# MDF Stock Report – Implementation Plan

## Objective

Implement the **MDF Stock Report** API under reports2 that generates an Excel report for a user-selected date range. The report shows opening stock, receives, consumption, sales, issue for pressing, and closing stock, grouped by **MDF sub-type**, **thickness**, and **size**.

## Implementation Approach

- Same pattern as other reports2 stock reports (e.g. Plywood): date-range filter, aggregation from MDF inventory view + item details + invoice + history, then Excel generation with grouped rows and totals.
- Data is anchored on **mdf_inventory_items_view_modal** (current stock); for each unique combination (sub-type, thickness, length, width), period receives come from **mdf_inventory_items_details** + **mdf_inventory_invoice_details**, and consumption/sales/issue-for-pressing from **mdf_history**.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** MongoDB aggregations over MDF view, item details, invoice details, and MDF history.
- **Grouping:** MDF Sub Type → Thickness → Size; subtotal per thickness; grand total.
- **Columns:** MDF Sub Type, Thickness, Size, Opening (sheets + sq m), Receive, Consume, Sales, Issue For Pressing (sheets + sq m), Closing (sheets + sq m).

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/MDF/mdfStockReport.js`

**Function:** `mdfStockReportCsv`

**Request body:**

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "SPECIFIC_TYPE"
  }
}
```

**Processing steps:**

1. Read `startDate`, `endDate` from `req.body`; if missing, return 400.
2. Parse dates; validate format and that start ≤ end; else 400.
3. Build `itemFilter` from `req.body.filter` (e.g. `item_sub_category_name`).
4. **Current inventory:** Aggregate `mdf_inventory_items_view_modal`: match `deleted_at: null` and `...itemFilter`; group by (sub-type, thickness, length, width); sum `available_sheets`, `available_sqm`; collect `item_ids`.
5. For each group:
   - **Receives:** Aggregate `mdf_inventory_items_details` (match on sub-type, thickness, length, width, `deleted_at: null`) → `$lookup` `mdf_inventory_invoice_details` on `invoice_id` → match `invoice.inward_date` in [start, end] → sum `no_of_sheet`, `total_sq_meter`.
   - **Consumption:** Aggregate `mdf_history_model`: match `mdf_item_id` in item_ids, `issue_status` in `['order', 'pressing']`, `createdAt` in [start, end] → sum `issued_sheets`, `issued_sqm`.
   - **Sales:** Same collection; `issue_status: 'challan'`, same date range → sum `issued_sheets`, `issued_sqm`.
   - **Issue for pressing:** Same collection; `issue_status: 'pressing'`, same date range → sum `issued_sheets`, `issued_sqm`.
   - Compute **opening** = current + consume + sales - receive (sheets and sq m); **closing** = opening + receive - consume - sales; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, sales, closing.
7. If no rows, return 404 "No stock data found for the selected period".
8. Call `GenerateMdfStockReportExcel(aggregatedData, startDate, endDate, filter)`.
9. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/MDF/mdfStockReport.js`

**Function:** `GenerateMdfStockReportExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/MDF` exists.
- Create workbook, sheet "MDF Stock Report".
- Title row: "MDF Type [ filter ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (filter from `filters.item_sub_category_name` or "ALL").
- Define columns: mdf_sub_type, thickness, size, opening_sheets, opening_sqm, receive_sheets, receive_sqm, consume_sheets, consume_sqm, sales_sheets, sales_sqm, issue_pressing_sheets, issue_pressing_sqm, closing_sheets, closing_sqm.
- Group data by mdf_sub_type → thickness; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `MDF-Stock-Report-{timestamp}.xlsx` in the same folder; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/MDF/mdf.routes.js`

- Import `mdfStockReportCsv` (and `mdfItemWiseStockReportCsv` for item-wise) from the controller.
- `router.post('/download-stock-report-mdf', mdfStockReportCsv)`.
- Export default router.

### 4. Report router registration

**File:** `topl_backend/routes/report/reports2.routes.js`

- Import: `import mdfRoutes from './reports2/MDF/mdf.routes.js';`
- Mount: `router.use(mdfRoutes);` (comment: MDF routes – MDF Stock Report).

**API path:** `POST /api/{version}/report/download-stock-report-mdf`

## Data aggregation logic

### Schema reference

| Collection / model                | Key fields used |
|-----------------------------------|------------------|
| mdf_inventory_items_view_modal    | item_sub_category_name, thickness, length, width, available_sheets, available_sqm, _id (for item_ids) |
| mdf_inventory_items_details       | item_sub_category_name, thickness, length, width, invoice_id, no_of_sheet, total_sq_meter, deleted_at |
| mdf_inventory_invoice_details     | _id, inward_date |
| mdf_history (mdf_history_model)   | mdf_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation

- **Receives (period):** Items where `inward_date` ∈ [start, end]; group by (sub-type, thickness, length, width). Sum `no_of_sheet`, `total_sq_meter`.
- **Consumption:** History where `issue_status` ∈ `['order', 'pressing']`, `createdAt` ∈ [start, end]. Sum `issued_sheets`, `issued_sqm` per item group (via item_ids).
- **Sales:** History where `issue_status === 'challan'`, same date range. Sum `issued_sheets`, `issued_sqm`.
- **Issue for pressing:** History where `issue_status === 'pressing'`, same date range. Sum `issued_sheets`, `issued_sqm`.
- **Opening:** `current_sheets + consume_sheets + sales_sheets - receive_sheets` (and same for sq m). Then `Math.max(0, ...)`.
- **Closing:** `opening + receive - consume - sales` (sheets and sq m). Then `Math.max(0, ...)`.

### Pipeline structure (conceptual)

1. **Current inventory:** `mdf_inventory_items_view_modal` → match (deleted_at, filters) → group by (sub-type, thickness, length, width) → sum available_sheets/sqm, push _id as item_ids.
2. **Per group:** Receives from item details + invoice lookup (sum no_of_sheet, total_sq_meter); Consumption / Sales / Issue pressing from mdf_history_model (mdf_item_id, issue_status, date range).
3. **Compute** opening and closing; build row object (mdf_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; pass to Excel generator.

## Excel report structure

### Columns

1. MDF Sub Type  
2. Thickness  
3. Size (length X width)  
4. Opening (sheets)  
5. Op Metres  
6. Receive (sheets)  
7. Rec Mtrs  
8. Consume (sheets)  
9. Cons Mtrs  
10. Sales (sheets)  
11. Sales Mtrs  
12. Issue For Pressing  
13. Issue For Pressing Sq Met  
14. Closing (sheets)  
15. Cl Metres  

### Row hierarchy

- Row 1: Title (merged), bold.  
- Row 2: Empty.  
- Row 3: Header row (gray background, bold).  
- Data rows grouped by sub-type → thickness; after each thickness group, a "Total" row; at the end a "Total" grand total row (bold, optional gray).

## API contract summary

| Aspect | Value |
|--------|--------|
| Method | POST |
| Path   | `/report/download-stock-report-mdf` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-mdf (body: startDate, endDate, filter?)
  → mdf.routes.js
  → mdfStockReportCsv (controller)
  → mdf_inventory_items_view_modal aggregate + per-group receives/history aggregates
  → GenerateMdfStockReportExcel(...) (config)
  → Excel to public/upload/reports/reports2/MDF/
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `mdfStockReport.js` – `mdfStockReportCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/MDF/mdfStockReport.js` – `GenerateMdfStockReportExcel` implemented.
- **Routes:** `MDF/mdf.routes.js` – POST route registered.
- **Documentation:** `MDF_STOCK_REPORT_API.md` (API), `MDF_STOCK_REPORT_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
