# Other Goods Inward Report API

## Overview

The Other Goods Inward Report API generates an Excel report listing inward items for a selected date range. It provides supplier details, invoice fields, and tax breakdown (CGST, SGST, IGST) alongside item, department, quantity, and rate.

## Endpoint

```
POST /report/download-other-goods-inward-report
```

**Full URL (with version):** `POST /api/V1/report/download-other-goods-inward-report`

## Authentication

- **Access:** Private (AuthMiddleware can be enabled)
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
  "message": "Other Goods inward report generated successfully",
  "result": "http://localhost:5000/public/reports/OtherGoods/other_goods_inward_report_1738152891234.xlsx"
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

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No Store inward data found for the selected date range"
}
```

## Report Structure

### Title row

**Format:** `Store Inward Report Date: DD/MM/YYYY to DD/MM/YYYY`

### Columns

| Column            | Description                                  |
|-------------------|----------------------------------------------|
| Sr. No            | Serial Number                                |
| Supplier Name     | Supplier Name                                |
| Inv. No/Challan N | Invoice number or Inward sr no               |
| Inv./Challan Date | Date of Invoice / Inward                     |
| Item Name         | Item name                                    |
| Department        | Department Name                              |
| Machine           | Machine Name                                 |
| Qty               | Total Quantity                               |
| Rate              | Rate in INR                                  |
| Value             | Total Amount                                 |
| Gst (Merged)      | Cgst, Sgst, Igst sub-columns                 |
| Total Gst         | Sum of Cgst, Sgst, Igst                      |
| Remark            | Item Remark                                  |
| Authorised        | Item Approved By                             |

### Layout

- **Row 1:** Report title (merged)
- **Row 3:** Top-level headers (with merged Gst column) 
- **Row 4:** Sub-level headers for Cgst, Sgst, and Igst
- **Data:** One row per record
- **Total row:** At bottom (grand totals of Value, Cgst, Sgst, Igst, Total Gst)

## Data Calculation Logic

- **Date Filtering:** Between `startDate` to `endDate` based on `othergoods_invoice_details.inward_date`.
- **GST Fetching:** Multiplying the amount by the respective GST percentages from invoice details, divided by 100.
- **Sorting:** Sorted by `item_name`, `item_sr_no`, and `invoice_no`.

## Database Collections Used

1. **othergoods_inventory_items_view_modal**
2. **item_subcategories**
3. **item_categories**

## Example Usage

### cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-other-goods-inward-report \
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
  '/api/V1/report/download-other-goods-inward-report',
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

- **Directory:** `public/reports/OtherGoods/`
- **Filename pattern:** `other_goods_inward_report_{timestamp}.xlsx`

## Notes

- Includes comprehensive tax breakdown (CGST/SGST/IGST).
- Excel files are timestamped to avoid overwrites.
- Date format: YYYY-MM-DD.
