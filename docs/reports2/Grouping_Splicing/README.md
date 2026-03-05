# Grouping/Splicing Reports Documentation

Grouping/Splicing report APIs are documented in subfolders, aligned with the Dressing reports structure.

## Folder Structure

| Folder | Description | Main Doc |
|--------|-------------|----------|
| **Daily_Report** | Grouping daily report (single date, grouping details in three sections: main table, dimension summary, grouping operations). Data from grouping_done_details and grouping_done_items_details. | [GROUPING_SPLICING_DAILY_REPORT_API.md](./Daily_Report/GROUPING_SPLICING_DAILY_REPORT_API.md), [GROUPING_SPLICING_DAILY_REPORT_PLAN.md](./Daily_Report/GROUPING_SPLICING_DAILY_REPORT_PLAN.md) |
| **Stock_Register** | Splicing Item Stock Register (date range, by Item Group + Item Name, opening/closing, received Hand/Machine Splice, issue columns, total row) | [GROUPING_SPLICING_STOCK_REGISTER_API.md](./Stock_Register/GROUPING_SPLICING_STOCK_REGISTER_API.md) |

## API Endpoints

- **Daily (Grouping)**: `POST /api/V1/report/download-excel-grouping-splicing-daily-report`
- **Stock Register**: `POST /api/V1/report/download-excel-grouping-splicing-stock-register`

## Related

- Controllers: `topl_backend/controllers/reports2/Grouping_Splicing/`
- Excel configs: `topl_backend/config/downloadExcel/reports2/Grouping_Splicing/`
- Routes: `topl_backend/routes/report/reports2/Grouping_Splicing/grouping_splicing.routes.js`
