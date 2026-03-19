# Crosscut Daily Report API

## Overview
The Crosscut Daily Report API generates Excel reports showing cross-cutting production details for a specific date. The report includes a main data table with a two-row-per-log layout (original log row + LogX/cut-piece row, then Total row), item-level totals, and a summary table (Item Name, Inward CMT, CC CMT).

## Endpoint
```
POST /report/download-excel-crosscutting-daily-report
```

## Authentication
- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

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

- **item_name** (optional): When provided, the report includes only cross-cutting records for that wood type (e.g. RED OAK, TEAK).

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/CrossCutting/crosscutting_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Cross-cutting daily report generated successfully"
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

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No cross-cutting data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
CrossCut Details Report Date: DD/MM/YYYY
```

**Example:**
```
CrossCut Details Report Date: 31/03/2025
```

### Row 2–3: Empty (spacing)

### Row 4: Main Data Headers (9 columns)

| # | Column     | Description                                      |
|---|------------|--------------------------------------------------|
| 1 | Item Name  | Wood type (e.g., RED OAK, TEAK)                  |
| 2 | LogNo      | Original log number                              |
| 3 | Length     | Original log length (meters)                     |
| 4 | Girth      | Original log girth/diameter (meters)             |
| 5 | Inward CMT | Original log cubic measurement (CMT)             |
| 6 | LogX       | Cut piece code (e.g., D356A)                     |
| 7 | Length     | Cut piece length (meters)                       |
| 8 | Girth      | Cut piece girth (meters)                         |
| 9 | CC CMT     | Cut piece cubic measurement (CMT)                |

### Data Rows: Two-row-per-log layout

For each cut piece:

- **Row 1 (Log row):** Item Name (first row of item only), LogNo, Length, Girth, Inward CMT from the original log; columns 6–9 empty.
- **Row 2 (LogX row):** Columns 1–5 empty; LogX (piece code), Length, Girth, CC CMT.
- **Row 3 (Total):** "Total" in column 6 (LogX column); column 9 = sum of CC CMT for that log (per-log subtotal).

After all logs of an item: one **item total** row (LogNo column = "Total", CC CMT column = item total).

### Summary Section

After the main data:

| Item Name | Inward CMT | CC CMT |
|-----------|------------|--------|
| RED OAK   | 6.602      | 6.602  |
| **Total** | **6.602**  | **6.602** |

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Optional item filter**: `item_name` to restrict to one wood type.
- **Two-row-per-log layout**: Original log row, then LogX row, then Total row per log.
- **Item totals**: One Total row per item with CC CMT; then summary table with Inward CMT and CC CMT per item and grand total.
- **Bold formatting**: Headers and total rows are bold.
- **Visual styling**: Header row has gray background.
- **Numeric formatting**: CMT and dimensions formatted to 3 decimal places (0.000).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/CrossCutting/crosscutting_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file.

2. **The Excel file** contains:
   - **Title row**: "CrossCut Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **Main table**: 9 columns; two data rows per piece (Log row + LogX row) plus a Total row per log; item total rows; grouped by Item Name and LogNo.
   - **Summary table**: Item Name, Inward CMT, CC CMT; one row per item plus bold Total row.

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (controller) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

1. **Source collection**: `crosscutting_dones` (model: `crosscutting_done_model`). One document per cut piece.

2. **Filter** (`$match`):
   - `worker_details.crosscut_date` between start and end of `reportDate` (00:00:00 to 23:59:59).
   - `deleted_at: null`.
   - If `item_name` is provided in filters: also `item_name` equals that value.

3. **Attach original log** (`$lookup`):
   - From: `issues_for_crosscuttings`
   - Join: `crosscutting_done.issue_for_crosscutting_id` = `issues_for_crosscutting._id`
   - Result: each document gets an `original_log` object (single element array, then unwound).

4. **Unwind** (`$unwind` on `original_log`):
   - `preserveNullAndEmptyArrays: true` so pieces without a matching issue still appear.

5. **Sort** (`$sort`):
   - By `item_name` (asc), `log_no` (asc), `code` (asc).

**Result of aggregation**: An array of documents. Each document = one cut piece with its `original_log` (physical_length, physical_diameter, physical_cmt) and piece fields (log_no, code, log_no_code, length, girth, crosscut_cmt, item_name, worker_details, machine_id, machine_name). This array is passed to the Excel generator.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Grouping**: Data is grouped by `item_name` and then by `log_no`. Each group has `original_log` (length, girth, inward_cmt) and `pieces` (code, log_no_code, length, girth, cc_cmt).
- **Title**: "CrossCut Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Main table**: For each item → each log → each piece: write Log row (cols 1–5), LogX row (cols 6–9), then Total row (col 6 = "Total", col 9 = log CC CMT sum). Then one item total row (Total in col 2, item CC CMT total in col 9).
- **Summary**: One row per item (Item Name, Inward CMT, CC CMT) and one bold Total row.

---

## Field Mapping (Excel Column → Source)

| # | Report column | Source (after aggregation) | DB collection / join        | DB field / note |
|---|----------------|----------------------------|-----------------------------|------------------|
| 1 | Item Name     | `item_name`                | crosscutting_done           | item_name |
| 2 | LogNo         | `original_log` (from lookup) | issues_for_crosscuttings  | log_no (via issue_for_crosscutting_id) |
| 3 | Length (log)  | `original_log.physical_length` | issues_for_crosscuttings | physical_length |
| 4 | Girth (log)   | `original_log.physical_diameter` | issues_for_crosscuttings | physical_diameter |
| 5 | Inward CMT    | `original_log.physical_cmt` | issues_for_crosscuttings | physical_cmt |
| 6 | LogX          | `log_no_code` or `code`   | crosscutting_done           | log_no_code, code |
| 7 | Length (piece)| `length`                  | crosscutting_done           | length |
| 8 | Girth (piece) | `girth`                   | crosscutting_done           | girth |
| 9 | CC CMT        | `crosscut_cmt`            | crosscutting_done           | crosscut_cmt |

**Summary section:**

| Report column | Source |
|----------------|--------|
| Item Name      | Item group key |
| Inward CMT     | Sum of original_log.physical_cmt per item |
| CC CMT         | Sum of piece crosscut_cmt per item |

---

## Calculations

### Data rows (main table)

- **Inward (Length, Girth, Inward CMT)**: From `issues_for_crosscuttings` via lookup (physical_length, physical_diameter, physical_cmt). Shown once per log on the Log row.
- **LogX, Length, Girth, CC CMT**: From `crosscutting_done` (log_no_code/code, length, girth, crosscut_cmt). Shown on the LogX row per piece.

### Per-log Total row

- **Column 6**: Literal `"Total"`.
- **Column 9**: Sum of `crosscut_cmt` for all pieces of that log.

### Item total row

- **Column 2**: Literal `"Total"`.
- **Column 9**: Sum of CC CMT for all pieces of that item.

### Summary section

- **Inward CMT per item**: Sum of `original_log.physical_cmt` for all logs of that item (one log contributes once per item).
- **CC CMT per item**: Sum of `crosscut_cmt` for all pieces of that item.
- **Total row**: Sum of all items’ Inward CMT and CC CMT.

---

## Data Sources and Relationships

### Database Collections Used

1. **crosscutting_dones** (crosscutting_done_model)
   - One document per cut piece.
   - Key fields: `issue_for_crosscutting_id`, `log_no`, `code`, `log_no_code`, `length`, `girth`, `crosscut_cmt`, `item_name`, `machine_id`, `machine_name`, `worker_details` (crosscut_date, shift, working_hours, workers), `deleted_at`.

2. **issues_for_crosscuttings** (issues_for_crosscutting_model)
   - Original logs issued for cross-cutting.
   - Key fields: `_id`, `log_no`, `physical_length`, `physical_diameter`, `physical_cmt`, `item_name`.
   - Joined by: `crosscutting_done.issue_for_crosscutting_id` = `issues_for_crosscutting._id`.

### Join Diagram (conceptual)

```
crosscutting_done (1 per piece)
    │ issue_for_crosscutting_id
    └── issues_for_crosscutting (1)  →  original_log (length, girth, inward_cmt)
```

One original log (issues_for_crosscutting) can have many cut pieces (crosscutting_done). Each piece row in the report carries the same original log data (from the lookup) plus its own piece dimensions and CC CMT.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-crosscutting-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31"
    }
  }'
```

### With optional item_name
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-crosscutting-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31",
      "item_name": "RED OAK"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateCrosscutReport = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-crosscutting-daily-report',
      {
        filters: {
          reportDate: '2025-03-31'
          // item_name: 'RED OAK' // optional
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

- Report includes all cross-cutting activity for the given date unless `item_name` is specified.
- Original log measurements (Length, Girth, Inward CMT) are shown once per log on the first row of each log block.
- Excel files are timestamped; stored in `public/reports/CrossCutting/`.

## File Storage

**Directory**: `public/reports/CrossCutting/`

**Filename pattern**: `crosscutting_daily_report_{timestamp}.xlsx`

**Example**: `crosscutting_daily_report_1738234567890.xlsx`

## Report Example Structure

```
CrossCut Details Report Date: 31/03/2025

Item Name | LogNo | Length | Girth | Inward CMT | LogX   | Length | Girth | CC CMT
RED OAK   | D356  | 3.20   | 1.50  | 0.450      |        |        |       |
          |       |        |       |            | D356A  | 3.20   | 1.50  | 0.450
          |       |        |       |            | Total  |        |       | 0.450
          | D357  | 3.30   | 1.57  | 0.508      |        |        |       |
          |       |        |       |            | D357A  | 3.30   | 1.57  | 0.508
          |       |        |       |            | Total  |        |       | 0.508
          | Total |        |       |            |        |        |       | 6.602

Item Name | Inward CMT | CC CMT
RED OAK   | 6.602      | 6.602
Total     | 6.602      | 6.602
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Cross-cutting operations occurred on that date (records in `crosscutting_dones` with `worker_details.crosscut_date` in range).
- Records have not been soft-deleted (`deleted_at` is null).
- If `item_name` is used, at least one record matches that item.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-03-31"`).

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Crosscut/crosscutDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Crosscut/crosscutDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Crosscut/crosscut.routes.js
```

### Aggregation Pipeline (exact stages)

Pipeline runs on **crosscutting_dones** (model: `crosscutting_done_model`). Order and purpose of each stage:

**Stage 1 – $match**
Filter by date, deleted_at, and optional item_name:

```javascript
{
  $match: {
    'worker_details.crosscut_date': { $gte: startOfDay, $lte: endOfDay },
    deleted_at: null,
    // if item_name in filters: item_name: 'RED OAK' etc.
  }
}
```

**Stage 2 – $lookup (issues_for_crosscuttings)**
Attach original log for each piece:

```javascript
{
  $lookup: {
    from: 'issues_for_crosscuttings',
    localField: 'issue_for_crosscutting_id',
    foreignField: '_id',
    as: 'original_log'
  }
}
```

**Stage 3 – $unwind (original_log)**
One document per piece with original_log as object:

```javascript
{
  $unwind: {
    path: '$original_log',
    preserveNullAndEmptyArrays: true
  }
}
```

**Stage 4 – $sort**
Order for the report:

```javascript
{
  $sort: { item_name: 1, log_no: 1, code: 1 }
}
```

**Result**: Array of documents. Each document has crosscutting_done fields plus `original_log` (physical_length, physical_diameter, physical_cmt, log_no). This array is passed to `GenerateCrosscutDailyReportExcel(details, reportDate)` in the config; the config groups by item_name and log_no, then writes the two-row-per-log main table, item totals, and summary table.
