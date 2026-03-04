# Dressing Daily Report API

## Overview
The Dressing Daily Report API generates Excel reports showing dressing production details for a specific date. The report includes item-level details (Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks) in a single table, a Total row for Leaves and Sq Mtr, and worker/session metadata at the end of the report.

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

### Worker Details Section (at the end)

Placed after the main table and Total row.

**Headers:** Dressing Id | Shift | Work Hours | Worker | Machine Id

**Data:** One row per dressing session (unique `dressing_id`). Machine Id is not in the schema and is left blank.

**Example:**
| Dressing Id      | Shift | Work Hours | Worker   | Machine Id |
|------------------|-------|------------|----------|------------|
| 690aed51c7445... | DAY   | 2          | SUPER ADM|            |
| 690b0a526e762... | DAY   | 1          | SUPER ADM|            |

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Optional session filter**: `dressingId` to restrict to one dressing session.
- **Single table layout**: All columns in one header row; no duplicated columns.
- **Worker details at end**: All session metadata (Dressing Id, Shift, Work Hours, Worker, Machine Id) at the end of the report.
- **Automatic totals**: One Total row for Leaves and Sq Mtr.
- **Bold formatting**: Headers and total row are bold.
- **Visual styling**: Header row has gray background.
- **Numeric formatting**: Thickness, Length, Width, Sq Mtr formatted to 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/Dressing/dressing_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row**: "Dressing Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **One main table**: 12 columns (see Field Mapping below). Each data row is one dressing item; rows are ordered by Item Name, then LogX, then Bundle No.
   - **One Total row**: Sum of Leaves (column 7) and sum of Sq Mtr (column 8) over all data rows; other columns blank.
   - **Worker details section** (at the end): One header row and one data row per dressing session. Each session row shows Dressing Id, Shift, Work Hours, Worker name, and Machine Id (blank).

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from sessions** and **attach items and worker name**:

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

5. **Attach worker name** (`$lookup` on `users`):
   - From: `users`
   - Join: `dressing_done_other_details.created_by` = `users._id`
   - We only pull `first_name` and `last_name`.
   - Result: each document gets a `worker` object (or empty if no user).

6. **Flatten worker** (`$unwind` on `worker`):
   - `preserveNullAndEmptyArrays: true` so sessions without a matching user still appear.

7. **Sort** (`$sort`):
   - By `items.item_name` (asc), then `items.log_no_code` (asc), then `items.bundle_number` (asc).

8. **Project to flat shape** (`$project`):
   - Session: `dressing_id` = `_id`, `shift`, `no_of_working_hours`, `no_of_workers`, `worker` = `first_name + " " + last_name`.
   - Item: `item_name`, `log_no_code`, `bundle_number`, `thickness`, `length`, `width`, `no_of_leaves`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`.

**Result of aggregation**: An array of flat objects. Each object = one dressing item row with its session metadata and worker name. Order: by item_name, log_no_code, bundle_number.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Title**: "Dressing Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Main table**: One header row (all 12 column names), then one data row per aggregated object (see Field Mapping). No extra grouping; one line per item.
- **Totals**:  
  - Total Leaves = sum of `no_of_leaves` over all aggregated rows.  
  - Total Sq Mtr = sum of `sqm` over all aggregated rows.  
  Written in the Total row in columns 7 and 8.
- **Worker details**:  
  - Scan aggregated rows and collect **unique** `dressing_id` (order preserved).  
  - For each unique `dressing_id`, take `shift`, `no_of_working_hours`, and `worker` from any row with that `dressing_id`.  
  - Write one header row (Dressing Id, Shift, Work Hours, Worker, Machine Id) then one data row per session. Machine Id is left blank.

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

**Worker details section (at end of report):**

| Report column | Source (after aggregation) | DB collection | DB field | Notes |
|----------------|-----------------------------|---------------|----------|--------|
| Dressing Id    | `dressing_id`               | dressing_done_other_details | _id | One row per unique dressing_id |
| Shift          | `shift`                     | dressing_done_other_details | shift | |
| Work Hours     | `no_of_working_hours`       | dressing_done_other_details | no_of_working_hours | |
| Worker         | `worker`                    | users         | first_name + " " + last_name | Resolved via dressing_done_other_details.created_by → users._id |
| Machine Id     | —                           | —             | — | Not in schema; always blank |

---

## Calculations

All numeric values in **data rows** are **pass-through** from the database (no formulas). Only the **Total row** and **Worker** are derived.

### Data rows (main table)

- **Item Name, LogX, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, Character, Pattern, Series, Remarks**  
  = same-named field from the aggregated row (which comes from `dressing_done_items` or session metadata as in the Field Mapping table).  
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

### Worker name (worker details section)

- Computed in the aggregation pipeline (not in Excel):
  ```
  worker = users.first_name + " " + users.last_name
  ```
  (with nulls as empty string).  
- Same value is repeated for every aggregated row that belongs to that session; the Excel generator uses the first occurrence per `dressing_id` for the worker details block.

### Worker details section (one row per session)

- **Dressing Id**: Unique `dressing_id` from aggregated rows (order preserved).
- **Shift, Work Hours, Worker**: Taken from any aggregated row that has that `dressing_id` (same for all rows of that session).
- **Machine Id**: Not stored anywhere; cell is blank.

---

## Data Sources and Relationships

### Database Collections Used

1. **dressing_done_other_details** (sessions)
   - One document per dressing run (date, shift, hours, who created it).
   - Key fields: `_id`, `dressing_date`, `shift`, `no_of_workers`, `no_of_working_hours`, `no_of_total_hours`, `created_by`.
   - `_id` is shown as **Dressing Id** in the worker details section.

2. **dressing_done_items** (items)
   - One document per dressed item (bundle).
   - Linked to session by: `dressing_done_other_details_id` = `dressing_done_other_details._id`.
   - Key fields: `item_name`, `log_no_code`, `bundle_number`, `thickness`, `length`, `width`, `no_of_leaves`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`.

3. **users**
   - Used only to resolve worker name.
   - Join: `dressing_done_other_details.created_by` = `users._id`.
   - Fields used: `first_name`, `last_name` (concatenated for **Worker**).

### Join Diagram (conceptual)

```
dressing_done_other_details (1)
    │ _id
    ├── dressing_done_items (N)  via dressing_done_other_details_id
    └── users (1)                 via created_by  →  worker name
```

- One session has many items; each item row in the report carries the same session metadata (dressing_id, shift, work hours, worker).
- Worker details at the end of the report list each session once (unique dressing_id) with that session’s shift, work hours, and worker name.

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
- Worker details appear only at the end of the report; one row per unique dressing session.
- Header spelling **ThickneSS** (capital S at end) is intentional per report spec.
- Machine Id is not stored in the current schema; column is present but blank.
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

Dressing Id       | Shift | Work Hours | Worker   | Machine Id
690aed51c7445...  | DAY   | 2          | SUPER ADM|
690b0a526e762...  | DAY   | 1          | SUPER ADM|
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Dressing operations occurred on that date (`dressing_done_other_details` and `dressing_done_items` exist for that date).
- If `dressingId` is used, the Id is valid and belongs to the given date.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-11-05"`).

### Missing Worker Details
Worker name is resolved from `users` via `dressing_done_other_details.created_by`. If worker names are missing, ensure `created_by` references valid user IDs and the users collection has `first_name` and `last_name`.

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

**Stage 4 – $lookup (users)**  
Attach worker name for each document:

```javascript
{
  $lookup: {
    from: 'users',
    localField: 'created_by',
    foreignField: '_id',
    as: 'worker',
    pipeline: [{ $project: { first_name: 1, last_name: 1 } }]
  }
}
```

**Stage 5 – $unwind (worker)**  
Flatten worker; keep documents even if no user match:

```javascript
{
  $unwind: {
    path: '$worker',
    preserveNullAndEmptyArrays: true
  }
}
```

**Stage 6 – $sort**  
Order for the report (and for stable worker-details order):

```javascript
{
  $sort: {
    'items.item_name': 1,
    'items.log_no_code': 1,
    'items.bundle_number': 1
  }
}
```

**Stage 7 – $project**  
Flatten to one object per row (names used by Excel generator):

```javascript
{
  $project: {
    dressing_id: '$_id',
    shift: 1,
    no_of_working_hours: 1,
    no_of_workers: 1,
    worker: {
      $concat: [
        { $ifNull: ['$worker.first_name', ''] },
        ' ',
        { $ifNull: ['$worker.last_name', ''] }
      ]
    },
    item_name: '$items.item_name',
    log_no_code: '$items.log_no_code',
    bundle_number: '$items.bundle_number',
    thickness: '$items.thickness',
    length: '$items.length',
    width: '$items.width',
    no_of_leaves: '$items.no_of_leaves',
    sqm: '$items.sqm',
    character_name: '$items.character_name',
    pattern_name: '$items.pattern_name',
    series_name: '$items.series_name',
    remark: '$items.remark'
  }
}
```

**Result**: Array of flat objects. Each object has one dressing item plus session fields (`dressing_id`, `shift`, `no_of_working_hours`, `worker`). This array is passed to `GenerateDressingDailyReport(rows, reportDate)` in the Excel config; the config writes the main table (one row per object), computes Total Leaves and Total Sq Mtr from `no_of_leaves` and `sqm`, and builds the worker details section from unique `dressing_id` with their `shift`, `no_of_working_hours`, and `worker`.
