# Slicing Reports Documentation

Slicing report APIs are documented in subfolders, aligned with the Flitch reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Slicing** | Slicing daily report (single date, slicing details with rejection and summary) | [SLICING_DAILY_REPORT_API.md](./Daily_Slicing/SLICING_DAILY_REPORT_API.md) |

## API Endpoints

- **Daily**: `POST /api/V1/report/download-excel-slicing-daily-report`

## Related

- Controllers: `topl_backend/controllers/reports2/Slicing/`
- Excel configs: `topl_backend/config/downloadExcel/reports2/Slicing/`
- Routes: `topl_backend/routes/report/reports2/Slicing/slicing.route.js`
