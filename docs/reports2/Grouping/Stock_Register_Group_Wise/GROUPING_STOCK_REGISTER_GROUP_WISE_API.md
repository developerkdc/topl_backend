# Grouping Stock Register Group Wise — API Reference

## Endpoint

```
POST /report/download-excel-grouping-stock-register-group-wise
```

---

## Description

Generates and downloads an Excel report for the **Grouping Stock Register (Group Wise)**.

This is the most consolidated of the four grouping stock registers. It groups data by **item group + thickness only** (no date or log code), giving a high-level view of stock movement per item category and thickness combination.

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
| Row 3      | Header row (gray fill, bold, centered)                                  |
| Row 4+     | Data rows — one per unique (item_group_name, thickness)                 |
| Last row   | **Total** row (yellow fill `FFFFD700`, bold)                            |

### Columns (9)

| # | Column Name        | Format | Source                                     |
|---|--------------------|--------|--------------------------------------------|
| 1 | Item Group Name    | text   | `items.item_sub_category_name`             |
| 2 | Thickness          | 0.00   | `items.thickness`                          |
| 3 | Opening Balance    | 0.00   | Computed (see Balance Formulas)            |
| 4 | Grouping Done      | 0.00   | `SUM(items.no_of_sheets)`                  |
| 5 | Issue for tapping  | 0.00   | `SUM(history.no_of_sheets)` where `issue_status = 'tapping'` |
| 6 | Issue for Challan  | 0.00   | `SUM(history.no_of_sheets)` where `issue_status = 'challan'` |
| 7 | Issue Sales        | 0.00   | `SUM(history.no_of_sheets)` where `issue_status = 'order'`   |
| 8 | Damage             | 0.00   | `SUM(items.no_of_sheets)` where `is_damaged = true`          |
| 9 | Closing Balance    | 0.00   | Computed (see Balance Formulas)            |

---

## Balance Formulas

```
issued_in_period = issue_tapping + issue_challan + issue_sales
opening_balance  = current_available + issued_in_period − grouping_done
closing_balance  = opening_balance + grouping_done − issue_tapping − issue_challan − issue_sales − damage
```

Where `current_available = SUM(items.available_details.no_of_sheets)`.

Balances may be negative.

---

## Data Sources (Collections)

| Collection                    | Role                                              |
|-------------------------------|---------------------------------------------------|
| `grouping_done_details`       | Session records (date range filter applied here)  |
| `grouping_done_items_details` | Item records linked to sessions                   |
| `grouping_done_history`       | Issue records per item (tapping / challan / order)|

---

## Row Granularity

One row per unique **(item_sub_category_name, thickness)**.

Sort order: `item_sub_category_name ASC → thickness ASC`.

---

## Comparison of All Grouping Stock Registers

| Register           | Cols | Row Key                              | Endpoint suffix                              |
|--------------------|------|--------------------------------------|----------------------------------------------|
| Date-wise          | 12   | group, name, date, log, thickness    | `grouping-stock-register`                    |
| Thickness-wise     | 10   | group, name, thickness               | `grouping-stock-register-thickness-wise`     |
| **Group-wise**     | **9**| **group, thickness**                 | **`grouping-stock-register-group-wise`**     |
