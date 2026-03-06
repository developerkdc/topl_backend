# Clipping Daily Report API

## Overview
The Clipping (Tapping) Daily Report API generates Excel reports showing clipping/tapping production details for a specific date. The report includes a main details table (Item Name, LogX, Length, Width, Sheets, Sq Mtr, Interno columns, Customer Name, Character, Pattern, Series, Remarks) grouped by Item Name with subtotals and a grand total, a summary table by dimensions (Length, Width, Sheets, SQ Mtr), and a Clipping ID section (Clipping Id, Shift, Work Hours, Worker, Machine Id) at the end.

## Endpoint
```
POST /report/download-excel-clipping-daily-report
```

Full path: `POST /api/V1/report/download-excel-clipping-daily-report`

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

- **reportDate** (required): Date for the report in `YYYY-MM-DD` format.

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/TappingORClipping/clipping_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Clipping daily report generated successfully"
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
  "message": "No clipping data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Clipping Details Report Date: DD/MM/YYYY
```

**Example:**
```
Clipping Details Report Date: 04/02/2025
```

### Main Data Table (15 columns)

Headers:

| # | Column | Description |
|---|--------|-------------|
| 1 | Item Name | Wood/item type (e.g., AMERICAN WALNUT 1MM PANELLO) |
| 2 | LogX | Log identifier code (e.g., 2/4AW-1B) |
| 3 | Length | Length (meters) |
| 4 | Width | Width (meters) |
| 5 | Sheets | Number of sheets |
| 6 | Sq Mtr | Square meters |
| 7 | Interno Length | Interno length (0 when not in schema) |
| 8 | Interno Width | Interno width (0 when not in schema) |
| 9 | Interno Sheets | Interno sheets (0 when not in schema) |
|10 | Interno SQMtr | Interno square meters (0 when not in schema) |
|11 | Customer Name | Customer name (default "TOPL") |
|12 | Character | Character name (e.g., Flowery, Figured) |
|13 | Pattern | Pattern name (e.g., Panello, Bookmatch) |
|14 | Series | Series name (e.g., Long, Plain) |
|15 | Remarks | Remarks |

- Data is **grouped by Item Name**. For each item, one row per LogX; then a **Total** row for that item (Sheets and Sq Mtr subtotal).
- After all items, a **Total** row with grand total Sheets and Sq Mtr.

### Summary Table by Dimensions

Placed below the main table.

**Headers:** Length | Width | Sheets | SQ Mtr

- One row per unique (Length, Width) with summed Sheets and Sq Mtr.
- A **Total** row with grand total Sheets and Sq Mtr.

### Clipping ID Section (at the end)

**Headers:** Clipping Id | Shift | Work Hours | Worker | Machine Id

- One row per tapping batch (unique `tapping_done_other_details`).
- **Clipping Id:** Numeric value derived from session `_id` (e.g. last 6 hex chars as number).
- **Machine Id:** Not in schema; reported as 0.

**Example:**
| Clipping Id | Shift | Work Hours | Worker | Machine Id |
|-------------|-------|------------|--------|------------|
| 17485 | DAY | 8 | JOHN | 0 |
| 17483 | NIGHT | 6 | JANE | 0 |

## Report Features

- **Single date filtering:** Report for one specific day only.
- **Grouping by Item Name:** Main table grouped by item with per-item Total row and grand Total row.
- **Summary by dimensions:** Aggregated Sheets and Sq Mtr by (Length, Width).
- **Clipping ID section:** One row per tapping session with Shift, Work Hours, Worker, Machine Id (0).
- **Interno columns:** All 0 (not in schema).
- **Customer Name:** Default "TOPL".
- **Bold formatting:** Headers and total rows are bold.
- **Visual styling:** Header row has gray background (D3D3D3).
- **Numeric formatting:** Length, Width, Sheets, Sq Mtr formatted to 2 decimal places where applicable.

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL to the generated Excel file. The client can use this URL to download the file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row:** "Clipping Details Report Date: DD/MM/YYYY" (date from request `reportDate`).
   - **Main table:** 15 columns, grouped by Item Name with Total row per item and grand Total row.
   - **Summary table:** Length, Width, Sheets, SQ Mtr by dimension with Total row.
   - **Clipping ID section:** One row per tapping session (Clipping Id, Shift, Work Hours, Worker, Machine Id).

3. **Data sources** are documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (controller) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

1. **Source collection:** `tapping_done_other_details` (one document per tapping/clipping session).

2. **Filter** (`$match`):
   - `tapping_date` between start and end of `reportDate` (00:00:00 to 23:59:59).

3. **Attach items** (`$lookup`):
   - From: `tapping_done_items_details`
   - Join: `tapping_done_other_details._id` = `tapping_done_items_details.tapping_done_other_details_id`
   - Result: each session document gets an `items` array.

4. **One row per item** (`$unwind` on `items`):
   - Each session becomes one document per item; sessions with no items are dropped (`preserveNullAndEmptyArrays: false`).

5. **Sort** (`$sort`):
   - By `items.item_name` (asc), then `items.log_no_code` (asc).

**Result of aggregation:** An array of documents. Each document has session fields (`_id`, `shift`, `no_of_working_hours`, `tapping_person_name`) and a single `items` object (one tapping_done_items_details row).

### Step 2: Excel Generation (Config)

- **Input:** The aggregated array and `reportDate`.
- **Grouping:** Group by `items.item_name`; for each item, list rows (LogX, Length, Width, Sheets, Sq Mtr, etc.), then Total row.
- **Summary:** Build dimension summary from all rows (unique length/width, sum sheets and sqm).
- **Clipping ID table:** Collect unique session `_id`; for each, output Clipping Id (derived from _id), shift, no_of_working_hours, tapping_person_name, Machine Id 0.
- **Save:** `public/reports/TappingORClipping/clipping_daily_report_{timestamp}.xlsx`; return `APP_URL + filePath`.

---

## Field Mapping (Excel Column → Source)

| # | Report column | Source | DB collection | DB field | Notes |
|---|----------------|--------|---------------|----------|--------|
| 1 | Item Name | items.item_name | tapping_done_items_details | item_name | Direct |
| 2 | LogX | items.log_no_code | tapping_done_items_details | log_no_code | Direct |
| 3 | Length | items.length | tapping_done_items_details | length | Direct |
| 4 | Width | items.width | tapping_done_items_details | width | Direct |
| 5 | Sheets | items.no_of_sheets | tapping_done_items_details | no_of_sheets | Direct; Total = SUM per item / grand |
| 6 | Sq Mtr | items.sqm | tapping_done_items_details | sqm | Direct; Total = SUM per item / grand |
| 7–10 | Interno Length/Width/Sheets/SQMtr | — | — | — | Not in schema; output 0 |
|11 | Customer Name | — | — | — | Default "TOPL" |
|12 | Character | items.character_name | tapping_done_items_details | character_name | Direct |
|13 | Pattern | items.pattern_name | tapping_done_items_details | pattern_name | Direct |
|14 | Series | items.series_name | tapping_done_items_details | series_name | Direct |
|15 | Remarks | items.remark | tapping_done_items_details | remark | Direct |

**Clipping ID section:**

| Report column | Source | DB collection | DB field | Notes |
|----------------|--------|---------------|----------|--------|
| Clipping Id | _id (derived) | tapping_done_other_details | _id | parseInt(_id.toString().slice(-6), 16) |
| Shift | shift | tapping_done_other_details | shift | |
| Work Hours | no_of_working_hours | tapping_done_other_details | no_of_working_hours | |
| Worker | tapping_person_name | tapping_done_other_details | tapping_person_name | |
| Machine Id | — | — | — | Not in schema; output 0 |

---

## Data Sources and Relationships

### Database Collections Used

1. **tapping_done_other_details** (sessions)
   - One document per tapping/clipping run.
   - Key fields: `_id`, `tapping_date`, `shift`, `no_of_working_hours`, `tapping_person_name`.
   - `_id` is used to derive **Clipping Id** and to uniquely list sessions in the Clipping ID table.

2. **tapping_done_items_details** (items)
   - One document per clipped/tapped item.
   - Linked by: `tapping_done_other_details_id` = `tapping_done_other_details._id`.
   - Key fields: `item_name`, `log_no_code`, `length`, `width`, `no_of_sheets`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`.

### Join Diagram (conceptual)

```
tapping_done_other_details (1)
    │ _id
    └── tapping_done_items_details (N)  via tapping_done_other_details_id
```

One session has many items; each item row carries the same session metadata. The Clipping ID section lists each session once.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-clipping-daily-report \
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

const generateClippingReport = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-clipping-daily-report',
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

- Report includes all tapping/clipping sessions for the given date.
- Clipping Id is a numeric representation of the session ObjectId (last 6 hex chars); Machine Id is always 0.
- Customer Name is fixed as "TOPL"; Interno columns are 0.
- Excel files are timestamped and stored in `public/reports/TappingORClipping/`.

## File Storage

**Directory:** `public/reports/TappingORClipping/`

**Filename pattern:** `clipping_daily_report_{timestamp}.xlsx`

**Example:** `clipping_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Clipping Details Report Date: 04/02/2025

Item Name                  | LogX       | Length | Width | Sheets | Sq Mtr  | Interno... | Customer | Character | Pattern  | Series | Remarks
AMERICAN WALNUT 1MM PANELLO| 2/4AW-1B   | 3.05   | 1.22  | 12     | 44.65   | 0 0 0 0     | TOPL     | Flowery   | Panello  | Long   |
AMERICAN WALNUT 1MM PANELLO| 2/4AW-2B   | 3.05   | 1.22  | 12     | 44.65   | 0 0 0 0     | TOPL     | Flowery   | Panello  | Long   |
                            Total       |        |       | 24     | 89.30   |             |          |           |          |        |
...
Total                      | -          |        |       | 338    | 1100.80 |             |          |           |          |        |

Length | Width | Sheets | SQ Mtr
2.40   | 1.22  | 24     | 70.27
2.44   | 1.22  | 184    | 547.71
3.05   | 1.22  | 130    | 482.82
Total  |       | 338    | 1100.80

Clipping Id | Shift | Work Hours | Worker | Machine Id
17485       |       |            |        | 0
17483       |       |            |        | 0
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Tapping/clipping operations occurred on that date (`tapping_done_other_details` and `tapping_done_items_details` exist for that date).

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-02-04"`).

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/TappingORClipping/clippingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/TappingORClipping/clippingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js
```

### Aggregation Pipeline

Pipeline runs on **tapping_done_other_details**. Stages:

**Stage 1 – $match**
```javascript
{
  $match: {
    tapping_date: { $gte: startOfDay, $lte: endOfDay }
  }
}
```

**Stage 2 – $lookup (tapping_done_items_details)**
```javascript
{
  $lookup: {
    from: 'tapping_done_items_details',
    localField: '_id',
    foreignField: 'tapping_done_other_details_id',
    as: 'items'
  }
}
```

**Stage 3 – $unwind (items)**
```javascript
{
  $unwind: {
    path: '$items',
    preserveNullAndEmptyArrays: false
  }
}
```

**Stage 4 – $sort**
```javascript
{
  $sort: {
    'items.item_name': 1,
    'items.log_no_code': 1
  }
}
```

**Result:** Array of documents; each has session root fields and one `items` object. This array is passed to `GenerateClippingDailyReportExcel(details, reportDate)` in the Excel config.
