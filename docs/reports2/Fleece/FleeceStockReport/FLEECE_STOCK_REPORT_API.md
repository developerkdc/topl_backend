# Fleece Stock Report API

## Overview

The Fleece Stock Report API (reports2) generates a dynamic inventory report with opening stock, receives, consumption, sales, issue for pressing, and closing stock for a given date range. Data is grouped by **Fleece Paper sub-category**, **thickness**, and **size**. Values are in **rolls** and **square meters**.

## Endpoint

```
POST /report/download-stock-report-fleece
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-fleece`)

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
| filter.item_sub_category_name | string | No | Fleece sub-type (e.g. IMPORTED)            |

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
    "item_sub_category_name": "IMPORTED"
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
  "data": "http://localhost:5000/public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-1706432891234.xlsx"
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

- **Sheet name:** Fleece Stock Report  
- **File path:** `public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
Fleece Paper Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

- With filter: e.g. `Fleece Paper Type [ IMPORTED ]   stock  in the period  01/05/2025 and 28/05/2025`
- Without filter: `Fleece Paper Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025`

**Row 2:** Empty (spacing)

**Row 3 onwards – Data table columns:**

| #  | Column header                  | Description                              |
|----|--------------------------------|------------------------------------------|
| 1  | Fleece Paper Sub Category      | Category (e.g. IMPORTED)                 |
| 2  | Thickness                      | Thickness (mm)                            |
| 3  | Size                           | Dimensions (e.g. "2.44 X 1.22")           |
| 4  | Opening Rolls                  | Opening stock (rolls)                     |
| 5  | Opening Metres                 | Opening stock (sq m)                      |
| 6  | Received Rolls                 | Received in period (rolls)                |
| 7  | Received Mtrs                  | Received (sq m)                           |
| 8  | Consumed Rolls                 | Consumed in period (rolls)                |
| 9  | Consumed Mtrs                  | Consumed (sq m)                           |
| 10 | Sales Rolls                    | Sold in period (rolls)                    |
| 11 | Sales Mtrs                     | Sold (sq m)                               |
| 12 | Issue For Pressing             | Issued for pressing (rolls)               |
| 13 | Issue For Pressing Sq Met      | Issued for pressing (sq m)                |
| 14 | Closing sheets                 | Closing stock (rolls)                     |
| 15 | Closing Metres                 | Closing stock (sq m)                      |

- Data grouped by **Fleece Paper Sub Category → Thickness → Size**; subtotal row after each thickness; grand total at the end.

## Stock Calculation Logic

All values are computed in **rolls** and **square meters**.

### Formulas

- **Opening (rolls):**  
  `Opening Rolls = Current Available Rolls + (Consumed + Sold) Rolls - Received Rolls`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm`
- **Receives:** From inventory item details joined to invoice details where `inward_date` is between startDate and endDate; sum `number_of_roll` and `total_sq_meter`.
- **Consumption:** From fleece history where `issue_status` in `['order', 'pressing']` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Sales:** From fleece history where `issue_status = 'challan'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Issue for pressing:** From fleece history where `issue_status = 'pressing'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume - Sales` (in both rolls and sq m).

Only rows that had **at least one movement in the period** (receive, consume, sales, or issue for pressing) are included. If there was no such activity in the date range, no rows are shown and the API returns 404. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **fleece_inventory_items_view_modal** – Current inventory (grouped view)
2. **fleece_inventory_items_details** – Item details and invoice link
3. **fleece_inventory_invoice_details** – Inward/invoice dates
4. **fleece_history_details** (fleece_history_model) – Transaction history (issue_status, issued_number_of_roll, issued_sqm)

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/V1/report/download-stock-report-fleece" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"startDate": "2025-05-01", "endDate": "2025-05-28"}'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-fleece',
  { startDate: '2025-05-01', endDate: '2025-05-28', filter: { item_sub_category_name: 'IMPORTED' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.data;
window.open(downloadUrl, '_blank');
```

## Notes

- Report includes only rows that had at least one movement in the period (receive, consume, sales, or issue for pressing). If the date range has no such activity, the report returns 404 with "No stock data found for the selected period".
- Fleece uses rolls (not sheets); all quantity columns use rolls.
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Fleece/`.
