# Tapping/Clipping Reports Documentation

Tapping/Clipping report APIs are documented in subfolders, aligned with the Dressing reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Clipping** | Clipping (Tapping) daily report (single date, clipping production details by Item Name and LogX, summary by dimensions, Clipping Id table) | [CLIPPING_DAILY_REPORT_API.md](./Daily_Clipping/CLIPPING_DAILY_REPORT_API.md), [CLIPPING_DAILY_REPORT_PLAN.md](./Daily_Clipping/CLIPPING_DAILY_REPORT_PLAN.md) |
| **Stock_Register** | Clipping Item Stock Register (date range, by Item Group + Item Name, opening/received/issue/issue-for breakdown/closing, total row) | [TAPPING_OR_CLIPPING_STOCK_REGISTER_API.md](./Stock_Register/TAPPING_OR_CLIPPING_STOCK_REGISTER_API.md), [TAPPING_OR_CLIPPING_STOCK_REGISTER_PLAN.md](./Stock_Register/TAPPING_OR_CLIPPING_STOCK_REGISTER_PLAN.md) |
| **Log_wise_TappingORClipping** | Clipping Item Stock Register (date range, one row per log per clipping date, opening/received/issue/issue-for/closing, total row) | [LOG_WISE_TAPPING_OR_CLIPPING_REPORT_API.md](./Log_wise_TappingORClipping/LOG_WISE_TAPPING_OR_CLIPPING_REPORT_API.md), [LOG_WISE_TAPPING_OR_CLIPPING_REPORT_PLAN.md](./Log_wise_TappingORClipping/LOG_WISE_TAPPING_OR_CLIPPING_REPORT_PLAN.md) |

## API Endpoints

- **Daily (Clipping)**: `POST /api/V1/report/download-excel-clipping-daily-report`
- **Stock Register**: `POST /api/V1/report/download-excel-tapping-or-clipping-stock-register`
- **Log Wise (Clipping Item Stock Register)**: `POST /api/V1/report/download-excel-log-wise-tapping-or-clipping-report`

## Related

- Controllers: `topl_backend/controllers/reports2/TappingORClipping/` (clipping daily report, stock register, log wise tapping/clipping report)
- Excel configs: `topl_backend/config/downloadExcel/reports2/TappingORClipping/`
- Routes: `topl_backend/routes/report/reports2/TappingORClipping/TappingORClipping.js`
