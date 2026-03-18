# Tapping Stock Register API

## Overview

The Tapping Stock Register API generates an Excel "Splicing Item Stock Register sales name wise" report for a given date range. It shows stock movement for each tapping item, broken down into Tapping received (Hand Splice and Machine Splice), Issue to Pressing, Process Waste, Sales (from raw-order issues), and calculates Opening and Closing Balances.

The existing `TappingORClipping` stock register (`/download-excel-tapping-or-clipping-stock-register`) is unchanged.

## Endpoint

```
POST /report/download-excel-tapping-stock-register
```

Full path: `POST /api/V1/report/download-excel-tapping-stock-register`

## Authentication

- Requires: Standard report authentication (as per reports2 pattern)

## Request Body

### Required Parameters

```json
{
  "startDate": "2026-01-31",
  "endDate": "2026-02-11"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format (inclusive) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Tapping stock register generated successfully",
  "result": "http://localhost:5000/public/reports/Tapping/tapping_stock_register_1738234567890.xlsx"
}
```

### Error Responses

#### 400 Bad Request – Missing dates
```json
{ "statusCode": 400, "success": false, "message": "Start date and end date are required" }
```

#### 400 Bad Request – Invalid date format
```json
{ "statusCode": 400, "success": false, "message": "Invalid date format. Use YYYY-MM-DD" }
```

#### 400 Bad Request – Invalid date range
```json
{ "statusCode": 400, "success": false, "message": "Start date cannot be after end date" }
```

#### 404 Not Found – No data
```json
{ "statusCode": 404, "success": false, "message": "No tapping data found" }
```

#### 404 Not Found – All rows zero
```json
{ "statusCode": 404, "success": false, "message": "No tapping stock data found for the selected period" }
```

---

## Report Structure

### Title Row
```
Splicing Item Stock Register sales name wise - DD/MM/YYYY and DD/MM/YYYY
```

### Column Headers (2-row)

| Header Row | Cols 1–3 | Cols 4–5 | Col 6 | Col 7 | Col 8 | Col 9 |
|------------|----------|----------|-------|-------|-------|-------|
| Row 1 | Item Name \| Sales Item Name \| Opening Balance | `Tapping` ← merged | `Issue` | Process Waste | Sales | Closing Balance |
| Row 2 | ↕ merged down | Hand Splice \| Machine Splice | Pressing | ↕ | ↕ | ↕ |

### Column Definitions

| # | Column | Source | Notes |
|---|--------|--------|-------|
| 1 | Item Name | `tapping_done_items_details.item_sub_category_name` | Item category/group |
| 2 | Sales Item Name | `tapping_done_items_details.item_name` | Specific item |
| 3 | Opening Balance | Calculated | `currentAvailable + issuePressing + sales − tappingReceived` |
| 4 | Hand Splice | `tapping_done_items_details` + `tapping_done_other_details` | sqm in period, splicing_type = HAND |
| 5 | Machine Splice | Same join | sqm in period, splicing_type = MACHINE |
| 6 | Pressing | `tapping_done_history` | sqm issued to pressing (excl. order+RAW); `issued_for` STOCK/SAMPLE OR (ORDER AND `order_category`≠RAW) |
| 7 | Process Waste | `issue_for_tapping_wastage` + `issue_for_tappings` | wastage sqm in period |
| 8 | Sales | `tapping_done_history` | sqm where `issued_for` ORDER AND `order_category`=RAW |
| 9 | Closing Balance | Calculated | `Opening + Hand + Machine − Pressing − ProcessWaste − Sales` |

### Data Rows

- One row per distinct **(item_sub_category_name, item_name)** that exists in `tapping_done_items_details`.
- Sorted by Item Name (sub_category_name) then Sales Item Name.
- Rows where all numeric values are 0 are excluded.
- Negative balances are shown in parentheses (Excel format `0.00;(0.00)`).

### Total Row

Last row is **Total**, with sums of all numeric columns (cols 3–9).

---

## How Data Is Brought Together

### 1. Report Period
- `start`: `new Date(startDate)` at 00:00:00.000
- `end`: `new Date(endDate)` at 23:59:59.999

### 2. Which Rows Appear
Distinct `(item_sub_category_name, item_name)` from `tapping_done_items_details` (all records, not filtered to the period). All-zero rows are then dropped.

### 3. Per-Row Aggregates (6 parallel queries per item pair)

| Quantity | Collection(s) | Filter | Meaning |
|----------|--------------|--------|---------|
| currentAvailable | `tapping_done_items_details` | Match item | SUM of `available_details.sqm` — current stock in tapping |
| tappingHand | `tapping_done_items_details` + `tapping_done_other_details` | Join; `tapping_date` in range; `splicing_type IN ['HAND','HAND SPLICING']` | SQM received via hand splicing in period |
| tappingMachine | Same join | `splicing_type IN ['MACHINE','MACHINE SPLICING']` | SQM received via machine splicing in period |
| issuePressing | `tapping_done_history` | `createdAt` in range, match item; `issued_for` STOCK/SAMPLE OR (ORDER AND `order_category`≠RAW) | SQM issued to pressing (excl. order+RAW) |
| sales | `tapping_done_history` | `createdAt` in range, match item; `issued_for` ORDER AND `order_category`=RAW | SQM issued for raw orders (Sales) |
| processWaste | `issue_for_tapping_wastage` + `issue_for_tappings` | Wastage `createdAt` in range; match item via lookup | Wastage SQM in period |

### 4. Balance Formulas

```
tappingReceived = tappingHand + tappingMachine

Opening Balance  = currentAvailable + issuePressing + sales − tappingReceived
Closing Balance  = Opening + tappingReceived − issuePressing − processWaste − sales
```

This derives Opening by "reversing" the period's activity on the current stock snapshot:
- Add back what was issued out (issuePressing + sales)
- Subtract what was received (tappingReceived)

Closing then applies all movements to Opening.

---

## Database Collections Used

| Collection | Role |
|-----------|------|
| `tapping_done_items_details` | Item-level tapping records; provides distinct item pairs and current available stock |
| `tapping_done_other_details` | Session header; provides `tapping_date` and `splicing_type` for Hand/Machine split |
| `tapping_done_history` | Records of items issued to pressing |
| `issue_for_tapping_wastage` | Wastage records at tapping stage |
| `issue_for_tappings` | Issue master; used to match wastage records to item_name |

```
tapping_done_items_details  ──→  tapping_done_other_details  (tapping_date, splicing_type)
tapping_done_history        ──→  issued to pressing
issue_for_tapping_wastage   ──→  issue_for_tappings  (item filter for wastage)
```

---

## Technical Implementation

### Controller
```
topl_backend/controllers/reports2/Tapping/Stock_Register/tappingStockRegister.js
```

### Excel Generator
```
topl_backend/config/downloadExcel/reports2/Tapping/Stock_Register/tappingStockRegister.js
```

### Routes
```
topl_backend/routes/report/reports2/Tapping/tapping.routes.js
```
Endpoint added: `POST /download-excel-tapping-stock-register`

---

## File Storage

**Directory:** `public/reports/Tapping/`

**Filename pattern:** `tapping_stock_register_{timestamp}.xlsx`

---

## Example Usage

### cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-tapping-stock-register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "startDate": "2026-01-31", "endDate": "2026-02-11" }'
```

### JavaScript (Axios)
```javascript
const response = await axios.post(
  '/api/V1/report/download-excel-tapping-stock-register',
  { startDate: '2026-01-31', endDate: '2026-02-11' },
  { headers: { Authorization: `Bearer ${token}` } }
);
window.open(response.data.result, '_blank');
```

---

## Troubleshooting

### All Values Zero / 404
- Verify `startDate`/`endDate` are in YYYY-MM-DD format and the range is correct.
- Check that tapping sessions have `tapping_date` and `splicing_type` populated.
- Confirm `tapping_done_history` records exist for pressing issues in the period.

### Hand/Machine Split All Zero
- Check that `splicing_type` on `tapping_done_other_details` uses `'HAND'`, `'HAND SPLICING'`, `'MACHINE'`, or `'MACHINE SPLICING'` (case-sensitive match).

### Process Waste Zero
- Verify `issue_for_tapping_wastage` documents exist for the period and that `issue_for_tapping_item_id` correctly references `issue_for_tappings`.

### Sales Column Always Zero
- `Sales` comes from `tapping_done_history` where `issued_for` = ORDER and `order_category` = RAW. Verify that raw-order issues create history with `order_category: 'RAW'` and that the report date range includes those records.
