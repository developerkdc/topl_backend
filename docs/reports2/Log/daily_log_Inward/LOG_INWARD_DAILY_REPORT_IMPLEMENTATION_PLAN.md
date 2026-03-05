# LOG Daily Inward Report API Implementation

## Overview

Create a new API endpoint in `topl_backend/routes/report/reports2.routes.js` that generates a daily inward report for logs. The report will match the structure shown in the reference image with grouped item data, log details, totals, and worker information.

## Data Structure Analysis

Based on the image, the report structure is:

### Report Title
- **Header Row**: "Inward Details Report Date: 24/02/2025"

### Main Data Table
**Columns:**
1. Item Name
2. Supplier Item
3. Log No
4. Invoice Length
5. Invoice Dia.
6. Invoice CMT
7. Indian CMT
8. Physical Length (blank in image)
9. Physical Girth
10. Physical CMT
11. Remarks
12. FSC (excluded per user request)

### Grouping Logic
- Group by **Item Name** (e.g., RED OAK)
- Show each log as a separate row (D298, D299, D300...)
- Display "Total" row after each item group showing:
  - Total Invoice CMT for that item
  - Total Indian CMT for that item
  - Total Physical CMT for that item

### Grand Total
- Final "Total" row with overall sums across all items

### Worker Details Section
- Displayed at bottom with columns:
  - Inward Id
  - Shift
  - Work Hours
  - Worker

## Database Schema Reference

### Collections Used

1. **`log_inventory_invoice_details`** - Invoice/inward header information
   - Fields: `inward_sr_no`, `inward_date`, `inward_type`, `currency`, `workers_details`, `supplier_details`, `invoice_Details`

2. **`log_inventory_items_details`** - Individual log items
   - Fields: `item_name`, `supplier_item_name`, `log_no`, `invoice_length`, `invoice_diameter`, `invoice_cmt`, `indian_cmt`, `physical_length`, `physical_diameter`, `physical_cmt`, `remark`, `invoice_id`

3. **`log_inventory_items_view_model`** - MongoDB view joining items with invoices
   - This is the primary model to query (already used in existing log exports)

### Key Models

From `topl_backend/controllers/inventory/log/log.controller.js`:
```javascript
import {
  log_inventory_invoice_model,
  log_inventory_items_model,
  log_inventory_items_view_model,
} from '../../../database/schema/inventory/log/log.schema.js';
```

## Implementation Steps

### 1. Create Excel Generator Function

**File**: `topl_backend/config/downloadExcel/reports2/logInward/logInward.js` (new file)

**Function**: `GenerateLogDailyInwardReport(details, reportDate)`

**Logic**:
- Create workbook with worksheet named "Log Inward Report"
- **Row 1**: Title "Inward Details Report Date: {DD/MM/YYYY}" (merged cells, bold, size 12)
- **Row 2-3**: Empty spacing
- **Row 4**: Column headers (bold, gray background)
- **Row 5+**: Data rows grouped by item name
  - Group logs by `item_name`
  - Sort by `item_name` then `log_no`
  - Show item name only on first row of each group
  - Show supplier item (use `supplier_item_name` field)
  - After each item group, insert "Total" row with sums
- **After all data**: Grand "Total" row with overall sums
- **Worker Section**: Add 2 empty rows, then worker details table
  - Headers: Inward Id, Shift, Work Hours, Worker
  - Data from `workers_details` in invoice

**Reference Pattern**: Similar to `topl_backend/config/downloadExcel/reports2/crossCutting/crossCutting.js`

**Calculations**:
- Item Total Invoice CMT = SUM of `invoice_cmt` for all logs in that item
- Item Total Indian CMT = SUM of `indian_cmt` for all logs in that item
- Item Total Physical CMT = SUM of `physical_cmt` for all logs in that item
- Grand Totals = SUM across all items

### 2. Create Controller Function

**File**: `topl_backend/controllers/reports2/logInward.js` (new file)

**Function**: `LogInwardDailyReportExcel = catchAsync(async (req, res, next) => {...})`

**Request Body**:
```javascript
{
  "filters": {
    "reportDate": "2025-02-24" // REQUIRED - specific date for the report
  }
}
```

**Processing Steps**:
1. Validate `reportDate` parameter (return 400 if missing)
2. Set up date range for the specific day:
   ```javascript
   const startOfDay = new Date(reportDate);
   startOfDay.setHours(0, 0, 0, 0);
   
   const endOfDay = new Date(reportDate);
   endOfDay.setHours(23, 59, 59, 999);
   ```
3. Build aggregation pipeline:
   ```javascript
   const logInwardData = await log_inventory_items_view_model.aggregate([
     {
       $match: {
         'log_invoice_details.inward_date': {
           $gte: startOfDay,
           $lte: endOfDay,
         }
       }
     },
     {
       $sort: {
         item_name: 1,
         log_no: 1,
       }
     }
   ]);
   ```
4. Check if data exists (return 404 if empty)
5. Call `GenerateLogDailyInwardReport(logInwardData, reportDate)`
6. Return success response with download link

**Reference Pattern**: Same structure as `topl_backend/controllers/reports2/crossCutting.js`

### 3. Add Route

**File**: `topl_backend/routes/report/reports2.routes.js`

**Current Content**:
```javascript
import { CrossCuttingDailyReportExcel } from '../../controllers/reports2/crossCutting.js';
import express from 'express';

const router = express.Router();

//crosscutting
router.post('/download-excel-crosscutting-daily-report', CrossCuttingDailyReportExcel);

export default router;
```

**Add**:
```javascript
import { LogInwardDailyReportExcel } from '../../controllers/reports2/logInward.js';

// ... existing imports ...

// Log Inward
router.post('/download-excel-log-inward-daily-report', LogInwardDailyReportExcel);
```

**API Endpoint**: `POST /reports2/download-excel-log-inward-daily-report`

## Expected Output Structure

### Excel Layout

```
Row 1: Inward Details Report Date: 24/02/2025                                                [BOLD, MERGED]
Row 2: [Empty]
Row 3: [Empty]
Row 4: Item Name | Supplier Item | Log No | Invoice Length | Invoice Dia. | Invoice CMT | Indian CMT | Physical Length | Physical Girth | Physical CMT | Remarks    [BOLD, GRAY BG]
Row 5: RED OAK   | Red Oak        | D298   | 10.00          | 21.00        | 181.000     | 0.585      | 3.10           | 1.88           | 0.685        |
Row 6:           |                | D299   | 10.00          | 20.00        | 160.000     | 0.530      | 3.25           | 1.92           | 0.749        |
...
Row 24:          |                | D318   | 11.00          | 22.00        | 223.000     | 0.706      | 3.35           | 2.00           | 0.838        |
Row 25:          | Total          |        |                |              | 3947.000    | 12.586     |                |                | 17.459       |     [BOLD]
Row 26: Total    |                |        |                |              | 3947.000    | 12.586     |                |                | 17.459       |     [BOLD]
Row 27: [Empty]
Row 28: [Empty]
Row 29: Inward Id | Shift         | Work Hours | Worker                                                                              [BOLD, GRAY BG]
Row 30: 360       |               |            |
```

### API Response Format

**Success (200)**:
```json
{
  "result": "http://localhost:5000/public/reports/LogInward/log_inward_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Log inward daily report generated successfully"
}
```

**Error - Missing Date (400)**:
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

**Error - No Data (404)**:
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No log inward data found for the selected date"
}
```

## File Structure

```
topl_backend/
├── config/
│   └── downloadExcel/
│       └── reports2/
│           └── logInward/
│               └── logInward.js                    [NEW - Excel generator]
├── controllers/
│   └── reports2/
│       ├── crossCutting.js                         [EXISTING - reference]
│       └── logInward.js                            [NEW - controller]
└── routes/
    └── report/
        └── reports2.routes.js                      [MODIFY - add new route]
```

## Key Technical Details

### Date Formatting Function
```javascript
const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'N/A';
  }
};
```

### Grouping Function
```javascript
const groupDataByItem = (data) => {
  const grouped = {};
  
  data.forEach((log) => {
    const itemName = log.item_name || 'UNKNOWN';
    
    if (!grouped[itemName]) {
      grouped[itemName] = {
        supplier_item: log.supplier_item_name,
        logs: [],
        workers: log.log_invoice_details?.workers_details || null,
        inward_id: log.log_invoice_details?.inward_sr_no || null
      };
    }
    
    grouped[itemName].logs.push(log);
  });
  
  return grouped;
};
```

### Number Formatting
- CMT values: 3 decimal places (`0.000`)
- Length/Diameter/Girth: 2 decimal places (`0.00`)

### Column Widths
```javascript
worksheet.columns = [
  { width: 15 },  // Item Name
  { width: 15 },  // Supplier Item
  { width: 12 },  // Log No
  { width: 15 },  // Invoice Length
  { width: 12 },  // Invoice Dia
  { width: 12 },  // Invoice CMT
  { width: 12 },  // Indian CMT
  { width: 15 },  // Physical Length
  { width: 15 },  // Physical Girth
  { width: 12 },  // Physical CMT
  { width: 20 },  // Remarks
];
```

## Testing Checklist

After implementation, test with:

1. **Valid date with data**: Should generate report successfully
2. **Valid date without data**: Should return 404 error
3. **Missing reportDate**: Should return 400 error
4. **Multiple items**: Verify grouping and totals are correct
5. **Worker details**: Verify worker section appears at bottom
6. **Calculations**: Verify item totals and grand totals match manual sum
7. **Excel formatting**: Verify bold headers, merged cells, number formats

## cURL Test Command

```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "2025-02-24"
    }
  }'
```

## Summary

This implementation will create a complete LOG Daily Inward report system that:
- ✅ Filters log inward data by specific date
- ✅ Groups logs by item name
- ✅ Shows supplier item reference
- ✅ Displays all dimension fields (invoice, Indian, physical)
- ✅ Calculates item-level totals
- ✅ Calculates grand totals
- ✅ Includes worker details section
- ✅ Generates downloadable Excel file
- ✅ Follows existing codebase patterns (crossCutting report reference)
- ✅ Uses existing models and schemas from log inventory system
