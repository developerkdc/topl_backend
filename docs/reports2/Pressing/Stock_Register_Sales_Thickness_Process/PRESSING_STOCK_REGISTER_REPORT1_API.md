# Pressing Stock Register Report 1 — Sales Name, Thickness, Other Process Wise

## Overview

The Pressing Stock Register Report 1 API generates an Excel report that shows pressing item stock movements grouped by **Item Name → Sales item Name → Thickness → Size** over a date range. The report includes Opening SqMtr, Pressing SqMtr (output from pressing), Alls Sell (Sales = issued for order minus CNC+Colour+Polish damage), All Damage (Pressing + CNC + Colour + Polish damage), Process Waste, and Closing SqMtr. Rows are grouped by Item Name with merged cells; each Item Name group has a **Total** (subtotal) row, and the report ends with a **Total** (grand total) row.

Data is sourced from `pressing_done_details` (row universe & Pressing SqMtr), `pressing_done_history` (Sales), `pressing_damage`, `cnc_damage_details`, `color_damage_details`, `polishing_damage_details` (All Damage — aggregated via pressing_details_id), `issues_for_pressing` (item_name via group_no), and `photos` (sales_item_name via group_no).

> **Note:** Issue for Challan is currently **0** (schema gap). All Damage = sum of damage from Pressing, CNC, Colour, and Polish stages (linked via pressing_done_details._id).

## Endpoint

```
POST /api/V1/report/download-excel-pressing-stock-register-sales-thickness-process
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
    "item_name": "AMERICAN WALNUT"
  }
}
```


| Parameter          | Type   | Required | Description                     |
| ------------------ | ------ | -------- | ------------------------------- |
| `startDate`        | String | Yes      | Start date in YYYY-MM-DD format |
| `endDate`          | String | Yes      | End date in YYYY-MM-DD format   |
| `filter.item_name` | String | No       | Filter by item name             |


## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pressing stock register (sales name - thickness - process) generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Pressing/Pressing-Stock-Register-Sales-Thickness-Process-1738234567890.xlsx"
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

#### 404 Not Found – No Data (no groups in issues_for_pressing)

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No pressing data found for the selected period"
}
```

#### 404 Not Found – All Rows Zero

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

- **start**: `new Date(startDate)` shifted to UTC 00:00:00.000 (via `setUTCHours(0,0,0,0)`)
- **end**: `new Date(endDate)` shifted to UTC 23:59:59.999 (via `setUTCHours(23,59,59,999)`)
- All "in period" logic uses this inclusive UTC range to avoid timezone offset issues.

### 2. Which rows appear in the report

- Distinct `(group_no, thickness, length, width)` are pulled from `pressing_done_details` **filtered by `pressing_date` in [start, end]**. Only groups actually pressed in the period appear.
- `item_name` is resolved for each `group_no` via a lookup into `issues_for_pressing` (first match per group_no).
- `sales_item_name` is resolved for each `group_no` via `photos`.
- Rows are collapsed to distinct `(item_name, sales_item_name, thickness, size)` combos. All `group_no`s sharing the same combo are collected and their metrics are summed.
- Optional filter: `filter.item_name` applied after resolving `item_name` from `issues_for_pressing`.

### 3. Collections and fields used

| Collection | Role | Key fields |
|---|---|---|
| **pressing_done_details** | Row universe and Pressing SqMtr — one doc per pressing run | `_id`, `group_no`, `pressing_date`, `thickness`, `length`, `width`, `sqm` |
| **pressing_done_history** | Sales — records where a pressed item was issued for ORDER | `issued_item_id` (→ pressing_done_details._id), `issued_for`, `sqm` |
| **pressing_damage** | All Damage — pressing-stage waste | `pressing_done_details_id`, `sqm` |
| **cnc_damage_details** | All Damage — CNC-stage waste | `cnc_done_id` → cnc_done_details.pressing_details_id |
| **color_damage_details** | All Damage — colour-stage waste | `color_done_id` → color_done_details.pressing_details_id |
| **polishing_damage_details** | All Damage — polishing-stage waste | `polishing_done_id` → polishing_done_details.pressing_details_id |
| **issues_for_pressing** | Resolves `item_name` via group_no | `group_no`, `item_name`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt` |
| **photos** (masters) | Sales item name per group | `group_no`, `sales_item_name` |

- **Join (Pressing SqMtr)**: `pressing_done_details` where `pressing_date` ∈ [start, end] → sum(`sqm`) per combo.
- **Join (Sales)**: `pressing_done_history` where `issued_for` = "ORDER" → sum(`sqm`) per pressing_done_id. Subtract (CNC + Colour + Polish damage) per pressing_done_id → net Sales. Closing uses net sales.
- **Join (All Damage)**: Sum of (1) `pressing_damage` where `pressing_done_details_id` ∈ pressing_done IDs; (2) `cnc_damage_details` via `cnc_done_details.pressing_details_id`; (3) `color_damage_details` via `color_done_details.pressing_details_id`; (4) `polishing_damage_details` via `polishing_done_details.pressing_details_id` → attributed to combo.
- **Current available**: `issues_for_pressing` where `is_pressing_done = false`, sum(`available_details.sqm`) per `(group_no, item_name)`.
- **Issued in period**: `issues_for_pressing` where `createdAt` ∈ [start, end], sum(`sqm`) per `(group_no, item_name)`.

### 4. Per-row aggregates (for each combo)

| Quantity | Source | Filter | Meaning |
|---|---|---|---|
| **Pressing SqMtr** | pressing_done_details | pressing_date ∈ [start, end] | Pressed output (finished panels) in period |
| **Sales** | pressing_done_history − (CNC + Colour + Polish damage) | issued_for = "ORDER"; subtract downstream damage | Net SQM: issued for order minus damage at CNC/Colour/Polish |
| **Issue for Challan** | — | — | 0 (schema gap) |
| **All Damage** | pressing_damage + cnc_damage + color_damage + polishing_damage | Linked via pressing_done_details._id | Total waste across Pressing, CNC, Colour, Polish |
| **Process Waste** | pressing_damage | pressing_done_details_id ∈ pressing_done IDs | Pressing-stage waste only |
| **Current available** | issues_for_pressing | is_pressing_done = false | SQM still awaiting pressing |
| **Opening SqMtr** | Calculated | — | Stock at pressing stage at start of period |
| **Closing SqMtr** | Calculated | — | Stock at end of period |

### 5. Formulas

For each `(item_name, sales_item_name, thickness, size)` combo (summing across all its `group_no`s and `pressing_done` IDs):

```
pressing_sqm       = sum of pressing_done_details.sqm where pressing_date in [start, end]
sales_raw          = sum of pressing_done_history.sqm where issued_for = "ORDER" and issued_item_id in pressing_done IDs
downstream_damage  = sum of (cnc_damage + color_damage + polishing_damage).sqm linked to pressing_done IDs
sales              = max(0, sales_raw − downstream_damage)   (displayed Sales column)
all_damage         = sum of (pressing_damage + cnc_damage + color_damage + polishing_damage).sqm
                    linked to pressing_done IDs via pressing_done_details_id / cnc_done_details.pressing_details_id /
                    color_done_details.pressing_details_id / polishing_done_details.pressing_details_id
current_available  = sum of issues_for_pressing.available_details.sqm where is_pressing_done = false
issued_in_period   = sum of issues_for_pressing.sqm where createdAt in [start, end]

process_waste      = pressing_damage only   (pressing-stage waste)
issue_for_challan  = 0

Opening SqMtr = current_available + pressing_sqm + all_damage − issued_in_period

Closing SqMtr = Opening SqMtr + pressing_sqm − sales − issue_for_challan − all_damage
                (uses net sales: sales_raw − downstream damage)
```

- **Opening** = stock that would have been "current" at the start of the period if we reverse pressing output/damage and add back the period's issues.
- **Closing** = derived from opening after all inflows/outflows in the period.

### 6. Which rows are returned in the Excel

- After computing the above, **rows where `pressing_sqm = 0 AND sales = 0 AND damage = 0`** are dropped (no actual in-period pressing activity).
- If no rows remain, the API responds with **404** `"No pressing stock data found for the selected period"`.
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a URL to the Excel file. The client can GET this URL to download the file.
- The Excel contains: title row, two-row header, data rows grouped by Item Name with merged Item Name cells, a **Total** row after each Item Name group (subtotal, **separate** from item details), and one **Total** row at the end (grand total, **separate** from item details).
- **400**: Invalid request (missing/invalid dates or start > end).
- **404**: No distinct groups in `issues_for_pressing`, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Pressing Item Stock Register sales name - thickness - other process wise between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Pressing Item Stock Register sales name - thickness - other process wise between 01/03/2025 and 31/03/2025`

### Column Headers (Two Rows)

#### Header Row A (span headers)


| Col | Label                                         | Spans                |
| --- | --------------------------------------------- | -------------------- |
| 1   | Item Name                                     | Rows A–B             |
| 2   | Sales item Name                               | Rows A–B             |
| 3   | Thickness                                     | Rows A–B             |
| 4   | Size                                          | Rows A–B             |
| 5   | Opening SqMtr                                 | Rows A–B             |
| 6   | Pressing SqMtr                                | Rows A–B             |
| 7–8 | Alls Sell (Direct Pressing+Cnc+Colour+Polish) | Cols 7–8, Row A only |
| 9   | All Damage (Pressing+Cnc+Colour+Polish)       | Rows A–B             |
| 10  | Process Waste                                 | Rows A–B             |
| 11  | Closing SqMtr                                 | Rows A–B             |


#### Header Row B (sub-headers)


| Col | Label             |
| --- | ----------------- |
| 7   | Sales             |
| 8   | Issue for Challan |


### Data Rows

- One row per distinct **(Item Name, Sales item Name, Thickness, Size)** that has any non-zero metric.
- Sorted by Item Name, then Sales item Name, then Thickness (numeric asc), then Size.
- **Merged cells**: Item Name column is merged for consecutive **detail rows** of the same Item Name only. The Total row is **not** merged with item details.
- Numeric columns use two decimal places.

### Item Name Total Rows

- After each Item Name's detail rows, a **Total** row sums Opening SqMtr, Pressing SqMtr, Sales, Issue for Challan, All Damage, Process Waste, Closing SqMtr for that group only.
- **The Total row is separate from item details** — it is not merged with the Item Name cell. Col 1 shows **Total**; Col 2 shows **Total**.

### Grand Total Row

- Last row is **Total**, with sums of all numeric columns across the entire report.
- **The Grand Total row is separate from item details and subtotal rows.** Col 1: **Total**; remaining text columns blank.

---

## Field Mapping (Excel Column → Source)


| #   | Report column     | Controller field    | DB / logic                                                               | Notes                     |
| --- | ----------------- | ------------------- | ------------------------------------------------------------------------ | ------------------------- |
| 1   | Item Name         | `item_name`         | issues_for_pressing.item_name                                            |                           |
| 2   | Sales item Name   | `sales_item_name`   | photos.sales_item_name via group_no                                      |                           |
| 3   | Thickness         | `thickness`         | issues_for_pressing.thickness                                            | numFmt 0.00               |
| 4   | Size              | `size`              | `length X width` from issues_for_pressing                                | String                    |
| 5   | Opening SqMtr     | `opening_sqm`       | current_available + pressing_sqm + pressing_waste_sqm − issued_in_period |                           |
| 6   | Pressing SqMtr    | `pressing_sqm`      | pressing_done_details.sqm where pressing_date in range                   | Output from pressing runs |
| 7   | Sales             | `sales`             | pressing_done_history.sqm (issued_for=ORDER) − (CNC+Colour+Polish damage) | Net sales, min 0           |
| 8   | Issue for Challan | `issue_for_challan` | 0                                                                        | Schema gap                |
| 9   | All Damage        | `damage`            | pressing_damage + cnc_damage + color_damage + polishing_damage (via pressing_details_id) | Pressing + CNC + Colour + Polish |
| 10  | Process Waste     | `process_waste`     | pressing_damage.sqm only (pressing-stage waste)                           |                           |
| 11  | Closing SqMtr     | `closing_sqm`       | Opening + Pressing − Sales − Challan − Damage − Process Waste            |                           |


---

## Data Sources and Relationships

### Database Collections Used

1. **issues_for_pressing** (items issued from splicing/tapping to pressing)
  - Key fields: `group_no`, `item_name`, `thickness`, `length`, `width`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt`.
  - Used for: distinct (group_no, item_name, thickness, size); issued in period = sum(sqm) where createdAt in range; current available = sum(available_details.sqm) where is_pressing_done = false.
2. **pressing_done_details** (one document per pressing run)
  - Key fields: `_id`, `group_no`, `pressing_id`, `sqm`, `pressing_date`.
  - Used for: Pressing SqMtr = sum(sqm) per group_no where pressing_date in range; also provides `_id`s for joining to pressing_damage and pressing_done_history.
3. **pressing_done_history** (items issued from pressing to further processes)
  - Key fields: `issued_item_id` (→ pressing_done_details._id), `issued_for`, `sqm`.
  - Used for: Sales = sum(sqm) where issued_for = "ORDER", grouped by issued_item_id.
4. **pressing_damage**, **cnc_damage_details**, **color_damage_details**, **polishing_damage_details**
  - pressing_damage: `pressing_done_details_id`, `sqm`. Direct link to pressing_done_details._id.
  - cnc_damage: `cnc_done_id` → cnc_done_details.pressing_details_id. color_damage: `color_done_id` → color_done_details.pressing_details_id. polishing_damage: `polishing_done_id` → polishing_done_details.pressing_details_id.
  - Used for: All Damage = sum(sqm) from all four damage tables, mapped back to pressing_done_details._id.
5. **photos** (masters)
  - Key fields: `group_no`, `sales_item_name`.
  - Used to resolve `sales_item_name` for each group_no.

### Join Diagram (conceptual)

```
issues_for_pressing
    └── group_no  →  photos.group_no  →  sales_item_name    (Sales item Name column)

pressing_done_details
    ├── group_no  (links back to issues_for_pressing)
    ├── sqm + pressing_date  →  Pressing SqMtr (in period)
    ├── _id  →  pressing_done_history.issued_item_id (issued_for="ORDER")  →  sqm  →  Sales
    ├── _id  →  pressing_damage.pressing_done_details_id  →  sqm  →  Process Waste (pressing only)
    └── _id  →  All Damage (sum of pressing + cnc + color + polishing damage, via pressing_details_id)
```

### Combo Aggregation

The controller builds combos in memory, not in MongoDB:

```
Step 1: Fetch all distinct (group_no, item_name, thickness, length, width) from issues_for_pressing
Step 2: Fetch sales_item_name from photos for all group_nos (single bulk query)
Step 3: Build Map<comboKey → { item_name, sales_item_name, thickness, size, group_nos[] }>
Step 4: Run 4 bulk aggregations (issued, pressing done, pressing waste, current available)
Step 5: For each combo, sum metrics across its group_nos
```

---

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-sales-thickness-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### With optional filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-sales-thickness-process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31",
    "filter": {
      "item_name": "AMERICAN WALNUT"
    }
  }'
```

### Using JavaScript (Axios)

```javascript
import axios from 'axios';

const generatePressingStockRegisterReport1 = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-pressing-stock-register-sales-thickness-process',
      {
        startDate: '2025-03-01',
        endDate: '2025-03-31'
        // filter: { item_name: 'AMERICAN WALNUT' }
      },
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    const downloadUrl = response.data.result;
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

---

## Notes

- **Sales item Name** is sourced from the `photos` collection via `group_no`. If a group_no has no matching photo document, `sales_item_name` defaults to an empty string.
- **Issue for Challan** is 0 (schema gap). **All Damage** = pressing + cnc + color + polishing damage. **Process Waste** = pressing_damage only (pressing-stage waste).
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `Pressing-Stock-Register-Sales-Thickness-Process-{timestamp}.xlsx`

**Example**: `Pressing-Stock-Register-Sales-Thickness-Process-1738234567890.xlsx`

---

## Report Example Structure

```
Pressing Item Stock Register sales name - thickness - other process wise between 01/03/2025 and 31/03/2025

Item Name        | Sales item Name      | Thickness | Size        | Opening SqMtr | Pressing SqMtr | [Alls Sell]                    | All Damage | Process Waste | Closing SqMtr
                 |                      |           |             |               |                | Sales | Issue for Challan |            |               |
AMERICAN WALNUT  | AW PLAIN MULTI       | 0.50      | 2440 X 1220 | 12.56         | 8.00           | 0.00  | 0.00              | 0.00       | 0.20          | 20.36
AMERICAN WALNUT  | AW PLAIN MULTI       | 0.50      | 2440 X 610  | 4.20          | 3.10           | 0.00  | 0.00              | 0.00       | 0.05          | 7.25
AMERICAN WALNUT  | Total                |           |             | 16.76         | 11.10          | 0.00  | 0.00              | 0.00       | 0.25          | 27.61
...
Total            |                      |           |             | ...           | ...            | ...   | ...               | ...        | ...           | ...
```

---

## Troubleshooting

### No Data Found

If you receive a 404 error, verify:

- The dates are correct and in YYYY-MM-DD format.
- There is data in `issues_for_pressing` for items (all time). The report relies on all-time history for opening balance, not just the period.
- If a filter is used, the `item_name` exists in `issues_for_pressing`.

### All Columns Zero

A row is dropped if every numeric column is 0. This happens when:

- The group has no pressing activity (pressing_sqm = 0), no current available stock, and no issued activity in the period.
- In this case, even if rows exist in `issues_for_pressing`, the API returns 404.

### Incorrect Date Format

Dates must be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-03-01"`).

### Sales item Name is blank

Ensure the `photos` collection has a document with `group_no` matching the pressing group, and that `sales_item_name` is populated.

---

## Technical Implementation

### Controller Location

```
topl_backend/controllers/reports2/Pressing/pressingStockRegisterReport1.js
```

### Excel Generator Location

```
topl_backend/config/downloadExcel/reports2/Pressing/pressingStockRegisterReport1.js
```

### Routes Location

```
topl_backend/routes/report/reports2/Pressing/pressing.routes.js
```

### Plan (design and implementation steps)

See [PRESSING_STOCK_REGISTER_REPORT1_PLAN.md](./PRESSING_STOCK_REGISTER_REPORT1_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the Data Is Brought Together](#how-the-data-is-brought-together)** above.