# Fleece Stock Report by Inward Number API

## Overview

The Fleece Stock Report by Inward Number API (reports2) generates a dynamic inventory report with each row representing one inward per product spec. **Multiple items in the same inward produce multiple rows** when they have different specs (sub-category, thickness, size). **Inward No.** (inward_sr_no) is the first column. The report shows opening stock, receives, consumption (total of challan, order, pressing), order, issue for pressing, and closing stock for a given date range. Challan is included in Consumed but not displayed. Values are in **rolls** and **square meters**.

## Endpoint

```
POST /report/download-stock-report-fleece-by-inward
```

(Full URL: `{baseUrl}/api/{version}/report/download-stock-report-fleece-by-inward`)

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
  "message": "Stock report by inward number generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ByInward-1706432891234.xlsx"
}
```

- **data**: Full URL to download the generated Excel file.

### Error Responses

Same as Fleece Stock Report (400, 404, 500).

## Report Structure

- **Sheet name:** Fleece Stock Report (By Inward No.)  
- **File path:** `public/upload/reports/reports2/Fleece/Fleece-Paper-Stock-Report-ByInward-{timestamp}.xlsx`

**Row 1 – Title (merged cell):**

```
Fleece Paper Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

**Row 3 onwards – Data table columns:**

| #  | Column header                  | Description                              |
|----|--------------------------------|------------------------------------------|
| 1  | Inward No.                     | Inward serial number (inward_sr_no)      |
| 2  | Fleece Paper Sub Category      | Category (e.g. IMPORTED)                  |
| 3  | Thickness                      | Thickness (mm)                            |
| 4  | Size                           | Dimensions (e.g. "2.44 X 1.22")           |
| 5  | Opening Rolls                  | Opening stock (rolls)                    |
| 6  | Opening Metres                 | Opening stock (sq m)                      |
| 7  | Received Rolls                 | Received in period (rolls)               |
| 8  | Received Mtrs                   | Received (sq m)                          |
| 9  | Consumed Rolls                 | Total consumed (challan + order + pressing) (rolls) |
| 10 | Consumed Mtrs                  | Total consumed (sq m)                    |
| 11 | Order Rolls                    | Issued for order (rolls)                 |
| 12 | Order Mtrs                     | Issued for order (sq m)                  |
| 13 | Issue For Pressing             | Issued for pressing (rolls)              |
| 14 | Issue For Pressing Sq Met      | Issued for pressing (sq m)                |
| 15 | Closing Rolls                  | Closing stock (rolls)                    |
| 16 | Closing Metres                 | Closing stock (sq m)                      |

- **Note:** Challan is included in Consumed but Challan columns are hidden in the Excel output for now.

- **Multiple items in the same inward produce multiple rows** when they have different specs. Items with same spec in same inward are aggregated into one row.
- **Inward No. cells are merged** vertically for each inward group; only one inward number is visible per group.
- **Total row per inward** after each group; grand total at the end.

## Stock Calculation Logic

All values are computed in **rolls** and **square meters** per inward group.

### Formulas

- **Opening (rolls):**  
  `Opening Rolls = Current Available Rolls + Consumed Rolls - Received Rolls`
- **Opening (sq m):**  
  `Opening Sqm = Current Available Sqm + Consumed Sqm - Received Sqm`
- **Consumed:** Challan + Order + Issue for pressing (computed from history).
- **Challan:** From fleece history where `fleece_item_id` in group item_ids, `issue_status = 'challan'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Order:** From fleece history where `fleece_item_id` in group item_ids, `issue_status = 'order'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Receives:** For each inward group, if invoice `inward_date` is between startDate and endDate (end includes 23:59:59.999 UTC), use sum of `number_of_roll` and `total_sq_meter` for items in that group; else 0.
- **Issue for pressing:** From fleece history where `fleece_item_id` in group item_ids, `issue_status = 'pressing'` and `createdAt` in period; sum `issued_number_of_roll` and `issued_sqm`.
- **Closing:**  
  `Closing = Opening + Receive - Consume` (in both rolls and sq m).

Only rows that had **at least one movement in the period** (receive, consume, challan, order, or issue for pressing) are included. If there was no such activity in the date range, no rows are shown and the API returns 404. All stock values are output as non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **fleece_inventory_items_details** – Individual roll items (item_sub_category_name, thickness, length, width, number_of_roll, total_sq_meter, available_number_of_roll, available_sqm, invoice_id)
2. **fleece_inventory_invoice_details** – Inward details (inward_sr_no, inward_date)
3. **fleece_history_details** (fleece_history_model) – Transaction history (fleece_item_id, issue_status, issued_number_of_roll, issued_sqm)

## Notes

- Report includes only rows that had at least one movement in the period (receive, consume, challan, order, or issue for pressing). If the date range has no such activity, the report returns 404 with "No stock data found for the selected period".
- Date range: end date includes the full day (23:59:59.999 UTC) so transactions on the end date are included.
- Each row corresponds to one inward per (sub_category, thickness, size) – multiple rows per inward when specs differ.
- Excel files are timestamped to avoid overwriting.
- Files are stored under `public/upload/reports/reports2/Fleece/`.
