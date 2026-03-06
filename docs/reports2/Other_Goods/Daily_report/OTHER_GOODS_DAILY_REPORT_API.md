# Other Goods Daily Report API

## Overview

The Other Goods Daily Report API generates a dynamic Excel report showing the store daily details for a specific date. The report includes items, inward ids, departments, machines, quantities, units, and amounts.

## Endpoint

```
POST /report/download-other-goods-daily-report
```

**Full URL (with version):** `POST /api/V1/report/download-other-goods-daily-report`

## Authentication

- **Access:** Private (AuthMiddleware can be enabled)
- **Permission:** `other_goods_inventory` with `view` access (when enabled)

## Request Body

### Required Parameters

```json
{
  "filters": {
    "reportDate": "2025-01-31"
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Other Goods daily report generated successfully",
  "result": "http://localhost:5000/public/reports/OtherGoods/store_daily_report_1738152891234.xlsx"
}
```

### Error Responses

#### 400 Bad Request – Missing date

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
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

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No Store daily data found for the selected date"
}
```

## Report Structure

### Title row

**Format:** `Store Daily Report Date: DD/MM/YYYY`

### Columns

| Column       | Description                                  |
|--------------|----------------------------------------------|
| Sr.          | Serial Number                                |
| Item         | Item name                                    |
| Inward id    | Invoice number or Inward sr no               |
| Department   | Department Name                              |
| Machine      | Machine Name                                 |
| Qty          | Total Quantity                               |
| Unit         | Calculated Unit (from category) or item unit |
| amount       | Amount                                       |

### Layout

- **Row 1:** Report title (merged)
- **Row 2:** Column headers
- **Data:** One row per record
- **Total row:** At bottom (grand total of amount)

## Data Calculation Logic

- **Date Filtering:** Start of `reportDate` to End of `reportDate` using `othergoods_invoice_details.inward_date`.
- **Unit Fetching:** Joins with `item_subcategories` and `item_categories` to fetch the `calculate_unit` field, falling back to existing unit fields.
- **Sorting:** Sorted by `item_name`, `item_sr_no`, and `invoice_no`.

## Database Collections Used

1. **othergoods_inventory_items_view_modal** – Aggregated view model for other goods inventory
2. **item_subcategories** – Item subcategory details
3. **item_categories** – Category details (to determine unit)

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-other-goods-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "2025-01-31"
    }
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-other-goods-daily-report',
  {
    filters: {
      reportDate: '2025-01-31'
    }
  }
);
const downloadUrl = response.data.result;
```

## File Storage

- **Directory:** `public/reports/OtherGoods/`
- **Filename pattern:** `store_daily_report_{timestamp}.xlsx`

## Notes

- Generates a daily snapshot of store inventory movements.
- Excel files are timestamped to avoid overwrites.
- Date format: YYYY-MM-DD.
