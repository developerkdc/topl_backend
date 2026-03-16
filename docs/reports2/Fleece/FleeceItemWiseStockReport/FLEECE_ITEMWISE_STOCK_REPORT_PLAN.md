# Fleece Item-Wise Stock Report – Implementation Plan

## Objective

Implement the **Fleece Item-Wise Stock Report** API under reports2 that generates an Excel report for a user-selected date range. Same structure as the standard Fleece Stock Report but grouped by **item name** first, then thickness and size. Values are in **rolls** and **square meters**.

## Implementation Approach

- Mirrors the Plywood/MDF item-wise report pattern.
- Group by item_name, item_sub_category_name, thickness, length, width.
- Support filter.item_name and filter.item_sub_category_name.

## Report Structure (Excel)

- **Grouping:** Item Name → Thickness → Size
- **Columns:** Item Name, Fleece Paper Sub Category, Thickness, Size, Opening Rolls through Closing Metres (16 columns).

## Implementation Files

### Controller

**File:** `topl_backend/controllers/reports2/Fleece/fleeceStockReport.js`

**Function:** `fleeceItemWiseStockReportCsv`

### Excel Config

**File:** `topl_backend/config/downloadExcel/reports2/Fleece/fleeceStockReport.js`

**Function:** `GenerateFleeceItemWiseStockReportExcel`

### Routes

**API path:** `POST /api/{version}/report/download-stock-report-fleece-item-wise`

## API Contract Summary

| Aspect | Value |
|--------|-------|
| Method | POST |
| Path   | `/report/download-stock-report-fleece-item-wise` |
| Body   | startDate, endDate, optional filter (item_sub_category_name, item_name) |
| 200    | `{ data: "<download URL>", message: "Item-wise stock report generated successfully" }` |
| 400    | Missing/invalid dates or start > end |
| 404    | No stock data for period (no receive, consume, sales, or issue for pressing in date range) |
| 500    | Error generating report |
