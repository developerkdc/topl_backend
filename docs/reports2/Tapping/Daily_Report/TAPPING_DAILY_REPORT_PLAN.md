# Tapping (Splicing) Daily Report API Plan

**Overview:** Add a new Tapping daily report API under `reports2 > Tapping > Daily_Report` that produces a "Splicing Details Report" Excel file. The report has a 14-column main table with a 3-row header (Machine Splicing / Hand Splicing breakdown under "Tapping received (In Sq. Mtr.)"), grouping by Item Name with subtotals and a grand total, and a "Summery" section showing Issue vs Production quantities grouped by (Item Name, Thickness, Length, Width). The existing `TappingORClipping/clippingDailyReport` API is not modified.

---

## Report Layout (from client image)

- **Title:** "Splicing Details Report Date: DD/MM/YYYY"
- **Main table (14 columns, 3-row header):**
  - Row 1: Item Name | Thickness | LogX | Length | Width | Sheets | `Tapping received (In Sq. Mtr.)` ← merged cols 7–10 | Character | Pattern | Series | Remarks
  - Row 2: (cols 1–6 merged from row 1) | `Machine Splicing` ← merged cols 7–8 | `Hand Splicing` ← merged cols 9–10 | (cols 11–14 merged from row 1)
  - Row 3: (cols 1–6, 11–14 merged from row 1) | Sheets | SQ Mtr | Sheets | SQ Mtr
- **Grouping:** Rows grouped by Item Name; each row is one LogX entry. After each Item Name block, a **Total** row (Sheets + Machine/Hand sub-totals). Grand **Total** row at end.
- **Summery table (8 columns, 2-row header):**
  - Row 1: Item Name | Tickness | Length | Width | `Issue` ← merged cols 5–6 | `Production` ← merged cols 7–8
  - Row 2: (cols 1–4 merged) | Sheets | SQ Mtr | Sheets | SQ Mtr
  - One row per (Item Name, Thickness, Length, Width); **Total** row at bottom.
- **No Clipping ID section.**

## Data Sources (Schema)

- **tapping_done_other_details:** `tapping_date`, `shift`, `splicing_type` (`MACHINE` or `HAND`), `issue_for_tapping_item_id`
- **tapping_done_items_details:** `item_name`, `log_no_code`, `thickness`, `length`, `width`, `no_of_sheets`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`
- **issue_for_tappings:** `no_of_sheets`, `sqm` — accessed via `tapping_done_other_details.issue_for_tapping_item_id`

## API Contract

- **Endpoint:** `POST /api/V1/report/download-excel-tapping-daily-report`
- **Request body:** `{ "filters": { "reportDate": "YYYY-MM-DD" } }`
- **Success (200):** `{ result: "<APP_URL>/public/reports/Tapping/...", statusCode: 200, status: "success", message: "..." }`
- **Errors:** 400 if `reportDate` missing; 404 if no data for the date.

## File Structure

| Purpose | Path |
|---------|------|
| Controller | `controllers/reports2/Tapping/Daily_Report/tappingDailyReport.js` |
| Excel generator | `config/downloadExcel/reports2/Tapping/Daily_Report/tappingDailyReport.js` |
| Routes | `routes/report/reports2/Tapping/tapping.routes.js` |
| Routes mount | `routes/report/reports2.routes.js` — `router.use(tappingRoutes)` |

## Implementation Summary

1. **Controller:** Match `tapping_done_other_details` by `tapping_date`; lookup `issue_for_tappings` (for Issue data); lookup `tapping_done_items_details` (for production/item data); unwind and sort by `items.item_name`, `items.log_no_code`. Return 404 if no data; else call Excel generator.
2. **Excel config:** 3-row merged header; group by item_name; per-row populate Machine Splicing (cols 7–8) or Hand Splicing (cols 9–10) based on `splicing_type`; Total row per item + grand Total; Summery section with Issue/Production grouped by (item_name, thickness, length, width).
3. **Routes:** POST `/download-excel-tapping-daily-report` → TappingDailyReportExcel.
4. **Mount:** Import and use `tappingRoutes` in `reports2.routes.js`.

## Notes

- `splicing_type` on `tapping_done_other_details` drives the Machine/Hand column split.
- Issue quantities come from `issue_for_tappings` (joined via `issue_for_tapping_item_id`); `issueSource` is added to each record before unwind so `issueSource[0]` is the same for all items in the same session.
- Excel files saved to `public/reports/Tapping/tapping_daily_report_{timestamp}.xlsx`.
