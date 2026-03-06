# Other Goods Consumption Report API

## Overview

The Other Goods Consumption Report API generates an Excel report listing item consumption details for a specified date range. It fetches issued quantity and issued amount, groupings items by department.

## Endpoint

```
POST /report/download-other-goods-consumption-report
```

**Full URL (with version):** `POST /api/V1/report/download-other-goods-consumption-report`

## Authentication

- **Access:** Private (AuthMiddleware / RolesPermissions can be enabled)
- **Permission:** `other_goods_inventory` with `view` access (when enabled)

## Request Body

### Required Parameters

```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

### Optional Parameters

```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31",
    "machine": "Press machine 1",
    "department": "PRODUCTION"
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Other goods consumption report generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Other_Goods/store_consumption_report_1738152891234.xlsx"
}
```

### Error Responses

#### 400 Bad Request – Missing dates

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and End date are required"
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
  "message": "No consumption data found for the selected date range"
}
```

## Report Structure

### Title row

**Format:** `Store Consumption Report Date: DD-MM-YYYY to DD-MM-YYYY`

### Columns

| Column     | Description                                |
|------------|--------------------------------------------|
| Department | Department Name                            |
| Machine    | Machine Name                               |
| Item       | Item name                                  |
| Qty        | Issued Quantity                            |
| Unit       | Unit (derived from category or fallback)   |
| Amt        | Issued Amount                              |

### Layout

- **Row 1:** Report title (merged)
- **Row 2:** Empty (spacing)
- **Row 3:** Column headers
- **Data:** Grouped by department. Row displays department name only for the first entry.
- **Subtotal rows:** Department Total (sum of amt) at end of each department group.
- **Grand Total row:** At bottom (sum of all amt).

## Data Calculation Logic

- **Date Filtering:** Fetched within `[startDate, endDate]` using `invoice_details.inward_date`.
- **Joins:** History data is joined with item details, invoice details (for date), item names, and categories (for unit).
- **Sorting:** Sorted by `department_name`, `machine_name`, and `item_name`.

## Database Collections Used

1. **other_goods_history** – Consumption/Issue data (`issued_quantity`, `issued_amount`)
2. **othergoods_inventory_items_details** – Item linking (`department_name`, `machine_name`, `item_name`)
3. **othergoods_inventory_invoice_details** – Invoice mapping for `inward_date`
4. **item_names** – Used to lookup correct category
5. **item_categories** – Used for `calculate_unit`

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-other-goods-consumption-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "startDate": "2025-01-01",
      "endDate": "2025-01-31"
    }
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-other-goods-consumption-report',
  {
    filters: {
      startDate: '2025-01-01',
      endDate: '2025-01-31'
    }
  }
);
const downloadUrl = response.data.result;
```

## File Storage

- **Directory:** `public/upload/reports/reports2/Other_Goods/`
- **Filename pattern:** `store_consumption_report_{timestamp}.xlsx`

## Notes

- Only records with valid issuance history are included.
- Excel files are timestamped to avoid overwrites.
- Date format: YYYY-MM-DD.
