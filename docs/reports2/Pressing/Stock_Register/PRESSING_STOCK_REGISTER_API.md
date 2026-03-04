# Pressing Stock Register API

## Overview

The Pressing Stock Register API generates an Excel report that shows pressing item stock movements by **Category**, **Item Group**, and **Item Name** over a date range. The report includes OPBL SqMtr (Opening Balance), Received SqMtr, Pur Sq Mtr, Issue SqMtr, Process Waste SqMtr, New Sqmtr, and Closing SqMtr. Rows are grouped by Category and Item Group with merged cells; each Item Group has a **Total** (subtotal) row, and the report ends with a **Total** (grand total) row.

Data is sourced from `issues_for_pressing` (received into pressing), `pressing_done_consumed_items_details` (consumption: base_details and group_details), `pressing_done_details` (pressing_date for period filter), and item masters (category name via item_name → item_category).

## Endpoint

```
POST /api/V1/report/download-excel-pressing-stock-register
```

## Authentication

- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

## Request Body

### Required Parameters

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31"
}
```

### Optional Parameters

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "RECON 111 2MM",
    "item_group_name": "RECON"
  }
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by item name |
| `filter.item_group_name` | String | No | Filter by item group (maps to item sub-category name) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pressing stock register generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Pressing/Pressing-Stock-Register-1738234567890.xlsx"
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
  "message": "No pressing item data found for the selected period"
}
```

or when all rows are filtered out (all zero):

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No pressing stock data found for the selected period"
}
```

---

## How the Data Is Brought Together

A developer should be able to understand the report from this section without reading the controller code.

### 1. Report period

- **start**: `new Date(startDate)` at 00:00:00.000  
- **end**: `new Date(endDate)` at 23:59:59.999  
- All “in period” logic uses this inclusive range.

### 2. Which rows appear in the report

- We take **distinct (Category, Item Group, Item Name)** from three sources, then merge and dedupe:
  1. **issues_for_pressing**: (item_sub_category_name, item_name). **Category** is resolved from item_name_id → item_name → category (ref item_category) → first category name.
  2. **pressing_done_consumed_items_details.base_details**: (base_type, item_sub_category_name, item_name). **Category** is a display name from base_type: PLYWOOD → "Plywood", MDF → "Decorative Mdf", FLEECE_PAPER → "Craft Back Paper".
  3. **pressing_done_consumed_items_details.group_details**: (item_sub_category_name, item_name). **Category** is resolved from item_name_id → item_category as in (1).
- There is **exactly one report row per** such (Category, Item Group, Item Name). Optional filters: `filter.item_name`, `filter.item_group_name` (applied as item_name and item_sub_category_name).

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **issues_for_pressing** | Items issued from tapping/splicing to pressing; drives **Received** and **current available** | `item_name`, `item_sub_category_name`, `item_name_id`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt` |
| **pressing_done_consumed_items_details** | Consumption in pressing (base + group) | `pressing_done_details_id`, `base_details[]` (base_type, item_name, item_sub_category_name, sqm), `group_details[]` (item_name, item_sub_category_name, sqm) |
| **pressing_done_details** | Session header; provides **pressing_date** for “issue in period” | `_id`, `pressing_date` |
| **item_name** (masters) | Resolve category for issues_for_pressing and group_details | `_id`, `category` (ref item_category) |
| **item_category** (masters) | Category display name | `_id`, `category` (string) |

- **Join (received)**: issues_for_pressing.createdAt in [start, end] → sum(sqm) = **Received SqMtr**.
- **Join (issue)**: pressing_done_consumed_items_details.pressing_done_details_id → pressing_done_details._id; filter pressing_done_details.pressing_date in [start, end]; sum base_details.sqm + group_details.sqm by (category, item_group, item_name) = **Issue SqMtr**.
- **Current available**: issues_for_pressing where is_pressing_done = false, sum(available_details.sqm) by (item_sub_category_name, item_name).

### 4. Per-row aggregates (for each Category, Item Group, Item Name)

| Quantity | Source | Filter | Meaning |
|----------|--------|--------|---------|
| **Received SqMtr** | issues_for_pressing | createdAt ∈ [start, end] | SQM issued from splicing to pressing in the period. |
| **Pur Sq Mtr** | — | — | No schema; always **0**. |
| **Issue SqMtr** | pressing_done_consumed_items_details (base_details + group_details) | Join pressing_done_details, pressing_date ∈ [start, end] | SQM consumed in pressing in the period. |
| **Process Waste SqMtr** | — | — | Per-item not attributed in schema; currently **0**. |
| **New Sqmtr** | Calculated | Issue SqMtr − Process Waste SqMtr | Net issue after waste. |
| **Current available** | issues_for_pressing | is_pressing_done = false | SQM still in pressing (not yet consumed). |
| **Opening (OPBL)** | Calculated | Current available + Issue in period − Received in period | Stock at start of period. |
| **Closing SqMtr** | Calculated | Opening + Received + Pur − Issue | Stock at end of period. |

### 5. Formulas (calculations)

For each (Category, Item Group, Item Name):

```
Opening Balance (OPBL) = Current available  +  Issue in period  −  Received in period

Closing SqMtr = Opening Balance  +  Received SqMtr  +  Pur Sq Mtr  −  Issue SqMtr

New Sqmtr = Issue SqMtr − Process Waste SqMtr
```

- **Opening** = what would have been “current” at start of period if we reverse the period’s receipts and add back the period’s issues (same idea as grouping/splicing stock register).
- **Closing** = opening + inflows (received + purchase) − outflows (issue).
- **Pur Sq Mtr** and **Process Waste SqMtr** are 0 in current implementation.

### 6. Which rows are returned in the Excel

- After computing the above for every distinct (Category, Item Group, Item Name), we **drop rows where every numeric column is 0** (opening_balance, received, purchase, issue, process_waste, new_sqmtr, closing_balance).
- If no rows remain, the API responds with **404** and message `"No pressing stock data found for the selected period"`.
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a **URL** to the Excel file (e.g. `http://localhost:5000/public/upload/reports/reports2/Pressing/Pressing-Stock-Register-<timestamp>.xlsx`). The client can GET this URL to download the file.
- The Excel contains: title row with date range, one header row (Category, Item Group, Item Name, OPBL SqMtr, Received SqMtr, Pur Sq Mtr, Issue SqMtr, Process Waste SqMtr, New Sqmtr, Closing SqMtr), data rows grouped by Category and Item Group with **merged cells** for Category and Item Group, a **Total** row after each Item Group (subtotal), and one **Total** row at the end (grand total).
- **400**: Invalid request (missing/invalid dates or start > end).
- **404**: No distinct (Category, Item Group, Item Name) found, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Pressing Item Stock Register between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Pressing Item Stock Register between 01/03/2025 and 31/03/2025`

### Column Headers

| Column | Description |
|--------|-------------|
| Category | High-level grouping (e.g. Craft Back Paper, Decorative Mdf, ASH, BIRCH); from item_category or base_type map |
| Item Group | Item sub-category name (e.g. RECON, ALDER) |
| Item Name | Item name (e.g. RECON 111 2MM, BLACK ALDER PANELLO) |
| OPBL SqMtr | Opening balance at start of period (SQM) |
| Received SqMtr | Issued from splicing to pressing in period (SQM) |
| Pur Sq Mtr | Purchase in period (currently 0) |
| Issue SqMtr | Consumed in pressing in period (SQM) |
| Process Waste SqMtr | Process waste in period (currently 0) |
| New Sqmtr | Issue SqMtr − Process Waste SqMtr |
| Closing SqMtr | Opening + Received + Pur − Issue (SQM) |

### Data Rows

- One row per distinct **(Category, Item Group, Item Name)** that has any non-zero metric.
- Sorted by Category, then Item Group, then Item Name.
- **Merged cells**: Category column is merged for consecutive rows with the same Category; Item Group column is merged for consecutive rows with the same Item Group (including the following Total row for that group).
- Numeric columns use two decimal places.

### Item Group Total Rows

- After each Item Group’s detail rows, a **Total** row sums OPBL SqMtr, Received SqMtr, Pur Sq Mtr, Issue SqMtr, Process Waste SqMtr, New Sqmtr, Closing SqMtr for that group only.
- Item Name column shows **Total**; Category and Item Group show the group’s values (and are part of the merged cell range).

### Grand Total Row

- Last row is **Total**, with sums of all numeric columns across the entire report.
- Category column: **Total**; Item Group and Item Name blank.

---

## Field Mapping (Excel Column → Source)

| # | Report column | Source (after controller) | DB / logic | Notes |
|---|----------------|---------------------------|------------|--------|
| 1 | Category | `category` | item_category.category (via item_name) or BASE_TYPE_MAP[base_type] | From issues_for_pressing/group_details: item_name_id → item_name → category; from base_details: base_type → Plywood / Decorative Mdf / Craft Back Paper |
| 2 | Item Group | `item_group_name` | item_sub_category_name | Same across sources |
| 3 | Item Name | `item_name` | item_name | Same across sources |
| 4 | OPBL SqMtr | `opening_balance` | Current available + Issue in period − Received in period | |
| 5 | Received SqMtr | `received` | issues_for_pressing, createdAt in range, sum(sqm) | |
| 6 | Pur Sq Mtr | `purchase` | 0 | No schema |
| 7 | Issue SqMtr | `issue` | pressing_done_consumed_items_details (base + group) where pressing_date in range, sum(sqm) | |
| 8 | Process Waste SqMtr | `process_waste` | 0 | Per-item not in schema |
| 9 | New Sqmtr | `new_sqmtr` | issue − process_waste | |
|10 | Closing SqMtr | `closing_balance` | opening_balance + received + purchase − issue | |

---

## Data Sources and Relationships

### Database Collections Used

1. **issues_for_pressing** (items issued to pressing)
   - Items issued from tapping/splicing to pressing.
   - Key fields: `item_name`, `item_sub_category_name`, `item_name_id`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt`.
   - Used for: distinct (item_group, item_name) + category via item master; Received = sum(sqm) where createdAt in period; Current available = sum(available_details.sqm) where is_pressing_done = false.

2. **pressing_done_consumed_items_details** (consumption per pressing)
   - One document per pressing run; linked by `pressing_done_details_id`.
   - **base_details[]**: base_type, item_name, item_sub_category_name, sqm → Category from base_type map.
   - **group_details[]**: item_name, item_sub_category_name, sqm → Category from item_name_id → item_category.
   - Used for: distinct (category, item_group, item_name); Issue = sum(sqm) where pressing_done_details.pressing_date in period.

3. **pressing_done_details**
   - One document per pressing run.
   - Key fields: `_id`, `pressing_date`.
   - Used only to filter consumption by pressing_date in [start, end].

4. **item_name** (masters)
   - Join: item_name_id → _id; populate category → item_category.
   - Used to get Category name for issues_for_pressing and group_details.

5. **item_category** (masters)
   - Key field: `category` (string).
   - Used via item_name.category ref for Category display name.

### Join Diagram (conceptual)

```
issues_for_pressing  →  item_name  →  item_category   (Category for splicing items)

pressing_done_consumed_items_details
    ├── base_details[]   →  Category = f(base_type)
    ├── group_details[]  →  item_name  →  item_category
    └── pressing_done_details_id  →  pressing_done_details.pressing_date  (for Issue in period)
```

---

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-pressing-stock-register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### With optional filter

```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-pressing-stock-register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31",
    "filter": {
      "item_group_name": "RECON"
    }
  }'
```

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const generatePressingStockRegister = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-pressing-stock-register',
      {
        startDate: '2025-03-01',
        endDate: '2025-03-31'
        // filter: { item_name: '...', item_group_name: '...' }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const downloadUrl = response.data.result;
    console.log('Download report from:', downloadUrl);
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

---

## Notes

- **Category** for base materials (MDF, Plywood, Fleece) comes from base_type: "Decorative Mdf", "Plywood", "Craft Back Paper". For splicing-issued items (issues_for_pressing and group_details), Category comes from item master (item_name → item_category).
- **Pur Sq Mtr** and **Process Waste SqMtr** are 0 in the current implementation; columns are present for future use.
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `Pressing-Stock-Register-{timestamp}.xlsx`

**Example**: `Pressing-Stock-Register-1738234567890.xlsx`

---

## Report Example Structure

```
Pressing Item Stock Register between 01/03/2025 and 31/03/2025

Category         | Item Group      | Item Name           | OPBL SqMtr | Received SqMtr | Pur Sq Mtr | Issue SqMtr | Process Waste SqMtr | New Sqmtr | Closing SqMtr
Craft Back Paper | RECON           | RECON 111 2MM       | 2.98       | 0.00           | 0.00       | 0.00        | 0.00                | 0.00      | 2.98
                 |                 | Total               | 2.98       | 0.00           | 0.00       | 0.00        | 0.00                | 0.00      | 2.98
Decorative Mdf   | AMERICAN WALNUT | AMERICAN WALNUT ... | 178.65     | 80.37          | 0.00       | 20.84       | 0.00                | 20.84     | 238.18
                 |                 | Total               | 178.65     | 80.37          | 0.00       | 20.84       | 0.00                | 20.84     | 238.18
...
Total            |                 |                     | ...        | ...            | ...        | ...         | ...                 | ...       | ...
```

---

## Troubleshooting

### No Data Found

If you receive a 404 error, verify:

- The dates are correct and in YYYY-MM-DD format.
- There is data in `issues_for_pressing` or `pressing_done_consumed_items_details` for items, and (for issue) `pressing_done_details.pressing_date` falls within the range.
- If filter is used, the item_name or item_group_name exists in the data.

### Incorrect Date Format

Dates must be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-03-01"`).

### Missing Category

Category for splicing items is resolved from `item_name` → `category` (ref item_category). Ensure item_name documents have a valid category reference and item_category documents have the `category` string set.

---

## Technical Implementation

### Controller Location

```
topl_backend/controllers/reports2/Pressing/pressingStockRegister.js
```

### Excel Generator Location

```
topl_backend/config/downloadExcel/reports2/Pressing/pressingStockRegister.js
```

### Routes Location

```
topl_backend/routes/report/reports2/Pressing/pressing.routes.js
```

### Plan (design and implementation steps)

See [PRESSING_STOCK_REGISTER_PLAN.md](./PRESSING_STOCK_REGISTER_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the Data Is Brought Together](#how-the-data-is-brought-together)** above.
