# Fleece Stock Report by Roll No. – Implementation Plan

## Objective

Implement the **Fleece Stock Report by Roll No.** API under reports2 that generates an Excel report for a user-selected date range. The report mirrors the standard Fleece Stock Report but with **Roll No.** (item_sr_no) as the first column. Each row represents one roll (one document in fleece_inventory_items_details). Data is grouped by **Fleece Paper sub-category** with subtotals and grand total. Values are in **rolls** and **square meters**.

## Implementation Approach

- Mirrors the Plywood/MDF by-pellet report pattern.
- Each fleece_inventory_items_details document = one roll.
- Use item_sr_no as "Roll No." (first column).
- Fleece has no ply resizing; only Issue For Pressing.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** fleece_inventory_items_details + fleece_inventory_invoice_details + fleece_history_details.
- **Grouping:** Fleece Paper Sub Category; subtotal per category; grand total.
- **Columns:** Roll No., Fleece Paper Sub Category, Thickness, Size, Opening Rolls through Closing Metres (16 columns).

## Implementation Files

### Controller

**File:** `topl_backend/controllers/reports2/Fleece/fleeceStockReport.js`

**Function:** `fleeceStockReportByRollCsv`

### Excel Config

**File:** `topl_backend/config/downloadExcel/reports2/Fleece/fleeceStockReport.js`

**Function:** `GenerateFleeceStockReportByRollExcel`

### Routes

**API path:** `POST /api/{version}/report/download-stock-report-fleece-by-roll`

## Schema Reference


| Collection / model                            | Key fields                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fleece_inventory_items_details                | _id, item_sr_no, item_sub_category_name, thickness, length, width, number_of_roll, total_sq_meter, available_number_of_roll, available_sqm, invoice_id, deleted_at |
| fleece_inventory_invoice_details              | _id, inward_date                                                                                                                                                   |
| fleece_history_details (fleece_history_model) | fleece_item_id, issue_status, issued_number_of_roll, issued_sqm, createdAt                                                                                         |


## API Contract Summary


| Aspect | Value                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| Method | POST                                                                                       |
| Path   | `/report/download-stock-report-fleece-by-roll`                                             |
| Body   | startDate, endDate, optional filter (item_sub_category_name)                               |
| 200    | `{ data: "<download URL>", message: "Stock report by roll generated successfully" }`       |
| 400    | Missing/invalid dates or start > end                                                       |
| 404    | No stock data for period (no receive, consume, sales, or issue for pressing in date range) |
| 500    | Error generating report                                                                    |


