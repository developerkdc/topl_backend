# Veneer Reports Documentation

Veneer report APIs are documented in subfolders, aligned with the Crosscut/Dressing reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Veneer_Inward** | Veneer Inward Report (date range, one row per item: Opening, Purchase, Issue Total, Smoking, Grouping, Sales, Job Work Challan, Damage, Closing) | [VENEER_INWARD_REPORT_API.md](./Veneer_Inward/VENEER_INWARD_REPORT_API.md), [VENEER_INWARD_REPORT_PLAN.md](./Veneer_Inward/VENEER_INWARD_REPORT_PLAN.md) |

## API Endpoints

- **Veneer Inward:** `POST /api/V1/report/download-excel-veneer-inward-report`

## Related

- Controllers: `topl_backend/controllers/reports2/Veneer/` (veneerInwardReport.js)
- Excel configs: `topl_backend/config/downloadExcel/reports2/Veneer/` (veneerInwardReport.js)
- Routes: `topl_backend/routes/report/reports2/Veneer/veneer.routes.js`
