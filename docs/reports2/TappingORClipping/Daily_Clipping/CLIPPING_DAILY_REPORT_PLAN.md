# Clipping (Tapping) Daily Report API Plan

**Overview:** Add a Tapping/Clipping daily report API under reports2 > TappingORClipping that produces an Excel "Clipping Details Report": a main table (Item Name, LogX, Length, Width, Sheets, Sq Mtr, Interno columns, Customer Name, Character, Pattern, Series, Remarks) with item subtotals and grand total, a summary table by length/width, and a Clipping ID operational table. Data is sourced from tapping_done_items_details and tapping_done_other_details.

---

## Report layout (from spec/image)

- **Title:** "Clipping Details Report Date: DD/MM/YYYY"
- **Main table (15 columns):** Item Name | LogX | Length | Width | Sheets | Sq Mtr | Interno Length | Interno Width | Interno Sheets | Interno SQMtr | Customer Name | Character | Pattern | Series | Remarks
- **Grouping:** Rows grouped by **Item Name**; each row is one LogX (log_no_code) with dimensions and quantities. After each Item Name block, a **Total** row (Sheets and Sq Mtr subtotal). At the end, a grand **Total** row.
- **Summary table:** Length | Width | Sheets | SQ Mtr — one row per (Length, Width) with summed Sheets and Sq Mtr, plus a **Total** row.
- **Clipping ID table:** Clipping Id | Shift | Work Hours | Worker | Machine Id — one row per distinct tapping batch (tapping_done_other_details).

## Data source (schema)

- **tapping_done.schema.js** (`topl_backend/database/schema/factory/tapping/tapping_done/tapping_done.schema.js`)
  - **tapping_done_other_details:** `tapping_date`, `shift`, `no_of_working_hours`, `tapping_person_name`. Use `_id` to derive numeric Clipping Id (e.g. last 6 hex chars). No `machine_id` — output 0.
  - **tapping_done_items_details:** `tapping_done_other_details_id`, `item_name`, `log_no_code` (→ LogX), `length`, `width`, `no_of_sheets`, `sqm`, `character_name`, `pattern_name`, `series_name`, `remark`. Customer Name and Interno columns not in schema — use "TOPL" and 0 respectively.

## API contract

- **Endpoint:** `POST /api/V1/report/download-excel-clipping-daily-report`
- **Request body:** `{ "filters": { "reportDate": "YYYY-MM-DD" } }`
- **Success (200):** `{ result: "<APP_URL>/public/reports/TappingORClipping/...", statusCode: 200, status: "success", message: "..." }`
- **Errors:** 400 if `reportDate` missing; 404 if no data for the date.

## File structure

| Purpose | Path |
|---------|------|
| Controller | `controllers/reports2/TappingORClipping/clippingDailyReport.js` |
| Excel generator | `config/downloadExcel/reports2/TappingORClipping/clippingDailyReport.js` |
| Routes | `routes/report/reports2/TappingORClipping/TappingORClipping.js` |
| Mount | `routes/report/reports2.routes.js` — `router.use(tappingORClippingRoutes)` |

## Implementation summary

1. **Controller:** Match tapping_done_other_details by tapping_date; lookup tapping_done_items_details; unwind and sort by items.item_name, items.log_no_code. Return 404 if no data; else call Excel generator and return 200 with download link.
2. **Excel config:** Group by item_name; main table with 15 columns (Interno = 0, Customer Name = "TOPL"); Total row per item and grand Total; summary by (length, width); Clipping ID table from unique tapping_done_other_details (Clipping Id from _id, Machine Id = 0).
3. **Routes:** POST `/download-excel-clipping-daily-report` → ClippingDailyReportExcel.
4. **Mount:** Import and use tappingORClippingRoutes in reports2.routes.js.

## Notes

- **Customer Name** and **Interno** columns have no schema source; use "TOPL" and 0 respectively.
- **Clipping Id:** Derived from `tapping_done_other_details._id` (e.g. `parseInt(_id.toString().slice(-6), 16)`).
- **Machine Id:** Not in schema; output 0.
