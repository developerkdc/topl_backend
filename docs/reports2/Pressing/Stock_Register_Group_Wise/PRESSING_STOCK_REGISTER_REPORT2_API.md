# Pressing Stock Register Report 2 — Group No Wise

## Overview

The Pressing Stock Register Report 2 API generates an Excel report showing pressing item stock at **transaction (group) level** — one row per group number, grouped and subtotalled by **Item Name**. The report includes Group no, Photo No (from `photos`), Order No (order number from `orders` when `issued_for` = ORDER, else empty), Issued Thickness (from consumed issues), Received Thickness (pressing output), Size, Opening SqMtr, Issued for pressing SqMtr, Pressing received SqMtr, Pressing Waste SqMtr, and Closing SqMtr. Each Item Name group has a **Total** (subtotal) row, and the report ends with a **Total** (grand total) row.

Data is sourced from `issues_for_pressing` (issued from splicing to pressing), `pressing_done_details` (pressing run output, order_id when issued_for=ORDER), `orders` (order_no for Order No column), `pressing_damage` (pressing waste), and `photos` (photo number via group_no or hybrid_group_no).

## Endpoint

```
POST /api/V1/report/download-excel-pressing-stock-register-group-wise
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
  "message": "Pressing stock register (group wise) generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Pressing/Pressing-Stock-Register-Group-Wise-1738234567890.xlsx"
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

#### 404 Not Found – No Groups

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No pressing group data found for the selected period"
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
- `item_name` is resolved for each `group_no` via `issues_for_pressing`.
- `photo_number` is resolved via `photos` (group_no or hybrid_group_no.group_no for hybrid veneer).
- One row is generated per distinct group/dimension row from pressing output.
- Optional filter: `filter.item_name` applied after resolving item names.

### 3. Collections and fields used

| Collection | Role | Key fields |
|------------|------|------------|
| **pressing_done_details** | Row universe and Pressing received — one doc per pressing run | `_id`, `group_no`, `order_id`, `issued_for`, `pressing_date`, `thickness`, `length`, `width`, `sqm` |
| **orders** | Order number when pressing was for order | `_id`, `order_no` |
| **pressing_done_history** | Sales — items issued from pressing to further processes (CNC, COLOR, etc.) | `issued_item_id` (→ pressing_done_details._id), `sqm` |
| **pressing_damage** | All Damage — pressing-stage waste per run | `pressing_done_details_id`, `sqm` |
| **issues_for_pressing** | Resolves `item_name` via group_no; provides current_available and inflow | `group_no`, `item_name`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt` |
| **photos** | Photo number per group | `group_no`, `photo_number`, `hybrid_group_no` |
| **pressing_done_consumed_items_details** | Consumed items per pressing run | `pressing_done_details_id`, `group_details` (group_no, thickness) |

- **Join (Pressing received)**: `pressing_done_details` where `pressing_date` ∈ [start, end] → sum(`sqm`) per group/dimension.
- **Join (Sales)**: `pressing_done_history.issued_item_id` ∈ pressing_done `_id`s in period → sum(`sqm`) per group.
- **Join (All Damage)**: `pressing_damage.pressing_done_details_id` ∈ pressing_done `_id`s in period → sum(`sqm`) per group.
- **Current available**: `issues_for_pressing` where `is_pressing_done = false` → sum(`available_details.sqm`) per `group_no`.
- **Issued for pressing**: `issues_for_pressing.createdAt` ∈ [start, end] → sum(`sqm`) per `(group_no, thickness, length, width)`. When dimension match returns 0 but pressing was done, fallback to sum from `pressing_done_consumed_items_details.group_details` (consumed sqm).

### 4. Per-row aggregates (for each group row)

| Quantity | Source | Filter | Meaning |
|----------|--------|--------|---------|
| **Pressing received Sqmtr** | pressing_done_details | pressing_date ∈ [start, end] | Pressed output in period |
| **Sales** | pressing_done_history | issued_item_id ∈ PD IDs | SQM issued from pressing to next process |
| **All Damage** | pressing_damage | PD IDs in period | Pressing waste (same as Pressing Waste SqMtr) |
| **Opening SqMtr** | Calculated | — | Stock at pressing stage at start of period |
| **Closing SqMtr** | Calculated | — | Stock at pressing stage at end of period |

### 5. Formulas

For each group row:

```
Opening SqMtr       = current_available + pressing_received + all_damage − issued_for_pressing

Closing SqMtr       = Opening + issued_for_pressing − pressing_received − all_damage − sales
```

- **Opening** = what would have been "current" at the start of the period if we reverse the period's pressing output and waste, and add back the period's issues.
- **Closing** = current_available, because `Opening + issued − received − waste = current_available` by construction.

### 6. Which rows are returned in the Excel

- After computing the above for every distinct `(group_no, item_name)`, **rows where every numeric column is 0** (opening_sqm, issued_for_pressing, pressing_received, pressing_waste, closing_sqm) are dropped.
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
Pressing Item Stock Register between group no wise DD/MM/YYYY and DD/MM/YYYY
```

Example: `Pressing Item Stock Register between group no wise 01/03/2025 and 31/03/2025`

### Column Headers (12 columns, single row)

| # | Column | Description |
|---|--------|-------------|
| 1 | Item Name | Veneer item name |
| 2 | Group no | Group number from issues_for_pressing |
| 3 | Photo No | `photo_number` from photos collection |
| 4 | Order No | `orders.order_no` when `pressing_done_details.issued_for` = ORDER, else empty |
| 5 | Issued Thickness | Veneer thickness (mm) from pressing_done_consumed_items_details.group_details — thickness when issued |
| 6 | Received Thickness | Veneer thickness (mm) from pressing_done_details — pressed output |
| 7 | Size | `length X width` (string) |
| 8 | Opening SqMtr | Stock at pressing stage at start of period |
| 9 | Issued for pressing SqMtr | Issued from splicing to pressing in period |
| 10 | Pressing received Sqmtr | Pressed output in period |
| 11 | Pressing Waste SqMtr | Pressing waste in period |
| 12 | Closing SqMtr | Stock at pressing stage at end of period |

### Data Rows

- One row per distinct **(group_no, item_name)** that has any non-zero metric.
- Sorted by Item Name (asc), then Group no (asc).
- **Merged cells**: Item Name column (col 1) is merged for consecutive **detail rows** of the same Item Name only. The Total row is **not** merged with item details.
- Numeric columns use two decimal places.

### Item Name Total Rows

- After each Item Name's detail rows, a **Total** row sums Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr, Pressing Waste SqMtr, Closing SqMtr for that group only.
- **The Total row is separate from item details** — it is not merged with the Item Name cell. Col 1 shows **Total**; Col 2 shows **Total**; cols 3–7 are blank.

### Grand Total Row

- Last row is **Total**, with sums of all numeric columns across the entire report.
- **The Grand Total row is separate from item details and subtotal rows.** Col 1: **Total**; cols 2–7 blank.

---

## Field Mapping (Excel Column → Source)

| # | Report column | Controller field | DB / logic | Notes |
|---|---------------|-----------------|------------|-------|
| 1 | Item Name | `item_name` | issues_for_pressing.item_name | Merged per group |
| 2 | Group no | `group_no` | issues_for_pressing.group_no | |
| 3 | Photo No | `photo_no` | photos.photo_number via group_no or hybrid_group_no.group_no | Empty string if no match; hybrid veneer groups in hybrid_group_no also resolve |
| 4 | Order No | `order_no` | orders.order_no when pressing_done_details.issued_for = ORDER, else empty | Empty when issued_for is STOCK or SAMPLE |
| 5 | Issued Thickness | `issued_thickness` | issues_for_pressing.thickness when dimKey matches; else pressing_done_consumed_items_details.group_details.thickness | Primary from issues (covers issued-but-not-pressed); fallback from consumed when dimension mismatch |
| 6 | Received Thickness | `received_thickness` | pressing_done_details.thickness | Thickness of pressed output; numFmt 0.00 |
| 7 | Size | `size` | `length X width` string | |
| 8 | Opening SqMtr | `opening_sqm` | current_available + pressing_received + pressing_waste − issued_for_pressing | |
| 9 | Issued for pressing SqMtr | `issued_for_pressing` | issues_for_pressing.sqm when dimKey matches; else sum from pressing_done_consumed_items_details.group_details | Never 0 when pressing_received > 0 |
| 10 | Pressing received Sqmtr | `pressing_received` | pressing_done_details.sqm where pressing_date in range | |
| 11 | Pressing Waste SqMtr | `pressing_waste` | pressing_damage.sqm via pressing_done_details in period | |
| 12 | Closing SqMtr | `closing_sqm` | current_available | = Opening + issued − received − waste |

---

## Data Sources and Relationships

### Database Collections Used

1. **issues_for_pressing** (items issued from splicing/tapping to pressing)
   - Key fields: `group_no`, `item_name`, `thickness`, `length`, `width`, `sqm`, `available_details.sqm`, `is_pressing_done`, `createdAt`.
   - Used for: distinct (group_no, item_name); issued in period = sum(sqm) where createdAt in range, **per (group_no, thickness, length, width)**; fallback to consumed sqm when dimension mismatch; current available = sum(available_details.sqm) where is_pressing_done = false.

2. **pressing_done_details** (one document per pressing run)
   - Key fields: `_id`, `group_no`, `order_id`, `issued_for`, `sqm`, `pressing_date`.
   - Used for: Order No = order_id when issued_for=ORDER (resolved via orders.order_no); Pressing received = sum(sqm) per group_no where pressing_date in range; bridge for waste join.
3. **orders**
   - Key fields: `_id`, `order_no`.
   - Used for: Order No column — lookup order_no by order_id when pressing_done_details.issued_for = ORDER.

4. **pressing_damage**
   - Key fields: `pressing_done_details_id`, `sqm`.
   - Used for: Pressing Waste = sum(sqm) per pressing_done_details_id; mapped back to group_no.

5. **photos** (masters)
   - Key fields: `group_no`, `photo_number`, `hybrid_group_no`.
   - Used to resolve `photo_number` for each group_no. For hybrid veneer, groups in `hybrid_group_no.group_no` also map to the same `photo_number` (single bulk query with `$or` on group_no and hybrid_group_no.group_no).

### Join Diagram (conceptual)

```
issues_for_pressing
    └── group_no  →  photos.group_no  →  photo_number          (Photo No column)
    └── group_no  →  pressing_done_details.group_no
                         ├── order_id (when issued_for=ORDER)  →  orders.order_no  (Order No column)
                         ├── sqm + pressing_date in period     (Pressing received SqMtr)
                         └── _id  →  pressing_damage           (Pressing Waste SqMtr)
```

---

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-group-wise \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### With optional filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-pressing-stock-register-group-wise \
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

const generatePressingStockRegisterReport2 = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-pressing-stock-register-group-wise',
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

- **Order No** shows `orders.order_no` when `pressing_done_details.issued_for` = ORDER, else empty. Resolved via pressing_done_details.order_id → orders._id → orders.order_no. When issued_for is STOCK or SAMPLE, Order No is blank.
- **Pressing received** and **Pressing Waste** are attributed to the primary `group_no` field of `pressing_done_details`. Groups that appear only in `group_no_array` (secondary groups in a multi-group pressing run) are not credited in this report.
- **Photo No** defaults to empty string if no `photos` document exists for the group_no. For hybrid veneer, groups listed in `photos.hybrid_group_no` also resolve to the same photo_number.
- **Issued Thickness** vs **Received Thickness**: Issued Thickness comes from `issues_for_pressing` when dimensions match (covers issued-but-not-pressed items); fallback from `pressing_done_consumed_items_details.group_details` when dimension mismatch. Received Thickness is from `pressing_done_details` (pressed output). Issued for pressing SqMtr includes all items issued in the period, including those not yet pressed.
- All rows from `issues_for_pressing` (all time) form the universe of groups. Rows with all-zero metrics are excluded.
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `Pressing-Stock-Register-Group-Wise-{timestamp}.xlsx`

**Example**: `Pressing-Stock-Register-Group-Wise-1738234567890.xlsx`

---

## Report Example Structure

```
Pressing Item Stock Register between group no wise 01/03/2025 and 31/03/2025

Item Name        | Group no | Photo No | Order No | Issued Thickness | Received Thickness | Size        | Opening SqMtr | Issued for pressing SqMtr | Pressing received Sqmtr | Pressing Waste SqMtr | Closing SqMtr
AMERICAN WALNUT  | G-001    | AW-P-01  | PR-2025  | 0.50              | 0.50               | 2440 X 1220 | 12.56         | 8.00                      | 6.00                    | 0.20                 | 12.56
AMERICAN WALNUT  | G-002    | AW-P-02  | PR-2025  | 0.50              | 0.50               | 2440 X 610  | 4.20          | 3.10                      | 2.80                    | 0.05                 | 4.20
AMERICAN WALNUT  | Total    |          |          |                     |                  |             | 16.76         | 11.10                     | 8.80                    | 0.25                 | 16.76
...
Total            |          |          |          |                     |                  |             | ...           | ...                       | ...                     | ...                  | ...
```

---

## Troubleshooting

### No Data Found

If you receive a 404 error, verify:

- The dates are correct and in YYYY-MM-DD format.
- There is data in `issues_for_pressing`. The report fetches distinct groups from all-time history (not filtered by the report period), so data must exist in `issues_for_pressing` regardless of date.
- If a filter is used, the `item_name` exists in `issues_for_pressing`.

### All Rows Zero

A row is dropped if every numeric column is 0 (opening, issued, received, waste, closing all zero). This happens when the group has no pressing activity and no current available stock.

### Photo No / Order No is blank

- **Photo No**: Check that a `photos` document exists with `group_no` or `hybrid_group_no.group_no` matching the pressing group and that `photo_number` is set. For hybrid veneer, the second group may appear only in `hybrid_group_no`.
- **Order No**: Check that `pressing_done_details` has a document with `group_no` matching the pressing group, `issued_for` = ORDER, and `order_id` set. The order must exist in `orders` with a valid `order_no`.

### Incorrect Date Format

Dates must be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-03-01"`).

---

## Technical Implementation

### Controller Location

```
topl_backend/controllers/reports2/Pressing/pressingStockRegisterReport2.js
```

### Excel Generator Location

```
topl_backend/config/downloadExcel/reports2/Pressing/pressingStockRegisterReport2.js
```

### Routes Location

```
topl_backend/routes/report/reports2/Pressing/pressing.routes.js
```

### Plan (design and implementation steps)

See [PRESSING_STOCK_REGISTER_REPORT2_PLAN.md](./PRESSING_STOCK_REGISTER_REPORT2_PLAN.md) in this folder.

For how data is gathered, which collections/fields are used, and the exact formulas, see **[How the Data Is Brought Together](#how-the-data-is-brought-together)** above.
