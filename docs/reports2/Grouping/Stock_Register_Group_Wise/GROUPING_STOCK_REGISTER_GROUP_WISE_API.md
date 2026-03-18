# Grouping Stock Register Group Wise — API Reference

## Endpoint

```
POST /report/download-excel-grouping-stock-register-group-wise
```

---

## Description

Generates and downloads an Excel report for the **Grouping Stock Register (Group Wise)**.

This is the most consolidated of the four grouping stock registers. It groups data by **item group + thickness only** (no date or log code), giving a high-level view of stock movement per item category and thickness combination. Each quantity is shown in **two columns: (Sheets)** and **(SQM)** (pair layout). A **Total** row appears at the bottom.

---

## Request

### Headers

| Header         | Value              | Required |
|----------------|--------------------|----------|
| `Content-Type` | `application/json` | Yes      |

### Body Parameters

| Field       | Type   | Required | Description                         | Example        |
|-------------|--------|----------|-------------------------------------|----------------|
| `startDate` | string | Yes      | Start of the date range (YYYY-MM-DD) | `"2025-07-01"` |
| `endDate`   | string | Yes      | End of the date range (YYYY-MM-DD)   | `"2026-02-12"` |

### Example Request

```json
{
  "startDate": "2025-07-01",
  "endDate": "2026-02-12"
}
```

---

## Response

### Success — `200 OK`

```json
{
  "statusCode": 200,
  "message": "Grouping stock register (group wise) generated successfully",
  "data": "http://your-app-url/public/reports/Grouping/grouping_stock_register_group_wise_<timestamp>.xlsx"
}
```

The `data` field is a direct download URL for the generated Excel file.

### No Data — `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "No grouping data found for the selected period"
}
```

### Validation Error — `400 Bad Request`

```json
{
  "statusCode": 400,
  "message": "Start date and end date are required"
}
```

---

## Excel Report Layout

### File Details

| Property  | Value                                                        |
|-----------|--------------------------------------------------------------|
| Directory | `public/reports/Grouping/`                                   |
| Filename  | `grouping_stock_register_group_wise_{timestamp}.xlsx`        |
| Sheet     | `Grouping Stock Register`                                    |

### Row Structure

| Row        | Content                                                                 |
|------------|-------------------------------------------------------------------------|
| Row 1      | Title: `Grouping Item Stock Register between DD/MM/YYYY and DD/MM/YYYY` (bold, merged, size 12) |
| Row 2      | Blank                                                                   |
| Row 3      | Super-header (quantity names merged over Sheets+SQM pairs), gray fill, bold, centered |
| Row 4      | Sub-header ("Sheets" and "SQM" under each quantity), gray fill, bold, centered |
| Row 5+     | Data rows — one per unique (item_group_name, thickness)                 |
| Last row   | **Total** row (gray fill, bold)                                        |

### Two-level Header (16 columns, gray fill, bold)

**Row 1 (super-header):** Cols 1–2 = Item Group Name, Thickness. Cols 3–16 = seven quantity names, each **merged over 2 columns** (Sheets + SQM): Opening Balance, Grouping Done, Issue for tapping, Issue for Challan, Issue Sales, Damage, Closing Balance.

**Row 2 (sub-header):** Cols 1–2 = blank. Cols 3–16 = "Sheets" and "SQM" repeated under each quantity.

### Columns (16)

| # | Column (logical)             | Format | Source                                     |
|---|------------------------------|--------|--------------------------------------------|
| 1 | Item Group Name              | text   | `items.item_sub_category_name`             |
| 2 | Thickness                    | 0.00   | `items.thickness`                          |
| 3 | Opening Balance (Sheets)     | 0.00   | Computed (see Balance Formulas)            |
| 4 | Opening Balance (SQM)       | 0.00   | Computed (see Balance Formulas)            |
| 5 | Grouping Done (Sheets)       | 0.00   | `SUM(items.no_of_sheets)`                  |
| 6 | Grouping Done (SQM)          | 0.00   | `SUM(items.sqm)`                           |
| 7 | Issue for tapping (Sheets)   | 0.00   | `SUM(history)` where `issue_status='tapping'` OR `issued_for` in `['STOCK','SAMPLE']` OR (`issue_status='order'` AND `order_category!='RAW'`) |
| 8 | Issue for tapping (SQM)      | 0.00   | Same as above (sqm) |
| 9 | Issue for Challan (Sheets)   | 0.00   | `SUM(history.no_of_sheets)` where `issue_status = 'challan'` |
|10 | Issue for Challan (SQM)      | 0.00   | `SUM(history.sqm)` where `issue_status = 'challan'` |
|11 | Issue Sales (Sheets)         | 0.00   | `SUM(history.no_of_sheets)` where `issue_status='order'` AND `order_category='RAW'`   |
|12 | Issue Sales (SQM)            | 0.00   | `SUM(history.sqm)` where `issue_status='order'` AND `order_category='RAW'`   |
|13 | Damage (Sheets)              | 0.00   | `SUM(items.no_of_sheets)` where `is_damaged = true`          |
|14 | Damage (SQM)                 | 0.00   | `SUM(items.sqm)` where `is_damaged = true`          |
|15 | Closing Balance (Sheets)     | 0.00   | Computed (see Balance Formulas)            |
|16 | Closing Balance (SQM)        | 0.00   | Computed (see Balance Formulas)            |

---

## Balance Formulas

**Sheets:**
```
issued_in_period = issue_tapping + issue_challan + issue_sales
opening_balance  = current_available + issued_in_period − grouping_done
closing_balance  = opening_balance + grouping_done − issue_tapping − issue_challan − issue_sales − damage
```

**SQM:** Same logic using SQM sources:
```
issued_in_period_sqm = issue_tapping_sqm + issue_challan_sqm + issue_sales_sqm
opening_balance_sqm  = current_available_sqm + issued_in_period_sqm − grouping_done_sqm
closing_balance_sqm  = opening_balance_sqm + grouping_done_sqm − issue_tapping_sqm − issue_challan_sqm − issue_sales_sqm − damage_sqm
```

Where `current_available = SUM(items.available_details.no_of_sheets)` and `current_available_sqm = SUM(items.available_details.sqm)`.

Balances may be negative.

---

## Data Sources (Collections)

| Collection                    | Role                                                                              |
|-------------------------------|-----------------------------------------------------------------------------------|
| `grouping_done_details`       | Session records (date range filter applied here)                                 |
| `grouping_done_items_details` | Item records linked to sessions (no_of_sheets, sqm, available_details, is_damaged)|
| `grouping_done_history`       | Issue records per item (tapping / challan / order); no_of_sheets, sqm            |

---

## Row Granularity

One row per unique **(item_sub_category_name, thickness)**.

Sort order: `item_sub_category_name ASC → thickness ASC`.

---

## Comparison of All Grouping Stock Registers

| Register           | Cols | Row Key                              | Endpoint suffix                              |
|--------------------|------|--------------------------------------|----------------------------------------------|
| Date-wise          | 19   | group, name, date, log, thickness    | `grouping-stock-register`                    |
| Thickness-wise     | 10   | group, name, thickness               | `grouping-stock-register-thickness-wise`     |
| **Group-wise**     | **16**| **group, thickness**                 | **`grouping-stock-register-group-wise`**     |
