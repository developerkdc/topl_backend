# MDF Stock Report by Pellet No. – Implementation Plan

## Objective

Implement the **MDF Stock Report by Pellet No.** API under reports2 that generates an Excel report for a user-selected date range. The report has the same structure as the standard MDF Stock Report but with **Pellet No.** (pallet_number) as the first column. Each row represents one pellet (one document in mdf_inventory_items_details). Data is grouped by **MDF sub-category** with subtotals and grand total. MDF has no ply resizing, so 16 columns (vs 18 for Plywood).

## Implementation Approach

- Reuse the same calculation logic as the standard MDF Stock Report (opening, receives, consumption, sales, issue for pressing, closing).
- Data is anchored on **mdf_inventory_items_details** (individual pellets); for each item, period receives come from invoice lookup (inward_date in range), and consumption/sales/issue from **mdf_history** matched by `mdf_item_id`.
- MDF has no plywood_resizing; consumed = `challan` + `order` + `pressing`.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** mdf_inventory_items_details + mdf_inventory_invoice_details + mdf_history.
- **Grouping:** MDF Sub Category; subtotal per category; grand total.
- **Columns:** Pellet No., MDF Sub Category, Thickness, Size, Opening (sheets + sq m), Received, Consumed, Order, Issue For Pressing (sheets + sq m), Closing (sheets + sq m). Challan is computed and included in Consumed but not displayed.

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/MDF/mdfStockReport.js`

**Function:** `mdfStockReportByPelletCsv`

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
4. **All items:** Aggregate `mdf_inventory_items_details`: match `deleted_at: null` and `...itemFilter`; `$lookup` invoice for `inward_date`; project pallet_number, item_sub_category_name, thickness, length, width, no_of_sheet, total_sq_meter, available_sheets, available_sqm.
5. For each item (each pellet):
   - **Receives:** If `invoice.inward_date` in [start, end], use `no_of_sheet` and `total_sq_meter`; else 0.
   - **Challan / Order / Issue for pressing:** Aggregate `mdf_history_model`: match `mdf_item_id: item._id`, `issue_status` ('challan', 'order', 'pressing'), `createdAt` in [start, end] → sum `issued_sheets`, `issued_sqm` per status.
   - **Consumed** = challan + order + issue for pressing (computed).
   - Compute **opening** = current + consume - receive; **closing** = opening + receive - consume; clamp to non-negative.
6. Filter rows with at least one non-zero among opening, receive, consume, challan, order, closing.
7. Sort by item_sub_category_name, then pallet_number.
8. If no rows, return 404 "No stock data found for the selected period".
9. Call `GenerateMdfStockReportByPelletExcel(aggregatedData, startDate, endDate, filter)`.
10. Return 200 with ApiResponse: message and `data: excelLink`.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/MDF/mdfStockReport.js`

**Function:** `GenerateMdfStockReportByPelletExcel(aggregatedData, startDate, endDate, filters)`

**Processing logic:**

- Ensure folder `public/upload/reports/reports2/MDF` exists.
- Create workbook, sheet "MDF Stock Report (By Pellet No.)".
- Title row: "MDF Type [ filter ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY" (filter from `filters.item_sub_category_name` or "ALL").
- Define columns: pellet_no, mdf_sub_type, thickness, size, opening_sheets, opening_sqm, receive_sheets, receive_sqm, consume_sheets, consume_sqm, order_sheets, order_sqm, issue_pressing_sheets, issue_pressing_sqm, closing_sheets, closing_sqm (16 columns). Challan columns are hidden.
- Group data by mdf_sub_type; for each group add data rows then a "Total" row; then grand total row. Bold headers and totals; gray header row.
- Save to `MDF-Stock-Report-ByPellet-{timestamp}.xlsx` in the same folder; return full download URL.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/MDF/mdf.routes.js`

- Import `mdfStockReportByPelletCsv` from the controller.
- `router.post('/download-stock-report-mdf-by-pellet', mdfStockReportByPelletCsv)`.

**API path:** `POST /api/{version}/report/download-stock-report-mdf-by-pellet`

## Data aggregation logic

### Schema reference

| Collection / model                  | Key fields used |
|-------------------------------------|------------------|
| mdf_inventory_items_details         | _id, pallet_number, item_sub_category_name, thickness, length, width, no_of_sheet, total_sq_meter, available_sheets, available_sqm, invoice_id, deleted_at |
| mdf_inventory_invoice_details       | _id, inward_date |
| mdf_history_details (mdf_history_model) | mdf_item_id, issue_status, issued_sheets, issued_sqm, createdAt |

### Stock calculation (per pellet)

- **Receives (period):** If item's invoice `inward_date` ∈ [start, end], use item's `no_of_sheet` and `total_sq_meter`; else 0.
- **Challan:** History where `mdf_item_id === item._id`, `issue_status === 'challan'`, `createdAt` ∈ [start, end]. Sum `issued_sheets`, `issued_sqm`.
- **Order:** History where `mdf_item_id === item._id`, `issue_status === 'order'`, same date range.
- **Issue for pressing:** History where `mdf_item_id === item._id`, `issue_status === 'pressing'`, same date range.
- **Consumed:** challan + order + issue for pressing (computed).
- **Opening:** `current_sheets + consume_sheets - receive_sheets` (and same for sq m). Then `Math.max(0, ...)`.
- **Closing:** `opening + receive - consume` (sheets and sq m). Then `Math.max(0, ...)`.

### Pipeline structure (conceptual)

1. **All items:** `mdf_inventory_items_details` → match (deleted_at, filters) → lookup invoice → project needed fields.
2. **Per item:** Receives from inward_date check; Consumption / Sales / Issue for pressing from mdf_history_model (mdf_item_id = item._id, issue_status, date range).
3. **Compute** opening and closing; build row object (pellet_no, mdf_sub_type, thickness, size, and all numeric columns).
4. **Filter** active rows; **sort** by sub_category, pellet_no; pass to Excel generator.

## Excel report structure

### Columns

1. Pellet No.  
2. MDF Sub Category  
3. Thickness  
4. Size (length X width)  
5. Opening Sheets  
6. Opening Metres  
7. Received Sheets  
8. Received Mtrs  
9. Consumed Sheets  
10. Consumed Mtrs  
11. Order Sheets  
12. Order Mtrs  
13. Issue For Pressing  
14. Issue For Pressing Sq Met  
15. Closing sheets  
16. Closing Metres  

### Row hierarchy

- Row 1: Title (merged), bold.  
- Row 2: Empty.  
- Row 3: Header row (gray background, bold).  
- Data rows grouped by MDF Sub Category; after each category group, a "Total" row; at the end a "Total" grand total row (bold, optional gray).

## API contract summary

| Aspect | Value |
|--------|--------|
| Method | POST |
| Path   | `/report/download-stock-report-mdf-by-pellet` (under report router) |
| Body   | startDate, endDate, optional filter (item_sub_category_name) |
| 200    | `{ data: "<download URL>", statusCode: 200, status: "success", message: "Stock report by pellet generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |

## Flow diagram

```
Client
  → POST /report/download-stock-report-mdf-by-pellet (body: startDate, endDate, filter?)
  → mdf.routes.js
  → mdfStockReportByPelletCsv (controller)
  → mdf_inventory_items_details aggregate + per-item receives/history aggregates
  → GenerateMdfStockReportByPelletExcel(...) (config)
  → Excel to public/upload/reports/reports2/MDF/
  ← 200 { data: downloadLink }
```

## Implementation status

- **Controller:** `mdfStockReport.js` – `mdfStockReportByPelletCsv` implemented.
- **Excel config:** `config/downloadExcel/reports2/MDF/mdfStockReport.js` – `GenerateMdfStockReportByPelletExcel` implemented.
- **Routes:** `mdf.routes.js` – POST route registered.
- **Documentation:** `MDF_STOCK_REPORT_BY_PELLET_API.md` (API), `MDF_STOCK_REPORT_BY_PELLET_PLAN.md` (this plan).

Feature is implemented and ready for testing and deployment.
