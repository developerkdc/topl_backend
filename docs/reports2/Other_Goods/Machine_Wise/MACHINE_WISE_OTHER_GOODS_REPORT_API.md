# Machine Wise Other Goods Report API

## Overview

The Machine Wise Other Goods Report API generates a styled Excel report showing "Other Goods" (consumables) assigned to machines within a specific date range. It includes machine name, item name, quantity, unit (category-based), and amount.

## Endpoint

```
POST /report/download-excel-machine-wise-report
```

**Full URL (with version):** `POST /api/V1/report/download-excel-machine-wise-report`

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

### Optional Parameters

```json
{
  "startDate": "2024-03-01",
  "endDate": "2024-03-31",
  "filter": {
    "machine_id": "60d...abc"
  }
}
```

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Machine wise other goods report generated successfully",
  "data": "http://localhost:5000/public/reports/Other_Goods/MachineWiseReport/Machine-Wise-Other-Goods-Report-1741172000000.xlsx"
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

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No other goods data found for the selected period"
}
```

## Report Structure

### Title row

**Format:** `Machine Wise Details Between DD/MM/YYYY and DD/MM/YYYY`

### Columns

| Column  | Description                        |
| ------- | ---------------------------------- |
| Machine | Machine name or "N/A"              |
| Item    | Item name                          |
| Qty     | Total quantity assigned            |
| Unit    | Calculated unit from Item Category |
| Amt     | Amount (Total value)               |

### Layout

- **Row 1:** Report title (merged across 5 columns)
- **Row 2:** Column headers (Machine, Item, Qty, Unit, Amt) with gray fill
- **Data:** List of assignments within the date range
- **Total row:** "Grand Total" at the bottom showing the sum of Amt

## Business Logic

### Unit Retrieval

1. Join `othergoods_inventory_items_details` with `item_subcategory` via `item_sub_category_id`.
2. Perform a bulk join with `item_category` to retrieve all associated categories.
3. Select the **first** available category (to prevent row duplication if an item maps to multiple categories).
4. Use `calculate_unit` from this primary category as the display unit.

### Data Aggregation

- **Qty:** Sum of `total_quantity` from `othergoods_inventory_items_details`.
- **Amt:** Sum of `amount` from `othergoods_inventory_items_details`.
- **Filter:** Items are filtered by `invoice.inward_date`.

## Database Collections Used

1. **othergoods_inventory_items_details** – Item assignment details
2. **othergoods_inventory_invoice_details** – Invoice/Inward date details
3. **item_subcategories** – Mapping from subcategory to category
4. **item_categories** – Categorical master data for units

## File Storage

- **Directory:** `public/reports/Other_Goods/MachineWiseReport/`
- **Filename pattern:** `Machine-Wise-Other-Goods-Report-{timestamp}.xlsx`
