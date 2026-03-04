# Log Item Further Process Report API Documentation

## Overview
This API generates a comprehensive Excel report that tracks the complete journey of individual logs from inward receipt through all processing stages including crosscutting, flitching, slicing, dressing, dyeing, tapping/splicing, and pressing.

## Endpoint
**POST** `/api/V1/reports2/log/download-excel-log-item-further-process-report`

## Request Body
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filter": {
    "item_name": "RED OAK" // Optional
  }
}
```

### Parameters
- `startDate` (required): Start date in YYYY-MM-DD format
- `endDate` (required): End date in YYYY-MM-DD format
- `filter.item_name` (optional): Filter by specific item name

## Response
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Log item further process report generated successfully",
  "result": "http://localhost:3000/public/upload/reports/reports2/Log/Log-Item-Further-Process-Report-1234567890.xlsx"
}
```

## Report Structure

The generated Excel report contains the following sections:

### 1. Inward Details
- **Item Name**: Name of the wood item
- **LogNo**: Unique log identifier
- **Indian CMT**: Indian cubic meter measurement
- **RECE**: Received CMT
- **Total Stock**: Available stock in inward

### 2. Inward in (CMT)
- **Total Stock**: Total inward stock
- **CC RECE**: Crosscut received
- **Saw**: Sawing data
- **UE**: UnEdge data
- **Peel**: Peeling data
- **Flitch**: Flitching data

### 3. Cross Cut Issue in (CMT)
- **Total Stock**: Stock after crosscutting
- **Total Issue**: Items issued from crosscut
- **Total Stock**: Remaining stock

### 4. Slice Issue
- **Slice RECE**: Slicing received
- **Dress**: Issued to dressing
- **Dye**: Issued to dyeing
- **Total issue**: Total issued from slicing
- **Total Stock**: Remaining stock

### 5. Dressing Issue
- **Dress RECE**: Dressing received
- **Clipp**: Clipping data
- **Dye**: Issued to dyeing
- **Mix Match**: Mix match items
- **Total issue**: Total issued from dressing
- **Total Stock**: Remaining stock

### 6. Dyeing
- **Total Issue**: Issued from dyeing
- **Total Stock**: Stock after dyeing
- **Dye RECE**: Dyeing received

### 7. Clip Issue
- **Clip RECE**: Clipping received
- **MSplic**: Machine splicing
- **HSplic**: Hand splicing
- **Total Issue**: Total issued
- **Total Stock**: Remaining stock

### 8. Machine Splicing
- **RECE**: Machine splicing received
- **Total Issue**: Issued from machine splicing
- **Total Stock**: Remaining stock

### 9. Hand Splicing
- **RECE**: Hand splicing received
- **Total Issue**: Issued from hand splicing
- **Total Stock**: Remaining stock

### 10. End Tapping
- **Total RECE**: End tapping received
- **Total Issue**: Issued from end tapping
- **Total Stock**: Remaining stock

### 11. Splicing
- **Total Issue**: Total issued from splicing
- **Total Stock**: Remaining stock

### 12. Pressing
- **RECE**: Pressing received

## Report Features

1. **Item Grouping**: Logs are grouped by item name with subtotals
2. **Grand Totals**: Overall totals across all items
3. **Multi-level Headers**: Four header rows for better organization:
   - Title row with date range
   - Empty spacing row
   - Major group headers (Inward Details, Slice Issue, etc.)
   - Column headers
4. **Vertical Merging**: Item names are merged vertically for logs of the same item
5. **Formatting**: 
   - Bold headers with gray background
   - Borders on all cells
   - Numeric values with 2 decimal places

## Data Calculations

### Filter Criteria
- The report shows logs **received** (inward) during the specified date range
- All processing activities for these logs are included, regardless of when the processing occurred

### Aggregation Logic
For each log in the date range, the system aggregates data from:
- `log_inventory_items_view_model` - Inward details
- `crosscutting_done_model` - Crosscutting data
- `flitching_done_model` - Flitching data
- `slicing_done_items_model` - Slicing data
- `dressing_done_items_model` - Dressing data
- `process_done_items_details_model` - Smoking/Dyeing data
- `tapping_done_items_details_model` - Tapping/Splicing data
- `pressing_done_details_model` - Pressing data

### Stock Calculations
- **Total Stock** = Received - Total Issue
- Each processing stage tracks:
  - What was received into that stage
  - What was issued to the next stage
  - Current stock remaining in that stage

## Error Handling

### 400 Bad Request
- Missing startDate or endDate
- Invalid date format
- Start date is after end date

### 404 Not Found
- No log data found for the selected period

### 500 Internal Server Error
- Database query errors
- Excel file generation errors

## File Structure

### Controller
**Location**: `topl_backend/controllers/reports2/Log/logItemFurtherProcess.js`

Main logic for:
- Request validation
- Date range processing
- Data aggregation across all processing stages
- Response formatting

### Excel Generator
**Location**: `topl_backend/config/downloadExcel/reports2/Log/logItemFurtherProcess.js`

Handles:
- Excel workbook creation
- Multi-level header formatting
- Data grouping and subtotals
- Cell styling and borders
- File saving and URL generation

### Route
**Location**: `topl_backend/routes/report/reports2/Log/log.routes.js`

Route definition:
```javascript
router.post('/download-excel-log-item-further-process-report', LogItemFurtherProcessReportExcel);
```

## Testing

### Sample Request
```bash
curl -X POST http://localhost:3000/api/V1/reports2/log/download-excel-log-item-further-process-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }'
```

### Expected Output
- Excel file with 44 columns
- Multiple rows per item (one per log)
- Subtotal rows per item
- Grand total row at the end
- All columns properly formatted with headers

## Performance Considerations

1. **Large Date Ranges**: The report performs multiple aggregations per log. For large date ranges:
   - Consider adding pagination
   - Implement caching for frequently requested date ranges
   - Monitor query performance

2. **Database Indexes**: Ensure indexes exist on:
   - `log_no` across all processing tables
   - `item_name` for filtering
   - `inward_date` for date range queries

3. **Timeout Settings**: Adjust server timeout settings for reports with many logs

## Dependencies

### NPM Packages
- `exceljs` - Excel file generation
- `dotenv` - Environment variable management

### Internal Dependencies
- Error handling utilities (`catchAsync`, `ApiError`, `ApiResponse`)
- All processing schema models

## Future Enhancements

1. **Additional Filters**: Add filters for:
   - Supplier
   - Log grade
   - Date of processing (not just inward date)

2. **Custom Column Selection**: Allow users to select which processing stages to include

3. **Export Formats**: Support CSV and PDF in addition to Excel

4. **Real-time Updates**: Implement WebSocket for progress updates on long-running reports

5. **Data Validation**: Add validation for clipping and mix-match calculations when schemas are clarified
