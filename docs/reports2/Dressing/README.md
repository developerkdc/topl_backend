# Dressing Reports Documentation

Dressing report APIs are documented in subfolders, aligned with the Flitch reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Dressing** | Dressing daily report (single date, dressing production details) | [DRESSING_DAILY_REPORT_API.md](./Daily_Dressing/DRESSING_DAILY_REPORT_API.md), [DRESSING_DAILY_REPORT_PLAN.md](./Daily_Dressing/DRESSING_DAILY_REPORT_PLAN.md) |
| **Stock_Register** | Dressing Stock Register (date range, by Item Group + Item Name, opening/closing, receipt, issues, mixmatch, total row) | [DRESSING_STOCK_REGISTER_API.md](./Stock_Register/DRESSING_STOCK_REGISTER_API.md), [DRESSING_STOCK_REGISTER_PLAN.md](./Stock_Register/DRESSING_STOCK_REGISTER_PLAN.md) |
| **Log_wise_dressing** | Dressing Stock Register By LogX (date range, one row per log, 20 columns, total row) | [LOG_WISE_DRESSING_REPORT_API.md](./Log_wise_dressing/LOG_WISE_DRESSING_REPORT_API.md), [LOG_WISE_DRESSING_REPORT_PLAN.md](./Log_wise_dressing/LOG_WISE_DRESSING_REPORT_PLAN.md) |

## API Endpoints

- **Daily**: `POST /api/V1/report/download-excel-dressing-daily-report`
- **Stock Register**: `POST /api/V1/report/download-excel-dressing-stock-register`
- **Log Wise**: `POST /api/V1/report/download-excel-log-wise-dressing-report`

## Related

- Controllers: `topl_backend/controllers/reports2/Dressing/` (daily, stock register); log-wise controller: `topl_backend/controllers/reports2/Flitch/logWiseDressingReport.js`
- Excel configs: `topl_backend/config/downloadExcel/reports2/Dressing/` (daily, stock register); log-wise config: `topl_backend/config/downloadExcel/reports2/Flitch/logWiseDressingReport.js`
- Routes: `topl_backend/routes/report/reports2/Dressing/dressing.routes.js`
