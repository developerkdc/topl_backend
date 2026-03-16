# Grouping Stock Register Thickness Wise API

## Overview

The Grouping Stock Register Thickness Wise API generates an Excel stock register grouped by **thickness** for a given date range. Each row represents one unique **(Item Group Name, Sales Item Name, Thickness)** combination and shows Opening Balance, Grouping Done, Issue for tapping, Issue for Challan, Issue Sales, Damage, and Closing Balance — each quantity in **two columns: (Sheets)** and **(SQM)** (pair layout). A **Total** row appears at the bottom.

This differs from the date-wise stock register by removing the Grouping Date and Log X columns and aggregating across all dates and logs for each item+thickness combination.

Data is sourced from `grouping_done_details`, `grouping_done_items_details`, and `grouping_done_history`.

## Endpoint

```
POST /report/download-excel-grouping-stock-register-thickness-wise
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
  "message": "Grouping stock register (thickness wise) generated successfully",
  "result": "http://localhost:5000/public/reports/Grouping/grouping_stock_register_thickness_wise_1738234567890.xlsx"
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
Grouping Item Stock Register Thickness Wise between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Grouping Item Stock Register Thickness Wise between 01/07/2025 and 12/02/2026`

### Two-level Header (17 columns, gray fill, bold)

**Row 1 (super-header):** Cols 1–3 = Item Group Name, Sales Item Name, Thickness. Cols 4–17 = seven quantity names, each **merged over 2 columns** (Sheets + SQM): Opening Balance, Grouping Done, Issue for tapping, Issue for Challan, Issue Sales, Damage, Closing Balance.

**Row 2 (sub-header):** Cols 1–3 = blank. Cols 4–17 = "Sheets" and "SQM" repeated under each quantity.

### Data Rows

- One row per unique (item_sub_category_name, item_name, thickness).
- Sorted by: Item Group Name → Sales Item Name → Thickness.
- All numeric columns formatted to 2 decimal places.

### Total Row

- Last row; **gray fill**, bold.
- Sums all numeric columns (cols 4–17: Opening Balance through Closing Balance, both Sheets and SQM).
- Cols 2–3 (Sales Item Name, Thickness) are blank.

---

## Balance Formulas

**Sheets:**
```
issued_in_period = Issue for tapping (Sheets) + Issue for Challan (Sheets) + Issue Sales (Sheets)
Opening Balance (Sheets)  = current_available_sheets + issued_in_period − Grouping Done (Sheets)
Closing Balance (Sheets)  = Opening Balance (Sheets) + Grouping Done (Sheets)
                           − Issue for tapping − Issue for Challan − Issue Sales (Sheets) − Damage (Sheets)
```

**SQM:** Same logic using SQM sources:
```
issued_in_period_sqm = Issue for tapping (SQM) + Issue for Challan (SQM) + Issue Sales (SQM)
Opening Balance (SQM)  = current_available_sqm + issued_in_period_sqm − Grouping Done (SQM)
Closing Balance (SQM)  = Opening Balance (SQM) + Grouping Done (SQM)
                         − Issue for tapping − Issue for Challan − Issue Sales (SQM) − Damage (SQM)
```

Where `current_available_sheets` = sum of `available_details.no_of_sheets`, and `current_available_sqm` = sum of `available_details.sqm`, for items in the group. Balances may be negative.

---

## Comparison with Date-wise Stock Register

| Aspect           | Date-wise Register                                              | Thickness-wise Register                     |
|------------------|-----------------------------------------------------------------|---------------------------------------------|
| Endpoint         | `/download-excel-grouping-stock-register`                       | `/download-excel-grouping-stock-register-thickness-wise` |
| Columns          | 19 (includes Grouping Date, Log X; each quantity in Sheets + SQM) | 17 (no Grouping Date, no Log X; each quantity in Sheets + SQM) |
| Row key          | (item_sub_category_name, item_name, grouping_done_date, log_no_code, thickness) | (item_sub_category_name, item_name, thickness) |
| Granularity      | Per item per date per log                                       | Per item per thickness (aggregated)         |
| Data sources     | Same                                                            | Same                                        |
| Balance formula  | Same (Sheets + SQM)                                             | Same (Sheets + SQM)                         |

---

## Field Mapping (Report Column → Source)

| # | Report Column                  | Source Field                                   | Collection                    | Notes |
|---|--------------------------------|------------------------------------------------|-------------------------------|-------|
| 1 | Item Group Name                | `item_sub_category_name`                       | grouping_done_items_details   | Row key |
| 2 | Sales Item Name                | `item_name`                                    | grouping_done_items_details   | Row key |
| 3 | Thickness                      | `thickness`                                    | grouping_done_items_details   | Row key; 0.00 |
| 4 | Opening Balance (Sheets)       | Computed                                       | —                             | See formula |
| 5 | Opening Balance (SQM)          | Computed                                       | —                             | See formula |
| 6 | Grouping Done (Sheets)         | `no_of_sheets`                                 | grouping_done_items_details   | Sum for group |
| 7 | Grouping Done (SQM)            | `sqm`                                          | grouping_done_items_details   | Sum for group |
| 8 | Issue for tapping (Sheets)     | `no_of_sheets` where `issue_status='tapping'`  | grouping_done_history         | Matched by `grouping_done_item_id` |
| 9 | Issue for tapping (SQM)        | `sqm` where `issue_status='tapping'`          | grouping_done_history         | Matched by `grouping_done_item_id` |
|10 | Issue for Challan (Sheets)     | `no_of_sheets` where `issue_status='challan'`  | grouping_done_history         | Matched by `grouping_done_item_id` |
|11 | Issue for Challan (SQM)        | `sqm` where `issue_status='challan'`          | grouping_done_history         | Matched by `grouping_done_item_id` |
|12 | Issue Sales (Sheets)           | `no_of_sheets` where `issue_status='order'`    | grouping_done_history         | Matched by `grouping_done_item_id` |
|13 | Issue Sales (SQM)              | `sqm` where `issue_status='order'`            | grouping_done_history         | Matched by `grouping_done_item_id` |
|14 | Damage (Sheets)                | `no_of_sheets` where `is_damaged=true`         | grouping_done_items_details   | Sum for group |
|15 | Damage (SQM)                   | `sqm` where `is_damaged=true`                 | grouping_done_items_details   | Sum for group |
|16 | Closing Balance (Sheets)       | Computed                                       | —                             | See formula |
|17 | Closing Balance (SQM)          | Computed                                       | —                             | See formula |

---

## Data Sources and Relationships

### Collections Used

| Collection                   | Role                                                                              |
|------------------------------|-----------------------------------------------------------------------------------|
| `grouping_done_details`      | Session header; provides `grouping_done_date` for date filtering                  |
| `grouping_done_items_details`| Items: identity (name, thickness), sheets/sqm, available (no_of_sheets, sqm), damage |
| `grouping_done_history`      | Issue records by `issue_status` (tapping / challan / order); no_of_sheets, sqm    |

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
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-stock-register-thickness-wise \
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

const generateGroupingThicknessRegister = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-grouping-stock-register-thickness-wise',
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
topl_backend/controllers/reports2/Grouping/Stock_Register/groupingStockRegisterThicknessWise.js
```

### Excel Generator
```
topl_backend/config/downloadExcel/reports2/Grouping/Stock_Register/groupingStockRegisterThicknessWise.js
```

### Routes
```
topl_backend/routes/report/reports2/Grouping/grouping.routes.js
```

---

## File Storage

**Directory:** `public/reports/Grouping/`

**Filename pattern:** `grouping_stock_register_thickness_wise_{timestamp}.xlsx`

---

## Troubleshooting

### No Data Found (404)
- Verify `startDate` and `endDate` are in `YYYY-MM-DD` format.
- Confirm grouping operations exist within the date range.

### Negative Balances
Balances are not floored at zero. A negative balance indicates more sheets were issued or damaged than were grouped in the period — expected in stock ledger accounting.

### Issue Columns Show 0
Issue columns come from `grouping_done_history`. If items have not yet been issued for tapping, challan, or order, those columns will be 0.
