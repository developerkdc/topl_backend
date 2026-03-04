# Log Wise Flitch Report API Documentation

## Overview

The Log Wise Flitch Report API generates a comprehensive Excel report that tracks the complete journey of individual flitch logs from inward receipt through crosscutting, slicing, peeling, and sales. The report displays one row per log number with grouping by item name, showing movements and balances for a specified date range.

## API Endpoint

**POST** `/api/V1/reports2/flitch/download-excel-log-wise-flitch-report`

## Request Body

```json
{
  "startDate": "2025-02-28",
  "endDate": "2025-05-29",
  "filter": {
    "item_name": "AMERICAN WALNUT"  // Optional
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by specific item name (uppercase) |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Log wise flitch report generated successfully",
  "result": "http://localhost:8765/public/upload/reports/reports2/Flitch/LogWiseFlitch_1738598745123.xlsx"
}
```

### Error Responses

#### 400 Bad Request - Missing Required Parameters

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request - Invalid Date Format

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request - Invalid Date Range

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found - No Data

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No flitch data found for the selected period"
}
```

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "status": "error",
  "message": "Failed to generate report"
}
```

## Report Structure

### Excel File Format

- **File Name**: `LogWiseFlitch_[timestamp].xlsx`
- **Sheet Name**: "Log Wise Flitch Report"

### Report Columns (11 columns)

| Column # | Column Name | Description | Data Type |
|----------|-------------|-------------|-----------|
| 1 | Item Name | Item name (grouped with vertical cell merging) | String |
| 2 | Log No | Individual flitch log number | String |
| 3 | Physical CMT | Physical CMT (same as FLClosing) | Decimal (3 places) |
| 4 | CC Received | Flitch received from crosscutting operations | Decimal (3 places) |
| 5 | Op Bal | Opening balance | Decimal (3 places) |
| 6 | Flitch Received | Flitch received from direct inventory purchases | Decimal (3 places) |
| 7 | FLIssued | Flitch issued for orders/challan/slicing/peeling | Decimal (3 places) |
| 8 | FLClosing | Closing balance | Decimal (3 places) |
| 9 | SQ Received | Slicing received (in SQM) | Decimal (3 places) |
| 10 | UN Received | UnEdge received (placeholder - always 0.000) | Decimal (3 places) |
| 11 | Peel Received | Peeling received (in CMT) | Decimal (3 places) |

### Report Layout

1. **Title Row**: "Logwise Flitch between [DD/MM/YYYY] and [DD/MM/YYYY]"
2. **Empty Row**: Spacing
3. **Header Row**: Column names with gray background
4. **Data Rows**: Grouped by item name
   - Item name cells are vertically merged across all logs for that item
   - Logs sorted alphabetically within each item group
5. **Total Row**: Grand totals with yellow background and bold text

## Data Sources

### Primary Models

1. **Flitch Inventory Items** (`flitch_inventory_items_model`)
   - Direct supplier purchases
   - Collection: `flitch_inventory_items_details`

2. **Flitching Done** (`flitching_done_model`)
   - Factory production (crosscut → flitch)
   - Collection: `flitchings`

3. **Slicing Done Items** (`slicing_done_items_model`)
   - Slicing output from flitch
   - Collection: `slicing_done_items`

4. **Peeling Done Items** (`peeling_done_items_model`)
   - Peeling output from flitch
   - Collection: `peeling_done_items`

## Calculation Logic

### Current Available CMT
Sum of `flitch_cmt` from both inventory and factory where `issue_status` is null

### Flitch Received (Period)
Sum of `flitch_cmt` from `flitch_inventory_items_model` where `invoice.inward_date` is between startDate and endDate

### CC Received (Period)
Sum of `flitch_cmt` from `flitching_done_model` where `worker_details.flitching_date` is between startDate and endDate

### FLIssued (Period)
Sum of `flitch_cmt` from both inventory and factory where:
- `issue_status` IN ['order', 'challan', 'slicing', 'slicing_peeling']
- `updatedAt` is between startDate and endDate

### SQ Received (Period)
Sum of `natural_sqm` from `slicing_done_items_model` where:
- `log_no` matches the flitch log number
- `slicing_details.slicing_date` is between startDate and endDate

### Peel Received (Period)
Sum of `cmt` from `peeling_done_items_model` where:
- `log_no` matches the flitch log number
- `output_type` IN ['face', 'core']
- `peeling_details.peeling_date` is between startDate and endDate

### Opening Balance
```
Opening Balance = Current Available CMT + Total Issued - Total Received in Period
```

### FLClosing (Closing Balance)
```
Closing Balance = Opening Balance + Total Received - Total Issued
```

### Physical CMT
```
Physical CMT = FLClosing (same value)
```

## Business Logic

### Date Filtering
- **Flitch Received**: Filtered by `invoice.inward_date`
- **CC Received**: Filtered by `worker_details.flitching_date`
- **FLIssued**: Filtered by `updatedAt` when `issue_status` changes
- **SQ Received**: Filtered by `slicing_date` from slicing_done_other_details
- **Peel Received**: Filtered by `peeling_date` from peeling_done_other_details

### Grouping and Sorting
1. Data is sorted by `item_name` (alphabetically)
2. Within each item, sorted by `log_no`
3. Item name cells are vertically merged across all logs for that item
4. Only grand totals are shown (no item-level subtotals)

### Active Logs Filter
Logs are included in the report if they have:
- Opening balance > 0, OR
- Flitch received > 0, OR
- CC received > 0, OR
- FL issued > 0, OR
- FL closing > 0, OR
- SQ received > 0, OR
- Peel received > 0

### Special Considerations

1. **UN Received Column**: Currently a placeholder showing 0.000 for all rows as UnEdge operations are not implemented in the system

2. **Multiple Sources**: Flitch data comes from both:
   - Direct inventory purchases (flitch_inventory_items_model)
   - Factory production from crosscutting (flitching_done_model)

3. **Issue Status Types**: 
   - 'order' - Issued for customer orders
   - 'challan' - Issued via challan
   - 'slicing' - Issued for slicing operations
   - 'slicing_peeling' - Issued for combined slicing and peeling

4. **Deleted Records**: Factory flitching done records with `deleted_at != null` are excluded from calculations

## Example Usage

### Request with Date Range Only

```bash
curl -X POST http://localhost:8765/api/V1/reports2/flitch/download-excel-log-wise-flitch-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-02-28",
    "endDate": "2025-05-29"
  }'
```

### Request with Item Filter

```bash
curl -X POST http://localhost:8765/api/V1/reports2/flitch/download-excel-log-wise-flitch-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-02-28",
    "endDate": "2025-05-29",
    "filter": {
      "item_name": "AMERICAN WALNUT"
    }
  }'
```

## Sample Report Output

```
Logwise Flitch between 28/02/2025 and 29/05/2025

Item Name       | Log No    | Physical CMT | CC Received | Op Bal | Flitch Received | FLIssued | FLClosing | SQ Received | UN Received | Peel Received
----------------|-----------|--------------|-------------|--------|-----------------|----------|-----------|-------------|-------------|---------------
AMERICAN WALNUT | F242ARF1  | 0.357       | 0.337       | 0.000  | 0.000           | 0.000    | 0.357     | 0.000       | 0.000       | 0.000
                | F246ARF1  | 0.395       | 0.351       | 0.000  | 0.000           | 0.000    | 0.395     | 0.000       | 0.000       | 0.000
                | F248ARF1  | 0.270       | 0.320       | 0.000  | 0.000           | 0.000    | 0.270     | 0.000       | 0.000       | 0.000
                | ...       | ...         | ...         | ...    | ...             | ...      | ...       | ...         | ...         | ...
----------------|-----------|--------------|-------------|--------|-----------------|----------|-----------|-------------|-------------|---------------
Total           |           | 125.456     | 98.234      | 27.222 | 15.000          | 10.000   | 125.456   | 45.678      | 0.000       | 12.345
```

## Files Modified

### Controller
- **Path**: `topl_backend/controllers/reports2/Flitch/logWiseFlitch.js`
- **Export**: `LogWiseFlitchReportExcel`
- **Purpose**: Handles data aggregation and business logic

### Excel Config
- **Path**: `topl_backend/config/downloadExcel/reports2/Flitch/logWiseFlitch.js`
- **Export**: `createLogWiseFlitchReportExcel`
- **Purpose**: Generates Excel file with proper formatting

### Routes
- **Path**: `topl_backend/routes/report/reports2/Flitch/flitch.routes.js`
- **Route**: `POST /download-excel-log-wise-flitch-report`
- **Connected via**: `topl_backend/routes/report/reports2.routes.js`

## Performance Considerations

### Database Indexes
The following indexes should exist for optimal performance:
- `item_name` (on both flitch_inventory_items and flitching_done)
- `log_no` (on all related collections)
- `issue_status` (on both flitch_inventory_items and flitching_done)
- `invoice.inward_date` (on flitch_inventory_invoice_details)
- `worker_details.flitching_date` (on flitching_done)
- `slicing_details.slicing_date` (on slicing_done_other_details)
- `peeling_details.peeling_date` (on peeling_done_other_details)

### MongoDB Aggregation
- Uses aggregation pipelines for efficient data retrieval
- Lookups are performed to join related collections
- Grouping operations minimize data transfer

## Testing Checklist

- [x] Verify correct log grouping by item name
- [x] Validate all calculations match expected business logic
- [x] Test date range filtering for all data sources
- [x] Confirm totals row calculations are accurate
- [x] Test with no data (returns 404 with appropriate message)
- [x] Test with single item vs multiple items
- [x] Verify Excel formatting (merged cells, decimal places, borders)
- [x] Test optional `filter.item_name` parameter
- [x] Verify no linter errors in all files

## Related APIs

- [Flitch Daily Report API](../Daily_Flitch/FLITCH_DAILY_REPORT_API.md)
- [Item Wise Flitch Report API](../Item_wise_flitch/ITEM_WISE_FLITCH_REPORT_API.md)
- **Log Item Wise Inward Report**: `/download-excel-log-item-wise-inward-daily-report`

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-02-03 | System | Initial implementation |

## Support

For issues or questions about this API, please contact the development team.
