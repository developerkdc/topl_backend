# Tapping Item Stock Register Thickness Wise (Report -2) — API Documentation

## Endpoint

```
POST /api/V1/report/download-excel-tapping-item-stock-register-thickness-wise
```

## Description

Generates an Excel file for the **Splicing Item Stock Register thickness wise** report (Report -2).

This is a simplified variant of Report -1 (`tappingStockRegisterThicknessWise`). It removes the "Sales Item Name" column and groups records by `(item_sub_category_name, thickness, log_no_code)` only — without breaking down by `item_name`. This gives a per-log stock breakdown per item category.

---

## Request

### Headers

| Key          | Value            |
| ------------ | ---------------- |
| Content-Type | application/json |

### Body

```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```

| Field     | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| startDate | string | Yes      | Period start date (YYYY-MM-DD) |
| endDate   | string | Yes      | Period end date (YYYY-MM-DD)   |

---

## Response

### Success — `200 OK`

```json
{
  "statusCode": 200,
  "message": "Tapping item stock register (thickness wise) generated successfully",
  "data": "https://<APP_URL>/public/reports/Tapping/tapping_item_stock_register_thickness_wise_<timestamp>.xlsx"
}
```

### No Data — `404 Not Found`

```json
{
  "statusCode": 404,
  "message": "No tapping stock data found for the selected period"
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

## Excel Report Structure

### Titles

| Row | Content |
| --- | ------- |
| 1   | `Report -2` |
| 2   | `Splicing Item Stock Register thickness wise - DD/MM/YYYY and DD/MM/YYYY` |

### Column Layout (11 columns, 2-row header)

| Col | Header Row 1       | Header Row 2         | Data Source |
| --- | ------------------ | -------------------- | ----------- |
| 1   | Item Name ↕        | (merged)             | `tapping_done_items_details.item_sub_category_name` |
| 2   | Thickness ↕        | (merged)             | `tapping_done_items_details.thickness` |
| 3   | Log No ↕           | (merged)             | `tapping_done_items_details.log_no_code` |
| 4   | Date ↕             | (merged)             | `tapping_done_other_details.tapping_date` (earliest for log) |
| 5   | Opening Balance ↕  | (merged)             | Calculated: `currentAvailable + issuePressing + sales − tappingReceived` |
| 6–7 | Tapping →          | Hand / Machine Splice | `tapping_done_items_details.sqm` filtered by `splicing_type` |
| 8   | Issue              | Pressing             | `tapping_done_history.sqm` where `issued_for` STOCK/SAMPLE OR (ORDER AND `order_category`≠RAW) |
| 9   | Process Waste ↕    | (merged)             | `issue_for_tapping_wastage.sqm` |
| 10  | Sales ↕            | (merged)             | `tapping_done_history.sqm` where `issued_for` ORDER AND `order_category`=RAW |
| 11  | Closing Balance ↕  | (merged)             | Calculated: `openingBalance + tappingReceived − issuePressing − processWaste − sales` |

---

## Comparison with Report -1

| Feature             | Report -1 (Thickness Wise)                      | Report -2 (Item Thickness Wise)               |
| ------------------- | ----------------------------------------------- | --------------------------------------------- |
| Title label         | `Report -1`                                     | `Report -2`                                   |
| Title string        | `...sales name - thickness wise`                | `...thickness wise`                           |
| Columns             | 12 (includes Sales Item Name)                   | 11 (no Sales Item Name)                       |
| Group key           | `(item_sub_category_name, item_name, thickness, log_no_code)` | `(item_sub_category_name, thickness, log_no_code)` |
| Process Waste match | by `item_sub_category_name` + `item_name`       | by `item_sub_category_name` only              |

---

## Data Sources

| Column              | Collection                      | Field / Notes                                         |
| ------------------- | ------------------------------- | ----------------------------------------------------- |
| Item Name           | `tapping_done_items_details`    | `item_sub_category_name`                              |
| Thickness           | `tapping_done_items_details`    | `thickness`                                           |
| Log No              | `tapping_done_items_details`    | `log_no_code`                                         |
| Date                | `tapping_done_other_details`    | `tapping_date` (min date for that log)                |
| Opening Balance     | Calculated                      | `currentAvailable + issuePressing + sales − tappingReceived`  |
| Tapping (Hand)      | `tapping_done_items_details`    | `sqm` where `splicing_type` IN ['HAND','HAND SPLICING'] |
| Tapping (Machine)   | `tapping_done_items_details`    | `sqm` where `splicing_type` IN ['MACHINE','MACHINE SPLICING'] |
| Issue → Pressing    | `tapping_done_history`          | `sqm` where `createdAt` in range; `issued_for` STOCK/SAMPLE OR (ORDER AND `order_category`≠RAW); matched by `(item_sub_category_name, thickness, log_no_code)` |
| Process Waste       | `issue_for_tapping_wastage`     | `sqm` joined to `issue_for_tappings`; match by `(item_sub_category_name, thickness, log_no_code)` |
| Sales               | `tapping_done_history`          | `sqm` where `issued_for` ORDER AND `order_category`=RAW; `createdAt` in range |
| Closing Balance     | Calculated                      | `openingBalance + tappingReceived − issuePressing − processWaste − sales` |

---

## Controller File

```
controllers/reports2/Tapping/Stock_Register/tappingItemStockRegisterThicknessWise.js
```

## Excel Generator File

```
config/downloadExcel/reports2/Tapping/Stock_Register/tappingItemStockRegisterThicknessWise.js
```

## Route File

```
routes/report/reports2/Tapping/tapping.routes.js
```
