# Fleece Stock Report by Roll No. API

## Overview

The Fleece Stock Report by Roll No. API (reports2) generates a dynamic inventory report with the same structure as the standard Fleece Stock Report, but with each row representing an individual roll (item). Data is grouped by **Fleece Paper sub-category**, with **Roll No.** (item_sr_no) as the first column. The report shows opening stock, receives, consumption, sales, issue for pressing, and closing stock for a given date range. Values are in **rolls** and **square meters**.

## Endpoint

```
POST /report/download-stock-report-fleece-by-roll
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-fleece-by-roll`)

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
| filter.item_sub_category_name | string | No | Fleece sub-type (e.g. IMPORTED)             |

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
  "message": "Stock report by roll generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ByRoll-1706432891234.xlsx"
}
```

- **data**: Full URL to download the generated Excel file.

### Error Responses

Same as Fleece Stock Report (400, 404, 500).

## Report Structure

- **Sheet name:** Fleece Stock Report (By Roll No.)  
- **File path:** `public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ByRoll-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
Fleece Paper Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

**Row 3 onwards – Data table columns:**

| #  | Column header                  | Description                              |
|----|--------------------------------|------------------------------------------|
| 1  | Roll No.                       | Unique roll identifier (item_sr_no)      |
| 2  | Fleece Paper Sub Category      | Category (e.g. IMPORTED)                 |
| 3  | Thickness                      | Thickness (mm)                            |
| 4  | Size                           | Dimensions (e.g. "2.44 X 1.22")           |
| 5  | Opening Rolls                  | Opening stock (rolls)                     |
| 6  | Opening Metres                 | Opening stock (sq m)                      |
| 7  | Received Rolls                 | Received in period (rolls)                |
| 8  | Received Mtrs                  | Received (sq m)                            |
| 9  | Consumed Rolls                 | Consumed in period (rolls)                |
| 10 | Consumed Mtrs                  | Consumed (sq m)                           |
| 11 | Sales Rolls                    | Sold in period (rolls)                    |
| 12 | Sales Mtrs                     | Sold (sq m)                               |
| 13 | Issue For Pressing             | Issued for pressing (rolls)               |
| 14 | Issue For Pressing Sq Met      | Issued for pressing (sq m)                |
| 15 | Closing sheets                 | Closing stock (rolls)                     |
| 16 | Closing Metres                 | Closing stock (sq m)                      |

- Data grouped by **Fleece Paper Sub Category**; subtotal row after each category; grand total at the end.
- Each row represents one roll (one document in fleece_inventory_items_details).

## Stock Calculation Logic

All values are computed in **rolls** and **square meters** per roll.

### Formulas

- **Opening (rolls):**  
  `Opening Rolls = Current Available Rolls + (Consumed + Sold) Rolls - Received Rolls`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm`
- **Receives:** For each roll, if its invoice `inward_date` is between startDate and endDate, use `number_of_roll` and `total_sq_meter`; else 0.
- **Consumption:** From fleece history where `fleece_item_id` = roll `_id`, `issue_status` in `['order', 'pressing']` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Sales:** From fleece history where `fleece_item_id` = roll `_id`, `issue_status = 'challan'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Issue for pressing:** From fleece history where `fleece_item_id` = roll `_id`, `issue_status = 'pressing'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume - Sales` (in both rolls and sq m).

Only rows with at least one non-zero value among opening, receive, consume, sales, or closing are included. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **fleece_inventory_items_details** – Individual roll items (item_sr_no, item_sub_category_name, thickness, length, width, number_of_roll, total_sq_meter, available_number_of_roll, available_sqm, invoice_id)
2. **fleece_inventory_invoice_details** – Inward/invoice dates
3. **fleece_history_details** (fleece_history_model) – Transaction history (fleece_item_id, issue_status, issued_number_of_roll, issued_sqm)

## Notes

- Report includes only rows with activity in the period.
- Each row corresponds to one roll (item_sr_no) from fleece_inventory_items_details.
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Fleece/`.
