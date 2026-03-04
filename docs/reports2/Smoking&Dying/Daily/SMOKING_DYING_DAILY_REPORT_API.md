# Smoking Daily Report API

## Overview
The Smoking Daily Report API generates Excel reports showing smoking/dyeing production details for a specific date. The report includes a main table with Item Name, LogX (merged vertically per log group), Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, PROCESS, Process color, Character, Pattern, Series, and Remarks per bundle; subtotal rows per item (label "TOTAL"); a Grand Total row; and a Summary section (ITEM NAME, RECEIVED MTR., PROCESS NAME, LEAVE, PRODUCTION SQ. MTR).

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
Smoking Details Report Date: DD/MM/YYYY
```

**Example:**
```
Smoking Details Report Date: 05/11/2025
```

### Row 2: Empty (spacing)

### Row 3: Main Data Headers (single line)

All columns in one header row:

| # | Column       | Description                                      |
|---|--------------|--------------------------------------------------|
| 1 | Item Name    | Original item name (e.g., IVORY CROWN)           |
| 2 | LogX         | Log identifier code (e.g., L24PDA, X1PDR)       |
| 3 | Bundle No    | Bundle number                                   |
| 4 | ThickneSS    | Thickness                                       |
| 5 | Length       | Length                                          |
| 6 | Width        | Width                                           |
| 7 | Leaves       | Number of leaves                                 |
| 8 | Sq Mtr       | Square meters                                   |
| 9 | PROCESS      | Process name                                    |
| 10| Process color| Color name                                      |
| 11| Character    | Character name                                  |
| 12| Pattern      | Pattern name                                    |
| 13| Series       | Series name                                     |
| 14| Remarks      | Remarks                                         |

### Data Rows
- One row per bundle; all sessions for the date (or the single session when `smokingDyingId` is provided) are listed in one table.
- **Columns 1–2:** Item Name and LogX are **merged vertically** for each contiguous group of rows that share the same log (same process_done_id + same log_no_code).
- **Columns 3–14:** Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, PROCESS, Process color, Character, Pattern, Series, and Remarks vary per row.

### Subtotal Rows
- After each item group, a row with label **TOTAL** and sum of Leaves (column 7) and Sq Mtr (column 8) for that item.

### Grand Total Row
- Immediately after the last subtotal row.
- First column: label **Total**.
- Column 7 (Leaves): total leaves across all bundles.
- Column 8 (Sq Mtr): sum of all Sq Mtr.

### Summary Section (SUMMERY)

Placed after the main table and Grand Total row.

**Headers:** ITEM NAME | RECEIVED MTR. | PROCESS NAME | LEAVE | PRODUCTION SQ. MTR

**Data:** One row per unique item name, with aggregated LEAVE and PRODUCTION SQ. MTR. RECEIVED MTR. is left blank. PROCESS NAME from first occurrence per item.

**TOTAL row:** Overall sum of LEAVE and PRODUCTION SQ. MTR.

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Optional session filter**: `smokingDyingId` to restrict to one smoking/dying session.
- **Merged columns**: Item Name and LogX merge vertically per log group for clearer grouping.
- **Subtotal rows**: Per-item subtotals (label "TOTAL") with Leaves and Sq Mtr sums.
- **Summary section**: SUMMERY table with ITEM NAME, RECEIVED MTR., PROCESS NAME, LEAVE, PRODUCTION SQ. MTR.
- **Automatic totals**: Grand Total row and Summary TOTAL row.
- **Bold formatting**: Headers and total rows are bold.
- **Visual styling**: Header row has gray background.
- **Numeric formatting**: Numeric columns formatted to 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/SmokingDying/smoking_dying_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row**: "Smoking Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **One main table**: 14 columns (see Field Mapping below). Each data row is one bundle; rows are ordered by Item Name, LogX, Bundle No. Columns 1–2 (Item Name, LogX) are merged per log group.
   - **Subtotal rows**: Per item, a "TOTAL" row with Leaves and Sq Mtr sums.
   - **Grand Total row**: Overall Leaves and Sq Mtr.
   - **Summary section** (at the end): SUMMERY table with ITEM NAME, RECEIVED MTR., PROCESS NAME, LEAVE, PRODUCTION SQ. MTR; one row per unique item; TOTAL row.

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from sessions** and **attach items**:

1. **Source collection**: `process_done_details` (one document per smoking/dying session).

2. **Filter** (`$match`):
   - `process_done_date` between start and end of `reportDate` (00:00:00 to 23:59:59).
   - If `smokingDyingId` is provided: also `_id` equals that ObjectId (single session).

3. **Attach items** (`$lookup`):
   - From: `process_done_items_details`
   - Join: `process_done_details._id` = `process_done_items_details.process_done_id`
   - Result: each session document gets an `items` array (all items for that session).

4. **One row per item** (`$unwind` on `items`):
   - Each session document becomes one document per bundle.
   - Documents with no items are dropped (`preserveNullAndEmptyArrays: false`).

5. **Sort** (`$sort`):
   - By `items.item_name` (asc), then `items.log_no_code` (asc), then `items.bundle_number` (asc).

6. **Project to flat shape** (`$project`):
   - Session: `process_done_id` = `_id`.
   - Item: `item_name`, `log_no_code`, `bundle_number`, `thickness`, `length`, `width`, `no_of_leaves`, `sqm`, `process_name`, `color_name`, `character_name`, `pattern_name`, `series_name`, `remark`.

**Result of aggregation**: An array of flat objects. Each object = one bundle row. Order: by item_name, log_no_code, bundle_number.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Title**: "Smoking Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Main table**: One header row (14 column names), then one data row per aggregated object. When iterating rows, detect log-group boundaries (same `process_done_id` + same `log_no_code`); for each such block, merge cells in columns 1 and 2 (Item Name, LogX).
- **Subtotal rows**: After each item group, insert a row with label "TOTAL" and sum of Leaves and Sq Mtr.
- **Grand Total**: One row with overall Leaves and Sq Mtr.
- **Summary section**: Group by item_name; compute sum of no_of_leaves and sqm per item; write SUMMERY table with ITEM NAME, RECEIVED MTR. (blank), PROCESS NAME, LEAVE, PRODUCTION SQ. MTR; add TOTAL row.

---

## Field Mapping (Excel Column → Source)

Every value in the Excel comes from the aggregated rows or from the above calculations. This table maps each report column to its source.

| # | Report column   | Source (after aggregation)   | DB collection                    | DB field                | Notes |
|---|-----------------|------------------------------|----------------------------------|-------------------------|--------|
| 1 | Item Name       | `item_name`                  | process_done_items_details       | item_name               | Direct; merged per log group |
| 2 | LogX            | `log_no_code`                | process_done_items_details       | log_no_code             | Direct; merged per log group |
| 3 | Bundle No       | `bundle_number`              | process_done_items_details       | bundle_number           | Direct |
| 4 | ThickneSS       | `thickness`                  | process_done_items_details       | thickness               | Direct |
| 5 | Length          | `length`                     | process_done_items_details       | length                  | Direct |
| 6 | Width           | `width`                     | process_done_items_details       | width                   | Direct |
| 7 | Leaves          | `no_of_leaves`               | process_done_items_details       | no_of_leaves            | Direct |
| 8 | Sq Mtr          | `sqm`                        | process_done_items_details       | sqm                     | Direct; subtotal/Grand Total = SUM(sqm) |
| 9 | PROCESS         | `process_name`               | process_done_items_details       | process_name            | Direct |
| 10| Process color   | `color_name`                 | process_done_items_details       | color_name              | Direct |
| 11| Character       | `character_name`             | process_done_items_details       | character_name          | Direct |
| 12| Pattern         | `pattern_name`               | process_done_items_details       | pattern_name            | Direct |
| 13| Series          | `series_name`                | process_done_items_details       | series_name             | Direct |
| 14| Remarks         | `remark`                     | process_done_items_details       | remark                  | Direct |

**Subtotal row:** Label "TOTAL"; Leaves = sum per item; Sq Mtr = sum per item.

**Grand Total row:** Label "Total"; Leaves = sum over all; Sq Mtr = sum over all.

**Summary section (SUMMERY):**

| Report column      | Source (after aggregation) | DB collection            | Notes |
|--------------------|----------------------------|--------------------------|-------|
| ITEM NAME          | `item_name`               | process_done_items_details | One row per unique item_name |
| RECEIVED MTR.      | —                         | —                        | Left blank |
| PROCESS NAME       | `process_name`            | process_done_items_details | First occurrence per item |
| LEAVE              | SUM(`no_of_leaves`)       | process_done_items_details | Per item |
| PRODUCTION SQ. MTR | SUM(`sqm`)               | process_done_items_details | Per item |

---

## Calculations

All numeric values in **data rows** are **pass-through** from the database (no formulas). Subtotal rows, Grand Total, and Summary section are derived.

### Data rows (main table)

- All 14 columns = same-named field from the aggregated row (from `process_done_items_details`).
- Columns 1–2 (Item Name, LogX) are merged per log group in the Excel.

### Subtotal rows (per item)

- **Column 1 (label)**: Literal `"TOTAL"`.
- **Column 7 (Leaves)**: SUM(no_of_leaves) over the item group.
- **Column 8 (Sq Mtr)**: SUM(sqm) over the item group.

### Grand Total row

- **Column 1 (label)**: Literal `"Total"`.
- **Column 7 (Leaves)**: SUM(no_of_leaves) over all aggregated rows.
- **Column 8 (Sq Mtr)**: SUM(sqm) over all aggregated rows.

### Summary section (SUMMERY)

- **ITEM NAME**: Unique item_name from aggregated rows.
- **RECEIVED MTR.**: Left blank.
- **PROCESS NAME**: First process_name per item.
- **LEAVE**: SUM(no_of_leaves) per item.
- **PRODUCTION SQ. MTR**: SUM(sqm) per item.
- **TOTAL row**: Sum of LEAVE and PRODUCTION SQ. MTR across all items.

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
- Summary section (SUMMERY) appears at the end; one row per unique item name.
- RECEIVED MTR. is left blank (no data source in current schema).
- Excel files are timestamped; stored in `public/reports/SmokingDying/`.

## File Storage

**Directory**: `public/reports/SmokingDying/`

**Filename pattern**: `smoking_dying_daily_report_{timestamp}.xlsx`

**Example**: `smoking_dying_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Smoking Details Report Date: 05/11/2025

Item Name   | LogX   | Bundle No | ThickneSS | Length | Width | Leaves | Sq Mtr | PROCESS | Process color | Character | Pattern | Series | Remarks
IVORY CROWN | L24PDA | 1         | 0.00      | 0.00   | 0.00 | 1      | 3.00   | FLARE   |               | NATURAL   | TEST   | AC     |
            |        | 11        | 0.00      | 0.00   | 0.00 | 1      | 3.00   |         |               |           |        |        |
TOTAL       |        |           |           |        |      | 3      | 9.00   |         |               |           |        |        |
WHITE OAK   | X1PDR  | 12        | 0.00      | 0.00   | 0.00 | 1      | 3.00   | LAST DEMO|              | TESTING   | AC     | AC     |
TOTAL       |        |           |           |        |      | 3      | 9.00   |         |               |           |        |        |
Total       |        |           |           |        |      | 6      | 18.00  |         |               |           |        |        |

SUMMERY
ITEM NAME   | RECEIVED MTR. | PROCESS NAME | LEAVE | PRODUCTION SQ. MTR
IVORY CROWN |              | FLARE        | 3     | 9.00
WHITE OAK   |              | LAST DEMO    | 3     | 9.00
TOTAL       |              |              | 6     | 18.00
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Smoking/dying operations occurred on that date (`process_done_details` and `process_done_items_details` exist for that date).
- If `smokingDyingId` is used, the Id is valid and belongs to the given date.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-11-05"`).


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
    process_done_id: '$_id',
    item_name: '$items.item_name',
    log_no_code: '$items.log_no_code',
    bundle_number: '$items.bundle_number',
    thickness: '$items.thickness',
    length: '$items.length',
    width: '$items.width',
    no_of_leaves: '$items.no_of_leaves',
    sqm: '$items.sqm',
    process_name: '$items.process_name',
    color_name: '$items.color_name',
    character_name: '$items.character_name',
    pattern_name: '$items.pattern_name',
    series_name: '$items.series_name',
    remark: '$items.remark'
  }
}
```

**Result**: Array of flat objects. Each object has one bundle. This array is passed to `GenerateSmokingDyingDailyReport(rows, reportDate)` in the Excel config; the config writes the main table (one row per object, with merged cells for columns 1–2 per log group), inserts subtotal rows per item, Grand Total row, and Summary section (SUMMERY).
