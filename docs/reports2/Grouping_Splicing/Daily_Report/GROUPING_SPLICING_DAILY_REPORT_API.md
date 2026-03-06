# Grouping/Splicing Daily Report API

## Overview
The Grouping/Splicing Daily Report API generates Excel reports showing grouping production details for a specific date. The report has three sections: (1) a main details table with Item Name, LogX, Length, Width, Sheets, Damaged Sheets, Sq Mtr, Customer Name, Character, Pattern, Series, Remarks—with a Total row after each Item Name group and a Grand Total row; (2) a dimension and quantity summary table (Length, Width, Sheets, Damaged Sheets, SQ Mtr) with one row per (Length, Width) and a Total row; (3) a grouping operations table (Grouping Id, Shift, Work Hours, Worker, Machine Id) with one row per grouping session. Data is sourced from grouping_done_details and grouping_done_items_details. Customer Name is not in grouping schema (blank). Damaged Sheets from items.is_damaged (1/0).

## Endpoint
```
POST /report/download-excel-grouping-splicing-daily-report
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

### Optional Parameters
```json
{
  "filters": {
    "reportDate": "2025-02-04",
    "groupingId": "690aed51c7445a1b2c3d4e5f"
  }
}
```

- **groupingId** (optional): MongoDB ObjectId of a specific `grouping_done_details` record. When provided, the report includes only that grouping session; when omitted, all grouping sessions for the given date are included.

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/Grouping_Splicing/grouping_splicing_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Grouping/Splicing daily report generated successfully"
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

#### 400 Bad Request – Invalid grouping Id
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid grouping Id"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No grouping data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Displays the report date in a merged cell.

**Format:**
```
Grouping Details Report Date: DD/MM/YYYY
```

**Example:**
```
Grouping Details Report Date: 04/02/2025
```

### Section 1: Main Splicing Details Table

**Headers (single row):**

| # | Column         | Description                                      |
|---|----------------|--------------------------------------------------|
| 1 | Item Name      | Product/item type (e.g., AMERICAN WALNUT PANELLO)|
| 2 | LogX           | Log identifier code (e.g., 10/1IMPA W-8A)       |
| 3 | Length         | Length (meters)                                  |
| 4 | Width          | Width (meters)                                   |
| 5 | Sheets         | Number of sheets                                 |
| 6 | Damaged Sheets | 1 if item is_damaged else 0 (grouping_done_items_details) |
| 7 | Sq Mtr         | Square meters                                    |
| 8 | Customer Name  | Not in grouping schema; blank                    |
| 9 | Character      | Character name                                   |
|10 | Pattern        | Pattern name (e.g., Panello)                     |
|11 | Series         | Series name (e.g., Long)                         |
|12 | Remarks        | Remarks                                          |

- **Data rows:** One row per grouping item; rows are ordered by Item Name, then LogX, then length/width.
- **Total row (per Item Name):** After each distinct Item Name block, a row with first column "Total", column 5 (Sheets) = sum of Sheets for that group, column 7 (Sq Mtr) = sum of Sq Mtr for that group; other columns blank.
- **Grand Total row:** At the end of the main table; "Total" in column 1, total Sheets in column 5, total Sq Mtr in column 7.

### Section 2: Dimension and Quantity Summary Table

**Headers:** Length | Width | Sheets | Damaged Sheets | SQ Mtr

- One row per unique (Length, Width) combination with aggregated Sheets and Sq Mtr.
- **Total row** at bottom: total Sheets and total Sq Mtr (matching grand total from Section 1).

### Section 3: Grouping Operations Details Table

**Headers:** Grouping Id | Shift | Work Hours | Worker | Machine Id

- One row per unique grouping session (`grouping_done_details._id`).
- **Grouping Id:** Session document _id.
- **Machine Id:** Not in grouping schema; blank.

**Example:**
| Grouping Id      | Shift | Work Hours | Worker   | Machine Id |
|------------------|-------|------------|----------|------------|
| 690aed51c7445... | DAY   | 2          | SUPER ADM|            |

## Report Features

- **Single date filtering:** Report for one specific day only.
- **Optional session filter:** `groupingId` to restrict to one grouping session.
- **Three-section layout:** Main details (with per–Item Name totals and grand total), dimension summary, grouping operations at end.
- **Customer Name:** Not in grouping schema; blank.
- **Damaged Sheets:** From `grouping_done_items_details.is_damaged` (1 if true, 0 if false).
- **Automatic totals:** Total row after each Item Name group; Grand Total; dimension summary Total; one row per session in operations table.
- **Bold formatting:** Headers and total rows are bold.
- **Visual styling:** Header rows have gray background.
- **Numeric formatting:** Length, Width, Sq Mtr formatted to 2 decimal places (0.00).

## Understanding the API Response

When the API returns **200 OK**:

1. **`result`** is a full URL (e.g. `http://localhost:5000/public/reports/Grouping_Splicing/grouping_splicing_daily_report_1738234567890.xlsx`). The client can use this URL to download the generated Excel file (GET request or open in browser).

2. **The Excel file** contains:
   - **Title row:** "Grouping Details Report Date: DD/MM/YYYY" (date from request `reportDate`, formatted as DD/MM/YYYY).
   - **Section 1 – Main table:** 12 columns; data rows plus Total row after each Item Name group and a Grand Total row.
   - **Section 2 – Dimension summary:** 5 columns; one row per (Length, Width) and a Total row (includes Damaged Sheets total).
   - **Section 3 – Grouping operations:** 5 columns; one row per grouping session (Grouping Id; Machine Id blank).

3. **Where each value comes from** is documented in **Field Mapping** and **How Data Is Brought Together** below.

---

## How Data Is Brought Together

The report is built in two steps: **aggregation** (backend) and **Excel generation** (config).

### Step 1: Aggregation (Controller)

We **start from grouping sessions** and **attach items and worker name**:

1. **Source collection:** `grouping_done_details` (one document per grouping session).

2. **Filter** (`$match`):
   - `grouping_done_date` between start and end of `reportDate` (00:00:00 to 23:59:59).
   - If `groupingId` is provided: also `_id` equals that ObjectId (single session).

3. **Attach items** (`$lookup`):
   - From: `grouping_done_items_details`
   - Join: `grouping_done_details._id` = `grouping_done_items_details.grouping_done_other_details_id`
   - Result: each session document gets an `items` array.

4. **One row per item** (`$unwind` on `items`).

5. **Attach worker name** (`$lookup` on `users`): `created_by` → `users._id`; project `first_name`, `last_name`.

6. **Sort** by `items.item_name`, `items.log_no_code`, `items.length`, `items.width`.

7. **Project** to flat shape: grouping_id, shift, no_of_working_hours, worker; item_name, log_no_code, length, width, no_of_sheets, sqm, character_name, pattern_name, series_name, remark, customer_name (literal ''); damaged_sheets = 1 if items.is_damaged else 0.

**Result of aggregation:** An array of flat objects. Each object = one grouping item row with session metadata and worker name. Order: by item_name, log_no_code, length, width.

### Step 2: Excel Generation (Config)

- **Input:** The aggregated array and `reportDate`.
- **Title:** "Hand Splicing Details Report Date: " + `reportDate` formatted as DD/MM/YYYY.
- **Section 1:** Main table: one header row, then data rows; when Item Name changes, insert Total row (sum Sheets and Sq Mtr for previous group); after all data, insert Grand Total row.
- **Section 2:** Build dimension summary from aggregated rows: group by (length, width), sum sheets, damaged_sheets and sqm; write header, data rows, Total row.
- **Section 3:** Collect unique `grouping_id` from rows; for each, take shift, no_of_working_hours, worker; Machine Id blank; write header and one row per session.

---

## Field Mapping (Excel Column → Source)

| # | Report column   | Source (after aggregation) | DB collection / source           | Notes |
|---|-----------------|-----------------------------|----------------------------------|--------|
| 1 | Item Name      | `item_name`                 | grouping_done_items_details      | Direct |
| 2 | LogX           | `log_no_code`               | grouping_done_items_details      | Direct |
| 3 | Length         | `length`                    | grouping_done_items_details | Direct |
| 4 | Width          | `width`                     | grouping_done_items_details | Direct |
| 5 | Sheets         | `no_of_sheets`              | grouping_done_items_details | Direct; Total = SUM per group / grand |
| 6 | Damaged Sheets | `damaged_sheets`            | grouping_done_items_details | 1 if is_damaged else 0 |
| 7 | Sq Mtr         | `sqm`                       | grouping_done_items_details | Direct; Total = SUM per group / grand |
| 8 | Customer Name  | `customer_name`             | Literal ''                  | Not in grouping schema |
| 9 | Character      | `character_name`            | grouping_done_items_details | Direct |
|10 | Pattern        | `pattern_name`              | grouping_done_items_details | Direct |
|11 | Series         | `series_name`               | grouping_done_items_details | Direct |
|12 | Remarks        | `remark`                    | grouping_done_items_details | Direct |

**Section 3 – Grouping operations:**

| Report column | Source (after aggregation) | DB collection / source           | Notes |
|----------------|-----------------------------|----------------------------------|--------|
| Grouping Id   | `grouping_id`               | grouping_done_details._id        | One row per unique session |
| Shift         | `shift`                     | grouping_done_details            | |
| Work Hours    | `no_of_working_hours`       | grouping_done_details            | |
| Worker        | `worker`                    | users (first_name + " " + last_name) | Via created_by |
| Machine Id    | —                           | —                                | Not in schema; blank |

---

## Calculations

### Data rows (main table)
- All columns except Damaged Sheets and Customer Name are pass-through from the aggregation (grouping_done_items_details or session). Damaged Sheets = 1 if item is_damaged else 0; Customer Name = '' (not in grouping schema).

### Total rows (main table)
- **Per–Item Name Total:** Sum of `no_of_sheets` and `sqm` for all rows in that Item Name group.
- **Grand Total:** Sum of `no_of_sheets` and `sqm` over all aggregated rows.

### Dimension summary
- Group aggregated rows by (length, width); sum no_of_sheets, damaged_sheets and sqm per group. Total row = sum over all groups (same as Grand Total for sheets/sqm; total damaged in column 4).

### Worker name
- `worker = users.first_name + " " + users.last_name` (nulls as empty string), resolved via grouping_done_details.created_by → users._id.

---

## Data Sources and Relationships

### Database Collections Used

1. **grouping_done_details** (sessions)
   - One document per grouping run.
   - Key fields: `_id`, `grouping_done_date`, `shift`, `no_of_working_hours`, `created_by`.
   - `_id` is shown as **Grouping Id** in Section 3. No Machine Id in schema.

2. **grouping_done_items_details** (items)
   - One document per grouped item. Linked by: `grouping_done_other_details_id` = `grouping_done_details._id`.
   - Key fields: `item_name`, `log_no_code`, `length`, `width`, `no_of_sheets`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`, `is_damaged`.

3. **users**
   - Resolve worker name. Join: `grouping_done_details.created_by` = `users._id`. Fields: `first_name`, `last_name`.

### Join Diagram (conceptual)

```
grouping_done_details (1)
    │ _id
    ├── grouping_done_items_details (N)  via grouping_done_other_details_id
    └── users (1)                         via created_by  →  worker name
```

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-splicing-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-02-04"
    }
  }'
```

### With optional groupingId
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-splicing-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-02-04",
      "groupingId": "690aed51c7445a1b2c3d4e5f"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateGroupingSplicingReport = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-grouping-splicing-daily-report',
      {
        filters: {
          reportDate: '2025-02-04'
          // groupingId: '690aed51c7445a1b2c3d4e5f' // optional
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

- Report includes all grouping sessions for the given date unless `groupingId` is specified.
- Customer Name is not in grouping schema; column is blank.
- Damaged Sheets: from grouping_done_items_details.is_damaged (1 if true, 0 if false).
- Excel files are timestamped; stored in `public/reports/Grouping_Splicing/`.

## File Storage

**Directory:** `public/reports/Grouping_Splicing/`

**Filename pattern:** `grouping_splicing_daily_report_{timestamp}.xlsx`

**Example:** `grouping_splicing_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Grouping Details Report Date: 04/02/2025

Item Name              | LogX         | Length | Width | Sheets | Damaged Sheets | Sq Mtr  | Customer Name | Character | Pattern | Series | Remarks
AMERICAN WALNUT PANELLO| 10/1IMPA W-8A| 3.05   | 1.22  | 5      | 0              | 18.60   |               | Flowery   | Panello | Long   |
...
Total                  |              |        |       | 106    |                | 389.20  |               |           |         |        |

Length | Width | Sheets | Damaged Sheets | SQ Mtr
3.05   | 1.22  | 220    | 0              | 818.61
...
Total  |       | 245    | 0              | 896.71

Grouping Id       | Shift | Work Hours | Worker   | Machine Id
690aed51c7445...  | DAY   | 2          | SUPER ADM|
```

## Troubleshooting

### No Data Found
If you receive a 404 error, verify:
- The date is correct and in YYYY-MM-DD format.
- Grouping operations occurred on that date (`grouping_done_details` and `grouping_done_items_details` exist for that date).
- If `groupingId` is used, the Id is valid and belongs to the given date.

### Incorrect Date Format
Date should be in ISO format: `"YYYY-MM-DD"` (e.g. `"2025-02-04"`).

### Missing Customer Name
Customer Name is not in grouping schema; column is always blank.

### Missing Worker Details
Worker name is resolved from `users` via `grouping_done_details.created_by`. Ensure `created_by` references valid user IDs and the users collection has `first_name` and `last_name`.

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Grouping_Splicing/groupingSplicingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Grouping_Splicing/groupingSplicingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Grouping_Splicing/grouping_splicing.routes.js
```

### Aggregation Pipeline (exact stages)

Pipeline runs on **grouping_done_details** (model: `grouping_done_details_model`). Order and purpose of each stage:

**Stage 1 – $match**  
Filter sessions by date and optional groupingId:

```javascript
{
  $match: {
    grouping_done_date: { $gte: startOfDay, $lte: endOfDay }
    // if groupingId provided: _id: ObjectId(groupingId)
  }
}
```

**Stage 2 – $lookup (grouping_done_items_details)**  
Attach all items for each session (localField: _id, foreignField: grouping_done_other_details_id).

**Stage 3 – $unwind (items)**  
One document per item; drop sessions with no items.

**Stage 4 – $lookup (users)**  
Attach worker name (first_name, last_name) via created_by.

**Stage 5 – $unwind (worker)**  
Flatten worker; preserveNullAndEmptyArrays: true.

**Stage 6 – $sort**  
By items.item_name, items.log_no_code, items.length, items.width.

**Stage 7 – $project**  
Flatten to one object per row: grouping_id, shift, no_of_working_hours, worker; item_name, log_no_code, length, width, no_of_sheets, sqm, character_name, pattern_name, series_name, remark, customer_name (literal ''), damaged_sheets (1 if items.is_damaged else 0).

**Result:** Array of flat objects passed to `GenerateGroupingSplicingDailyReport(rows, reportDate)` in the Excel config. The config writes Section 1 (main table with per–Item Name totals and grand total), Section 2 (dimension summary including damaged_sheets total), and Section 3 (unique grouping_id with shift, no_of_working_hours, worker; Machine Id blank).
