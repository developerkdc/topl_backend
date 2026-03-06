# Grouping Stock Register API

## Overview

The Grouping Stock Register API generates a date-wise Excel stock register for grouping production. Each row represents one unique **(Item Group Name, Sales Item Name, Grouping Date, Log X, Thickness)** combination and shows its Opening Balance, Grouping Done, Issue for tapping, Issue for Challan, Issue Sales, Damage, and Closing Balance — all in **sheets (no_of_sheets)**. A yellow-highlighted **Total** row appears at the bottom.

Data is sourced from `grouping_done_details`, `grouping_done_items_details`, and `grouping_done_history`.

## Endpoint

```
POST /report/download-excel-grouping-stock-register
```

## Authentication

- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

## Request Body

### Required Parameters

```json
{
  "startDate": "2025-07-01",
  "endDate": "2026-02-12"
}
```

| Parameter   | Type   | Required | Description                     |
|-------------|--------|----------|---------------------------------|
| `startDate` | String | Yes      | Start date in YYYY-MM-DD format |
| `endDate`   | String | Yes      | End date in YYYY-MM-DD format   |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Grouping stock register generated successfully",
  "result": "http://localhost:5000/public/reports/Grouping/grouping_stock_register_1738234567890.xlsx"
}
```

### Error Responses

#### 400 Bad Request – Missing Parameters
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request – Invalid Date Format
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request – Invalid Date Range
```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found – No Data
```json
{
  "statusCode": 404,
  "success": false,
  "message": "No grouping data found for the selected period"
}
```

---

## Report Structure

### Title Row

```
Grouping Item Stock Register Date wise between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Grouping Item Stock Register Date wise between 01/07/2025 and 12/02/2026`

### Header Row (12 columns, gray fill, bold)

| # | Column             | Description                                                           |
|---|--------------------|-----------------------------------------------------------------------|
| 1 | Item Group Name    | Item sub-category name (`item_sub_category_name`)                     |
| 2 | Sales Item Name    | Item name (`item_name`)                                               |
| 3 | Grouping Date      | Date the items were grouped (`grouping_done_date`), DD/MM/YYYY        |
| 4 | Log X              | Log identifier code (`log_no_code`)                                   |
| 5 | Thickness          | Thickness in mm (`thickness`), 0.00 format                            |
| 6 | Opening Balance    | Sheets at start of period (computed), 0.00 format; may be negative    |
| 7 | Grouping Done      | Sheets produced in the period (`no_of_sheets`), 0.00 format           |
| 8 | Issue for tapping  | Sheets issued for tapping (`grouping_done_history`, status=tapping)   |
| 9 | Issue for Challan  | Sheets issued for challan (`grouping_done_history`, status=challan)   |
|10 | Issue Sales        | Sheets issued for orders (`grouping_done_history`, status=order)      |
|11 | Damage             | Damaged sheets (`is_damaged=true` items), 0.00 format                 |
|12 | Closing Balance    | Computed closing stock, 0.00 format; may be negative                  |

### Data Rows

- One row per unique (item_sub_category_name, item_name, grouping_done_date, log_no_code, thickness).
- Sorted by: Item Group Name → Sales Item Name → Grouping Date → Log X.
- All numeric columns formatted to 2 decimal places.

### Total Row

- Last row; **yellow fill**, bold.
- Sums all numeric columns (Opening Balance through Closing Balance).
- Cols 2–5 (Sales Item Name, Grouping Date, Log X, Thickness) are blank.

---

## Balance Formulas

```
issued_in_period = Issue for tapping + Issue for Challan + Issue Sales

Opening Balance  = current_available + issued_in_period − Grouping Done
                   (may be negative)

Closing Balance  = Opening Balance + Grouping Done
                   − Issue for tapping − Issue for Challan − Issue Sales
                   − Damage
                   (may be negative)
```

Where `current_available` = sum of `available_details.no_of_sheets` for items in the group.

---

## Field Mapping (Report Column → Source)

| # | Report Column      | Source Field                                   | Collection                    | Notes |
|---|--------------------|------------------------------------------------|-------------------------------|-------|
| 1 | Item Group Name    | `item_sub_category_name`                       | grouping_done_items_details   | Row key |
| 2 | Sales Item Name    | `item_name`                                    | grouping_done_items_details   | Row key |
| 3 | Grouping Date      | `grouping_done_date`                           | grouping_done_details         | Row key; formatted DD/MM/YYYY |
| 4 | Log X              | `log_no_code`                                  | grouping_done_items_details   | Row key |
| 5 | Thickness          | `thickness`                                    | grouping_done_items_details   | Row key; 0.00 |
| 6 | Opening Balance    | Computed                                       | —                             | See formula |
| 7 | Grouping Done      | `no_of_sheets`                                 | grouping_done_items_details   | Sum for group |
| 8 | Issue for tapping  | `no_of_sheets` where `issue_status='tapping'`  | grouping_done_history         | Matched by `grouping_done_item_id` |
| 9 | Issue for Challan  | `no_of_sheets` where `issue_status='challan'`  | grouping_done_history         | Matched by `grouping_done_item_id` |
|10 | Issue Sales        | `no_of_sheets` where `issue_status='order'`    | grouping_done_history         | Matched by `grouping_done_item_id` |
|11 | Damage             | `no_of_sheets` where `is_damaged=true`         | grouping_done_items_details   | Sum for group |
|12 | Closing Balance    | Computed                                       | —                             | See formula |

---

## Data Sources and Relationships

### Collections Used

| Collection                   | Role                                                                 |
|------------------------------|----------------------------------------------------------------------|
| `grouping_done_details`      | Session header; provides `grouping_done_date` for date filtering     |
| `grouping_done_items_details`| Items: identity (name, log, thickness), sheets, available, damage    |
| `grouping_done_history`      | Issue records by `issue_status` (tapping / challan / order)          |

### Join Diagram

```
grouping_done_details (1)
    │ _id = grouping_done_other_details_id
    └── grouping_done_items_details (N)
              │ _id = grouping_done_item_id
              └── grouping_done_history (N)
```

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-stock-register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-07-01",
    "endDate": "2026-02-12"
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateGroupingStockRegister = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-grouping-stock-register',
      {
        startDate: '2025-07-01',
        endDate: '2026-02-12'
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    window.open(response.data.result, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

---

## Technical Implementation

### Controller
```
topl_backend/controllers/reports2/Grouping/Stock_Register/groupingStockRegister.js
```

### Excel Generator
```
topl_backend/config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegister.js
```

### Routes
```
topl_backend/routes/report/reports2/Grouping/grouping.routes.js
```

---

## File Storage

**Directory:** `public/reports/Grouping/`

**Filename pattern:** `grouping_stock_register_{timestamp}.xlsx`

**Example:** `grouping_stock_register_1738234567890.xlsx`

---

## Troubleshooting

### No Data Found (404)
- Verify `startDate` and `endDate` are in `YYYY-MM-DD` format.
- Confirm grouping operations exist within the date range in `grouping_done_details`.
- Ensure `grouping_done_items_details` records are linked to those sessions.

### Negative Opening / Closing Balance
Balances are **not floored at zero**. A negative opening balance means more was issued or damaged than was grouped in the period — this is expected in stock ledger accounting.

### Issue Columns Show 0
Issue columns are sourced from `grouping_done_history`. If no history records exist for the grouped items (i.e., the items have not yet been issued for tapping, challan, or order), those columns will be 0.
