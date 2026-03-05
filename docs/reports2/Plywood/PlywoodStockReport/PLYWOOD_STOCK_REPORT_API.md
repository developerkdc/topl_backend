# Plywood Stock Report API

## Overview

The Plywood Stock Report API (reports2) generates a dynamic inventory report with opening stock, receives, consumption, sales, issue for ply resizing, issue for pressing, and closing stock for a given date range. Data is grouped by **plywood sub-category**, **thickness**, and **size**.

## Endpoint

```
POST /report/download-stock-report-plywood
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-plywood`)

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

### Example

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28"
}
```

### Example – With category filter

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "GURJAN"
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Stock report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/Plywood/Plywood-Stock-Report-1706432891234.xlsx"
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

- **Sheet name:** Plywood Stock Report  
- **File path:** `public/upload/reports/reports2/Plywood/Plywood-Stock-Report-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
Plywood Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

- With filter: e.g. `Plywood Type [ GURJAN ]   stock  in the period  01/05/2025 and 28/05/2025`
- Without filter: `Plywood Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025`

**Row 2:** Empty (spacing)

**Row 3 onwards – Data table columns:**

| #  | Column header                  | Description                              |
|----|--------------------------------|------------------------------------------|
| 1  | Plywood Sub Category          | Category (e.g. GURJAN, MALAYSIAN)        |
| 2  | Thickness                      | Thickness (mm)                           |
| 3  | Size                           | Dimensions (e.g. "2.44 X 1.22")          |
| 4  | Opening Sheets                 | Opening stock (sheets)                   |
| 5  | Opening Metres                 | Opening stock (sq m)                     |
| 6  | Received Sheets                | Received in period (sheets)               |
| 7  | Received Mtrs                   | Received (sq m)                          |
| 8  | Consumed Sheets                | Consumed in period (sheets)              |
| 9  | Consumed Mtrs                  | Consumed (sq m)                          |
| 10 | Sales Sheets                   | Sold in period (sheets)                   |
| 11 | Sales Mtrs                     | Sold (sq m)                              |
| 12 | Issue For Ply Resizing Sheet   | Issued for ply resizing (sheets)        |
| 13 | Issue For Ply Resizing Sq Met  | Issued for ply resizing (sq m)          |
| 14 | Issue For Pressing             | Issued for pressing (sheets)             |
| 15 | Issue For Pressing Sq Met      | Issued for pressing (sq m)              |
| 16 | Closing sheets                 | Closing stock (sheets)                   |
| 17 | Closing Metres                 | Closing stock (sq m)                     |

- Data grouped by **Plywood Sub Category → Thickness → Size**; subtotal row after each thickness; grand total at the end.

## Stock Calculation Logic

All values are computed in **sheets** and **square meters**.

### Formulas

- **Opening (sheets):**  
  `Opening Sheets = Current Available Sheets + (Consumed + Sold) Sheets - Received Sheets`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm`
- **Receives:** From inventory item details joined to invoice details where `inward_date` is between startDate and endDate; sum `sheets` and `total_sq_meter`.
- **Consumption:** From plywood history where `issue_status` in `['order', 'pressing', 'plywood_resizing']` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Sales:** From plywood history where `issue_status = 'challan'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Issue for ply resizing:** From plywood history where `issue_status = 'plywood_resizing'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Issue for pressing:** From plywood history where `issue_status = 'pressing'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume - Sales` (in both sheets and sq m).

Only rows with at least one non-zero value among opening, receive, consume, sales, or closing are included. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **plywood_inventory_items_view_modal** – Current inventory (grouped view)
2. **plywood_inventory_items_details** – Item details and invoice link
3. **plywood_inventory_invoice_details** – Inward/invoice dates
4. **plywood_history** (plywood_history_model) – Transaction history (issue_status, issued_sheets, issued_sqm)

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/V1/report/download-stock-report-plywood" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"startDate": "2025-05-01", "endDate": "2025-05-28"}'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-plywood',
  { startDate: '2025-05-01', endDate: '2025-05-28', filter: { item_sub_category_name: 'GURJAN' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.data;
window.open(downloadUrl, '_blank');
```

## Notes

- Report includes only rows with activity in the period (non-zero opening, receive, consume, sales, or closing).
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Plywood/`.
