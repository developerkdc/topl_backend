# Smoking&Dying Stock Register API Plan

**Overview:** The Smoking&Dying Stock Register report has the **same Excel layout as the Smoking&Dying Daily Report** (main table with Item Name, LogX merged per log group, Bundle No, ThickneSS, Length, Width, Leaves, Sq Mtr, PROCESS, Process color, Character, Pattern, Series, Remarks; subtotal rows per item; Grand Total row; Summary section with ITEM NAME, RECEIVED MTR., PROCESS NAME, LEAVE, PRODUCTION SQ. MTR). The only difference is filtering by **date range** (startDate, endDate) instead of a single report date. The Stock Register uses its **own** route, controller, and Excel generator; it does not use the Daily report.

---

## Goal

- **Route:** `POST /api/V1/report/download-excel-smoking-dying-stock-register`
- **Request:** `startDate` and `endDate` (via `filters.startDate` / `filters.endDate` or top-level `startDate` / `endDate`).
- **Report output:** Same structure as Daily report; title shows date range: "Smoking Details Report Date: DD/MM/YYYY - DD/MM/YYYY".

## Data source

- **process_done_details:** Filter by `process_done_date` in [startDate 00:00:00, endDate 23:59:59].
- **process_done_items_details:** Joined via `process_done_id`; one row per bundle; same fields as Daily report (item_name, log_no_code, bundle_number, thickness, length, width, no_of_leaves, sqm, process_name, color_name, character_name, pattern_name, series_name, remark).

## File structure

| Purpose         | Path |
|-----------------|------|
| Controller      | `controllers/reports2/Smoking&Dying/smokingDyingStockRegister.js` |
| Excel generator | `config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js` |
| Routes          | `routes/report/reports2/Smoking&Dying/smoking_dying.routes.js` |

## Implementation summary

1. **Controller**
   - Read `startDate`, `endDate` from `req.body.filters` or `req.body`.
   - Validate required dates, format (YYYY-MM-DD), and start ≤ end.
   - Run aggregation on `process_done_details`: $match by date range, $lookup `process_done_items_details`, $unwind, $sort (item_name, log_no_code, bundle_number), $project to flat shape.
   - If no rows, return 404.
   - Call `GenerateSmokingDyingStockRegisterExcel(rows, startDate, endDate)`; return 200 with download link.

2. **Excel generator**
   - Same layout as Daily report: title with date range; 14-column main table; merge Item Name and LogX per log group; subtotal row per item; Grand Total row; SUMMERY (RECEIVED MTR. = PRODUCTION SQ. MTR).
   - Save to `public/reports/SmokingDying/smoking_dying_stock_register_{timestamp}.xlsx`.
   - Return download URL.

3. **Routes**
   - Existing route `POST /download-excel-smoking-dying-stock-register` → `SmokingDyingStockRegisterExcel`.

## Notes

- **No shared code with Daily report:** Stock Register does not import or call the Daily report controller or Excel generator.
- **RECEIVED MTR. = PRODUCTION SQ. MTR** in the Summary section, same as Daily report.
