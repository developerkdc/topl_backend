# Pressing Stock Register Report 3 — Sales Name, Thickness

## Overview

The Pressing Stock Register Report 3 API generates an Excel report showing pressing item stock aggregated by **Item Name → Sales item Name → Thickness → Size** over a date range. The report includes Opening SqMtr, Issued for pressing SqMtr, Pressing received SqMtr, Pressing Waste SqMtr, and Closing SqMtr. Sales item name is resolved from the `photos` collection via `group_no`. Each Item Name group has a **Total** (subtotal) row, and the report ends with a **Total** (grand total) row.

Data is sourced from `issues_for_pressing` (issued from splicing to pressing), `pressing_done_details` (pressing run output), `pressing_damage` (pressing waste), and `photos` (sales item name via group_no).

## Endpoint

```
POST /api/V1/report/download-excel-pressing-stock-register-sales-thickness
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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by item name |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Pressing stock register (sales name - thickness) generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Pressing/Pressing-Stock-Register-Sales-Thickness-1738234567890.xlsx"
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

- Distinct `(group_no, item_name)` pairs are pulled from `issues_for_pressing` (all time — opening balance needs full history).
- Each `group_no` is joined to `photos` to get `sales_item_name`.
- Rows are then collapsed to distinct `(item_name, sales_item_name, thickness, size)` combos. All `group_no`s sharing the same combo are collected into a list and their metrics are summed.
- One row per distinct `(item_name, sales_item_name, thickness, size)` combo.
- Optional filter: `filter.item_name` applied as `item_name` match on `issues_for_pressing`.

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **issues_for_pressing** | Items issued from splicing to pressing; drives issued in period and current available | `group_no`, `item_name`, `thickness`, `length`, `width`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt` |
| **pressing_done_details** | Pressing run header; provides `sqm` output and `pressing_date` | `_id`, `group_no`, `sqm`, `pressing_date` |
| **pressing_damage** | Pressing waste per run | `pressing_done_details_id`, `sqm` |
| **photos** (masters) | Sales item name per group | `group_no`, `sales_item_name` |

- **Join (sales_item_name)**: `photos.group_no = group_no` → `sales_item_name`.
- **Join (pressing received)**: `pressing_done_details.pressing_date` ∈ [start, end] AND `group_no` in set → sum(`sqm`) per group_no.
- **Join (pressing waste)**: same pressing_done_details docs → collect `_id`s → `pressing_damage.pressing_done_details_id` in those IDs → sum(`sqm`) per `_id` → map back to group_no.
- **Issued for pressing**: `issues_for_pressing.createdAt` ∈ [start, end] → sum(`sqm`) per `(group_no, item_name)`.
- **Current available**: `issues_for_pressing` where `is_pressing_done = false` → sum(`available_details.sqm`) per `(group_no, item_name)`.

### 4. Per-row aggregates (for each combo)

| Quantity | Source | Filter | Meaning |
|----------|--------|--------|---------|
| **Issued for pressing SqMtr** | issues_for_pressing | createdAt ∈ [start, end] | SQM issued from splicing to pressing in the period (summed across all group_nos in combo) |
| **Pressing received SqMtr** | pressing_done_details | pressing_date ∈ [start, end] | Pressed output in period (summed across all group_nos in combo) |
| **Pressing Waste SqMtr** | pressing_damage | Via pressing_done_details in period | Pressing waste in period (summed across all group_nos in combo) |
| **Current available** | issues_for_pressing | is_pressing_done = false | SQM still awaiting pressing (summed across all group_nos in combo) |
| **Opening SqMtr** | Calculated | — | Stock at pressing stage at start of period |
| **Closing SqMtr** | Calculated | — | Stock at pressing stage at end of period |

### 5. Formulas

For each `(item_name, sales_item_name, thickness, size)` combo (summing across all its `group_no`s):

```
current_available   = sum(issues_for_pressing.available_details.sqm) where is_pressing_done = false

Opening SqMtr       = current_available + pressing_received + pressing_waste − issued_for_pressing

Closing SqMtr       = current_available
                    (= Opening + issued_for_pressing − pressing_received − pressing_waste)
```

- **Opening** = stock that would have been "current" at the start of the period if we reverse the period's pressing output and waste, and add back the period's issues.
- **Closing** = current_available (algebraically equivalent to Opening + issued − received − waste).

### 6. Which rows are returned in the Excel

- After computing the above for every distinct combo, **rows where every numeric column is 0** (opening_sqm, issued_for_pressing, pressing_received, pressing_waste, closing_sqm) are dropped.
- If no rows remain, the API responds with **404** `"No pressing stock data found for the selected period"`.
- The Excel is built from the remaining rows only.

### 7. Understanding the API response

- **200**: The report was generated. **result** is a URL to the Excel file. The client can GET this URL to download the file.
- The Excel contains: title row, one header row, data rows grouped by Item Name with merged Item Name cells, a **Total** row after each Item Name group (subtotal, **separate** from item details), and one **Total** row at the end (grand total, **separate** from item details).
- **400**: Invalid request (missing/invalid dates or start > end).
- **404**: No distinct groups in `issues_for_pressing`, or all rows were dropped as all-zero.

---

## Report Structure

The generated Excel file has the following layout.

### Title Row

```
Pressing Item Stock Register sales name - thicksens between DD/MM/YYYY and DD/MM/YYYY
```

Example: `Pressing Item Stock Register sales name - thicksens between 01/03/2025 and 31/03/2025`

> Note: "thicksens" is a typo preserved from the original report spec/layout. Do not correct it in the title or filename as it would break consistency with the delivered spec.

### Column Headers (9 columns, single row)

| # | Column | Description |
|---|--------|-------------|
| 1 | Item Name | Veneer item name |
| 2 | Slaes item Name | Sales item name from photos (note: "Slaes" preserved from spec) |
| 3 | Thickness | Veneer thickness (mm), numFmt 0.00 |
| 4 | Size | `length X width` (string) |
| 5 | Opening SqMtr | Stock at pressing stage at start of period |
| 6 | Issued for pressing SqMtr | Issued from splicing to pressing in period |
| 7 | Pressing received Sqmtr | Pressed output in period |
| 8 | Pressing Waste SqMtr | Pressing waste in period |
| 9 | Closing SqMtr | Stock at pressing stage at end of period |

### Data Rows

- One row per distinct **(Item Name, Sales item Name, Thickness, Size)** that has any non-zero metric.
- Sorted by Item Name (asc), then Sales item Name (asc), then Thickness (numeric asc), then Size (string asc).
- **Merged cells**: Item Name column (col 1) is merged for consecutive **detail rows** of the same Item Name only. The Total row is **not** merged with item details.
- Numeric columns use two decimal places.

### Item Name Total Rows

- After each Item Name's detail rows, a **Total** row sums Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr, Pressing Waste SqMtr, Closing SqMtr for that group only.
- **The Total row is separate from item details** — it is not merged with the Item Name cell. Col 1 shows **Total**; Col 2 shows **Total**; cols 3–4 are blank.

### Grand Total Row

- Last row is **Total**, with sums of all numeric columns across the entire report.
- **The Grand Total row is separate from item details and subtotal rows.** Col 1: **Total**; cols 2–4 blank.

---

## Field Mapping (Excel Column → Source)

| # | Report column | Controller field | DB / logic | Notes |
|---|---------------|-----------------|------------|-------|
| 1 | Item Name | `item_name` | issues_for_pressing.item_name | Merged per group |
| 2 | Slaes item Name | `sales_item_name` | photos.sales_item_name via group_no | Empty string if no photo match |
| 3 | Thickness | `thickness` | issues_for_pressing.thickness | numFmt 0.00 |
| 4 | Size | `size` | `length X width` string | |
| 5 | Opening SqMtr | `opening_sqm` | current_available + pressing_received + pressing_waste − issued_for_pressing | |
| 6 | Issued for pressing SqMtr | `issued_for_pressing` | issues_for_pressing.sqm where createdAt in range, summed per combo | |
| 7 | Pressing received Sqmtr | `pressing_received` | pressing_done_details.sqm where pressing_date in range, summed per combo | |
| 8 | Pressing Waste SqMtr | `pressing_waste` | pressing_damage.sqm via pressing_done_details in period, summed per combo | |
| 9 | Closing SqMtr | `closing_sqm` | current_available | = Opening + issued − received − waste |

---

## Data Sources and Relationships

### Database Collections Used

1. **issues_for_pressing** (items issued from splicing/tapping to pressing)
   - Key fields: `group_no`, `item_name`, `thickness`, `length`, `width`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt`.
   - Used for: distinct (group_no, item_name, thickness, size) all time; issued in period = sum(sqm) where createdAt in range; current available = sum(available_details.sqm) where is_pressing_done = false.

2. **pressing_done_details** (one document per pressing run)
   - Key fields: `_id`, `group_no`, `sqm`, `pressing_date`.
   - Used for: Pressing received = sum(sqm) per group_no where pressing_date in range; bridge for waste join.

3. **pressing_damage**
   - Key fields: `pressing_done_details_id`, `sqm`.
   - Used for: Pressing Waste = sum(sqm) per pressing_done_details_id; mapped back to group_no.

4. **photos** (masters)
   - Key fields: `group_no`, `sales_item_name`.
   - Used to resolve `sales_item_name` per group_no (single bulk query).

### Join Diagram (conceptual)

```
issues_for_pressing
    └── group_no  →  photos.group_no  →  sales_item_name       (Sales item Name column)

pressing_done_details
    ├── group_no  (links back to issues_for_pressing)
    ├── sqm + pressing_date in period    →  Pressing received SqMtr
    └── _id  →  pressing_damage.pressing_done_details_id  →  sqm  →  Pressing Waste SqMtr
```

### Combo Aggregation

The controller builds combos in memory, not in MongoDB:

```
Step 1: Fetch all distinct (group_no, item_name, thickness, length, width) from issues_for_pressing (all time)
Step 2: Fetch sales_item_name from photos for all group_nos (single bulk query)
Step 3: Build Map<comboKey → { item_name, sales_item_name, thickness, size, group_nos[] }>
        comboKey = "item_name||sales_item_name||thickness||size"
Step 4: Run 4 bulk aggregations (issued, pressing done, pressing waste, current available)
Step 5: For each combo, sum metrics across all its group_nos using Maps
```

---

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-sales-thickness \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### With optional filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-sales-thickness \
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

const generatePressingStockRegisterReport3 = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-pressing-stock-register-sales-thickness',
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

- **Sales item Name (col 2)** is sourced from `photos.sales_item_name` via `group_no`. If a group_no has no matching photo document, `sales_item_name` defaults to an empty string, and combos without a sales name are grouped under the empty string key.
- **"Slaes item Name"** and **"thicksens"** in column header and title respectively are preserved from the original layout spec. Do not correct them to avoid breaking consistency with the delivered Excel format.
- **Pressing received / waste attribution**: Attributed to the primary `group_no` field of `pressing_done_details`. Secondary groups appearing only in `group_no_array` are not credited.
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `Pressing-Stock-Register-Sales-Thickness-{timestamp}.xlsx`

**Example**: `Pressing-Stock-Register-Sales-Thickness-1738234567890.xlsx`

---

## Report Example Structure

```
Pressing Item Stock Register sales name - thicksens between 01/03/2025 and 31/03/2025

Item Name        | Slaes item Name      | Thickness | Size        | Opening SqMtr | Issued for pressing SqMtr | Pressing received Sqmtr | Pressing Waste SqMtr | Closing SqMtr
AMERICAN WALNUT  | AW PLAIN MULTI       | 0.50      | 2440 X 1220 | 12.56         | 8.00                      | 6.00                    | 0.20                 | 12.56
AMERICAN WALNUT  | AW PLAIN MULTI       | 0.50      | 2440 X 610  | 4.20          | 3.10                      | 2.80                    | 0.05                 | 4.20
AMERICAN WALNUT  | Total                |           |             | 16.76         | 11.10                     | 8.80                    | 0.25                 | 16.76
...
Total            |                      |           |             | ...           | ...                       | ...                     | ...                  | ...
```

---

## Troubleshooting

### No Data Found

If you receive a 404 error, verify:

- The dates are correct and in YYYY-MM-DD format.
- There is data in `issues_for_pressing`. The report fetches distinct groups from all-time history (not filtered by period), so data must exist in `issues_for_pressing` regardless of date.
- If a filter is used, the `item_name` exists in `issues_for_pressing`.

### All Rows Zero

A row is dropped if every numeric column is 0. This happens when a combo has no pressing activity and no current available stock in the system.

### Sales item Name is blank

Ensure the `photos` collection has a document with `group_no` matching the pressing group and that `sales_item_name` is populated.

### Incorrect Date Format

Dates must be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-03-01"`).

---

## Technical Implementation

### Controller Location

```
topl_backend/controllers/reports2/Pressing/pressingStockRegisterReport3.js
```

### Excel Generator Location

```
topl_backend/config/downloadExcel/reports2/Pressing/pressingStockRegisterReport3.js
```

### Routes Location

```
topl_backend/routes/report/reports2/Pressing/pressing.routes.js
```

### Plan (design and implementation steps)

See [PRESSING_STOCK_REGISTER_REPORT3_PLAN.md](./PRESSING_STOCK_REGISTER_REPORT3_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the Data Is Brought Together](#how-the-data-is-brought-together)** above.
