# MDF Stock Report API

## Overview

The MDF Stock Report API (reports2) generates a dynamic inventory report with opening stock, receives, consumption (total of challan, order, pressing), challan, order, issue for pressing, and closing stock for a given date range. Data is grouped by **MDF sub-type**, **thickness**, and **size**.

## Endpoint

```
POST /report/download-stock-report-mdf
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-mdf`)

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
| filter.item_sub_category_name | string | No | MDF sub-type (e.g. category name)          |

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
    "item_sub_category_name": "SPECIFIC_TYPE"
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
  "data": "http://localhost:5000/public/upload/reports/reports2/MDF/MDF-Stock-Report-1706432891234.xlsx"
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

- **Sheet name:** MDF Stock Report  
- **File path:** `public/upload/reports/reports2/MDF/MDF-Stock-Report-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
MDF Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

- With filter: e.g. `MDF Type [ SPECIFIC_TYPE ]   stock  in the period  01/05/2025 and 28/05/2025`
- Without filter: `MDF Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025`

**Row 2:** Empty (spacing)

**Row 3 onwards – Data table columns:**

| #  | Column header           | Description                              |
|----|-------------------------|------------------------------------------|
| 1  | MDF Sub Type            | Category (from item_sub_category_name)   |
| 2  | Thickness               | Thickness (mm)                           |
| 3  | Size                    | Dimensions (e.g. "2.44 X 1.22")          |
| 4  | Opening                 | Opening stock (sheets)                   |
| 5  | Op Metres               | Opening stock (sq m)                     |
| 6  | Receive                 | Received in period (sheets)              |
| 7  | Rec Mtrs                | Received (sq m)                          |
| 8  | Consume                 | Total consumed (challan + order + pressing) (sheets) |
| 9  | Cons Mtrs               | Total consumed (sq m)                    |
| 10 | Challan Sheets          | Issued for challan (sheets)             |
| 11 | Challan Mtrs            | Issued for challan (sq m)               |
| 12 | Order Sheets            | Issued for order (sheets)                |
| 13 | Order Mtrs              | Issued for order (sq m)                  |
| 14 | Issue For Pressing      | Issued for pressing (sheets)             |
| 15 | Issue For Pressing Sq Met | Issued for pressing (sq m)            |
| 16 | Closing                 | Closing stock (sheets)                   |
| 17 | Cl Metres               | Closing stock (sq m)                     |

- Data grouped by **MDF Sub Type → Thickness → Size**; subtotal row after each thickness; grand total at the end.

## Stock Calculation Logic

All values are computed in **sheets** and **square meters**.

### Formulas

- **Opening (sheets):**  
  `Opening Sheets = Current Available Sheets + Consumed Sheets - Received Sheets`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + Consumed Sqm - Received Sqm`
- **Consumed:** Challan + Order + Issue for pressing (computed from history).
- **Challan:** From MDF history where `issue_status = 'challan'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Order:** From MDF history where `issue_status = 'order'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Receives:** From MDF inventory item details joined to invoice details where `inward_date` is between startDate and endDate (end date includes full day 23:59:59.999 UTC); sum `no_of_sheet` and `total_sq_meter`.
- **Issue for pressing:** From MDF history where `issue_status = 'pressing'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume` (in both sheets and sq m).

Only rows that had **at least one movement in the period** (receive, consume, challan, order, or issue for pressing) are included. If there was no inward, consumption, challan, order, or issue for pressing in the date range, no rows are shown and the API returns 404. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **mdf_inventory_items_view_modal** – Current inventory (grouped view)
2. **mdf_inventory_items_details** – Item details and invoice link (`no_of_sheet`, `total_sq_meter`)
3. **mdf_inventory_invoice_details** – Inward/invoice dates
4. **mdf_history** (mdf_history_model) – Transaction history (`mdf_item_id`, issue_status, issued_sheets, issued_sqm)

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/V1/report/download-stock-report-mdf" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"startDate": "2025-05-01", "endDate": "2025-05-28"}'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-mdf',
  { startDate: '2025-05-01', endDate: '2025-05-28', filter: { item_sub_category_name: 'SPECIFIC_TYPE' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.data;
window.open(downloadUrl, '_blank');
```

## Notes

- Report includes only rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing). If the date range has no such activity, the report returns 404 with "No stock data found for the selected period".
- Date range: end date includes the full day (23:59:59.999 UTC) so transactions on the end date are included.
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/MDF/`.
