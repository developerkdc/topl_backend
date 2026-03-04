# Smoking&Dying (Dyeing) Daily Report API

## Overview
The Smoking&Dying Daily Report API generates Excel reports showing dyeing (smoking & dying) production details for a specific date. The report includes a main table with Item Name, New Item Name, and LogX (merged vertically per log group), then Bundle No, Sq Mtr, Colour Code, and Remarks per bundle; a Total row for bundle count and total Sq Mtr; and a session metadata table at the end (Dyeing Id, Shift, Work Hours, Worker, Machine Id).

## Endpoint
```
POST /report/download-excel-smoking-dying-daily-report
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
    "smokingDyingId": "690aed51c7445a1b2c3d4e5f"
  }
}
```

- **smokingDyingId** (optional): MongoDB ObjectId of a specific `process_done_details` record. When provided, the report includes only that smoking/dying session; when omitted, all sessions for the given date are included.

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/SmokingDying/smoking_dying_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Smoking & dying daily report generated successfully"
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

#### 400 Bad Request – Invalid smoking dying Id
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid smoking dying Id"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No smoking & dying data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Dyeing Details Report Date: DD/MM/YYYY
```

**Example:**
```
Dyeing Details Report Date: 05/11/2025
```

### Row 2: Empty (spacing)

### Row 3: Main Data Headers (single line)

All columns in one header row:

| # | Column        | Description                                      |
|---|---------------|--------------------------------------------------|
| 1 | Item Name     | Original item name (e.g., RED OAK)              |
| 2 | New Item Name | Item after process (e.g., TAN OAK)               |
| 3 | LogX          | Log identifier code (e.g., D25A1A, D3A1A)       |
| 4 | Bundle No     | Bundle number                                   |
| 5 | Sq Mtr        | Square meters                                   |
| 6 | Colour Code   | Colour name (if any)                            |
| 7 | Remarks       | Remarks                                         |

### Data Rows
- One row per bundle; all sessions for the date (or the single session when `smokingDyingId` is provided) are listed in one table.
- **Left block (columns 1–3):** Item Name, New Item Name, and LogX are **merged vertically** for each contiguous group of rows that share the same LogX (within the same session). So multiple bundle rows for the same log show one merged cell for Item Name, one for New Item Name, and one for LogX.
- **Right block (columns 4–7):** Bundle No, Sq Mtr, Colour Code, and Remarks vary per row (one value per bundle).

### Total Row
- Immediately after the last data row.
- First column: label **Total**.
- Column 4 (Bundle No): total number of bundles (row count).
- Column 5 (Sq Mtr): sum of all Sq Mtr.
- Other columns blank in the total row.

### Session Details Section (at the end)

Placed after the main table and Total row.

**Headers:** Dyeing Id | Shift | Work Hours | Worker | Machine Id

**Data:** One row per smoking/dying session (unique `process_done_id`). Machine Id is not in the schema and is left blank.

**Example:**
| Dyeing Id      | Shift | Work Hours | Worker   | Machine Id |
|----------------|-------|------------|----------|------------|
| 690aed51c7445... | DAY   | 2          | SUPER ADM|            |
| 690b0a526e762... | DAY   | 1          | SUPER ADM|            |

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Optional session filter**: `smokingDyingId` to restrict to one smoking/dying session.
- **Merged left block**: Item Name, New Item Name, and LogX are merged vertically per log group for clearer grouping.
- **Session details at end**: All session metadata (Dyeing Id, Shift, Work Hours, Worker, Machine Id) at the end of the report.
- **Automatic totals**: One Total row for bundle count and total Sq Mtr.
- **Bold formatting**: Headers and total row are bold.
- **Visual styling**: Header row has gray background.
- **Numeric formatting**: Sq Mtr formatted to 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/SmokingDying/smoking_dying_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row**: "Dyeing Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **One main table**: 7 columns (see Field Mapping below). Each data row is one bundle; rows are ordered by LogX, then Bundle No. Columns 1–3 are merged per log group.
   - **One Total row**: Bundle count (number of rows) and sum of Sq Mtr; other columns blank.
   - **Session details section** (at the end): One header row and one data row per session. Each session row shows Dyeing Id, Shift, Work Hours, Worker name, and Machine Id (blank).

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from sessions** and **attach items and worker name**:

1. **Source collection**: `process_done_details` (one document per smoking/dying session).

2. **Filter** (`$match`):
   - `process_done_date` between start and end of `reportDate` (00:00:00 to 23:59:59).
   - If `smokingDyingId` is provided: also `_id` equals that ObjectId (single session).

3. **Attach items** (`$lookup`):
   - From: `process_done_items_details`
   - Join: `process_done_details._id` = `process_done_items_details.process_done_id`
   - Result: each session document gets an `items` array (all items for that session).

4. **One row per item** (`$unwind` on `items`):
   - Each session document becomes one document per bundle (session fields repeat for each item).
   - Documents with no items are dropped (`preserveNullAndEmptyArrays: false`).

5. **Attach worker name** (`$lookup` on `users`):
   - From: `users`
   - Join: `process_done_details.created_by` = `users._id`
   - We only pull `first_name` and `last_name`.
   - Result: each document gets a `worker` object (or empty if no user).

6. **Flatten worker** (`$unwind` on `worker`):
   - `preserveNullAndEmptyArrays: true` so sessions without a matching user still appear.

7. **Sort** (`$sort`):
   - By `items.log_no_code` (asc), then `items.bundle_number` (asc).

8. **Project to flat shape** (`$project`):
   - Session: `process_done_id` = `_id`, `shift`, `no_of_working_hours`, `no_of_workers`, `worker` = `first_name + " " + last_name`.
   - Item: `item_name`, `item_sub_category_name`, `log_no_code`, `bundle_number`, `sqm`, `color_name`, `remark`.

**Result of aggregation**: An array of flat objects. Each object = one bundle row with its session metadata and worker name. Order: by log_no_code, bundle_number.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Title**: "Dyeing Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Main table**: One header row (all 7 column names), then one data row per aggregated object. When iterating rows, detect log-group boundaries (same `process_done_id` + same `log_no_code`); for each such block, merge cells in columns 1, 2, and 3 from the first row to the last row of that block.
- **Totals**:
  - Total bundle count = number of aggregated rows.
  - Total Sq Mtr = sum of `sqm` over all aggregated rows.
  Written in the Total row in columns 4 and 5.
- **Session details**:
  - Scan aggregated rows and collect **unique** `process_done_id` (order preserved).
  - For each unique `process_done_id`, take `shift`, `no_of_working_hours`, and `worker` from any row with that `process_done_id`.
  - Write one header row (Dyeing Id, Shift, Work Hours, Worker, Machine Id) then one data row per session. Machine Id is left blank.

---

## Field Mapping (Excel Column → Source)

Every value in the Excel comes from the aggregated rows or from the above calculations. This table maps each report column to its source.

| # | Report column   | Source (after aggregation)   | DB collection                    | DB field                | Notes |
|---|-----------------|------------------------------|----------------------------------|-------------------------|--------|
| 1 | Item Name       | `item_name`                  | process_done_items_details       | item_name               | Direct; merged per log group |
| 2 | New Item Name   | `item_sub_category_name`     | process_done_items_details       | item_sub_category_name  | Direct; merged per log group |
| 3 | LogX            | `log_no_code`                | process_done_items_details       | log_no_code             | Direct; merged per log group |
| 4 | Bundle No       | `bundle_number`              | process_done_items_details       | bundle_number           | Direct |
| 5 | Sq Mtr          | `sqm`                        | process_done_items_details       | sqm                     | Direct in data rows; **Total row** = SUM(sqm) |
| 6 | Colour Code     | `color_name`                 | process_done_items_details       | color_name              | Direct |
| 7 | Remarks         | `remark`                     | process_done_items_details       | remark                  | Direct |

**Total row:** Column 4 = row count (bundle count); Column 5 = sum of `sqm`.

**Session details section (at end of report):**

| Report column | Source (after aggregation) | DB collection          | DB field              | Notes |
|---------------|----------------------------|------------------------|------------------------|--------|
| Dyeing Id     | `process_done_id`          | process_done_details   | _id                   | One row per unique process_done_id |
| Shift         | `shift`                    | process_done_details   | shift                 | |
| Work Hours    | `no_of_working_hours`      | process_done_details   | no_of_working_hours   | |
| Worker        | `worker`                   | users                  | first_name + " " + last_name | Resolved via process_done_details.created_by → users._id |
| Machine Id    | —                          | —                      | —                     | Not in schema; always blank |

---

## Calculations

All numeric values in **data rows** are **pass-through** from the database (no formulas). Only the **Total row** and **Worker** are derived.

### Data rows (main table)

- **Item Name, New Item Name, LogX, Bundle No, Sq Mtr, Colour Code, Remarks**
  = same-named field from the aggregated row (which comes from `process_done_items_details` or session metadata as in the Field Mapping table).
- No calculation; value is whatever is stored in the DB for that bundle.
- Columns 1–3 are merged per log group in the Excel (same value repeated for each row in the group).

### Total row (main table)

- **Column 1 (label)**: Literal `"Total"`.
- **Column 4 (Bundle No)**:
  ```
  Total bundles = number of aggregated rows
  ```
- **Column 5 (Sq Mtr)**:
  ```
  Total Sq Mtr = SUM(sqm) over all aggregated rows
  ```
- **Columns 2–3, 6–7**: Left blank in the Total row.

### Worker name (session details section)

- Computed in the aggregation pipeline (not in Excel):
  ```
  worker = users.first_name + " " + users.last_name
  ```
  (with nulls as empty string).
- Same value is repeated for every aggregated row that belongs to that session; the Excel generator uses the first occurrence per `process_done_id` for the session details block.

### Session details section (one row per session)

- **Dyeing Id**: Unique `process_done_id` from aggregated rows (order preserved).
- **Shift, Work Hours, Worker**: Taken from any aggregated row that has that `process_done_id` (same for all rows of that session).
- **Machine Id**: Not stored anywhere; cell is blank.

---

## Data Sources and Relationships

### Database Collections Used

1. **process_done_details** (sessions)
   - One document per smoking/dying run (date, shift, hours, who created it).
   - Key fields: `_id`, `process_done_date`, `shift`, `no_of_workers`, `no_of_working_hours`, `no_of_total_hours`, `created_by`.
   - `_id` is shown as **Dyeing Id** in the session details section.

2. **process_done_items_details** (items / bundles)
   - One document per bundle.
   - Linked to session by: `process_done_id` = `process_done_details._id`.
   - Key fields: `item_name`, `item_sub_category_name`, `log_no_code`, `bundle_number`, `sqm`, `color_name`, `remark`.

3. **users**
   - Used only to resolve worker name.
   - Join: `process_done_details.created_by` = `users._id`.
   - Fields used: `first_name`, `last_name` (concatenated for **Worker**).

### Join Diagram (conceptual)

```
process_done_details (1)
    │ _id
    ├── process_done_items_details (N)  via process_done_id
    └── users (1)                        via created_by  →  worker name
```

- One session has many bundles; each bundle row in the report carries the same session metadata (process_done_id, shift, work hours, worker).
- Session details at the end of the report list each session once (unique process_done_id) with that session’s shift, work hours, and worker name.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-smoking-dying-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-11-05"
    }
  }'
```

### With optional smokingDyingId
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-smoking-dying-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-11-05",
      "smokingDyingId": "690aed51c7445a1b2c3d4e5f"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateSmokingDyingReport = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-smoking-dying-daily-report',
      {
        filters: {
          reportDate: '2025-11-05'
          // smokingDyingId: '690aed51c7445a1b2c3d4e5f' // optional
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

- Report includes all smoking/dying sessions for the given date unless `smokingDyingId` is specified.
- Session details appear only at the end of the report; one row per unique session.
- Machine Id is not stored in the current schema; column is present but blank.
- Excel files are timestamped; stored in `public/reports/SmokingDying/`.
- Item Name and New Item Name correspond to `item_name` and `item_sub_category_name` in `process_done_items_details`.

## File Storage

**Directory**: `public/reports/SmokingDying/`

**Filename pattern**: `smoking_dying_daily_report_{timestamp}.xlsx`

**Example**: `smoking_dying_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Dyeing Details Report Date: 05/11/2025

Item Name  | New Item Name | LogX   | Bundle No | Sq Mtr   | Colour Code | Remarks
RED OAK    | TAN OAK       | D25A1A  | 2         | 9.54     |             |
           |               |         | 3         | 10.15    |             |
           |               |         | 4         | 10.29    |             |
           |               |         | ...       | ...      |             |
RED OAK    | TAN OAK       | D3A1A   | 1         | 9.02     |             |
Total      |               |         | 51        | 559.55   |             |

Dyeing Id       | Shift | Work Hours | Worker   | Machine Id
690aed51c7445... | DAY   | 2          | SUPER ADM|
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Smoking/dying operations occurred on that date (`process_done_details` and `process_done_items_details` exist for that date).
- If `smokingDyingId` is used, the Id is valid and belongs to the given date.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-11-05"`).

### Missing Worker Details
Worker name is resolved from `users` via `process_done_details.created_by`. If worker names are missing, ensure `created_by` references valid user IDs and the users collection has `first_name` and `last_name`.

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Smoking&Dying/smokingDyingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Smoking&Dying/smokingDyingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Smoking&Dying/smoking_dying.routes.js
```

### Aggregation Pipeline (exact stages)

Pipeline runs on **process_done_details** (model: `process_done_details_model`). Order and purpose of each stage:

**Stage 1 – $match**
Filter sessions by date (and optional smokingDyingId):

```javascript
{
  $match: {
    process_done_date: { $gte: startOfDay, $lte: endOfDay }
    // if smokingDyingId provided: _id: ObjectId(smokingDyingId)
  }
}
```

- `startOfDay` = `new Date(reportDate)` with time 00:00:00.000
- `endOfDay` = `new Date(reportDate)` with time 23:59:59.999

**Stage 2 – $lookup (process_done_items_details)**
Attach all items for each session:

```javascript
{
  $lookup: {
    from: 'process_done_items_details',
    localField: '_id',
    foreignField: 'process_done_id',
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
Order for the report (and for stable session-details order):

```javascript
{
  $sort: {
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
    process_done_id: '$_id',
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
    item_sub_category_name: '$items.item_sub_category_name',
    log_no_code: '$items.log_no_code',
    bundle_number: '$items.bundle_number',
    sqm: '$items.sqm',
    color_name: '$items.color_name',
    remark: '$items.remark'
  }
}
```

**Result**: Array of flat objects. Each object has one bundle plus session fields (`process_done_id`, `shift`, `no_of_working_hours`, `worker`). This array is passed to `GenerateSmokingDyingDailyReport(rows, reportDate)` in the Excel config; the config writes the main table (one row per object, with merged cells for columns 1–3 per log group), computes Total bundle count and Total Sq Mtr from row count and `sqm`, and builds the session details section from unique `process_done_id` with their `shift`, `no_of_working_hours`, and `worker`.
