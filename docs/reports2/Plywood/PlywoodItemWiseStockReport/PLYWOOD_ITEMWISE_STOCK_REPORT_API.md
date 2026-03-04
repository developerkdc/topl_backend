# Plywood Item-Wise Stock Report API

## Overview

The Plywood Item-Wise Stock Report API (reports2) generates a dynamic inventory report with opening stock, receives, consumption, sales, issue for recalibration, and closing stock for a given date range. Data is grouped by **item name**, then **plywood sub-type**, **thickness**, and **size**. Same columns as the standard Plywood Stock Report with **Item Name** as the first column.

## Endpoint

```
POST /report/download-stock-report-plywood-item-wise
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-plywood-item-wise`)

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
| filter.item_sub_category_name | string | No | Plywood sub-type (e.g. GURJAN, MALAYSIAN)  |
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
    "item_sub_category_name": "GURJAN",
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
  "data": "http://localhost:5000/public/upload/reports/reports2/Plywood/Plywood-Stock-Report-ItemWise-1706432891234.xlsx"
}
```

- **data**: Full URL to download the generated Excel file.

### Error Responses

#### 400 Bad Request – Missing dates

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request – Invalid date format

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid date format"
}
```

#### 400 Bad Request – Invalid range

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found

When there is no stock data for the selected period:

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No stock data found for the selected period"
}
```

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "status": "error",
  "message": "Failed to generate stock report"
}
```

## Report Structure

- **Sheet name:** Plywood Stock Report Item Wise  
- **File path:** `public/upload/reports/reports2/Plywood/Plywood-Stock-Report-ItemWise-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
Plywood Type (Item Wise) [ CATEGORY ] [ Item: ITEM_NAME ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

- Category and Item segments appear when the corresponding filters are applied.

**Row 2:** Empty (spacing)

**Row 3 onwards – Data table columns:**

| #  | Column header               | Description                              |
|----|-----------------------------|------------------------------------------|
| 1  | Item Name                   | Item name                                |
| 2  | Plywood Sub Type           | Category (e.g. GURJAN, MALAYSIAN)        |
| 3  | Thickness                   | Thickness (mm)                           |
| 4  | Size                        | Dimensions (e.g. "2.44 X 1.22")          |
| 5  | Opening                     | Opening stock (sheets)                   |
| 6  | Op Metres                   | Opening stock (sq m)                     |
| 7  | Receive                     | Received in period (sheets)              |
| 8  | Rec Mtrs                    | Received (sq m)                         |
| 9  | Consume                     | Consumed in period (sheets)              |
| 10 | Cons Mtrs                   | Consumed (sq m)                         |
| 11 | Sales                       | Sold in period (sheets)                 |
| 12 | Sales Mtrs                  | Sold (sq m)                              |
| 13 | Issue For Rec Ply/Cal Sheet | Issued for recal (sheets)               |
| 14 | Issue For Rec Ply/Cal Sq Met| Issued for recal (sq m)                  |
| 15 | Closing                     | Closing stock (sheets)                  |
| 16 | Cl Metres                   | Closing stock (sq m)                     |

- Data grouped by **Item Name → Thickness → Size**; subtotal row after each thickness; grand total at the end.

## Stock Calculation Logic

Same as the Plywood Stock Report: all values in **sheets** and **square meters**. Opening = current + consume + sales - receive; Closing = opening + receive - consume - sales. Receives from invoice inward date in period; consumption from `issue_status` in `['order', 'pressing', 'plywood_resizing']`; sales from `issue_status = 'challan'`; issue for recal from `['plywood_resizing', 'pressing']`. Only rows with activity are included; values are non-negative.

## Database Collections Used

1. **plywood_inventory_items_view_modal** – Current inventory (grouped view, includes item_name)
2. **plywood_inventory_items_details** – Item details and invoice link
3. **plywood_inventory_invoice_details** – Inward/invoice dates
4. **plywood_history** (plywood_history_model) – Transaction history

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/V1/report/download-stock-report-plywood-item-wise" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"startDate": "2025-05-01", "endDate": "2025-05-28", "filter": {"item_sub_category_name": "GURJAN"}}'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-plywood-item-wise',
  { startDate: '2025-05-01', endDate: '2025-05-28', filter: { item_name: 'SOME_ITEM' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.data;
window.open(downloadUrl, '_blank');
```

## Notes

- Report includes only rows with activity in the period (non-zero opening, receive, consume, sales, or closing).
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Plywood/`.
