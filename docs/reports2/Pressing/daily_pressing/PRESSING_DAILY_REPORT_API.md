# Pressing Daily Report API

## Overview
The Pressing Daily Report API generates Excel reports showing pressing production details for a specific date. The report has three sections: (1) **Pressing Details** — Category, Base, Item Name, Thick., Side, Size, Sheets, Sq Mtr (from base_details) with per-category totals and grand total; (2) **Core - Face Consumption Sq.Mtr.** — Item Name, Thick., Size, Sheets, Sq Mtr; (3) **Plywood Consumption Sq.Mtr.** — Item Name, Thick., Size, Sheets, Sq Mtr. Data is sourced from pressing_done_details and pressing_done_consumed_items_details.

## Endpoint
```
POST /report/download-excel-pressing-daily-report
```

## Authentication
- Requires: Standard report authentication (as per reports2 pattern)
- Permission: As configured for report APIs

## Request Body

### Required Parameters
```json
{
  "filters": {
    "reportDate": "2025-02-04"
  }
}
```

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/upload/reports/reports2/Pressing/pressing_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Pressing daily report generated successfully"
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
  "message": "No pressing data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Section 1: Pressing Details Report Date

**Section header (Row 1):**
```
Pressing Details Report Date: DD/MM/YYYY
```

**Table columns:**

| # | Column    | Description                                    |
|---|-----------|------------------------------------------------|
| 1 | Category  | Derived from base_type (Decorative Mdf, Decorative Plywood, Fleece Back Veneer) |
| 2 | Base      | MDF, PLYWOOD, or PAPER                        |
| 3 | Item Name | base_details.item_name                        |
| 4 | Thick.    | Thickness                                     |
| 5 | Side      | Not in schema; blank or placeholder           |
| 6 | Size      | Raw length×width (no conversion), e.g. "75 X 72" |
| 7 | Sheets    | Number of sheets                              |
| 8 | Sq Mtr    | Square meters (from DB or calculated when missing) |

- Data is grouped by **Category**; each category has a **Total** row (Sheets and Sq Mtr summed).
- After all categories, a **Grand Total** row sums total Sheets and total Sq Mtr.
- **Sq Mtr** is used from DB when present and > 0; otherwise calculated as (length × width) / 10000.

### Section 2: Core - Face Consumption Sq.Mtr.

**Section header:** `Core - Face Consumption Sq.Mtr.`

**Table columns:** Item Name | Thick. | Size | Sheets | Sq Mtr

- Data from consumed **face_details**; grouped by item name and size.
- Section ends with a **Total** row (Sheets, Sq Mtr).

### Section 3: Plywood Consumption Sq.Mtr.

**Section header:** `Plywood Consumption Sq.Mtr.`

**Table columns:** Item Name | Thick. | Size | Sheets | Sq Mtr

- Data from consumed **base_details** (item_name, thickness, size, sheets, sqm).
- Section ends with a **Total** row.
- **Sq Mtr** is used from DB when present and > 0; otherwise calculated as (length × width) / 10000.

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Three-section layout**: Pressing Details, Core - Face Consumption, Plywood Consumption.
- **Category grouping in section 1**: Per-category totals and grand total for Sheets and Sq Mtr.
- **Category mapping**: base_type → Decorative Mdf / Decorative Plywood / Fleece Back Veneer.
- **Size formatting**: Raw length×width (no conversion), e.g. "75 X 72".
- **Sq Mtr fallback**: Calculated as (length × width) / 10000 when sqm is missing or zero.
- **Bold formatting**: Section headers and total rows are bold.
- **Header styling**: Column header rows have gray background.
- **Numeric formatting**: Dimensions and Sq Mtr use 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/upload/reports/reports2/Pressing/pressing_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Section 1**: Title "Pressing Details Report Date: DD/MM/YYYY", then a table (8 columns: Category, Base, Item Name, Thick., Side, Size, Sheets, Sq Mtr) built from base_details. Rows grouped by category with Total per category and Grand Total.
   - **Section 2**: Header "Core - Face Consumption Sq.Mtr.", then table from face_details with total row.
   - **Section 3**: Header "Plywood Consumption Sq.Mtr.", then table from base_details by item name with total row.

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from pressing_done_details** and **attach consumed items and worker name**:

1. **Source collection**: `pressing_done_details` (one document per pressing run).

2. **Filter** (`$match`):
   - `pressing_date` between start and end of `reportDate` (00:00:00 to 23:59:59).

3. **Attach consumed items** (`$lookup`):
   - From: `pressing_done_consumed_items_details`
   - Join: `pressing_done_details._id` = `pressing_done_consumed_items_details.pressing_done_details_id`
   - Result: each pressing document gets a `consumedItems` array (one element: the single consumed-details document for that pressing).

4. **Attach worker name** (`$lookup` on `users`):
   - From: `users`
   - Join: `pressing_done_details.created_by` = `users._id`
   - We only pull `first_name` and `last_name`.
   - Result: each document gets a `workerUser` array.

5. **Add fields** (`$addFields`):
   - `consumed` = first element of `consumedItems` (so each doc has `consumed.group_details`, `consumed.base_details`, `consumed.face_details`).
   - `workerName` = trim(concat(workerUser.first_name, " ", workerUser.last_name)) with nulls as empty string.

6. **Sort** (`$sort`): By `pressing_id` (asc), then `product_type` (asc).

**Result of aggregation**: An array of documents. Each document = one pressing_done with nested `consumed` (group_details, base_details, face_details) and `workerName`. No flattening to one row per item; the Excel config iterates over these docs and over the nested arrays to build each section.

### Step 2: Excel Generation (Config)

- **Input**: The aggregated array and `reportDate`.
- **Section 1**: Title "Pressing Details Report Date: " + reportDate (DD/MM/YYYY). From all docs, collect `consumed.base_details[]`; map base_type to Category and Base; Size = raw length×width; Sq Mtr = sqm or (length×width/10000) when missing; group by category then by thick/side/size/itemName; write Pressing Details table with category and section totals.
- **Section 2**: From all docs, collect `consumed.face_details[]`; group by item name and size; write Core - Face Consumption table with total row.
- **Section 3**: From all docs, collect `consumed.base_details[]`; group by item_name and size; write Plywood Consumption table with total row.

---

## Field Mapping (Excel Column → Source)

### Section 1: Pressing Details

| Report column | Source (config)           | DB field                          | Notes |
|---------------|---------------------------|-----------------------------------|--------|
| Category      | base_type → map           | base_details[].base_type          | MDF→Decorative Mdf, PLYWOOD→Decorative Plywood, FLEECE_PAPER→Fleece Back Veneer |
| Base          | base_type → label         | base_details[].base_type         | MDF, PLYWOOD, PAPER |
| Item Name     | base_details.item_name   | base_details[].item_name         | |
| Thick.        | base_details.thickness   | base_details[].thickness         | |
| Side          | (placeholder)             | —                                 | Not in schema |
| Size          | formatSize(length, width) | base_details[].length, width     | Raw "L X W" (no conversion) |
| Sheets        | base_details.no_of_sheets | base_details[].no_of_sheets      | |
| Sq Mtr        | getSqm(sqm, length, width)| base_details[].sqm or calculated | (length×width)/10000 when sqm missing or 0 |

### Section 2: Core - Face Consumption

| Report column | Source (config)      | DB field                    |
|---------------|----------------------|-----------------------------|
| Item Name     | face_details.item_name | face_details[].item_name  |
| Thick.        | face_details.thickness | face_details[].thickness  |
| Size          | formatSize(length, width) | face_details[].length, width |
| Sheets        | face_details.no_of_sheets | face_details[].no_of_sheets |
| Sq Mtr        | getSqm(sqm, length, width)| face_details[].sqm or calculated |

### Section 3: Plywood Consumption

Same column structure as Section 2 but sourced from **base_details** (item_name, thickness, size, no_of_sheets, sqm). Sq Mtr uses getSqm when missing or 0.

---

## Calculations

### Section 1 (Pressing Details)

- **Data rows**: Category, Base, Item Name, Thick., Side, Size, Sheets, Sq Mtr = from base_details; Category/Base derived from base_type; Size = raw length×width; Sq Mtr = sqm or (length×width)/10000 when missing.
- **Per-category Total row**: Sheets = SUM(sheets) for that category; Sq Mtr = SUM(sqm) for that category.
- **Grand Total row**: Sheets = SUM(all sheets); Sq Mtr = SUM(all sqm), rounded to 2 decimals.

### Section 2 & 3 (Core-Face, Plywood Consumption)

- Totals: SUM(Sheets), SUM(Sq Mtr) over section rows; Sq Mtr rounded to 2 decimals.

---

## Data Sources and Relationships

### Database Collections Used

1. **pressing_done_details** (pressing runs)
   - One document per pressing run (date, pressing_id, shift, machine, etc.).
   - Key fields: `_id`, `pressing_date`, `pressing_id`, `shift`, `no_of_workers`, `no_of_working_hours`, `length`, `width`, `no_of_sheets`, `sqm`, `product_type`, `group_no`, `remark`, `flow_process`, `created_by`, `machine_id`, `machine_name`.

2. **pressing_done_consumed_items_details** (consumed items per pressing)
   - One document per pressing run; linked by `pressing_done_details_id` = `pressing_done_details._id`.
   - **base_details[]**: base_type, item_name, length, width, thickness, no_of_sheets, sqm (→ Section 1 and 3).
   - **face_details[]**: item_name, length, width, thickness, no_of_sheets, sqm (→ Section 2).

### Join Diagram (conceptual)

```
pressing_done_details (1)
    │ _id
    └── pressing_done_consumed_items_details (1)  via pressing_done_details_id  →  base_details, face_details
```

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-pressing-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-02-04"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generatePressingReport = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-pressing-daily-report',
      {
        filters: {
          reportDate: '2025-02-04'
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

- Report includes all pressing runs for the given date.
- **Side** in Pressing Details is not in the schema; column is present and left blank (or placeholder).
- **Sq Mtr** is calculated as (length × width) / 10000 when sqm is missing or zero in the database.
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.
- **Timezone**: Dates are filtered using `setUTCHours` so the range matches exactly the UTC day sent by the client. Using `setHours` (local time) would shift the range by the server timezone offset (IST = +05:30), causing stale/wrong-day data.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `pressing_daily_report_{timestamp}.xlsx`

**Example**: `pressing_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Pressing Details Report Date: 02/04/2025

Category           | Base    | Item Name | Thick. | Side | Size   | Sheets | Sq Mtr
Decorative Plywood | PLYWOOD |           | 0.00   |      | 75 X 72| 1      | 0.00
                   | Total   |           |        |      |        | 1      | 0.00
Total              |         |           |        |      |        | 1      | 0.00

Core - Face Consumption Sq.Mtr.

Item Name  | Thick. | Size    | Sheets | Sq Mtr
RED-OAK    | 0.5    | 31 X 10 | 1      | 0.00
...
Total      |        |         | 1      | 0.00

Plywood Consumption Sq.Mtr.

Item Name  | Thick. | Size    | Sheets | Sq Mtr
ASH VENEER | 2      | 75 X 72 | 1      | 0.00
...
Total      |        |         | 1      | 0.00
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Pressing operations occurred on that date (`pressing_done_details` and `pressing_done_consumed_items_details` exist for that date).

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-02-04"`).

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Pressing/pressingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Pressing/pressingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Pressing/pressing.routes.js
```

### Aggregation Pipeline (exact stages)

Pipeline runs on **pressing_done_details** (model: `pressing_done_details_model`). Order and purpose of each stage:

**Stage 1 – $match**  
Filter by date:

```javascript
{
  $match: {
    pressing_date: { $gte: startOfDay, $lte: endOfDay }
  }
}
```

- `startOfDay` = `new Date(reportDate)` with **UTC** time set to 00:00:00.000 via `setUTCHours(0, 0, 0, 0)`  
- `endOfDay` = `new Date(reportDate)` with **UTC** time set to 23:59:59.999 via `setUTCHours(23, 59, 59, 999)`  

> **Why `setUTCHours`?** MongoDB stores dates in UTC. The client sends `"YYYY-MM-DD"` (e.g. `"2026-03-16"`), which `new Date()` parses as UTC midnight. Using `setHours()` would shift the range by the server's local timezone offset (IST = +05:30), causing the query to include data from the previous day and miss today's data. `setUTCHours` avoids this shift entirely.

**Stage 2 – $lookup (pressing_done_consumed_items_details)**  
Attach consumed items for each pressing:

```javascript
{
  $lookup: {
    from: 'pressing_done_consumed_items_details',
    localField: '_id',
    foreignField: 'pressing_done_details_id',
    as: 'consumedItems'
  }
}
```

**Stage 3 – $lookup (users)**  
Attach worker for each document:

```javascript
{
  $lookup: {
    from: 'users',
    localField: 'created_by',
    foreignField: '_id',
    as: 'workerUser',
    pipeline: [{ $project: { first_name: 1, last_name: 1 } }]
  }
}
```

**Stage 4 – $addFields**  
Flatten consumed and compute worker name:

```javascript
{
  $addFields: {
    consumed: { $arrayElemAt: ['$consumedItems', 0] },
    workerName: {
      $let: {
        vars: { w: { $arrayElemAt: ['$workerUser', 0] } },
        in: {
          $trim: {
            input: {
              $concat: [
                { $ifNull: ['$$w.first_name', ''] },
                ' ',
                { $ifNull: ['$$w.last_name', ''] }
              ]
            }
          }
        }
      }
    }
  }
}
```

**Stage 5 – $sort**  
Order for the report:

```javascript
{
  $sort: { pressing_id: 1, product_type: 1 }
}
```

**Result**: Array of documents. Each document has pressing_done fields plus `consumed` (base_details, face_details). This array is passed to `GeneratePressingDailyReportExcel(pressingData, reportDate)` in the Excel config; the config builds each of the three sections from these documents and their nested arrays.

---

## Changelog

| Date | Change | File |
|------|--------|------|
| 2026-03-16 | **Bug fix**: Changed `setHours(0,0,0,0)` → `setUTCHours(0,0,0,0)` and `setHours(23,59,59,999)` → `setUTCHours(23,59,59,999)` in date range calculation. `setHours` was shifting the filter window by the IST UTC+5:30 offset, causing the report to show previous-day data and miss today's records. | `controllers/reports2/Pressing/pressingDailyReport.js` |
