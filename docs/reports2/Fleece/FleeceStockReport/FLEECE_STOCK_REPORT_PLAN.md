# Fleece Stock Report – Implementation Plan

## Objective

Implement the **Fleece Stock Report** API under reports2 that generates an Excel report for a user-selected date range. The report shows opening stock, receives, consumption, sales, issue for pressing, and closing stock. Data is grouped by **Fleece Paper sub-category**, **thickness**, and **size**. Values are in **rolls** and **square meters**.

## Implementation Approach

- Mirrors the Plywood/MDF stock report pattern, adapted for fleece (rolls instead of sheets).
- Fleece has no ply resizing; only **Issue For Pressing**.
- Data source: fleece_inventory_items_view_modal, fleece_inventory_items_details, fleece_inventory_invoice_details, fleece_history_details.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** fleece_inventory_items_view_modal + fleece_inventory_items_details + fleece_inventory_invoice_details + fleece_history_details.
- **Grouping:** Fleece Paper Sub Category → Thickness → Size; subtotal per thickness; grand total.
- **Columns:** Fleece Paper Sub Category, Thickness, Size, Opening Rolls, Opening Metres, Received Rolls, Received Mtrs, Consumed Rolls, Consumed Mtrs, Sales Rolls, Sales Mtrs, Issue For Pressing, Issue For Pressing Sq Met, Closing sheets, Closing Metres.

## Implementation Files

### Controller

**File:** `topl_backend/controllers/reports2/Fleece/fleeceStockReport.js`

**Function:** `fleeceStockReportCsv`

### Excel Config

**File:** `topl_backend/config/downloadExcel/reports2/Fleece/fleeceStockReport.js`

**Function:** `GenerateFleeceStockReportExcel`

### Routes

**File:** `topl_backend/routes/report/reports2/Fleece/fleece.routes.js`

**API path:** `POST /api/{version}/report/download-stock-report-fleece`

## Schema Reference

| Collection / model                  | Key fields |
|-------------------------------------|------------|
| fleece_inventory_items_details       | _id, item_sub_category_name, thickness, length, width, number_of_roll, total_sq_meter, available_number_of_roll, available_sqm, invoice_id, deleted_at |
| fleece_inventory_invoice_details     | _id, inward_date |
| fleece_history_details (fleece_history_model) | fleece_item_id, issue_status, issued_number_of_roll, issued_sqm, createdAt |

## API Contract Summary

| Aspect | Value |
|--------|-------|
| Method | POST |
| Path   | `/report/download-stock-report-fleece` |
| Body   | startDate, endDate, optional filter (item_sub_category_name) |
| 200    | `{ data: "<download URL>", message: "Stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period |
| 500    | Error generating report |
