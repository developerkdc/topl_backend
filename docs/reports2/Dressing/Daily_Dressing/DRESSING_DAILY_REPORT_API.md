# Dressing Daily Report API

## Overview
The Dressing Daily Report API generates Excel reports showing dressing production details for a specific date. The report includes item-level details (Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks) in a single table, a Total row for Leaves and Sq Mtr, Veneer Summary (grouped by item), and Log Summary (grouped by log and item).

## Endpoint
```
POST /report/download-excel-dressing-daily-report
```

## Authentication
- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

## Request Body

### Required Parameters
```json
{
  "filters": {
    "reportDate": "2025-11-05"
  }
}
```

### Optional Parameters
```json
{
  "filters": {
    "reportDate": "2025-11-05",
    "dressingId": "690aed51c7445a1b2c3d4e5f"
  }
}
```

- **dressingId** (optional): MongoDB ObjectId of a specific `dressing_done_other_details` record. When provided, the report includes only that dressing session; when omitted, all sessions for the given date are included.

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/Dressing/dressing_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Dressing daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request – Missing report date
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 400 Bad Request – Invalid dressing Id
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid dressing Id"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No dressing data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Dressing Details Report Date: DD/MM/YYYY
```

**Example:**
```
Dressing Details Report Date: 05/11/2025
```

### Row 2: Empty (spacing)

### Row 3: Main Data Headers (single line)

All columns in one header row:

| # | Column     | Description                                      |
|---|------------|--------------------------------------------------|
| 1 | Item Name  | Wood/item type (e.g., IVORY CROWN, SAPELI)      |
| 2 | LogX       | Log identifier code (e.g., L24PDA, X1PDR)       |
| 3 | Bundle No  | Bundle number                                   |
| 4 | ThickneSS  | Thickness (note capital S in header)             |
| 5 | Length     | Length (meters)                                 |
| 6 | Width      | Width (meters)                                  |
| 7 | Leaves     | Number of leaves                                |
| 8 | Sq Mtr     | Square meters                                   |
| 9 | Character  | Character name (e.g., FLARE, LAST DEMO)         |
|10 | Pattern    | Pattern name (e.g., NATURAL WO YZ, TESTING)    |
|11 | Series     | Series name (e.g., TEST, AC)                   |
|12 | Remarks    | Remarks                                         |

### Data Rows
- One row per dressing item; all sessions for the date (or the single session when `dressingId` is provided) are listed in one continuous table.
- No duplicate columns; no separate summary table—only this single details table.

### Total Row
- Immediately after the last data row.
- First column: label **Total**.
- Column 7 (Leaves): sum of all Leaves.
- Column 8 (Sq Mtr): sum of all Sq Mtr.
- Other columns blank in the total row.

### Veneer Summary Section

Placed after the main table and Total row.

**Headers:** ITEM NAME | LEAVE | SQ. MTR

**Data:** One row per unique item name. LEAVE = sum of `no_of_leaves` per item; SQ. MTR = sum of `sqm` per item. Sorted by item name.

**Total row:** Sum of LEAVE and SQ. MTR across all items.

**Example:**
| ITEM NAME   | LEAVE | SQ. MTR |
|-------------|-------|---------|
| IVORY CROWN | 3     | 9.00    |
| WHITE OAK   | 3     | 9.00    |
| TOTAL       | 6     | 18.00   |

### Log Summary Section

Placed after Veneer Summary.

**Headers:** LOG NO | ITEM NAME | CMT | LEAVES | SQ. MTR

**Data:** One row per unique (log_no_code, item_name) pair. CMT = sum of `volume` (Cubic Meter of Timber); LEAVES = sum of `no_of_leaves`; SQ. MTR = sum of `sqm`. Sorted by log no, then item name.

**Total row:** Sum of CMT, LEAVES, and SQ. MTR across all log rows.

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Optional session filter**: `dressingId` to restrict to one dressing session.
- **Single table layout**: All columns in one header row; no duplicated columns.
- **Veneer Summary**: Grouped by item name with totals for Leaves and Sq Mtr.
- **Log Summary**: Grouped by log no and item name with CMT, Leaves, Sq Mtr and totals.
- **Automatic totals**: Total rows for main table, Veneer Summary, and Log Summary.
- **Bold formatting**: Headers and total rows are bold.
- **Visual styling**: Header rows have gray background.
- **Numeric formatting**: Thickness, Length, Width, Sq Mtr formatted to 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/Dressing/dressing_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row**: "Dressing Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **One main table**: 12 columns (see Field Mapping below). Each data row is one dressing item; rows are ordered by Item Name, then LogX, then Bundle No.
   - **One Total row**: Sum of Leaves (column 7) and sum of Sq Mtr (column 8) over all data rows; other columns blank.
   - **Veneer Summary**: ITEM NAME, LEAVE, SQ. MTR—grouped by item with totals.
   - **Log Summary**: LOG NO, ITEM NAME, CMT, LEAVES, SQ. MTR—grouped by log and item with totals.

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from sessions** and **attach items**:

1. **Source collection**: `dressing_done_other_details` (one document per dressing session).

2. **Filter** (`$match`):
   - `dressing_date` between start and end of `reportDate` (00:00:00 to 23:59:59).
   - If `dressingId` is provided: also `_id` equals that ObjectId (single session).

3. **Attach items** (`$lookup`):
   - From: `dressing_done_items`
   - Join: `dressing_done_other_details._id` = `dressing_done_items.dressing_done_other_details_id`
   - Result: each session document gets an `items` array (all items for that session).

4. **One row per item** (`$unwind` on `items`):
   - Each session document becomes one document per item (session fields repeat for each item).
   - Documents with no items are dropped (`preserveNullAndEmptyArrays: false`).

5. **Sort** (`$sort`):
   - By `items.item_name` (asc), then `items.log_no_code` (asc), then `items.bundle_number` (asc).

6. **Project to flat shape** (`$project`):
   - Item: `item_name`, `log_no_code`, `bundle_number`, `thickness`, `length`, `width`, `no_of_leaves`, `sqm`, `volume`, `character_name`, `pattern_name`, `series_name`, `remark`.

**Result of aggregation**: An array of flat objects. Each object = one dressing item row. Order: by item_name, log_no_code, bundle_number.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Title**: "Dressing Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Main table**: One header row (all 12 column names), then one data row per aggregated object (see Field Mapping). No extra grouping; one line per item.
- **Totals**:  
  - Total Leaves = sum of `no_of_leaves` over all aggregated rows.  
  - Total Sq Mtr = sum of `sqm` over all aggregated rows.  
  Written in the Total row in columns 7 and 8.
- **Veneer Summary**: Group aggregated rows by `item_name`; for each item compute SUM(`no_of_leaves`) and SUM(`sqm`). Write header (ITEM NAME, LEAVE, SQ. MTR), data rows, and TOTAL row.
- **Log Summary**: Group aggregated rows by (`log_no_code`, `item_name`); for each group compute SUM(`volume`), SUM(`no_of_leaves`), SUM(`sqm`). Write header (LOG NO, ITEM NAME, CMT, LEAVES, SQ. MTR), data rows, and TOTAL row.

---

## Field Mapping (Excel Column → Source)

Every value in the Excel comes from the aggregated rows or from the above calculations. This table maps each report column to its source.

| # | Report column | Source (after aggregation) | DB collection | DB field | Notes |
|---|----------------|-----------------------------|---------------|-----------|--------|
| 1 | Item Name     | `item_name`                 | dressing_done_items | item_name | Direct |
| 2 | LogX          | `log_no_code`               | dressing_done_items | log_no_code | Direct |
| 3 | Bundle No     | `bundle_number`             | dressing_done_items | bundle_number | Direct |
| 4 | ThickneSS     | `thickness`                 | dressing_done_items | thickness | Direct; header spelled "ThickneSS" |
| 5 | Length        | `length`                    | dressing_done_items | length | Direct |
| 6 | Width         | `width`                     | dressing_done_items | width | Direct |
| 7 | Leaves        | `no_of_leaves`              | dressing_done_items | no_of_leaves | Direct in data rows; **Total row** = SUM(no_of_leaves) |
| 8 | Sq Mtr        | `sqm`                       | dressing_done_items | sqm | Direct in data rows; **Total row** = SUM(sqm) |
| 9 | Character     | `character_name`            | dressing_done_items | character_name | Direct |
|10 | Pattern       | `pattern_name`              | dressing_done_items | pattern_name | Direct |
|11 | Series        | `series_name`               | dressing_done_items | series_name | Direct |
|12 | Remarks       | `remark`                    | dressing_done_items | remark | Direct |

**Veneer Summary section:**

| Report column | Source | Notes |
|---------------|--------|-------|
| ITEM NAME     | `item_name` | Group key; one row per unique item |
| LEAVE         | SUM(`no_of_leaves`) | Per item |
| SQ. MTR       | SUM(`sqm`)  | Per item |

**Log Summary section:**

| Report column | Source | Notes |
|---------------|--------|-------|
| LOG NO        | `log_no_code` | Group key with item_name |
| ITEM NAME     | `item_name` | Group key with log_no_code |
| CMT           | SUM(`volume`) | Cubic Meter of Timber from dressing_done_items.volume |
| LEAVES        | SUM(`no_of_leaves`) | Per log+item |
| SQ. MTR       | SUM(`sqm`)  | Per log+item |

---

## Calculations

All numeric values in **data rows** are **pass-through** from the database (no formulas). Totals are computed in the Excel generator.

### Data rows (main table)

- **Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks**  
  = same-named field from the aggregated row (which comes from `dressing_done_items` as in the Field Mapping table).  
- No calculation; value is whatever is stored in the DB for that dressing item.

### Total row (main table)

- **Column 1 (label)**: Literal `"Total"`.
- **Column 7 (Leaves)**:
  ```
  Total Leaves = SUM(no_of_leaves) over all aggregated rows
  ```
- **Column 8 (Sq Mtr)**:
  ```
  Total Sq Mtr = SUM(sqm) over all aggregated rows
  ```
- **Columns 2–6, 9–12**: Left blank in the Total row.

### Veneer Summary section

- **ITEM NAME**: Group key; one row per unique `item_name`.
- **LEAVE**: `SUM(no_of_leaves)` over all aggregated rows with that item.
- **SQ. MTR**: `SUM(sqm)` over all aggregated rows with that item.
- **TOTAL row**: Sum of LEAVE and SQ. MTR across all Veneer Summary rows.

### Log Summary section

- **LOG NO, ITEM NAME**: Group key; one row per unique (`log_no_code`, `item_name`).
- **CMT**: `SUM(volume)` over all aggregated rows with that log+item (volume = Cubic Meter of Timber).
- **LEAVES**: `SUM(no_of_leaves)` over all aggregated rows with that log+item.
- **SQ. MTR**: `SUM(sqm)` over all aggregated rows with that log+item.
- **TOTAL row**: Sum of CMT, LEAVES, SQ. MTR across all Log Summary rows.

---

## Data Sources and Relationships

### Database Collections Used

1. **dressing_done_other_details** (sessions)
   - One document per dressing run (date, shift, hours).
   - Key fields: `_id`, `dressing_date`, `shift`, `no_of_workers`, `no_of_working_hours`, `no_of_total_hours`.
   - Used for filtering by date and optional `dressingId`.

2. **dressing_done_items** (items)
   - One document per dressed item (bundle).
   - Linked to session by: `dressing_done_other_details_id` = `dressing_done_other_details._id`.
   - Key fields: `item_name`, `log_no_code`, `bundle_number`, `thickness`, `length`, `width`, `no_of_leaves`, `sqm`, `volume` (CMT), `character_name`, `pattern_name`, `series_name`, `remark`.

### Join Diagram (conceptual)

```
dressing_done_other_details (1)
    │ _id
    └── dressing_done_items (N)  via dressing_done_other_details_id
```

- One session has many items; each item row in the report is one dressing item. Veneer Summary groups by item; Log Summary groups by (log_no_code, item_name).

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-dressing-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-11-05"
    }
  }'
```

### With optional dressingId
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-dressing-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-11-05",
      "dressingId": "690aed51c7445a1b2c3d4e5f"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateDressingReport = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-dressing-daily-report',
      {
        filters: {
          reportDate: '2025-11-05'
          // dressingId: '690aed51c7445a1b2c3d4e5f' // optional
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    const downloadUrl = response.data.result;
    console.log('Download report from:', downloadUrl);
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

## Notes

- Report includes all dressing sessions for the given date unless `dressingId` is specified.
- Veneer Summary and Log Summary sections appear after the main table; spelling "SUMMARY" matches report spec.
- Header spelling **ThickneSS** (capital S at end) is intentional per report spec.
- CMT in Log Summary is sourced from `dressing_done_items.volume` (Cubic Meter of Timber).
- Excel files are timestamped; stored in `public/reports/Dressing/`.

## File Storage

**Directory**: `public/reports/Dressing/`

**Filename pattern**: `dressing_daily_report_{timestamp}.xlsx`

**Example**: `dressing_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Dressing Details Report Date: 05/11/2025

Item Name    | LogX   | Bundle No | ThickneSS | Length | Width | Leaves | Sq Mtr   | Character | Pattern      | Series | Remarks
IVORY CROWN  | L24PDA | 1         | 547.00    | 20.00  | 5.00  | 442    | 44200.00 | FLARE     | NATURAL WO YZ| TEST   |
IVORY CROWN  | X1PDR  | 11        | 5.00      | 12.00  | 12.00 | 25     | 3600.00  | LAST DEMO | TESTING      | AC     |
IVORY CROWN  | X1PDR  | 12        | 5.00      | 12.00  | 12.00 | 25     | 3600.00  | LAST DEMO | TESTING      | AC     |
Total        |        |           |           |        |       | 492    | 51400.00 |           |             |        |

VENEER SUMMARY
ITEM NAME   | LEAVE | SQ. MTR
IVORY CROWN | 492   | 51400.00
TOTAL       | 492   | 51400.00

LOG SUMMARY
LOG NO  | ITEM NAME   | CMT    | LEAVES | SQ. MTR
L24PDA  | IVORY CROWN | 0.00   | 442    | 44200.00
X1PDR   | IVORY CROWN | 0.00   | 50     | 7200.00
TOTAL   |             | 0.00   | 492    | 51400.00
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Dressing operations occurred on that date (`dressing_done_other_details` and `dressing_done_items` exist for that date).
- If `dressingId` is used, the Id is valid and belongs to the given date.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-11-05"`).

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Dressing/dressingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Dressing/dressingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Dressing/dressing.routes.js
```

### Aggregation Pipeline (exact stages)

Pipeline runs on **dressing_done_other_details** (model: `dressing_done_other_details_model`). Order and purpose of each stage:

**Stage 1 – $match**  
Filter sessions by date (and optional dressingId):

```javascript
{
  $match: {
    dressing_date: { $gte: startOfDay, $lte: endOfDay }
    // if dressingId provided: _id: ObjectId(dressingId)
  }
}
```

- `startOfDay` = `new Date(reportDate)` with time 00:00:00.000  
- `endOfDay` = `new Date(reportDate)` with time 23:59:59.999  

**Stage 2 – $lookup (dressing_done_items)**  
Attach all items for each session:

```javascript
{
  $lookup: {
    from: 'dressing_done_items',
    localField: '_id',
    foreignField: 'dressing_done_other_details_id',
    as: 'items'
  }
}
```

**Stage 3 – $unwind (items)**  
One document per item; drop sessions with no items:

```javascript
{
  $unwind: {
    path: '$items',
    preserveNullAndEmptyArrays: false
  }
}
```

**Stage 4 – $sort**  
Order for the report:

```javascript
{
  $sort: {
    'items.item_name': 1,
    'items.log_no_code': 1,
    'items.bundle_number': 1
  }
}
```

**Stage 5 – $project**  
Flatten to one object per row (names used by Excel generator):

```javascript
{
  $project: {
    item_name: '$items.item_name',
    log_no_code: '$items.log_no_code',
    bundle_number: '$items.bundle_number',
    thickness: '$items.thickness',
    length: '$items.length',
    width: '$items.width',
    no_of_leaves: '$items.no_of_leaves',
    sqm: '$items.sqm',
    volume: '$items.volume',
    character_name: '$items.character_name',
    pattern_name: '$items.pattern_name',
    series_name: '$items.series_name',
    remark: '$items.remark'
  }
}
```

**Result**: Array of flat objects. Each object has one dressing item. This array is passed to `GenerateDressingDailyReport(rows, reportDate)` in the Excel config; the config writes the main table (one row per object), computes Total Leaves and Total Sq Mtr from `no_of_leaves` and `sqm`, and builds Veneer Summary and Log Summary sections from the aggregated data.
