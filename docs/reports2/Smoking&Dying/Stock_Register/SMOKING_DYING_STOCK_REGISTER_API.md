# Smoking&Dying Stock Register API

## Overview

The Smoking&Dying Stock Register API generates an Excel report with the **same layout as the Smoking&Dying Daily Report**: main table (Item Name, LogX merged per log group, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, PROCESS, Process color, Character, Pattern, Series, Remarks); subtotal rows per item; Grand Total row; and Summary section (ITEM NAME, RECEIVED MTR., PROCESS NAME, LEAVE, PRODUCTION SQ. MTR). The only difference is that the Stock Register is filtered by a **date range** (startDate–endDate) instead of a single date.

The report uses its own route, controller, and Excel generator; it does not call the Daily report.

## Endpoint

```
POST /api/V1/report/download-excel-smoking-dying-stock-register
```

## Request Body

### Required Parameters

Request body can use either `filters` (recommended) or top-level dates:

```json
{
  "filters": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

Alternatively (supported for backward compatibility):

```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

| Parameter   | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| startDate  | String | Yes      | Start date in YYYY-MM-DD format      |
| endDate    | String | Yes      | End date in YYYY-MM-DD format        |

## Response

### Success Response (200 OK)

```json
{
  "result": "http://localhost:5000/public/reports/SmokingDying/smoking_dying_stock_register_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Smoking & dying stock register generated successfully"
}
```

### Error Responses

#### 400 Bad Request – Missing Parameters

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request – Invalid Date Format

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request – Invalid Date Range

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No smoking & dying data found for the selected period"
}
```

---

## Report Structure

The generated Excel has the **same structure as the Daily report**, with the title showing the date range.

### Row 1: Report Title

**Format:**
```
Smoking Details Report Date: DD/MM/YYYY - DD/MM/YYYY
```

**Example:**
```
Smoking Details Report Date: 01/01/2025 - 31/01/2025
```

### Row 2: Empty (spacing)

### Row 3: Main Data Headers (single line)

| # | Column        | Description                                      |
|---|---------------|--------------------------------------------------|
| 1 | Item Name     | Original item name                               |
| 2 | LogX          | Log identifier code (merged per log group)       |
| 3 | Bundle No     | Bundle number                                    |
| 4 | ThickneSS     | Thickness                                        |
| 5 | Length        | Length                                           |
| 6 | Width         | Width                                            |
| 7 | Leaves        | Number of leaves                                 |
| 8 | Sq Mtr        | Square meters                                    |
| 9 | PROCESS       | Process name                                     |
|10 | Process color | Color name                                       |
|11 | Character     | Character name                                   |
|12 | Pattern       | Pattern name                                     |
|13 | Series        | Series name                                      |
|14 | Remarks       | Remarks                                          |

### Data Rows

- One row per bundle; all sessions with `process_done_date` in the selected date range are listed.
- **Columns 1–2:** Item Name and LogX are **merged vertically** for each contiguous group that share the same log (same process_done_id + same log_no_code).
- **Columns 3–14:** Bundle No through Remarks vary per row.

### Subtotal Rows

- After each item group, a row with label **TOTAL** and sum of Leaves (column 7) and Sq Mtr (column 8) for that item.

### Grand Total Row

- Label **TOTAL**; Column 7 = total leaves; Column 8 = sum of all Sq Mtr.

### Summary Section (SUMMERY)

**Headers:** ITEM NAME | RECEIVED MTR. | PROCESS NAME | LEAVE | PRODUCTION SQ. MTR

**Data:** One row per unique item name. RECEIVED MTR. equals PRODUCTION SQ. MTR (same value per item). PROCESS NAME from first occurrence per item.

**TOTAL row:** Overall sum of LEAVE and PRODUCTION SQ. MTR; RECEIVED MTR. equals total PRODUCTION SQ. MTR.

---

## How Data Is Brought Together

### Step 1: Aggregation (Controller)

1. **Source collection:** `process_done_details`.
2. **Filter ($match):** `process_done_date` between start of `startDate` (00:00:00.000) and end of `endDate` (23:59:59.999).
3. **Attach items ($lookup):** From `process_done_items_details` on `process_done_id` = `_id`.
4. **One row per bundle ($unwind** on `items`, **preserveNullAndEmptyArrays: false**).
5. **Sort:** By `items.item_name`, `items.log_no_code`, `items.bundle_number`.
6. **Project:** Flat shape (process_done_id, item_name, log_no_code, bundle_number, thickness, length, width, no_of_leaves, sqm, process_name, color_name, character_name, pattern_name, series_name, remark).

**Result:** Array of flat objects, one per bundle, ordered by item_name, log_no_code, bundle_number.

### Step 2: Excel Generation (Config)

- **Input:** Aggregated rows, `startDate`, `endDate`.
- **Title:** "Smoking Details Report Date: " + formatted startDate + " - " + formatted endDate (DD/MM/YYYY).
- **Main table, subtotals, Grand Total, Summary section:** Same logic as the Daily report (merge columns 1–2 per log group; RECEIVED MTR. = PRODUCTION SQ. MTR).

---

## Implementation References

- **Controller:** `topl_backend/controllers/reports2/Smoking&Dying/smokingDyingStockRegister.js`
- **Excel config:** `topl_backend/config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js`
- **Routes:** `topl_backend/routes/report/reports2/Smoking&Dying/smoking_dying.routes.js`
- **Plan:** [SMOKING_DYING_STOCK_REGISTER_PLAN.md](./SMOKING_DYING_STOCK_REGISTER_PLAN.md)

## File Storage

**Directory:** `public/reports/SmokingDying/`

**Filename pattern:** `smoking_dying_stock_register_{timestamp}.xlsx`

## Notes

- Report layout is identical to the Smoking&Dying Daily Report; only the date filter (range vs single date) and title format differ.
- This report does not use the Daily report’s route, controller, or Excel generator.
