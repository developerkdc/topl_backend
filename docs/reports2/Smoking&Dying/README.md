# Smoking&Dying Reports Documentation

Smoking&Dying (Dyeing) report APIs are documented in subfolders, aligned with the Dressing reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily** | Smoking&Dying (Dyeing) daily report (single date, process_done_details + items by LogX, merged Item Name / New Item Name / LogX, Total row, Dyeing Id table) | [SMOKING_DYING_DAILY_REPORT_API.md](./Daily/SMOKING_DYING_DAILY_REPORT_API.md), [SMOKING_DYING_DAILY_REPORT_PLAN.md](./Daily/SMOKING_DYING_DAILY_REPORT_PLAN.md) |
| **Stock_Register** | Smoking&Dying Stock Register (date range, by Item Group + Item Name, opening/closing, Direct Dye, DR Dyed, issues, total row) | [SMOKING_DYING_STOCK_REGISTER_API.md](./Stock_Register/SMOKING_DYING_STOCK_REGISTER_API.md), [SMOKING_DYING_STOCK_REGISTER_PLAN.md](./Stock_Register/SMOKING_DYING_STOCK_REGISTER_PLAN.md) |

## API Endpoints

- **Daily**: `POST /api/V1/report/download-excel-smoking-dying-daily-report`
- **Stock Register**: `POST /api/V1/report/download-excel-smoking-dying-stock-register`

## Related

- Controllers: `topl_backend/controllers/reports2/Smoking&Dying/` (smokingDyingDailyReport.js, smokingDyingStockRegister.js)
- Excel configs: `topl_backend/config/downloadExcel/reports2/Smoking&Dying/` (smokingDyingDailyReport.js, smokingDyingStockRegister.js)
- Routes: `topl_backend/routes/report/reports2/Smoking&Dying/smoking_dying.routes.js`
