# Fleece Stock Report by Inward Number – Implementation Plan

## Objective

Implement the **Fleece Stock Report by Inward Number** API under reports2 that generates an Excel report for a user-selected date range. The report has **Inward No.** (inward_sr_no) as the first column. **Multiple items in the same inward produce multiple rows** when they have different specs (sub-category, thickness, size). Grand total at the end. Values are in **rolls** and **square meters**.

## Implementation Approach

- Mirrors the Plywood/MDF by-pellet report pattern, adapted for inward grouping.
- Group fleece items by (invoice_id, item_sub_category_name, thickness, length, width).
- Use inward_sr_no from fleece_inventory_invoice_details as "Inward No." (first column).
- Fleece has no ply resizing; only Issue For Pressing.

## Report Structure (Excel)

- **Period:** User-specified date range (startDate, endDate).
- **Data source:** fleece_inventory_items_details + fleece_inventory_invoice_details + fleece_history_details.
- **Grouping:** One row per inward per (sub_category, thickness, size); Inward No. cells merged vertically; total row per inward; grand total at the end.
- **Columns:** Inward No., Fleece Paper Sub Category, Thickness, Size, Opening Rolls, Opening Metres, Received, Consumed, Order, Issue For Pressing, Closing (rolls + sq m). Challan is computed and included in Consumed but not displayed. Multiple items in same inward with different specs = multiple rows.

## Implementation Files

### Controller

**File:** `topl_backend/controllers/reports2/Fleece/fleeceStockReport.js`

**Function:** `fleeceStockReportByInwardCsv`

### Excel Config

**File:** `topl_backend/config/downloadExcel/reports2/Fleece/fleeceStockReport.js`

**Function:** `GenerateFleeceStockReportByInwardExcel`

### Routes

**API path:** `POST /api/{version}/report/download-stock-report-fleece-by-inward`

## Schema Reference


| Collection / model                            | Key fields                                                                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fleece_inventory_items_details                | _id, item_sub_category_name, thickness, length, width, number_of_roll, total_sq_meter, available_number_of_roll, available_sqm, invoice_id, deleted_at |
| fleece_inventory_invoice_details              | _id, inward_sr_no, inward_date                                                                                                                                     |
| fleece_history_details (fleece_history_model) | fleece_item_id, issue_status, issued_number_of_roll, issued_sqm, createdAt                                                                                           |


## API Contract Summary


| Aspect | Value                                                                                      |
| ------ | ------------------------------------------------------------------------------------------ |
| Method | POST                                                                                       |
| Path   | `/report/download-stock-report-fleece-by-inward`                                           |
| Body   | startDate, endDate, optional filter (item_sub_category_name)                               |
| 200    | `{ data: "<download URL>", message: "Stock report by inward number generated successfully" }` |
| 400    | Missing/invalid dates or start > end                                                       |
| 404    | No stock data for period (no receive, consume, challan, order, or issue for pressing in date range) |
| 500    | Error generating report                                                                    |

