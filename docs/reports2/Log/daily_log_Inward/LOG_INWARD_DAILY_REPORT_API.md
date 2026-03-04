# Log Daily Inward Report API Documentation

## Overview
The Log Daily Inward Report API generates a daily report of all logs received on a specific date. The report groups logs by item name, displays detailed measurements, calculates totals, and includes worker information.

## Endpoint
```
POST /reports2/download-excel-log-inward-daily-report
```

## Request Body

### Required Parameters
```json
{
  "filters": {
    "reportDate": "2025-02-24"
  }
}
```

### Parameters Description
- `reportDate` (string, required): The specific date for the report in `YYYY-MM-DD` format

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/LogInward/log_inward_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Log inward daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request - Missing Date
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 404 Not Found - No Data
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No log inward data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Inward Details Report Date: DD/MM/YYYY
```

**Example:**
```
Inward Details Report Date: 24/02/2025
```

### Row 2-3: Empty (spacing)

### Row 4: Column Headers
The data table contains the following columns:

1. **Item Name** - Log item name (e.g., RED OAK, TEAK)
2. **Supplier Item** - Supplier's item reference name
3. **Log No** - Unique log number (e.g., D298, D299)
4. **Invoice Length** - Length as per invoice (meters)
5. **Invoice Dia.** - Diameter as per invoice (meters)
6. **Invoice CMT** - CMT (Cubic Meter of Timber) as per invoice
7. **Indian CMT** - CMT as per Indian standards
8. **Physical Length** - Actual measured length (meters)
9. **Physical Girth** - Actual measured girth/diameter (meters)
10. **Physical CMT** - Actual measured CMT
11. **Remarks** - Any remarks or notes

### Data Rows (Row 5+)

**Grouping Logic:**
- Logs are grouped by **Item Name**
- Within each group, logs are sorted by **Log No**
- Item name and supplier item are shown only on the first row of each group
- After each item group, a **Total** row displays sums for that item
- After all items, a **Grand Total** row displays overall sums

**Example Layout:**
```
RED OAK   | Red Oak  | D298 | 10.00 | 21.00 | 181.000 | 0.585 | 3.10 | 1.88 | 0.685 |
          |          | D299 | 10.00 | 20.00 | 160.000 | 0.530 | 3.25 | 1.92 | 0.749 |
          |          | D300 | 10.00 | 22.00 | 202.000 | 0.642 | 3.20 | 2.07 | 0.857 |
          | Total    |      |       |       | 3947.000| 12.586|      |      | 17.459|
Total     |          |      |       |       | 3947.000| 12.586|      |      | 17.459|
```

### Worker Details Section

After the main data, the report includes a worker details section:

**Headers:**
- **Inward Id** - Inward serial number
- **Shift** - Work shift
- **Work Hours** - Total working hours
- **Worker** - Number of workers

**Example:**
```
Inward Id | Shift    | Work Hours | Worker
360       |          |            |
```

## Report Features

- **Date Filtering**: Only includes logs where `inward_date` matches the specified date
- **Hierarchical Grouping**: Data grouped by Item Name → Log Number
- **Subtotals**: Automatic subtotals after each item group
- **Grand Total**: Overall totals across all items
- **Bold Formatting**: Headers and total rows are bold
- **Gray Background**: Header rows have gray background for visibility
- **Number Formatting**: 
  - CMT values: 3 decimal places (0.000)
  - Length/Diameter/Girth: 2 decimal places (0.00)

## Data Calculations

### Item Totals
For each item group, the following are calculated:
- **Total Invoice CMT** = SUM of `invoice_cmt` for all logs in that item
- **Total Indian CMT** = SUM of `indian_cmt` for all logs in that item
- **Total Physical CMT** = SUM of `physical_cmt` for all logs in that item

### Grand Totals
Overall totals across all items:
- **Grand Total Invoice CMT** = SUM of all item Invoice CMT totals
- **Grand Total Indian CMT** = SUM of all item Indian CMT totals
- **Grand Total Physical CMT** = SUM of all item Physical CMT totals

## Database Collections Used

1. **log_inventory_items_view_model** - MongoDB view joining invoice and item details
2. **log_inventory_invoice_details** - Invoice/inward header information
3. **log_inventory_items_details** - Individual log item details

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "2025-02-24"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateLogInwardReport = async () => {
  try {
    const response = await axios.post(
      '/reports2/download-excel-log-inward-daily-report',
      {
        filters: {
          reportDate: '2025-02-24'
        }
      }
    );
    
    // Download URL
    const downloadUrl = response.data.result;
    console.log('Download report from:', downloadUrl);
    
    // Open in new window
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

## File Location

Generated files are stored in:
```
public/reports/LogInward/log_inward_daily_report_{timestamp}.xlsx
```

## Notes

- The report only includes logs where `inward_date` matches the specified date
- Worker details are deduplicated based on inward ID and shift combination
- Files are timestamped to prevent overwrites
- Empty cells are left blank for better visual grouping

## Implementation Files

- **Route**: `topl_backend/routes/report/reports2.routes.js`
- **Controller**: `topl_backend/controllers/reports2/logInward.js`
- **Excel Generator**: `topl_backend/config/downloadExcel/reports2/logInward/logInward.js`
