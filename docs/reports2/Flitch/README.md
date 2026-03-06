# Flitch Reports Documentation

Flitch report APIs are documented in three subfolders, aligned with the Log reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Flitch** | Flitch daily report (single date, flitching production details) | [FLITCH_DAILY_REPORT_API.md](./Daily_Flitch/FLITCH_DAILY_REPORT_API.md) |
| **Item_wise_flitch** | Item-wise flitch report (date range, movements by item name) | [ITEM_WISE_FLITCH_REPORT_API.md](./Item_wise_flitch/ITEM_WISE_FLITCH_REPORT_API.md) |
| **Log_wise_flitch** | Log-wise flitch report (date range, one row per log with item grouping) | [LOG_WISE_FLITCH_REPORT_API.md](./Log_wise_flitch/LOG_WISE_FLITCH_REPORT_API.md) |

## API Endpoints

- **Daily**: `POST /api/V1/reports2/flitch/download-excel-flitch-daily-report`
- **Item Wise**: `POST /api/V1/reports2/flitch/download-excel-item-wise-flitch-report`
- **Log Wise**: `POST /api/V1/reports2/flitch/download-excel-log-wise-flitch-report`

## Related

- Controllers: `topl_backend/controllers/reports2/Flitch/`
- Excel configs: `topl_backend/config/downloadExcel/reports2/Flitch/`
- Routes: `topl_backend/routes/report/reports2/Flitch/flitch.routes.js`
