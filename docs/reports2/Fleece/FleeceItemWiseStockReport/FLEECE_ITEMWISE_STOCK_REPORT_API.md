# Fleece Item-Wise Stock Report API

## Overview

The Fleece Item-Wise Stock Report API (reports2) generates a dynamic inventory report with opening stock, receives, consumption, sales, issue for pressing, and closing stock for a given date range. Data is grouped by **item name**, then **Fleece Paper sub-type**, **thickness**, and **size**. Same columns as the standard Fleece Stock Report with **Item Name** as the first column. Values are in **rolls** and **square meters**.

## Endpoint

```
POST /report/download-stock-report-fleece-item-wise
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-fleece-item-wise`)

## Authentication

- Uses the same auth as other report endpoints (report router).
- Ensure a valid session/authorization if the report router is protected.

## Request Body

### Required Parameters

| Parameter  | Type   | Required | Description                    |
|-----------|--------|----------|--------------------------------|
| startDate | string | Yes      | Period start date `YYYY-MM-DD` |
| endDate   | string | Yes      | Period end date `YYYY-MM-DD`   |

### Optional Parameters

| Parameter | Type   | Required | Description                                |
|-----------|--------|----------|--------------------------------------------|
| filter    | object | No       | Filters to narrow the report               |
| filter.item_sub_category_name | string | No | Fleece sub-type (e.g. IMPORTED)             |
| filter.item_name             | string | No | Item name to filter by                     |

### Example

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28"
}
```

### Example – With filters

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "IMPORTED",
    "item_name": "SOME_ITEM"
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Item-wise stock report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ItemWise-1706432891234.xlsx"
}
```

- **data**: Full URL to download the generated Excel file.

### Error Responses

Same as Fleece Stock Report (400, 404, 500).

## Report Structure

- **Sheet name:** Fleece Stock Report Item Wise  
- **File path:** `public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ItemWise-{timestamp}.xlsx`

**Columns:** Item Name, Fleece Paper Sub Category, Thickness, Size, Opening Rolls, Opening Metres, Received Rolls, Received Mtrs, Consumed Rolls, Consumed Mtrs, Sales Rolls, Sales Mtrs, Issue For Pressing, Issue For Pressing Sq Met, Closing sheets, Closing Metres.

- Data grouped by **Item Name → Thickness → Size**; subtotal row after each thickness; grand total at the end.

## Stock Calculation Logic

Same as the Fleece Stock Report: all values in **rolls** and **square meters**. Opening = current + consume + sales - receive; Closing = opening + receive - consume - sales. Receives from invoice inward date in period; consumption from `issue_status` in `['order', 'pressing']`; sales from `issue_status = 'challan'`; issue for pressing from `issue_status = 'pressing'`. Only rows that had at least one movement in the period (receive, consume, sales, or issue for pressing) are included; if there was no such activity, the API returns 404. Values are non-negative.

## Database Collections Used

1. **fleece_inventory_items_view_modal** – Current inventory (grouped view, includes item_name)
2. **fleece_inventory_items_details** – Item details and invoice link
3. **fleece_inventory_invoice_details** – Inward/invoice dates
4. **fleece_history_details** (fleece_history_model) – Transaction history

## Notes

- Report includes only rows that had at least one movement in the period (receive, consume, sales, or issue for pressing). If the date range has no such activity, the report returns 404 with "No stock data found for the selected period".
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Fleece/`.
