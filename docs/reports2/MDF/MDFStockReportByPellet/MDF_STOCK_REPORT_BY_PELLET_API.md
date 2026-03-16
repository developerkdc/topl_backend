# MDF Stock Report by Pellet No. API

## Overview

The MDF Stock Report by Pellet No. API (reports2) generates a dynamic inventory report with the same structure as the standard MDF Stock Report, but with each row representing an individual pellet (pallet). Data is grouped by **MDF sub-category**, with **Pellet No.** (pallet_number) as the first column. The report shows opening stock, receives, consumption, sales, issue for pressing, and closing stock for a given date range. MDF has no ply resizing, so the report has 16 columns (vs 18 for Plywood).

## Endpoint

```
POST /report/download-stock-report-mdf-by-pellet
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-mdf-by-pellet`)

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
| filter.item_sub_category_name | string | No | MDF sub-type filter                        |

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
  "message": "Stock report by pellet generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/MDF/MDF-Stock-Report-ByPellet-1706432891234.xlsx"
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

- **Sheet name:** MDF Stock Report (By Pellet No.)  
- **File path:** `public/upload/reports/reports2/MDF/MDF-Stock-Report-ByPellet-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
MDF Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

- With filter: e.g. `MDF Type [ GURJAN ]   stock  in the period  01/05/2025 and 28/05/2025`
- Without filter: `MDF Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025`

**Row 2:** Empty (spacing)

**Row 3 onwards – Data table columns:**

| #  | Column header                  | Description                              |
|----|--------------------------------|------------------------------------------|
| 1  | Pellet No.                     | Unique pellet/pallet identifier         |
| 2  | MDF Sub Category               | Category (e.g. GURJAN, MALAYSIAN)        |
| 3  | Thickness                      | Thickness (mm)                           |
| 4  | Size                           | Dimensions (e.g. "2.44 X 1.22")          |
| 5  | Opening Sheets                 | Opening stock (sheets)                   |
| 6  | Opening Metres                 | Opening stock (sq m)                     |
| 7  | Received Sheets                | Received in period (sheets)              |
| 8  | Received Mtrs                  | Received (sq m)                          |
| 9  | Consumed Sheets                | Consumed in period (sheets)              |
| 10 | Consumed Mtrs                  | Consumed (sq m)                          |
| 11 | Sales Sheets                   | Sold in period (sheets)                  |
| 12 | Sales Mtrs                     | Sold (sq m)                              |
| 13 | Issue For Pressing             | Issued for pressing (sheets)             |
| 14 | Issue For Pressing Sq Met      | Issued for pressing (sq m)               |
| 15 | Closing sheets                 | Closing stock (sheets)                   |
| 16 | Closing Metres                 | Closing stock (sq m)                     |

- Data grouped by **MDF Sub Category**; subtotal row after each category; grand total at the end.
- Each row represents one pellet (one document in mdf_inventory_items_details).

## Stock Calculation Logic

All values are computed in **sheets** and **square meters** per pellet.

### Formulas

- **Opening (sheets):**  
  `Opening Sheets = Current Available Sheets + (Consumed + Sold) Sheets - Received Sheets`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm`
- **Receives:** For each pellet, if its invoice `inward_date` is between startDate and endDate, use `no_of_sheet` and `total_sq_meter`; else 0.
- **Consumption:** From mdf history where `mdf_item_id` = pellet `_id`, `issue_status` in `['order', 'pressing']` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Sales:** From mdf history where `mdf_item_id` = pellet `_id`, `issue_status = 'challan'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Issue for pressing:** From mdf history where `mdf_item_id` = pellet `_id`, `issue_status = 'pressing'` and `createdAt` in period; sum `issued_sheets` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume - Sales` (in both sheets and sq m).

Only rows that had **at least one movement in the period** (receive, consume, sales, or issue for pressing) are included. If there was no inward, consumption, sales, or issue for pressing in the date range, no rows are shown and the API returns 404. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **mdf_inventory_items_details** – Individual pellet items (pallet_number, item_sub_category_name, thickness, length, width, no_of_sheet, total_sq_meter, available_sheets, available_sqm, invoice_id)
2. **mdf_inventory_invoice_details** – Inward/invoice dates
3. **mdf_history_details** (mdf_history_model) – Transaction history (mdf_item_id, issue_status, issued_sheets, issued_sqm)

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/V1/report/download-stock-report-mdf-by-pellet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{"startDate": "2025-05-01", "endDate": "2025-05-28"}'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/V1/report/download-stock-report-mdf-by-pellet',
  { startDate: '2025-05-01', endDate: '2025-05-28', filter: { item_sub_category_name: 'GURJAN' } },
  { headers: { Authorization: `Bearer ${token}` } }
);
const downloadUrl = response.data.data;
window.open(downloadUrl, '_blank');
```

## Notes

- Report includes only rows that had at least one movement in the period (receive, consume, sales, or issue for pressing). If the date range has no such activity, the report returns 404 with "No stock data found for the selected period".
- Each row corresponds to one pellet (pallet_number) from mdf_inventory_items_details.
- MDF has no ply resizing; only Issue For Pressing columns (vs Plywood which has both ply resizing and pressing).
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/MDF/`.
