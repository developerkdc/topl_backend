# MDF Item-Wise Stock Report – Implementation Plan

## Objective

Implement the **MDF Item-Wise Stock Report** API under reports2 that generates an Excel report for a user-selected date range. The report shows opening stock, receives, consumption, sales, issue for pressing, and closing stock, grouped by **item name**, then **MDF sub-type**, **thickness**, and **size**. Same columns as the MDF Stock Report with **Item Name** as the first column.

## Implementation Approach

- Same data sources and calculation logic as the MDF Stock Report; grouping adds **item_name** so that the view is aggregated per (item_name, sub-type, thickness, length, width). Receives and history aggregations also filter/group by item_name where applicable.
- Data is anchored on **mdf_inventory_items_view_modal**; for each unique (item_name, sub-type, thickness, length, width), period receives and history aggregates are computed, then opening/closing are derived.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** MongoDB aggregations over MDF view, item details, invoice details, and MDF history.
- **Grouping:** Item Name → Thickness → Size; subtotal per thickness; grand total.
- **Columns:** Item Name, MDF Sub Type, Thickness, Size, Opening (sheets + sq m), Receive, Consume, Sales, Issue For Pressing (sheets + sq m), Closing (sheets + sq m).

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/MDF/mdfStockReport.js`

**Function:** `mdfItemWiseStockReportCsv`

**Request body:**

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "SPECIFIC_TYPE",
    "item_name": "SOME_ITEM"
  }
}
```

**Processing steps:**

1. Read `startDate`, `endDate` from `req.body`; if missing, return 400.
2. Parse dates; validate format and that start ≤ end; else 400.
3. Build `itemFilter` from `req.body.filter` (e.g. `item_sub_category_name`, `item_name`).
4. **Current inventory:** Aggregate `mdf_inventory_items_view_modal`: match `deleted_at: null` and `...itemFilter`; group by (item_name, sub-type, thickness, length, width); sum `available_sheets`, `available_sqm`; collect `item_ids`.
5. For each group:
   - **Receives:** Aggregate `mdf_inventory_items_details` (match on item_name, sub-type, thickness, length, width, `deleted_at: null`) → `$lookup` invoice → match `invoice.inward_date` in [start, end] → sum `no_of_sheet`, `total_sq_meter`.
   - **Consumption / Sales / Issue for pressing:** Same as stock report, using mdf_item_id in item_ids and date range.
   - Compute **opening** and **closing**; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, sales, closing.
7. If no rows, return 404 "No stock data found for the selected period".
8. Call `GenerateMdfItemWiseStockReportExcel(aggregatedData, startDate, endDate, filter)`.
9. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/MDF/mdfStockReport.js`

**Function:** `GenerateMdfItemWiseStockReportExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/MDF` exists.
- Create workbook, sheet "MDF Stock Report Item Wise".
- Title row: "MDF Type (Item Wise) [ category ] [ Item: item_name ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (from filters when present).
- First column: item_name; then same numeric columns as stock report (mdf_sub_type, thickness, size, opening_sheets, opening_sqm, …).
- Group data by item_name → thickness; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `MDF-Stock-Report-ItemWise-{timestamp}.xlsx`; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/MDF/mdf.routes.js`

- Import `mdfItemWiseStockReportCsv` from the controller.
- `router.post('/download-stock-report-mdf-item-wise', mdfItemWiseStockReportCsv)`.
- Export default router (alongside stock report route).

### 4. Report router registration

**File:** `topl_backend/routes/report/reports2.routes.js`

- MDF routes mounted via `router.use(mdfRoutes);`.

**API path:** `POST /api/{version}/report/download-stock-report-mdf-item-wise`

## Data aggregation logic

### Schema reference

Same as MDF Stock Report; **item_name** is used in view and item details for grouping and filtering.

| Collection / model                | Key fields used |
|-----------------------------------|------------------|
| mdf_inventory_items_view_modal    | item_name, item_sub_category_name, thickness, length, width, available_sheets, available_sqm, _id (for item_ids) |
| mdf_inventory_items_details       | item_name, item_sub_category_name, thickness, length, width, invoice_id, no_of_sheet, total_sq_meter, deleted_at |
| mdf_inventory_invoice_details     | _id, inward_date |
| mdf_history (mdf_history_model)    | mdf_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation

Same formulas as MDF Stock Report. Receives and history aggregations are scoped per (item_name, sub-type, thickness, length, width) via the grouped item_ids and item details match. History uses `mdf_item_id` in item_ids.

### Pipeline structure (conceptual)

1. **Current inventory:** `mdf_inventory_items_view_modal` → match (deleted_at, filters including item_name) → group by (item_name, sub-type, thickness, length, width) → sum available_sheets/sqm, push _id as item_ids.
2. **Per group:** Receives from item details (with item_name in match) + invoice lookup (sum no_of_sheet, total_sq_meter); Consumption / Sales / Issue pressing from mdf_history_model (mdf_item_id in item_ids, issue_status, date range).
3. **Compute** opening and closing; build row object (item_name, mdf_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; pass to Excel generator.

## Excel report structure

### Columns

1. Item Name  
2. MDF Sub Type  
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
13. Issue For Pressing  
14. Issue For Pressing Sq Met  
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
| Path   | `/report/download-stock-report-mdf-item-wise` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name, item_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Item-wise stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-mdf-item-wise (body: startDate, endDate, filter?)
  → mdf.routes.js
  → mdfItemWiseStockReportCsv (controller)
  → mdf_inventory_items_view_modal aggregate (with item_name) + per-group receives/history aggregates
  → GenerateMdfItemWiseStockReportExcel(...) (config)
  → Excel to public/upload/reports/reports2/MDF/ (ItemWise filename)
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `mdfStockReport.js` – `mdfItemWiseStockReportCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/MDF/mdfStockReport.js` – `GenerateMdfItemWiseStockReportExcel` implemented.
- **Routes:** `MDF/mdf.routes.js` – POST route registered.
- **Documentation:** `MDF_ITEMWISE_STOCK_REPORT_API.md` (API), `MDF_ITEMWISE_STOCK_REPORT_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
