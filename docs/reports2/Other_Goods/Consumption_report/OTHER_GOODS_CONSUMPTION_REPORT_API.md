# Other Goods Consumption Report API

## Overview

The Other Goods Consumption Report API generates an Excel report listing **direct consumption** (store consume) details for a specified date range. It includes only history records where `issue_status` is `'consume'` (from the Consume modal), not order issues or challan issues. It fetches issued quantity and issued amount, grouping items by department.

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

- **Consume-only:** Only records with `issue_status: 'consume'` are included (direct consumption from the Consume modal).
- **Date Filtering:** Records are filtered by `issue_date` (when consumption occurred) within `[startDate, endDate]`. Records without `issue_date` are excluded.
- **Joins:** History data is joined with item details, invoice details (for item context; no date filter), item names, and categories (for unit).
- **Sorting:** Sorted by `department_name`, `machine_name`, and `item_name`.

## Database Collections Used

1. **other_goods_history_details** – Filtered by `issue_status: 'consume'` and `issue_date` in range; provides `issued_quantity`, `issued_amount`, `issue_date`
2. **othergoods_inventory_items_details** – Item linking (`department_name`, `machine_name`, `item_name`)
3. **othergoods_inventory_invoice_details** – Invoice mapping (item context; not used for date filtering)
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

- Only **consumed** data is included: history records with `issue_status: 'consume'` and `issue_date` within the selected range. Order and challan issues are excluded.
- Records without `issue_date` are excluded from the report.
- Excel files are timestamped to avoid overwrites.
- Date format: YYYY-MM-DD.
