# Peeling Daily Report – Implementation Plan

## Objective

Implement a **Peeling Daily Report** API that generates an Excel report for a selected date, showing peeling production details in the same style as the Slicing Daily Report: main detail table (item, log no, output type, dimensions, CMT, leaves), rejection/wastage columns, item-wise summary (Input CMT, Rej. CMT, Peel CMT, Leaves), and session details (Peeling Id, Shift, Work Hours, Worker).

## Implementation Approach

- Reuse the **Slicing Daily Report** pattern: single-date filter, aggregation from a “done other details” collection with lookups, then Excel generation with grouped rows and session block.
- Data is anchored on **peeling_done_other_details** by **peeling_date**; join **issues_for_peelings**, **issue_for_peeling_wastage**, **peeling_done_items**, and **users** to build flat rows for Excel.

## Report Structure (Excel)

- **Period:** One day (reportDate).
- **Data source:** MongoDB aggregation over peeling_done_other_details + lookups.
- **Grouping:** By item name; within each item: detail rows + Total row.
- **Sections:**
  1. **Main table:** Item Name, Log No, Output Type, Thickness, Length, Width, Diameter, CMT, Leaves, Sq Mtr.
  2. **Rejection block:** Rej. Length, Rej. Diameter, Rej. CMT, Remarks.
  3. **Summary table:** Item name, Input CMT, Rej. CMT, Peel CMT, Leaves (+ Total row).
  4. **Session table:** Peeling Id, Shift, Work Hours, Worker.

## Implementation Files

### 1. Controller

**File:** `topl_backend/controllers/reports2/Peeling/peelingDailyReport.js`

**Function:** `PeelingDailyReportExcel` (wrapped with `catchAsync`)

**Request body:**

```json
{
  "filters": {
    "reportDate": "2025-03-31"
  }
}
```

**Processing steps:**

1. Read `reportDate` from `req.body.filters`; if missing, return 400.
2. Set `startOfDay` / `endOfDay` (00:00:00 and 23:59:59 for reportDate).
3. Run aggregation on **peeling_done_other_details_model**:
   - `$match`: `peeling_date` between startOfDay and endOfDay.
   - `$lookup` **issues_for_peelings** on `issue_for_peeling_id` → `_id`; `$unwind` (preserveNullAndEmptyArrays: true).
   - `$lookup` **issue_for_peeling_wastage** on `issue_for_peeling_id`; `$unwind` (preserveNullAndEmptyArrays: true).
   - `$lookup` **peeling_done_items** on `_id` → `peeling_done_other_details_id`; `$unwind` items (preserveNullAndEmptyArrays: false).
   - `$lookup` **users** on `created_by`, project first_name, last_name; `$unwind` (preserveNullAndEmptyArrays: true).
   - `$sort` by `items.item_name`, `items.log_no`.
   - `$project` flat row: peeling_id, shift, no_of_working_hours, worker (concat first_name + last_name), item_name, log_no, output_type, thickness, length (issued or item), diameter, width, cmt, leaves, rej_length, rej_diameter, rej_cmt, remarks.
4. If no rows, return 404 with message "No peeling data found for the selected date".
5. Call `GeneratePeelingDailyReport(rows, reportDate)` from config.
6. Return 200 with `result: excelLink`, status, message.

### 2. Excel config

**File:** `topl_backend/config/downloadExcel/reports2/Peeling/peelingDailyReport.js`

**Function:** `GeneratePeelingDailyReport(rows, reportDate)`

**Processing logic:**

- Create workbook, one sheet “Peeling Details Report”.
- Format report date to DD/MM/YYYY.
- **groupRows(rows):** Group by item_name; accumulate input_cmt, rej_cmt, leaves; collect unique sessions by peeling_id (shift, work_hours, worker).
- Build main table with main + rejection columns; per-item Total row; apply borders and number formats.
- Build summary table (Item name, Input CMT, Rej. CMT, Peel CMT, Leaves) and Total row.
- Build session table (Peeling Id, Shift, Work Hours, Worker).
- Save to `public/reports/Peeling/peeling_daily_report_{timestamp}.xlsx`.
- Return `process.env.APP_URL` + file path.

### 3. Routes

**File:** `topl_backend/routes/report/reports2/Peeling/peeling.routes.js`

- Import `PeelingDailyReportExcel` and `express`.
- `router.post('/download-excel-peeling-daily-report', PeelingDailyReportExcel)`.
- Export default router.

### 4. Report router registration

**File:** `topl_backend/routes/report/reports2.routes.js`

- Import peeling routes: `import peelingRoutes from './reports2/Peeling/peeling.routes.js';`
- Mount: `router.use(peelingRoutes);` (e.g. after slicing routes).
- Comment: `// Peeling routes (Peeling Daily Report)`.

**API path:** `POST /api/{version}/report/download-excel-peeling-daily-report`

## Data aggregation logic

### Schema reference

| Collection                   | Key fields used                                                                 |
|-----------------------------|----------------------------------------------------------------------------------|
| peeling_done_other_details  | peeling_date, issue_for_peeling_id, shift, no_of_working_hours, total_cmt, created_by |
| issues_for_peelings         | _id, length, diameter, cmt                                                      |
| issue_for_peeling_wastage   | issue_for_peeling_id, length, diameter, cmt, remark                             |
| peeling_done_items          | peeling_done_other_details_id, item_name, log_no, output_type, thickness, length, width, no_of_leaves, cmt |
| users                       | _id, first_name, last_name                                                      |

### Join logic

- **peeling_done_other_details** is the root; filter by `peeling_date` in [startOfDay, endOfDay].
- **issues_for_peelings:** `issue_for_peeling_id` → `_id` (one-to-one per session).
- **issue_for_peeling_wastage:** `issue_for_peeling_id` (one per session; optional).
- **peeling_done_items:** `_id` (peeling_done_other_details) → `peeling_done_other_details_id` (one-to-many; each item = one detail row).
- **users:** `created_by` → `_id` (worker name).

### Projected row (for Excel)

- peeling_id, shift, no_of_working_hours, worker
- item_name, log_no, output_type, thickness, length, diameter, width, cmt, leaves
- rej_length, rej_diameter, rej_cmt, remarks

Length/cmt prefer issued-for-peeling values when present; otherwise from peeling_done_items.

## API contract summary

| Aspect        | Value |
|---------------|--------|
| Method        | POST   |
| Path          | `/download-excel-peeling-daily-report` (under report router) |
| Body          | `{ "filters": { "reportDate": "YYYY-MM-DD" } }` |
| 200           | `{ result: "<download URL>", statusCode: 200, status: "success", message: "..." }` |
| 400           | Missing reportDate |
| 404           | No peeling data for the date |

## Flow diagram

```
Client
  → POST /report/download-excel-peeling-daily-report (body: filters.reportDate)
  → peeling.routes.js
  → PeelingDailyReportExcel (controller)
  → peeling_done_other_details aggregate (match by peeling_date, lookups)
  → GeneratePeelingDailyReport(rows, reportDate) (config)
  → Excel written to public/reports/Peeling/
  ← 200 { result: downloadLink }
```

## Differences from Slicing Daily Report

| Aspect        | Slicing Daily Report                    | Peeling Daily Report                         |
|---------------|----------------------------------------|----------------------------------------------|
| Anchor        | slicing_done_other_details, slicing_date | peeling_done_other_details, peeling_date     |
| Input source  | issued_for_slicings (length, width, height, cmt) | issues_for_peelings (length, diameter, cmt) |
| Wastage       | issue_for_slicing_wastage              | issue_for_peeling_wastage                    |
| Items         | slicing_done_items                     | peeling_done_items                           |
| Main table    | Flitch No, Length, Width, Height       | Log No, Output Type, Length, Width, Diameter|
| Rejection     | Rej. Height, Rej. Width, Rej. CMT      | Rej. Length, Rej. Diameter, Rej. CMT         |
| Summary       | Flitch CMT, Rej. CMT, Slice CMT        | Input CMT, Rej. CMT, Peel CMT                 |
| Session id    | slicing_id                             | peeling_id                                  |

Logic and Excel layout are aligned; only schema names and column labels differ as above.
