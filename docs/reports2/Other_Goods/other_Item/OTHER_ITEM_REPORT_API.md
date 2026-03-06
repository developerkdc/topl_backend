# Other Item Summary Report API

## Overview

The Other Item Summary Report API generates an Excel report providing a comprehensive overview of "Other Goods" inventory movements within a specified date range. The report tracks quantities for Opening Stock, Purchase, Issue (Internal), Sales (External), Damage, and Closing Stock.

## Endpoint

```
POST /report/download-excel-other-item-report
```

**Full URL (with version):** `POST /api/V1/report/download-excel-other-item-report`

## Authentication

- **Access:** Private (Requires authentication middleware)

## Request Body

### Required Parameters

```json
{
  "startDate": "2024-03-01",
  "endDate": "2024-03-31"
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Other Item Summary Report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/Other_Goods/Other_Item_Summary_1741172000000.xlsx"
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

#### 404 Not Found – No activity

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No inventory activity found for the selected period"
}
```

## Report Structure

### Title row

**Format:** `Other Item Summary Report Between DD/MM/YYYY and DD/MM/YYYY`

### Columns

| Column   | Description                                  |
| -------- | -------------------------------------------- |
| Item     | Item name from inventory                     |
| Opening  | Stock at the start of the period             |
| Purchase | Total inward quantity during the period      |
| Issue    | Internal consumption (issue_status: 'order') |
| Sales    | Finalized dispatches from `dispatch_items`   |
| Damage   | Recorded damage quantity (Currently 0)       |
| Closing  | Final stock (Opening + Purchase - Outbound)  |

### Layout

- **Row 1:** Report title (merged across 7 columns)
- **Row 2:** Column headers with gray fill and borders
- **Data:** List of items with movements in the period (Aggregated by logical item name)
- **Formatting:** Numeric columns are centered; no "Grand Total" row as per simplified requirements.

## Inventory Calculation Logic

- **Opening Stock:** (Total Inward before `startDate`) - (Total Issued + Total Dispatched before `startDate`).
- **Purchase:** Sum of `total_quantity` from `othergoods_inventory_items_details` where `inward_date` is between `startDate` and `endDate`.
- **Issue:** Sum of history `issued_quantity` where `issue_status` is 'order' in the period.
- **Sales:** Sum of quantities from `dispatch_items` (combining `quantity`, `no_of_sheets`, `no_of_leaves`, and `number_of_rolls`) in the period.
- **Closing Stock:** `Opening + Purchase - (Issue + Sales + Damage)`.

All values are non-negative (`Math.max(0, value)`).

## Database Collections Used

1. **othergoods_inventory_items_details** – Item stock and inward records
2. **other_goods_history_model** – Internal movement history (Issues)
3. **dispatch_items** – External dispatch records (Sales)
4. **othergoods_inventory_invoice_details** – Invoice and inward date tracking

## File Storage

- **Directory:** `public/upload/reports/Other_Goods/`
- **Filename pattern:** `Other_Item_Summary_{timestamp}.xlsx`
