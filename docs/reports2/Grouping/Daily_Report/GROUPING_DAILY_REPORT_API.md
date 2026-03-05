# Grouping Daily Report API

## Overview
The Grouping Daily Report API generates Excel reports showing grouping production details for a specific date. The report has two sections: (1) a main details table with Item Name, LogX, Photo No, Length, Width, Thickness, Sheets, Damaged Sheets, Sq Mtr, Character, Pattern, Series, Remarks—with a Total row after each Item Name group and a Grand Total row; (2) an Issue/Production summary table grouped by (Item Name, Length, Width, Thickness) with two-level headers showing Issue quantities (Sheets, SQ Mtr from available_details) and Production quantities (Group Sheets, Group Sq. Mtr., Damaged Sheets, Damaged Sq. Mtr.). Data is sourced from grouping_done_details and grouping_done_items_details.

## Endpoint
```
POST /report/download-excel-grouping-daily-report
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
  "result": "http://localhost:5000/public/reports/Grouping/grouping_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Grouping daily report generated successfully"
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

### Section 1: Main Grouping Details Table

**Headers (single row, 13 columns):**

| # | Column         | Description                                          |
|---|----------------|------------------------------------------------------|
| 1 | Item Name      | Product/item type                                    |
| 2 | LogX           | Log identifier code                                  |
| 3 | Photo No       | Photo reference number (grouping_done_items_details) |
| 4 | Length         | Length (meters)                                      |
| 5 | Width          | Width (meters)                                       |
| 6 | Thickness      | Thickness (grouping_done_items_details)               |
| 7 | Sheets         | Number of sheets                                     |
| 8 | Damaged Sheets | 1 if item is_damaged else 0                          |
| 9 | Sq Mtr         | Square meters                                        |
|10 | Character      | Character name                                       |
|11 | Pattern        | Pattern name                                         |
|12 | Series         | Series name                                          |
|13 | Remarks        | Remarks                                              |

- **Data rows:** One row per grouping item; sorted by Item Name, LogX, Length, Width, Thickness.
- **Total row (per Item Name):** After each Item Name block — "Total" in col 1, Sheets sum in col 7, Sq Mtr sum in col 9.
- **Grand Total row:** "Total" in col 1, total Sheets in col 7, total Sq Mtr in col 9.

### Section 2: Issue/Production Summary Table

Two-level header layout with 10 columns:

**Super-header row:**
- Cols 1–4: empty (plain bordered cells)
- Cols 5–6: merged `"Issue"`
- Cols 7–10: merged `"Production"`

**Sub-header row:**

| # | Column           | Description                                               |
|---|------------------|-----------------------------------------------------------|
| 1 | Item Name        | Product/item type                                         |
| 2 | Length           | Length (meters)                                           |
| 3 | Width            | Width (meters)                                            |
| 4 | Thickness        | Thickness                                                 |
| 5 | Sheets           | Issue sheets (available_details.no_of_sheets)             |
| 6 | SQ Mtr           | Issue sqm (available_details.sqm)                         |
| 7 | Group Sheets     | Grouped production sheets (no_of_sheets)                  |
| 8 | Group Sq. Mtr.   | Grouped production sqm (sqm)                              |
| 9 | Damaged Sheets   | Count of damaged sheets (is_damaged = true → 1, else 0)   |
|10 | Damaged Sq. Mtr. | Sqm of damaged items (sqm where is_damaged = true)        |

- **Data rows:** One row per unique (Item Name, Length, Width, Thickness) combination with aggregated values.
- **Total row:** Sum of all numeric columns.

## Report Features

- **Single date filtering:** Report for one specific day only.
- **Optional session filter:** `groupingId` to restrict to one grouping session.
- **Two-section layout:** Main details with per–Item Name totals and grand total; Issue/Production summary.
- **Photo No:** From `grouping_done_items_details.photo_no` (optional; blank if not set).
- **Thickness:** From `grouping_done_items_details.thickness` (required field).
- **Damaged Sheets:** 1 if `is_damaged = true` else 0.
- **Damaged Sq. Mtr.:** `sqm` where `is_damaged = true` else 0.
- **Issue Sheets/SQ Mtr:** From `available_details.no_of_sheets` / `available_details.sqm` (original available stock).
- **Bold formatting:** Headers and total rows are bold.
- **Visual styling:** Header rows have gray background.
- **Numeric formatting:** Length, Width, Thickness, Sq Mtr formatted to 2 decimal places (0.00).

---

## How Data Is Brought Together

### Step 1: Aggregation (Controller)

1. **Source collection:** `grouping_done_details`
2. **Filter (`$match`):** `grouping_done_date` in range; optional `_id` = `groupingId`.
3. **Attach items (`$lookup`):** `grouping_done_items_details` via `grouping_done_other_details_id`.
4. **One row per item (`$unwind`).**
5. **Attach worker name (`$lookup` on `users`):** `created_by` → `first_name`, `last_name`.
6. **Sort:** `item_name`, `log_no_code`, `length`, `width`, `thickness`.
7. **Project (flat shape):**
   - Session: `grouping_id`, `shift`, `no_of_working_hours`, `worker`
   - Item: `item_name`, `log_no_code`, `photo_no`, `length`, `width`, `thickness`, `no_of_sheets`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`
   - Computed: `damaged_sheets` (1/0), `issue_sheets` (available_details.no_of_sheets), `issue_sqm` (available_details.sqm), `damaged_sqm` (sqm if is_damaged else 0)

### Step 2: Excel Generation (Config)

- **Section 1:** 13-column main table with per–Item Name totals (Sheets col 7, Sq Mtr col 9) and Grand Total.
- **Section 2:** Build Issue/Production summary from aggregated rows: group by (item_name, length, width, thickness); write two-level header (super-header + sub-header) then data rows and Total row.

---

## Field Mapping (Excel Column → Source)

### Section 1

| # | Report column  | Source (after aggregation) | DB collection / source          | Notes |
|---|----------------|-----------------------------|----------------------------------|-------|
| 1 | Item Name      | `item_name`                 | grouping_done_items_details      | Direct |
| 2 | LogX           | `log_no_code`               | grouping_done_items_details      | Direct |
| 3 | Photo No       | `photo_no`                  | grouping_done_items_details      | Optional; blank if null |
| 4 | Length         | `length`                    | grouping_done_items_details      | 0.00 format |
| 5 | Width          | `width`                     | grouping_done_items_details      | 0.00 format |
| 6 | Thickness      | `thickness`                 | grouping_done_items_details      | 0.00 format |
| 7 | Sheets         | `no_of_sheets`              | grouping_done_items_details      | Total per group / grand |
| 8 | Damaged Sheets | `damaged_sheets`            | grouping_done_items_details      | 1 if is_damaged else 0 |
| 9 | Sq Mtr         | `sqm`                       | grouping_done_items_details      | Total per group / grand |
|10 | Character      | `character_name`            | grouping_done_items_details      | Direct |
|11 | Pattern        | `pattern_name`              | grouping_done_items_details      | Direct |
|12 | Series         | `series_name`               | grouping_done_items_details      | Direct |
|13 | Remarks        | `remark`                    | grouping_done_items_details      | Direct |

### Section 2

| # | Report column    | Source (after aggregation)          | Notes |
|---|------------------|--------------------------------------|-------|
| 1 | Item Name        | `item_name`                          | Group key |
| 2 | Length           | `length`                             | Group key |
| 3 | Width            | `width`                              | Group key |
| 4 | Thickness        | `thickness`                          | Group key |
| 5 | Sheets (Issue)   | `issue_sheets` (available_details.no_of_sheets) | Summed per group |
| 6 | SQ Mtr (Issue)   | `issue_sqm` (available_details.sqm) | Summed per group |
| 7 | Group Sheets     | `no_of_sheets`                       | Summed per group |
| 8 | Group Sq. Mtr.   | `sqm`                                | Summed per group |
| 9 | Damaged Sheets   | `damaged_sheets`                     | Summed per group |
|10 | Damaged Sq. Mtr. | `damaged_sqm`                        | Summed per group |

---

## Data Sources and Relationships

### Database Collections Used

1. **grouping_done_details** (sessions)
   - Key fields: `_id`, `grouping_done_date`, `shift`, `no_of_working_hours`, `created_by`.

2. **grouping_done_items_details** (items)
   - Linked by `grouping_done_other_details_id` = `grouping_done_details._id`.
   - Key fields: `item_name`, `log_no_code`, `photo_no`, `length`, `width`, `thickness`, `no_of_sheets`, `sqm`, `available_details.no_of_sheets`, `available_details.sqm`, `character_name`, `pattern_name`, `series_name`, `remark`, `is_damaged`.

3. **users** — resolve worker name via `created_by`.

### Join Diagram

```
grouping_done_details (1)
    │ _id
    ├── grouping_done_items_details (N)  via grouping_done_other_details_id
    └── users (1)                        via created_by  →  worker name
```

---

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-daily-report \
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
curl -X POST http://localhost:5000/api/v1/report/download-excel-grouping-daily-report \
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

const generateGroupingDailyReport = async () => {
  try {
    const response = await axios.post(
      '/api/v1/report/download-excel-grouping-daily-report',
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
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

## Technical Implementation

### Controller Location
```
topl_backend/controllers/reports2/Grouping/Daily_Report/groupingDailyReport.js
```

### Excel Generator Location
```
topl_backend/config/downloadExcel/reports2/Grouping/Daily_Report/groupingDailyReport.js
```

### Routes Location
```
topl_backend/routes/report/reports2/Grouping/grouping.routes.js
```

### Aggregation Pipeline Stages

**Stage 1 – $match:** Filter by `grouping_done_date` range; optional `_id` = groupingId.

**Stage 2 – $lookup:** Attach `grouping_done_items_details` via `_id` → `grouping_done_other_details_id`.

**Stage 3 – $unwind:** One document per item (drop sessions with no items).

**Stage 4 – $lookup:** Attach worker from `users` via `created_by`.

**Stage 5 – $unwind:** Flatten worker; `preserveNullAndEmptyArrays: true`.

**Stage 6 – $sort:** `items.item_name`, `items.log_no_code`, `items.length`, `items.width`, `items.thickness`.

**Stage 7 – $project:** Flat output including `photo_no`, `thickness`, `issue_sheets` (`available_details.no_of_sheets`), `issue_sqm` (`available_details.sqm`), `damaged_sqm` (`$cond` on `is_damaged`).

## File Storage

**Directory:** `public/reports/Grouping/`

**Filename pattern:** `grouping_daily_report_{timestamp}.xlsx`

## Troubleshooting

### No Data Found
- Verify date is in `YYYY-MM-DD` format.
- Confirm grouping operations exist for that date.
- If `groupingId` is used, confirm the Id is valid and belongs to the given date.

### Photo No is blank
`photo_no` is optional in the schema (default null); it will appear blank if not set for that item.

### Issue Sheets / SQ Mtr shows 0
`available_details.no_of_sheets` and `available_details.sqm` default to the item's `no_of_sheets`/`sqm` at creation time. If they are 0, the original available quantities were recorded as 0.
