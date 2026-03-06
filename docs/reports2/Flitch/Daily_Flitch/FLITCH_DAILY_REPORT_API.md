# Flitch Daily Report API

## Overview
The Flitch Daily Report API generates dynamic Excel reports showing flitching production details for a specific date. The report includes crosscut source measurements, flitch piece details with dimensions (length, width1-3, height), worker details, and machine tracking information.

## Endpoint
```
POST /report/download-excel-flitch-daily-report
```

## Authentication
- Requires: `AuthMiddleware`
- Permission: Standard user authentication

## Request Body

### Required Parameters
```json
{
  "filters": {
    "reportDate": "2025-03-31"
  }
}
```

### Optional Parameters
```json
{
  "filters": {
    "reportDate": "2025-03-31",
    "item_name": "RED OAK"
  }
}
```

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/Flitch/flitch_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Flitch daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No flitching data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Flitch Details Report Date: DD/MM/YYYY
```

**Example:**
```
Flitch Details Report Date: 31/03/2025
```

### Row 2: Empty (spacing)

### Row 3: Main Data Headers

The main data table contains the following columns:

1. **Item Name** - Wood type (e.g., RED OAK, TEAK)
2. **CC No** - Crosscut piece number (source piece)
3. **Length** - Crosscut piece length (meters)
4. **Girth** - Crosscut piece girth/diameter (meters)
5. **CMT** - Crosscut piece cubic measurement (CMT)
6. **Flitch No** - Individual flitch identifier (e.g., D356A1)
7. **Length** - Flitch length (meters)
8. **Width1** - First width measurement (meters)
9. **Width2** - Second width measurement (meters)
10. **Width3** - Third width measurement (meters)
11. **Height** - Flitch height/thickness (meters)
12. **CMT** - Flitch cubic measurement (CMT)

### Data Rows: Hierarchical Grouping

Data is organized as follows:

**Level 1: Item Name (e.g., RED OAK)**
- Groups all flitch pieces of the same wood type

**Level 2: CC No (e.g., D356A, D357A)**
- Shows crosscut source measurements once per CC piece
- Lists all flitch pieces produced from that CC piece

**Level 3: Flitch Pieces**
- Individual flitch pieces with their detailed measurements

**Totals:**
- **Per CC Total**: Sum of Flitch CMT for all pieces from one CC piece (displayed in **red bold**)
- **Per Item Total**: Sum of all Flitch CMT for one item type (displayed in **bold**)
- **Grand Total**: Sum of all Flitch CMT across all items

### Summary Section

After the main data, a summary table shows:

| Item Name | Inward CMT | CC CMT |
|-----------|------------|---------|
| RED OAK   | 6.602      | 6.063   |
| **Total** | **6.602**  | **6.063** |

**Note:** 
- **Inward CMT** = Total CMT from crosscut source pieces
- **CC CMT** = Total CMT of flitch pieces produced

### Worker Details Section

At the bottom of the report:

| Flitch Id | Shift | Work Hours | Worker | Machine Id |
|-----------|-------|------------|--------|------------|
| 11587     | DAY   | 8          | 4      | FLITCH-1   |

## Report Features

- **Single Date Filtering**: Report for one specific day only
- **Item Name Filter**: Optional filter to show specific wood types
- **Hierarchical Grouping**: Item Name → CC Number → Flitch Pieces
- **Detailed Measurements**: Both source CC piece and individual flitch dimensions
- **Width Tracking**: Three width measurements per flitch for accurate volume calculation
- **Automatic Totals**: Per-CC totals, per-item totals, and grand totals
- **Color-Coded Totals**: CC subtotals in red bold, item totals in bold
- **Bold Formatting**: Headers and total rows are bold for easy reading
- **Visual Styling**: Header rows have gray background for better visibility
- **Numeric Formatting**: 
  - CMT values formatted to 3 decimal places (0.000)
  - Dimension values formatted to 2 decimal places (0.00)
- **Worker Tracking**: Shows shift, hours, workers, and machines used

## Data Sources

### Database Collections Used

1. **flitchings** - Completed flitching records
   - Contains: flitch piece details, measurements, worker information
   - Fields: `log_no`, `flitch_code`, `log_no_code`, `length`, `width1`, `width2`, `width3`, `height`, `flitch_cmt`, `item_name`, `machine_id`, `machine_name`
   - Worker details: `worker_details.flitching_date`, `worker_details.shift`, `worker_details.working_hours`, `worker_details.workers`
   - Formula: `flitch_formula` - describes how CMT is calculated

2. **crosscutting_dones** - Source crosscut pieces used for flitching
   - Contains: original crosscut measurements before flitching
   - Fields: `log_no_code`, `length`, `girth`, `crosscut_cmt`

### Data Relationships

- Join: `flitchings.crosscut_done_id` → `crosscutting_dones._id`
- One crosscut piece can produce multiple flitch pieces (one-to-many relationship)
- Process flow: Log → Crosscut → Flitching

## Calculation Logic

### Date Filtering
```
Match records where:
  worker_details.flitching_date >= reportDate 00:00:00
  AND worker_details.flitching_date <= reportDate 23:59:59
  AND deleted_at IS NULL
```

### CMT Calculations

**Crosscut Source (Inward CMT):**
- Sourced from `crosscutting_dones.crosscut_cmt`
- Represents the cubic measurement of the crosscut piece before flitching

**Flitch Pieces (CC CMT):**
- Sourced from `flitchings.flitch_cmt`
- Each flitch piece has its own CMT value calculated based on its dimensions
- Formula typically: Length × (Width1 + Width2 + Width3) / 3 × Height

**CC Total Flitch CMT:**
```
CC Total = SUM(all flitch pieces from that CC piece)
```

**Item Total:**
```
Item Inward Total = SUM(crosscut_source.crosscut_cmt for all CC pieces of that item)
Item Flitch Total = SUM(flitch_cmt for all flitch pieces of that item)
```

**Grand Total:**
```
Grand Inward Total = SUM(all item inward totals)
Grand Flitch Total = SUM(all item flitch totals)
```

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/report/download-excel-flitch-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateFlitchReport = async () => {
  try {
    const response = await axios.post(
      '/report/download-excel-flitch-daily-report',
      {
        filters: {
          reportDate: '2025-03-31',
          item_name: 'RED OAK' // Optional
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
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

### With Item Filter
```bash
curl -X POST http://localhost:5000/report/download-excel-flitch-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31",
      "item_name": "RED OAK"
    }
  }'
```

## Key Differences from Cross Cut Daily Report

| Aspect | Cross Cut Daily Report | Flitch Daily Report |
|--------|------------------------|---------------------|
| **Date Filter** | worker_details.crosscut_date | worker_details.flitching_date |
| **Source Data** | Original logs | Crosscut pieces |
| **Output** | Cut log pieces | Flitch pieces |
| **Measurements** | Length, Girth | Length, Width1-3, Height |
| **Grouping** | Item → Log → CC Pieces | Item → CC No → Flitch Pieces |
| **CMT Calculation** | Length × Girth formula | Length × Avg(Width) × Height |
| **Process Stage** | First cutting (logs to CC) | Second cutting (CC to flitches) |
| **Columns** | 9 columns | 12 columns |

## Notes

- The report only includes flitching activities for the specified date
- CMT values are formatted to 3 decimal places
- Dimension values (length, width, height) are formatted to 2 decimal places
- Excel files are timestamped to prevent overwrites
- Files are stored in: `public/reports/Flitch/`
- Crosscut source measurements are shown once per CC piece
- Item names are shown once per item group for better readability
- Worker details section consolidates all workers/machines used on that date
- CC subtotal rows are displayed in red bold for visual distinction
- Three width measurements allow for accurate volume calculation of irregular flitch pieces

## File Storage

**Directory**: `public/reports/Flitch/`

**Filename Pattern**: `flitch_daily_report_{timestamp}.xlsx`

**Example**: `flitch_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Flitch Details Report Date: 31/03/2025

Item Name | CC No  | Length | Girth | CMT   | Flitch No | Length | Width1 | Width2 | Width3 | Height | CMT
RED OAK   | D356A  | 3.20   | 1.50  | 0.450 | D356A1    | 3.20   | 0.19   | 0.44   | 0.20   | 0.39   | 0.433
          |        |        |       |       | Total     |        |        |        |        |        | 0.433
          | D357A  | 3.30   | 1.57  | 0.508 | D357A1    | 3.30   | 0.19   | 0.43   | 0.21   | 0.43   | 0.479
          |        |        |       |       | Total     |        |        |        |        |        | 0.479
          | D358A  | 2.65   | 1.70  | 0.479 | D358A1    | 2.65   | 0.20   | 0.44   | 0.21   | 0.46   | 0.421
          |        |        |       |       | Total     |        |        |        |        |        | 0.421
          | Total  |        |       |       |           |        |        |        |        |        | 6.063
Total     |        |        |       |       |           |        |        |        |        |        | 6.063

Item Name     | Inward CMT | CC CMT
RED OAK       | 6.602      | 6.063
Total         | 6.602      | 6.063

Flitch Id | Shift | Work Hours | Worker | Machine Id
11587     | DAY   | 8          | 4      | FLITCH-1
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format
- Flitching operations occurred on that date
- Records have not been deleted (deleted_at is null)
- The crosscut pieces were previously processed (crosscut_done_id exists)

### Incorrect Date Format
Date should be in ISO format: "YYYY-MM-DD" (e.g., "2025-03-31")

### Missing Crosscut Source Data
If crosscut source measurements are missing, verify:
- The crosscut_done_id field is properly populated in flitching records
- The referenced crosscut records exist in the crosscutting_dones collection
- The aggregation lookup is successfully joining the data

### Missing Worker Details
Worker details are sourced from `worker_details` object in each flitching record. If missing, the worker section will be empty.

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Flitch/flitchDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Flitch/flitchDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Flitch/flitch.routes.js
```

### Aggregation Pipeline
```javascript
[
  {
    $match: {
      'worker_details.flitching_date': { $gte: startOfDay, $lte: endOfDay },
      deleted_at: null
    }
  },
  {
    $lookup: {
      from: 'crosscutting_dones',
      localField: 'crosscut_done_id',
      foreignField: '_id',
      as: 'crosscut_source'
    }
  },
  {
    $unwind: {
      path: '$crosscut_source',
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $sort: {
      item_name: 1,
      log_no: 1,
      flitch_code: 1
    }
  }
]
```

## Production Process Flow

```
1. Log Inward → Original logs received
2. Crosscutting → Logs cut into CC pieces
3. Flitching → CC pieces cut into flitch pieces (THIS REPORT)
4. Slicing/Peeling → Further processing of flitch pieces
```

This report tracks the **third stage** of wood processing, showing how crosscut pieces are converted into flitch pieces ready for further processing or sale.
