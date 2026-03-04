# Pressing Daily Report API

## Overview
The Pressing Daily Report API generates Excel reports showing pressing production details for a specific date. The report has five sections: (1) **Pressing Details** — item-wise table with Item Code, Sub-code/Type, Date/Batch, dimensions, Quantity, Area/Metric, Notes, with per-item totals and grand total; (2) **Ply Details** — Category, Base, Thick., Side, Size, Sheets, Sq Mtr; (3) **Core - Face Consumption Sq.Mtr.** — Item Name, Thick., Size, Sheets, Sq Mtr; (4) **Plywood Consumption Sq.Mtr.** — Item Name, Thick., Size, Sheets, Sq Mtr; (5) **Pressing Operation** — Pressing Id, Shift, Work Hours, Worker, Machine Id. Data is sourced from pressing_done_details, pressing_done_consumed_items_details, and users (worker name).

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

| # | Column         | Description                                    |
|---|----------------|------------------------------------------------|
| 1 | Item Code      | Product/item name (from group_details or product_type) |
| 2 | Sub-code/Type  | Log/batch code (e.g. log_no_code)             |
| 3 | Date/Batch     | Pressing Id (e.g. D2/5/1)                     |
| 4 | Dimension 1    | Length (meters)                               |
| 5 | Dimension 2    | Width (meters)                                |
| 6 | Quantity       | Number of sheets                              |
| 7 | Area/Metric    | Square meters                                 |
| 8 | Notes          | Character/flow_process or remark              |

- Data is grouped by **Item Code**; each item group has a **Total** row (Quantity and Area/Metric summed).
- After all items, a **Grand Total** row sums total Quantity and total Area/Metric.

### Section 2: Ply Details

**Section header:** `Ply Details`

**Table columns:** Category | Base | Thick. | Side | Size | Sheets | Sq Mtr

- **Category** is derived from base_type: MDF → "Decorative Mdf", PLYWOOD → "Decorative Plywood", FLEECE_PAPER → "Fleece Back Veneer".
- **Base**: MDF, PLYWOOD, or PAPER.
- **Size**: Length and width in meters converted to feet (e.g. "10 X 4", "8 X 4").
- **Side**: Not in schema; column present, value blank or placeholder.
- Each category has a **Total** row; section ends with an overall **Total** row.

### Section 3: Core - Face Consumption Sq.Mtr.

**Section header:** `Core - Face Consumption Sq.Mtr.`

**Table columns:** Item Name | Thick. | Size | Sheets | Sq Mtr

- Data from consumed **face_details**; grouped by item name and size.
- Section ends with a **Total** row (Sheets, Sq Mtr).

### Section 4: Plywood Consumption Sq.Mtr.

**Section header:** `Plywood Consumption Sq.Mtr.`

**Table columns:** Item Name | Thick. | Size | Sheets | Sq Mtr

- Data from consumed **base_details** (item_name, thickness, size, sheets, sqm).
- Section ends with a **Total** row.

### Section 5: Pressing Operation

**Table columns:** Pressing Id | Shift | Work Hours | Worker | Machine Id

- One row per pressing_done record.
- **Worker** is resolved from users (first_name + " " + last_name) via created_by.

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Five-section layout**: Pressing Details, Ply Details, Core - Face Consumption, Plywood Consumption, Pressing Operation.
- **Item-wise grouping in section 1**: Per-item totals and grand total for Quantity and Area/Metric.
- **Category mapping**: base_type → Decorative Mdf / Decorative Plywood / Fleece Back Veneer.
- **Size formatting**: Length/width (meters) → feet string (e.g. "10 X 4").
- **Worker tracking**: Shift, work hours, worker name, machine id in the last section.
- **Bold formatting**: Section headers and total rows are bold.
- **Header styling**: Column header rows have gray background.
- **Numeric formatting**: Dimensions and Sq Mtr use 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/upload/reports/reports2/Pressing/pressing_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Section 1**: Title "Pressing Details Report Date: DD/MM/YYYY", then a table (8 columns) built from group_details (or pressing_done when no group_details). Rows grouped by item with Total per item and Grand Total.
   - **Section 2**: Header "Ply Details", then table (Category, Base, Thick., Side, Size, Sheets, Sq Mtr) from base_details, with category and section totals.
   - **Section 3**: Header "Core - Face Consumption Sq.Mtr.", then table from face_details with total row.
   - **Section 4**: Header "Plywood Consumption Sq.Mtr.", then table from base_details by item name with total row.
   - **Section 5**: Pressing Id, Shift, Work Hours, Worker, Machine Id — one row per pressing_done.

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
- **Section 1**: Title "Pressing Details Report Date: " + reportDate (DD/MM/YYYY). Flatten: for each doc, for each `consumed.group_details[]` (or one row from doc if no group_details), emit a row (item name, sub-code, pressing_id, length, width, sheets, sqm, notes). Group rows by item name; write table with per-item Total and Grand Total.
- **Section 2**: From all docs, collect `consumed.base_details[]`; map base_type to Category and Base; format Size from length/width; group by category then by thick/side/size; write Ply Details table with category and section totals.
- **Section 3**: From all docs, collect `consumed.face_details[]`; group by item name and size; write Core - Face Consumption table with total row.
- **Section 4**: From all docs, collect `consumed.base_details[]` again; group by item_name and size; write Plywood Consumption table with total row.
- **Section 5**: One row per aggregated doc: pressing_id, shift, no_of_working_hours, workerName, machine_name.

---

## Field Mapping (Excel Column → Source)

### Section 1: Pressing Details

| # | Report column   | Source (config)                    | DB collection/field                          | Notes |
|---|-----------------|------------------------------------|----------------------------------------------|--------|
| 1 | Item Code       | group_details.item_name or product_type | pressing_done_consumed_items_details.group_details[].item_name; pressing_done_details.product_type | |
| 2 | Sub-code/Type   | group_details.log_no_code          | pressing_done_consumed_items_details.group_details[].log_no_code | |
| 3 | Date/Batch      | pressing_id                        | pressing_done_details.pressing_id            | |
| 4 | Dimension 1     | group_details.length or length     | group_details[].length; pressing_done_details.length | |
| 5 | Dimension 2     | group_details.width or width       | group_details[].width; pressing_done_details.width | |
| 6 | Quantity        | group_details.no_of_sheets or no_of_sheets | group_details[].no_of_sheets; pressing_done_details.no_of_sheets | Total = SUM per item; Grand Total = SUM all |
| 7 | Area/Metric     | group_details.sqm or sqm           | group_details[].sqm; pressing_done_details.sqm | Total = SUM per item; Grand Total = SUM all |
| 8 | Notes           | flow_process[0] or remark         | pressing_done_details.flow_process, remark   | |

### Section 2: Ply Details

| Report column | Source (config)           | DB field                          | Notes |
|---------------|---------------------------|-----------------------------------|--------|
| Category      | base_type → map           | base_details[].base_type          | MDF→Decorative Mdf, PLYWOOD→Decorative Plywood, FLEECE_PAPER→Fleece Back Veneer |
| Base          | base_type → label         | base_details[].base_type         | MDF, PLYWOOD, PAPER |
| Thick.        | base_details.thickness    | base_details[].thickness         | |
| Side          | (placeholder)             | —                                 | Not in schema |
| Size          | formatSize(length, width) | base_details[].length, width     | Meters → feet e.g. "10 X 4" |
| Sheets        | base_details.no_of_sheets | base_details[].no_of_sheets      | |
| Sq Mtr        | base_details.sqm          | base_details[].sqm               | |

### Section 3: Core - Face Consumption

| Report column | Source (config)      | DB field                    |
|---------------|----------------------|-----------------------------|
| Item Name     | face_details.item_name | face_details[].item_name  |
| Thick.        | face_details.thickness | face_details[].thickness  |
| Size          | formatSize(length, width) | face_details[].length, width |
| Sheets        | face_details.no_of_sheets | face_details[].no_of_sheets |
| Sq Mtr        | face_details.sqm    | face_details[].sqm          |

### Section 4: Plywood Consumption

Same as Section 3 but sourced from **base_details** (item_name, thickness, size, no_of_sheets, sqm).

### Section 5: Pressing Operation

| Report column | Source (after aggregation) | DB collection | DB field | Notes |
|----------------|-----------------------------|---------------|----------|--------|
| Pressing Id    | pressing_id                 | pressing_done_details | pressing_id | |
| Shift          | shift                      | pressing_done_details | shift | |
| Work Hours     | no_of_working_hours        | pressing_done_details | no_of_working_hours | |
| Worker         | workerName                 | users         | first_name + " " + last_name | Via pressing_done_details.created_by → users._id |
| Machine Id     | machine_name               | pressing_done_details | machine_name | |

---

## Calculations

### Section 1 (Pressing Details)

- **Data rows**: Item Code, Sub-code, Date/Batch, Dimension 1, Dimension 2, Quantity, Area/Metric, Notes = pass-through from group_details (or pressing_done when no group_details).
- **Per-item Total row**: Quantity = SUM(quantity) for that item; Area/Metric = SUM(area) for that item.
- **Grand Total row**: Quantity = SUM(all quantities); Area/Metric = SUM(all areas), rounded to 2 decimals.

### Section 2 (Ply Details)

- **Category**: base_type → "Decorative Mdf" | "Decorative Plywood" | "Fleece Back Veneer".
- **Size**: length, width in meters → `round(length*3.28084) + " X " + round(width*3.28084)` (feet).
- **Category total / Section total**: SUM(Sheets), SUM(Sq Mtr) over the relevant rows.

### Section 3 & 4

- Totals: SUM(Sheets), SUM(Sq Mtr) over section rows; Sq Mtr rounded to 2 decimals.

### Worker name (Section 5)

- Computed in aggregation: `workerName = trim(concat(users.first_name, " ", users.last_name))` with nulls as empty string.

---

## Data Sources and Relationships

### Database Collections Used

1. **pressing_done_details** (pressing runs)
   - One document per pressing run (date, pressing_id, shift, machine, etc.).
   - Key fields: `_id`, `pressing_date`, `pressing_id`, `shift`, `no_of_workers`, `no_of_working_hours`, `length`, `width`, `no_of_sheets`, `sqm`, `product_type`, `group_no`, `remark`, `flow_process`, `created_by`, `machine_id`, `machine_name`.

2. **pressing_done_consumed_items_details** (consumed items per pressing)
   - One document per pressing run; linked by `pressing_done_details_id` = `pressing_done_details._id`.
   - **group_details[]**: item_name, log_no_code, length, width, no_of_sheets, sqm (→ Section 1).
   - **base_details[]**: base_type, item_name, length, width, thickness, no_of_sheets, sqm (→ Section 2 and 4).
   - **face_details[]**: item_name, length, width, thickness, no_of_sheets, sqm (→ Section 3).

3. **users**
   - Used only to resolve worker name.
   - Join: `pressing_done_details.created_by` = `users._id`.
   - Fields used: `first_name`, `last_name` (concatenated for **Worker**).

### Join Diagram (conceptual)

```
pressing_done_details (1)
    │ _id
    ├── pressing_done_consumed_items_details (1)  via pressing_done_details_id  →  group_details, base_details, face_details
    └── users (1)                                  via created_by  →  worker name
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
- **Side** in Ply Details is not in the schema; column is present and left blank (or placeholder).
- Worker name is resolved from `users` via `created_by`; if user is missing, Worker cell is empty.
- Excel files are timestamped; stored in `public/upload/reports/reports2/Pressing/`.

## File Storage

**Directory**: `public/upload/reports/reports2/Pressing/`

**Filename pattern**: `pressing_daily_report_{timestamp}.xlsx`

**Example**: `pressing_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Pressing Details Report Date: 02/04/2025

Item Code   | Sub-code/Type | Date/Batch | Dimension 1 | Dimension 2 | Quantity | Area/Metric | Notes
R3001       | CX-3232-A     | D2/5/1     | 2.44        | 1.22        | 1        | 2.98        | Flowery
R3001       | ...           | ...        | ...         | ...         | ...      | ...         | ...
            | Total         |            |             |             | 3        | 8.94        |
Total       |               |            |             |             | 191      | 682.36      |

Ply Details

Category           | Base    | Thick. | Side | Size   | Sheets | Sq Mtr
Decorative Mdf     | MDF     | 8      |      | 10 X 4 | 2      | 7.44
                   | Total   |        |      |        | 2      | 7.44
Decorative Plywood | PLYWOOD | 3.2    |      | 8X4    | 10     | 29.77
...
Total              |         |        |      |        | 191    | 682.36

Core - Face Consumption Sq.Mtr.

Item Name  | Thick. | Size   | Sheets | Sq Mtr
GURJAN     | 0.3    | 10 X 4 | 10     | 37.20
...
Total      |        |        | 119    | 435.33

Plywood Consumption Sq.Mtr.

Item Name  | Thick. | Size   | Sheets | Sq Mtr
...
Total      |        |        | 191    | 684.64

Pressing Id | Shift | Work Hours | Worker | Machine Id
15806       |       |            | SAMPLE |
15801       |       |            |        |
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Pressing operations occurred on that date (`pressing_done_details` and `pressing_done_consumed_items_details` exist for that date).

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-02-04"`).

### Missing Worker Details
Worker name is resolved from `users` via `pressing_done_details.created_by`. If worker names are missing, ensure `created_by` references valid user IDs and the users collection has `first_name` and `last_name`.

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

- `startOfDay` = `new Date(reportDate)` with time 00:00:00.000  
- `endOfDay` = `new Date(reportDate)` with time 23:59:59.999  

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

**Result**: Array of documents. Each document has pressing_done fields plus `consumed` (group_details, base_details, face_details) and `workerName`. This array is passed to `GeneratePressingDailyReportExcel(pressingData, reportDate)` in the Excel config; the config builds each of the five sections from these documents and their nested arrays.
