# Item Wise Inward Report API

## Overview
The Item Wise Inward Report API generates comprehensive inventory reports tracking the complete journey of logs from inward receipt through crosscutting, flitching, peeling, and sales for any given date range.

## Endpoint
```
POST /api/V1/reports2/download-excel-item-wise-inward-daily-report
```

## Authentication
- Requires: `AuthMiddleware`
- Permission: Authentication and authorization as per reports2 module

## Request Body

### Required Parameters
```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31"
}
```

### Optional Parameters
```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "ASH"
  }
}
```

## Response

### Success Response (200 OK)
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Item wise inward report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/reports2/Log/Item-Wise-Inward-Report-1706432891234.xlsx"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

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
  "message": "No stock data found for the selected period"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the date range in a merged cell.

**Format:**
```
Inward Item Wise Stock Details Between DD/MM/YYYY and DD/MM/YYYY
```

**Examples:**

**With specific item filter:**
```
Inward Item Wise Stock Details [ ASH ] Between 01/03/2025 and 31/03/2025
```

**Without item filter (all items):**
```
Inward Item Wise Stock Details Between 01/03/2025 and 31/03/2025
```

### Row 2: Empty (spacing)

### Row 3: Group Headers
Multi-level header row showing column groupings:
- **ROUND LOG DETAIL CMT** (spans columns 3-5: Invoice, Indian, Actual)
- **Cross Cut Details CMT** (spans columns 6-8: Issue for CC, CC Received, Diff)
- **CrossCut Log Issue For CMT** (spans columns 11-14: Wooden Tile, UnEdge, Peel, Sales)

### Row 4: Column Headers

### Rows 5+: Data Table

The data table contains the following 15 columns:

1. **ItemName** - Item name from inventory (e.g., ASH, BEECH, CHERRY)
2. **Opening Stock CMT** - Opening balance in CMT
3. **Invoice** (ROUND LOG DETAIL CMT) - Invoice CMT from log inward
4. **Indian** (ROUND LOG DETAIL CMT) - Indian CMT from log inward
5. **Actual** (ROUND LOG DETAIL CMT) - Physical/Actual CMT from log inward
6. **Issue for CC** (Cross Cut Details CMT) - Logs issued for crosscutting
7. **CC Received** (Cross Cut Details CMT) - Crosscutting completed
8. **Diff** (Cross Cut Details CMT) - Difference (Issue for CC - CC Received)
9. **Flitching** - Crosscut logs issued for flitching
10. **Sawing** - Placeholder (0.000) - awaiting clarification
11. **Wooden Tile** (CrossCut Log Issue For CMT) - Placeholder (0.000) - awaiting clarification
12. **UnEdge** (CrossCut Log Issue For CMT) - Placeholder (0.000) - awaiting clarification
13. **Peel** (CrossCut Log Issue For CMT) - Crosscut logs issued for peeling
14. **Sales** (CrossCut Log Issue For CMT) - Items issued to orders/challan
15. **Closing Stock CMT** - Calculated closing balance

## Report Features

- **Filter Information Row**: First row displays date range and applied filters
- **Multi-Level Headers**: Grouped column headers for better readability
- **Grand Total**: Overall totals across all items at the bottom
- **Bold Formatting**: Headers and total rows are bold for easy reading
- **Gray Background**: Header rows have gray background for better visibility
- **Decimal Precision**: All CMT values shown with 3 decimal places

## Stock Calculation Logic

**All calculations are performed in CMT (Cubic Meter).**

### Database Collections Used

1. **log_inventory_items_details** - Source logs with invoice/indian/physical CMT
2. **log_inventory_invoice_details** - Inward/invoice information
3. **crosscutting_done** - Completed crosscut items
4. **flitching_done** - Completed flitch items
5. **issues_for_crosscutting** - Logs issued for crosscutting
6. **issues_for_flitching** - Crosscut items issued for flitching
7. **issues_for_peeling** - Crosscut items issued for peeling

### Calculation Formulas

#### Opening Stock CMT
```
Opening CMT = Current Available CMT + Total Issued CMT - Total Received CMT (during period)
```

**Current Available CMT** includes:
- log_inventory_items where issue_status = null (physical_cmt)
- crosscutting_done where issue_status = null (crosscut_cmt)
- flitching_done where issue_status = null and deleted_at = null (flitch_cmt)

#### Round Log Details (during period)
Items added to log inventory where `inward_date` is between startDate and endDate:

```
Invoice CMT = SUM(invoice_cmt)
Indian CMT = SUM(indian_cmt)
Actual CMT = SUM(physical_cmt)
```

#### Cross Cut Details

**Issue for CC:**
```
Issue for CC = SUM(physical_cmt) from log_inventory_items 
               where issue_status = 'crosscutting' 
               and updatedAt in period
```

**CC Received:**
```
CC Received = SUM(crosscut_cmt) from crosscutting_done 
              where createdAt in period
```

**Diff:**
```
Diff = Issue for CC - CC Received
```

#### Flitching
```
Flitching = SUM(crosscut_cmt) from crosscutting_done 
            where issue_status = 'flitching' 
            and updatedAt in period
```

#### Peel
```
Peel = SUM(crosscut_cmt) from crosscutting_done 
       where issue_status = 'peeling' 
       and updatedAt in period
```

#### Sales
```
Sales = SUM(physical_cmt) from log_inventory_items 
        where issue_status in ['order', 'challan'] 
        and updatedAt in period
      + SUM(crosscut_cmt) from crosscutting_done 
        where issue_status in ['order', 'challan'] 
        and updatedAt in period
      + SUM(flitch_cmt) from flitching_done 
        where issue_status in ['order', 'challan'] 
        and deleted_at = null 
        and updatedAt in period
```

#### Closing Stock CMT
```
Closing CMT = Opening CMT + Actual CMT - Issue for CC + CC Received - Flitching - Peel - Sales
```

**Important**: All CMT values are non-negative (Math.max(0, value)).

## Pending Clarifications

The following columns are currently showing as 0.000 and need clarification:

1. **Sawing** (Column 10) - Data source and meaning
2. **Wooden Tile** (Column 11) - Whether this is an item sub-category, production output, or specific issue destination
3. **UnEdge** (Column 12) - Whether this is an item sub-category, production output, or specific issue destination

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateItemWiseInwardReport = async () => {
  try {
    const response = await axios.post(
      '/api/V1/reports2/download-excel-item-wise-inward-daily-report',
      {
        startDate: '2025-03-01',
        endDate: '2025-03-31',
        filter: {
          item_name: 'ASH' // Optional
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Download URL
    const downloadUrl = response.data.data;
    console.log('Download report from:', downloadUrl);
    
    // Open in new window
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

## Data Flow

```
Log Inventory Inward (invoice_cmt, indian_cmt, physical_cmt)
    ↓
Issue for Crosscutting
    ↓
Crosscutting Done (crosscut_cmt)
    ↓
    ├── Issue for Flitching → Flitching Done
    ├── Issue for Peeling → Peeling Done
    └── Issue for Order → Sales (Challan/Order)
```

## Notes

- The report only includes items with activity during the period (non-zero values)
- All stock values are non-negative (Math.max(0, value))
- Excel files are timestamped to prevent overwrites
- Files are stored in: `public/upload/reports/reports2/Log/`
- Multi-level headers provide better visual grouping of related columns
- The report covers the complete lifecycle from log inward to final sales/usage
