# Face Stock Report API

## Overview

The Face Stock Report API generates dynamic Excel reports showing face inventory stock movements for a given date range. The report includes opening balance, received metres, issued metres, and closing balance, grouped by item name and thickness. It uses face_inventory_items_details, face_inventory_invoice_details, and face_history.

## Endpoint

```
POST /report/download-stock-report-face
```

**Full URL (with version):** `POST /api/V1/report/download-stock-report-face`

## Authentication

- **Access:** Private (AuthMiddleware / RolesPermissions can be enabled)
- **Permission:** `face_inventory` with `view` access (when enabled)

## Request Body

### Required Parameters

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

### Optional Parameters

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filter": {
    "item_name": "ASH"
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
  "data": "http://localhost:5000/public/upload/reports/reports2/Face/Face-Stock-Report-1738152891234.xlsx"
}
```

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
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request – Invalid date range

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No stock data found for the selected period"
}
```

## Report Structure

### Title row

**Format:** `Face Stock Report - DD/MM/YYYY-DD/MM/YYYY`  
**With filter:** `Face Stock Report [ item_name ] - DD/MM/YYYY-DD/MM/YYYY`

### Columns

| Column            | Description                                  |
|------------------|----------------------------------------------|
| Item name        | Item name from inventory                     |
| Thickness        | Thickness                                   |
| Opening Balance  | Opening stock (sq m)                         |
| Received Metres  | Received during period (sq m)               |
| Issued Metres    | Issued during period (sq m)                  |
| Closing Bal      | Closing stock (sq m)                         |

### Layout

- **Row 1:** Report title (merged)
- **Row 2:** Empty (spacing)
- **Row 3:** Column headers
- **Data:** Grouped by item name, with subtotal row per item
- **Total row** at bottom (grand total)

## Stock Calculation Logic

- **Opening Balance:** Current Available Sqm + Issued Sqm (in period) − Received Sqm (in period)
- **Received Metres:** Sum of `total_sq_meter` where `invoice.inward_date` is in [startDate, endDate]
- **Issued Metres:** Sum of `issued_sqm` from face_history where `createdAt` is in [startDate, endDate]
- **Closing Bal:** Opening + Received − Issued (all in sq m)

All values are non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **face_inventory_items_details** – Current inventory (item_name, thickness, available_sqm, total_sq_meter, invoice_id)
2. **face_inventory_invoice_details** – Inward/invoice (inward_date)
3. **face_history** – Transaction history (face_item_id, issued_sqm, createdAt)

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-stock-report-face \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "filter": { "item_name": "ASH" }
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-face',
  {
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    filter: { item_name: 'ASH' }
  }
);
const downloadUrl = response.data.data;
```

## File Storage

- **Directory:** `public/upload/reports/reports2/Face/`
- **Filename pattern:** `Face-Stock-Report-{timestamp}.xlsx`

## Notes

- Only items with at least one non-zero value (opening, received, issued, closing) are included.
- Excel files are timestamped to avoid overwrites.
- Date format: YYYY-MM-DD.
