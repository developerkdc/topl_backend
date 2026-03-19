# Crosscut Reports Documentation

Crosscut report APIs are documented in subfolders, aligned with the Dressing reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Crosscut** | Crosscut daily report (single date, log details with two-row-per-log layout, summary) | [CROSSCUT_DAILY_REPORT_API.md](./Daily_Crosscut/CROSSCUT_DAILY_REPORT_API.md), [CROSSCUT_DAILY_REPORT_PLAN.md](./Daily_Crosscut/CROSSCUT_DAILY_REPORT_PLAN.md) |
| **Log_wise_crosscut** | Log Wise Crosscut (date range, one row per log, 15 columns, totals per item and grand total) | [LOG_WISE_CROSSCUT_REPORT_API.md](./Log_wise_crosscut/LOG_WISE_CROSSCUT_REPORT_API.md), [LOG_WISE_CROSSCUT_REPORT_PLAN.md](./Log_wise_crosscut/LOG_WISE_CROSSCUT_REPORT_PLAN.md) |

## API Endpoints

- **Daily**: `POST /api/V1/report/download-excel-crosscutting-daily-report`
- **Log Wise**: `POST /api/V1/report/download-excel-log-wise-crosscut-report`

## Related

- Controllers: `topl_backend/controllers/reports2/Crosscut/` (crosscutDailyReport.js, logWiseCrosscut.js)
- Excel configs: `topl_backend/config/downloadExcel/reports2/Crosscut/` (crosscutDailyReport.js, logWiseCrosscut.js)
- Routes: `topl_backend/routes/report/reports2/Crosscut/crosscut.routes.js`
