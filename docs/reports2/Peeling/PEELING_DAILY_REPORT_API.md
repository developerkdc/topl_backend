# Peeling Daily Report API

## Overview

The Peeling Daily Report API generates an Excel report of peeling production for a given date. The report lists peeling-done records with input dimensions (from issue-for-peeling), output items (veneer/face/core), rejection/wastage details, and session info (shift, work hours, worker). Layout and behaviour mirror the Slicing Daily Report, adapted for peeling (log-based input, diameter, output types).

## Endpoint

```
POST /report/download-excel-peeling-daily-report
```

(Full URL: `{baseUrl}/api/{version}/report/download-excel-peeling-daily-report`)

## Authentication

- Uses the same auth as other report endpoints (report router).
- Ensure a valid session/authorization if the report router is protected.

## Request Body

### Required Parameters

```json
{
  "filters": {
    "reportDate": "2025-03-31"
  }
}
```

| Parameter   | Type   | Required | Description                    |
|------------|--------|----------|--------------------------------|
| reportDate | string | Yes      | Report date in `YYYY-MM-DD`.  |

## Response

### Success Response (200 OK)

```json
{
  "result": "http://localhost:5000/public/reports/Peeling/peeling_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Peeling daily report generated successfully"
}
```

- **result**: Full URL to download the generated Excel file.

### Error Responses

#### 400 Bad Request

When `reportDate` is missing:

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 404 Not Found

When there is no peeling data for the selected date:

```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No peeling data found for the selected date"
}
```

## Report Structure

The Excel file has one sheet: **Peeling Details Report**.

### Title Row

- **Format:** `Peeling Details Report Date: DD/MM/YYYY`
- **Example:** `Peeling Details Report Date: 31/03/2025`

### Main Data Table

Rows are grouped by **Item Name**. For each item, detail rows then a **Total** row.

**Main columns:**

| Column       | Description                                      |
|-------------|---------------------------------------------------|
| Item Name   | Wood/item name (e.g. from peeling_done_items)     |
| Log No      | Log number                                       |
| Output Type | Veneer, Face, or Core                            |
| Thickness   | Thickness (mm)                                    |
| Length      | Length (from issued-for-peeling or item)          |
| Width       | Width (from item)                                 |
| Diameter    | Diameter (from issued-for-peeling)                |
| CMT         | Cubic metre (input/output)                        |
| Leaves      | Number of leaves                                  |
| Sq Mtr      | Square metres (placeholder/optional)               |

**Rejection columns (to the right):**

| Column        | Description                    |
|---------------|--------------------------------|
| Rej. Length   | Wastage length                 |
| Rej. Diameter | Wastage diameter                |
| Rej. CMT      | Wastage CMT                    |
| Remarks       | Wastage remark or "COMPLETE"   |

- Each item group has a **Total** row for CMT, Leaves, Sq Mtr, and Rej. CMT.
- Numeric cells use decimal formatting (e.g. CMT to 3 decimal places).

### Summary Section

Item-wise summary table:

| Item name | Input CMT | Rej. CMT | Peel CMT | Leaves |
|-----------|-----------|----------|----------|--------|
| ...       | ...       | ...      | ...      | ...    |
| **Total** | ...       | ...      | ...      | ...    |

- **Peel CMT** = Input CMT − Rej. CMT per item; totals at bottom.

### Peeling Session Details

At the bottom of the sheet:

| Peeling Id | Shift | Work Hours | Worker   |
|------------|-------|------------|----------|
| ...        | DAY   | 8          | John Doe |

- One row per distinct peeling session (by peeling_done_other_details id) for the day.
- **Worker** is created_by user’s first_name + last_name.

## Data Sources

### Collections

1. **peeling_done_other_details**
   - Anchor: filtered by `peeling_date` within the report day.
   - Fields used: `_id`, `issue_for_peeling_id`, `shift`, `no_of_working_hours`, `total_cmt`, `created_by`.

2. **issues_for_peelings**
   - Lookup by `issue_for_peeling_id` → `_id`.
   - Fields: `length`, `diameter`, `cmt` (input dimensions).

3. **issue_for_peeling_wastage**
   - Lookup by `issue_for_peeling_id`.
   - Fields: `length`, `diameter`, `cmt`, `remark` (rejection/wastage).

4. **peeling_done_items**
   - Lookup by `peeling_done_other_details_id` → `_id`.
   - Fields: `item_name`, `log_no`, `output_type`, `thickness`, `length`, `width`, `no_of_leaves`, `cmt`.

5. **users**
   - Lookup by `created_by` → `_id`.
   - Fields: `first_name`, `last_name` (for Worker).

### Relationships

- **peeling_done_other_details** is the root (one per peeling session).
- Each has one **issues_for_peelings** (input) and optionally one **issue_for_peeling_wastage**.
- Each has many **peeling_done_items** (output rows).
- **users** is joined for the worker name.

## Calculation Logic

### Date filter

- `peeling_date >= reportDate 00:00:00` and `peeling_date <= reportDate 23:59:59`.
- Only records in that day are included.

### CMT and totals

- **Input CMT**: From `issues_for_peelings.cmt` (or `peeling_done_items.cmt` when issued CMT is null).
- **Rej. CMT**: From `issue_for_peeling_wastage.cmt`.
- **Peel CMT**: Input CMT − Rej. CMT (per row and per item in summary).
- **Leaves**: From `peeling_done_items.no_of_leaves`.
- Item totals and grand totals sum the above per item name.

### Sorting

- Rows sorted by `items.item_name`, then `items.log_no`.

## Example Usage

### cURL

```bash
curl -X POST "http://localhost:5000/api/v1/report/download-excel-peeling-daily-report" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31"
    }
  }'
```

### JavaScript (Axios)

```javascript
const response = await axios.post(
  '/api/v1/report/download-excel-peeling-daily-report',
  {
    filters: {
      reportDate: '2025-03-31',
    },
  },
  { headers: { Authorization: `Bearer ${token}` } }
);

const downloadUrl = response.data.result;
window.open(downloadUrl, '_blank');
```

## File Storage

- **Directory:** `public/reports/Peeling/`
- **Filename pattern:** `peeling_daily_report_{timestamp}.xlsx`
- **Example:** `peeling_daily_report_1738234567890.xlsx`
- **Download URL:** `{APP_URL}public/reports/Peeling/peeling_daily_report_{timestamp}.xlsx`

## Notes

- Report includes only peeling sessions with `peeling_date` on the given day.
- One row in the main table is one **peeling_done_item**; input and wastage are joined from issue-for-peeling.
- Session block lists each distinct peeling session (by peeling_done_other_details id) once.
- Excel uses borders and header styling consistent with other daily reports (e.g. Slicing).

## Troubleshooting

| Issue | Check |
|-------|--------|
| 400 "Report date is required" | Send `filters.reportDate` in body as `YYYY-MM-DD`. |
| 404 "No peeling data found" | Confirm peeling_done_other_details exist for that date and time range. |
| Wrong/missing data | Verify issue_for_peeling_id links to issues_for_peelings and peeling_done_items link to peeling_done_other_details. |
| Missing worker name | Ensure created_by references a user with first_name/last_name. |
