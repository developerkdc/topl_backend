# Slicing Daily Report API

## Overview

The Slicing Daily Report API generates an Excel report for a specific date showing slicing production details: main slicing table (item, flitch no, dimensions, CMT, leaves), rejection details (rej. height, width, CMT, remarks), item-wise summary (Flitch CMT, Rej. CMT, Slice CMT, Leaves), and slicing session details (slicing id, shift, work hours, worker).

## Endpoint

```
POST /report/download-excel-slicing-daily-report
```

## Authentication

- Requires: Same as other report endpoints (application auth)
- Permission: Standard user authentication

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
  "result": "http://localhost:5000/public/reports/Slicing/slicing_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Slicing daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request

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
  "message": "No slicing data found for the selected date"
}
```

## Report Structure

The generated Excel report matches the following layout.

### Row 1: Report Title

**Format:**

```
Slicing Details Report Date: DD/MM/YYYY
```

**Example:**

```
Slicing Details Report Date: 02/04/2025
```

### Main Slicing Details Table (left) + Rejection Details Table (right)

**Main table columns:**

1. **Item Name** – Wood/item type (e.g., SAPELI)
2. **Flitch No** – Flitch identifier (e.g., D252A1A)
3. **Thickness** – Thickness (meters)
4. **Length** – Length (meters)
5. **Width** – Width (meters)
6. **Height** – Height (meters)
7. **CMT** – Cubic measurement (CMT)
8. **Leaves** – Number of leaves
9. **Sq Mtr** – Square meters (reported as 0.00 when not calculated)

**Rejection table columns (to the right of main table):**

1. **Rej. Hight** – Rejection height
2. **Rej. Width** – Rejection width
3. **Rej. CMT** – Rejection CMT
4. **Remarks** – e.g. COMPLETE or wastage remark

**Totals:**

- **Total** row under main table: sum of CMT, Leaves, Sq Mtr for that item; Total Rej. CMT in rejection section.

### Summary Section (Item-wise)

| Item name | Flitch CMT | Rej. CMT | Slice CMT | Leaves |
|-----------|------------|----------|-----------|--------|
| SAPELI    | 3.650      | 0.143    | 3.507     | 7610   |
| **Total** | **3.650**  | **0.143**| **3.507** | **7610** |

- **Slice CMT** = Flitch CMT − Rej. CMT

### Slicing Session Details

| Slicing Id | Shift | Work Hours | Worker      |
|------------|-------|------------|-------------|
| 22821      |       | 7          | RANJAN BHARTI |

## Report Features

- **Single date filtering**: Report for one specific day only.
- **Item grouping**: Rows grouped by item name with per-item totals.
- **Main + rejection layout**: Main slicing details and rejection details side by side.
- **Summary**: Item-wise Flitch CMT, Rej. CMT, Slice CMT, Leaves and grand total.
- **Session info**: Slicing Id, Shift, Work Hours, Worker per session.
- **Numeric formatting**: CMT to 3 decimals (0.000); dimensions to 2 decimals (0.00).
- **Header styling**: Gray background, bold headers and total rows.

## Data Sources

### Database Collections Used

1. **slicing_done_other_details** – Slicing session header
   - Fields: `slicing_date`, `shift`, `no_of_working_hours`, `issue_for_slicing_id`, `created_by`
   - Filter: `slicing_date` within report date (start of day to end of day)

2. **slicing_done_items** – Per-flitch slicing output
   - Fields: `item_name`, `log_no` (Flitch No), `thickness`, `no_of_leaves`
   - Linked via `slicing_done_other_details_id`

3. **issued_for_slicings** – Flitch dimensions and CMT (source of sliced flitch)
   - Fields: `length`, `width1`, `width2`, `width3`, `height`, `cmt`
   - Linked via `slicing_done_other_details.issue_for_slicing_id`

4. **issue_for_slicing_wastage** – Rejection/wastage
   - Fields: `height` (Rej. Hight), `width` (Rej. Width), `cmt` (Rej. CMT), `remark` (Remarks)
   - Linked via `issue_for_slicing_id`

5. **users** – Worker name
   - Linked via `slicing_done_other_details.created_by`
   - Display: `first_name` + `last_name`

### Data Relationships

- One **slicing_done_other_details** (session) has one **issue_for_slicing_id** → one **issued_for_slicing** (flitch dimensions, CMT).
- One session has one **issue_for_slicing_wastage** (if any).
- One session has many **slicing_done_items** (one row per flitch/item line).
- Report uses **width1** from issued_for_slicing for the single “Width” column.

## Calculation Logic

### Date filtering

```
Match records where:
  slicing_done_other_details.slicing_date >= reportDate 00:00:00
  AND slicing_done_other_details.slicing_date <= reportDate 23:59:59
```

### Summary

- **Flitch CMT**: Sum of `issued_for_slicing.cmt` per item (from each row).
- **Rej. CMT**: Sum of `issue_for_slicing_wastage.cmt` per item.
- **Slice CMT**: Flitch CMT − Rej. CMT per item.
- **Leaves**: Sum of `slicing_done_items.no_of_leaves` per item.

## Example Usage

### Using cURL

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-slicing-daily-report \
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

const generateSlicingReport = async () => {
  try {
    const response = await axios.post(
      '/api/V1/report/download-excel-slicing-daily-report',
      {
        filters: {
          reportDate: '2025-02-04',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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

- Report includes only slicing sessions for the selected date.
- CMT: 3 decimal places; dimensions: 2 decimal places.
- Excel filenames are timestamped to avoid overwrites.
- Files are stored in: `public/reports/Slicing/`.
- If no wastage record exists, Remarks can show “COMPLETE”.
- Sq Mtr is output as 0.00 (not computed in current implementation).

## File Storage

**Directory**: `public/reports/Slicing/`

**Filename pattern**: `slicing_daily_report_{timestamp}.xlsx`

**Example**: `slicing_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Slicing Details Report Date: 02/04/2025

Item Name | Flitch No | Thickness | Length | Width | Height | CMT   | Leaves | Sq Mtr | Rej. Hight | Rej. Width | Rej. CMT | Remarks
SAPELI    | D252A1A   | 0.40      | 3.15   | 0.68  | 0.40   | 0.721 | 1660   | 0.00   | 0.40       | 0.02       | 0.025    | COMPLETE
          | D252A2A   | 0.40      | 3.15   | 0.60  | 0.44   | 0.669 | 1470   | 0.00   | 0.44       | 0.02       | 0.028    | COMPLETE
          | ...       |           |        |       |        |       |        |        |            |            |          |
          | Total     |           |        |       |        | 3.650 | 7610   | 0.00   |            |            | 0.143    |

Item name | Flitch CMT | Rej. CMT | Slice CMT | Leaves
SAPELI    | 3.650      | 0.143    | 3.507     | 7610
Total     | 3.650      | 0.143    | 3.507     | 7610

Slicing Id | Shift | Work Hours | Worker
22821      |       | 7          | RANJAN BHARTI
```

## Troubleshooting

### No data found

If you get 404:

- Use a valid date in `YYYY-MM-DD`.
- Ensure slicing operations exist for that date (`slicing_done_other_details.slicing_date`).
- Confirm sessions have at least one `slicing_done_items` record.

### Wrong or missing dimensions

- Length, Width, Height, CMT come from **issued_for_slicings** via the session’s `issue_for_slicing_id`. If a session has multiple items, they share the same issued flitch dimensions.
- Width in the report is `width1` from issued_for_slicing.

### Missing rejection or worker

- Rejection: requires an **issue_for_slicing_wastage** row for that session’s `issue_for_slicing_id`; otherwise Rej. columns can be empty and Remarks may default to “COMPLETE”.
- Worker: comes from **users** via `slicing_done_other_details.created_by` (first_name + last_name).

## Technical Implementation

### Controller

```
topl_backend/controllers/reports2/Slicing/slicingDailyReport.js
```

### Excel generator

```
topl_backend/config/downloadExcel/reports2/Slicing/slicingDailyReport.js
```

### Routes

```
topl_backend/routes/report/reports2/Slicing/slicing.route.js
```

### Aggregation flow (conceptual)

- Match **slicing_done_other_details** by `slicing_date` (report date).
- Lookup **issued_for_slicings** (length, width1, height, cmt).
- Lookup **issue_for_slicing_wastage** (rej. height, width, cmt, remark).
- Lookup **slicing_done_items** (item_name, log_no, thickness, no_of_leaves).
- Lookup **users** (worker name from created_by).
- Unwind items so each document is one row; project fields for Excel.
- Sort by item name and flitch no.

## Process Flow

```
1. Log Inward     → Logs received
2. Crosscutting   → Logs to CC pieces
3. Flitching      → CC to flitches
4. Slicing        → Flitches sliced (THIS REPORT)
5. Peeling/Dressing → Further processing
```

This report covers the **slicing** stage: flitches issued for slicing, their dimensions and CMT, rejection/wastage, and session (shift, hours, worker).
