# Item Wise Inward Report API

## Overview
The Item Wise Inward Report API generates comprehensive inventory reports tracking the complete journey of logs from inward receipt through crosscutting, flitching, peeling, and sales for any given date range. The report is grouped by **item** (item_id + item_name), with one row per item.

## Endpoint
```
POST /api/V1/report/download-excel-item-wise-inward-daily-report
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
  "result": "http://localhost:5000/public/upload/reports/reports2/Log/Item-Wise-Inward-Report-1706432891234.xlsx"
}
```

- **result**: Full URL to download the generated Excel file.

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

**With specific item filter:**
```
Inward Item Wise Stock Details [ ASH ] Between 01/03/2025 and 31/03/2025
```

### Row 2: Empty (spacing)

### Row 3: Group Headers
Multi-level header row showing column groupings:
- **ROUND LOG DETAIL CMT** (Invoice, Indian, Actual)
- **Cross Cut Details CMT** (Issue for CC, CC Received, CC Issued, CC Diff)
- **Flitch Details CMT** (Issue for Flitch, Flitch Received, Flitch Diff)
- **CrossCut Log Issue For CMT** (Issue for SqEdge, Peeling Issued, Peeling Received, Peeling Diff)

### Row 4: Column Headers

The data table contains the following columns:

| #  | Column                | Description                                                     |
|----|-----------------------|-----------------------------------------------------------------|
| 1  | ItemName              | Item name from inventory (e.g., ASH, BEECH)                    |
| 2  | Opening Stock CMT     | Physical CMT of logs received in the period                     |
| 3  | Invoice               | (ROUND LOG) Invoice CMT from log inward                        |
| 4  | Indian                | (ROUND LOG) Indian CMT from log inward                         |
| 5  | Actual                | (ROUND LOG) Physical/Actual CMT from log inward                |
| 6  | Recover From Rejected | Placeholder (0.000) – data source TBD                          |
| 7  | Issue for CC          | (Cross Cut) Logs issued for crosscutting                       |
| 8  | CC Received           | (Cross Cut) Crosscutting completed                             |
| 9  | CC Issued             | (Cross Cut) Crosscut pieces forwarded to next stage            |
| 10 | CC Diff               | (Cross Cut) Issue for CC − CC Received                         |
| 11 | Issue for Flitch      | Crosscut logs issued for flitching                             |
| 12 | Flitch Received       | Flitch output from flitching_done                              |
| 13 | Flitch Diff           | Issue for Flitch − Flitch Received                             |
| 14 | Issue for SqEdge      | Placeholder (0.000) – data source TBD                          |
| 15 | Peeling Issued        | Crosscut logs issued for peeling                               |
| 16 | Peeling Received      | Peeling output from peeling_done                               |
| 17 | Peeling Diff          | Peeling Issued − Peeling Received                              |
| 18 | Sales                 | Items issued to orders/challan across all stages               |
| 19 | Job Work Challan      | Placeholder (0.000) – data source TBD                          |
| 20 | Rejected              | Rejected CMT across crosscutting, flitching, peeling           |
| 21 | Closing Stock CMT     | Calculated closing balance                                     |

## Report Features

- **Multi-Level Headers**: Grouped column headers for better readability
- **Grand Total**: Overall totals across all items at the bottom
- **Bold Formatting**: Headers and total rows are bold
- **Gray Background**: Header rows have gray background
- **Decimal Precision**: All CMT values shown with 3 decimal places

## Stock Calculation Logic

**All calculations are performed in CMT (Cubic Meter). Data is aggregated using a Map keyed by `item_id + item_name`.**

### Database Collections Used

1. **log_inventory_items_details** – Source logs with invoice/indian/physical CMT and issue_status
2. **log_inventory_invoice_details** – Inward/invoice date information (joined via invoice_id)
3. **crosscutting_done** – Completed crosscut items (CC Received, CC Issued, crosscut-stage sales, rejected crosscut)
4. **flitching_done** – Completed flitch items (Flitch Received, flitch-stage sales, rejected flitch)
5. **issues_for_flitching** – Records of crosscut items issued for flitching (Issue for Flitch)
6. **issues_for_peeling** – Records of items issued for peeling (Peeling Issued)
7. **peeling_done_other_details + peeling_done_items** – Peeling output (Peeling Received, rejected peeling)

### Aggregation Approach

The controller uses a **Map-based batch aggregation** approach: each data category is fetched with a single aggregate pipeline, then values are merged into a shared `Map` keyed by `item_id_item_name`. This replaces the older per-item async approach.

### Calculation Formulas

#### Opening Stock CMT
```
Opening CMT = SUM(physical_cmt) from log_inventory_items
              where invoice.inward_date in [startDate, endDate]
```
(Logs received during the period — same lookup as Actual CMT.)

#### Round Log Details (during period)
Items added to log inventory where `invoice.inward_date` is between startDate and endDate:
```
Invoice CMT = SUM(invoice_cmt)
Indian CMT  = SUM(indian_cmt)
Actual CMT  = SUM(physical_cmt)
```

#### Cross Cut Details

**Issue for CC** (logs issued for crosscutting, createdAt in period):
```
Issue for CC = SUM(physical_cmt) from log_inventory_items
               where issue_status = 'crosscutting'
               and createdAt in period
```

**CC Received** (crosscutting completed, createdAt in period):
```
CC Received = SUM(crosscut_cmt) from crosscutting_done
              where createdAt in period
```

**CC Issued** (crosscut pieces forwarded ahead, createdAt in period):
```
CC Issued = SUM(crosscut_cmt) from crosscutting_done
            where issue_status != null
            and createdAt in period
```

**CC Diff:**
```
CC Diff = Issue for CC − CC Received
```

#### Flitch Details

**Issue for Flitch** (issued for flitching, createdAt in period):
```
Issue for Flitch = SUM(cmt) from issues_for_flitching
                   where createdAt in period
```

**Flitch Received** (flitching completed, createdAt in period):
```
Flitch Received = SUM(flitch_cmt) from flitching_done
                  where createdAt in period
```

**Flitch Diff:**
```
Flitch Diff = Issue for Flitch − Flitch Received
```

#### Peeling

**Peeling Issued** (issued for peeling, createdAt in period):
```
Peeling Issued = SUM(cmt) from issues_for_peeling
                 where createdAt in period
```

**Peeling Received** (peeling completed, createdAt in period):
```
Peeling Received = SUM(items.cmt) from peeling_done_other_details + peeling_done_items
                   where createdAt in period
```

**Peeling Diff:**
```
Peeling Diff = Peeling Issued − Peeling Received
```

#### Sales
```
Sales = SUM(physical_cmt) from log_inventory_items
        where issue_status in ['order', 'challan'] and createdAt in period
      + SUM(crosscut_cmt) from crosscutting_done
        where issue_status in ['order', 'challan'] and createdAt in period
      + SUM(flitch_cmt) from flitching_done
        where issue_status in ['order', 'challan'] and deleted_at = null and createdAt in period
```

#### Rejected
```
Rejected = SUM(crosscut_cmt) from crosscutting_done where is_rejected = true and createdAt in period
         + SUM(flitch_cmt)   from flitching_done   where is_rejected = true and createdAt in period
         + SUM(items.cmt)    from peeling_done_other_details+items where is_rejected = true and createdAt in period
```

#### Closing Stock CMT
```
Closing CMT = (logs with invoice_date in range and issue_status != null).physical_cmt
              − Opening CMT
```

## Pending Clarifications

The following columns are currently showing as 0.000 and need clarification:

1. **Recover From Rejected** – Data source and business meaning TBD.
2. **Issue For SqEdge** – Data source and business rules TBD (replaces previous Sawing/Wooden Tile/UnEdge).
3. **Job Work Challan** – Data source TBD.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-item-wise-inward-daily-report \
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
  const response = await axios.post(
    '/api/V1/report/download-excel-item-wise-inward-daily-report',
    {
      startDate: '2025-03-01',
      endDate: '2025-03-31',
      filter: {
        item_name: 'ASH' // Optional
      }
    },
    {
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );

  // Download URL is in response.data.result
  const downloadUrl = response.data.result;
  window.open(downloadUrl, '_blank');
};
```

## Data Flow

```
Log Inventory Inward (invoice_cmt, indian_cmt, physical_cmt)
    ↓
Issue for Crosscutting  →  Crosscutting Done (crosscut_cmt)
                                ↓
                    ┌── Issue for Flitching  →  Flitching Done (flitch_cmt)
                    ├── Issue for Peeling   →  Peeling Done
                    └── Issue for Order/Challan → Sales
```

## Notes

- All stock values are non-negative (Math.max(0, value))
- Excel files are timestamped to prevent overwrites
- Files are stored in: `public/upload/reports/reports2/Log/`
- Multi-level headers provide better visual grouping
- The report covers the complete lifecycle from log inward to final sales/usage

## Technical Implementation

| Component        | Path |
|-----------------|------|
| Controller      | `topl_backend/controllers/reports2/Log/itemWiseInward.js` |
| Excel generator | `topl_backend/config/downloadExcel/reports2/Log/itemWiseInward.js` |
| Routes          | `topl_backend/routes/report/reports2/Log/log.routes.js` |
| Full URL        | `POST /api/V1/report/download-excel-item-wise-inward-daily-report` |
