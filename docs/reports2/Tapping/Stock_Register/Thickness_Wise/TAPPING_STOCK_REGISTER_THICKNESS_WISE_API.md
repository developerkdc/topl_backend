# Tapping Stock Register Thickness Wise — API Documentation

## Endpoint

```
POST /api/V1/report/download-excel-tapping-stock-register-thickness-wise
```

## Description

Generates an Excel file for the **Splicing Item Stock Register sales name - thickness wise** report.

This report extends the "sales name wise" stock register by grouping at the individual log level, adding **Thickness**, **Log No**, and **Date** columns to provide a row-per-log breakdown of opening balance, tapping received (hand / machine), issue to pressing, process waste, sales, and closing balance for each spliced item.

---

## Request

### Headers

| Key          | Value              |
| ------------ | ------------------ |
| Content-Type | application/json   |

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
  "message": "Tapping stock register (thickness wise) generated successfully",
  "data": "https://<APP_URL>/public/reports/Tapping/tapping_stock_register_thickness_wise_<timestamp>.xlsx"
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
| 1   | `Report -1` |
| 2   | `Splicing Item Stock Register sales name - thickness wise - DD/MM/YYYY and DD/MM/YYYY` |

### Column Layout (12 columns, 2-row header)

| Col | Header Row 1       | Header Row 2   | Data Source                         |
| --- | ------------------ | -------------- | ------------------------------------ |
| 1   | Item Name ↕        | (merged)       | `tapping_done_items_details.item_sub_category_name` |
| 2   | Sales Item Name ↕  | (merged)       | `tapping_done_items_details.item_name` |
| 3   | Thickness ↕        | (merged)       | `tapping_done_items_details.thickness` |
| 4   | Log No ↕           | (merged)       | `tapping_done_items_details.log_no_code` |
| 5   | Date ↕             | (merged)       | `tapping_done_other_details.tapping_date` (earliest for log) |
| 6   | Opening Balance ↕  | (merged)       | Calculated: `currentAvailable + issuePressing − tappingReceived` |
| 7–8 | Tapping →         | Hand Splice / Machine Splice | `tapping_done_items_details.sqm` filtered by `splicing_type` |
| 9   | Issue              | Pressing       | `tapping_done_history.sqm` |
| 10  | Process Waste ↕   | (merged)       | `issue_for_tapping_wastage.sqm` |
| 11  | Sales ↕           | (merged)       | `0` (placeholder) |
| 12  | Closing Balance ↕ | (merged)       | Calculated: `openingBalance + tappingReceived − issuePressing − processWaste − sales` |

---

## Data Sources

| Column              | Collection                      | Field / Notes                                         |
| ------------------- | ------------------------------- | ----------------------------------------------------- |
| Item Name           | `tapping_done_items_details`    | `item_sub_category_name`                              |
| Sales Item Name     | `tapping_done_items_details`    | `item_name`                                           |
| Thickness           | `tapping_done_items_details`    | `thickness`                                           |
| Log No              | `tapping_done_items_details`    | `log_no_code`                                         |
| Date                | `tapping_done_other_details`    | `tapping_date` (min date for that log in the period)  |
| Opening Balance     | Calculated                      | `currentAvailable + issuePressing − tappingReceived`  |
| Tapping (Hand)      | `tapping_done_items_details`    | `sqm` where `splicing_type` IN ['HAND','HAND SPLICING'] |
| Tapping (Machine)   | `tapping_done_items_details`    | `sqm` where `splicing_type` IN ['MACHINE','MACHINE SPLICING'] |
| Issue → Pressing    | `tapping_done_history`          | `sqm` where `createdAt` in range; matched by item, thickness, log_no_code |
| Process Waste       | `issue_for_tapping_wastage`     | `sqm` joined to `issue_for_tappings` for item filter  |
| Sales               | —                               | `0` placeholder                                       |
| Closing Balance     | Calculated                      | `openingBalance + tappingReceived − issuePressing − processWaste − sales` |

---

## Controller File

```
controllers/reports2/Tapping/Stock_Register/tappingStockRegisterThicknessWise.js
```

## Excel Generator File

```
config/downloadExcel/reports2/Tapping/Stock_Register/tappingStockRegisterThicknessWise.js
```

## Route File

```
routes/report/reports2/Tapping/tapping.routes.js
```
