# Log inward daily report — API

## Purpose

Generates an Excel file listing all log inventory lines whose **invoice inward date** falls on a single calendar day. Data is read from the log inventory **view** model, sorted by item and log number, then formatted with inward/item subtotals, grand totals, a supplier summary, and optional worker/shift details.

## Routing

| Item | Value |
|------|--------|
| Mount | `app.use(\`/api/${version}/report\`, reportRouter)` — see `topl_backend/index.js` (version from config, typically `V1`) |
| Route file | `topl_backend/routes/report/reports2/Log/log.routes.js` |
| Method / path | `POST /api/V1/report/download-excel-log-inward-daily-report` |

## Request

**Content-Type:** `application/json`

**Body** — note the nested `filters` object (this endpoint differs from other Log reports):

```json
{
  "filters": {
    "reportDate": "2025-02-24"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `filters.reportDate` | Yes | Date string; used to build `[startOfDay, endOfDay]` in the server local timezone (`00:00:00.000`–`23:59:59.999`). |

Any other keys under `filters` are ignored by the controller.

## Responses

### Success — 200

Shape from `logInward.js` controller (not `ApiResponse`):

```json
{
  "result": "<APP_URL>/public/upload/reports/reports2/Log/<filename>.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Log inward daily report generated successfully"
}
```

- `result` is a full URL to the generated workbook (see Excel generator in `config/downloadExcel/reports2/Log/logInward.js`).

### Errors

| HTTP | When |
|------|------|
| 400 | `filters.reportDate` missing |
| 404 | Aggregation returned no rows for that date |

Error body example:

```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

## Logic summary (for consumers)

- **Filter:** `log_invoice_details.inward_date` between start and end of `reportDate`.
- **Source:** `log_inventory_items_view_model.aggregate([ $match, $sort ])`.
- **Output file:** Under `public/upload/reports/reports2/Log/`; filename includes a timestamp.

## Excel layout (high level)

Implemented in `config/downloadExcel/reports2/Log/logInward.js`:

- Title: `Log Inward Daily Report Date: DD/MM/YYYY`
- Main table columns: Inward Id, Supplier Name, Item Name, Log No, Invoice Length, Invoice Dia., Invoice CMT, Indian CMT, Physical Length, Physical Girth, Physical CMT, Remarks
- Rows grouped by inward serial, then item; item subtotal rows; inward total rows; grand total
- **Summary 1:** per item + supplier aggregates
- **Summary 2 / worker block:** derived from `log_invoice_details.workers_details` when present

## Related code

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Log/logInward.js` |
| Excel | `topl_backend/config/downloadExcel/reports2/Log/logInward.js` |
| View model | `topl_backend/database/schema/inventory/log/log.schema.js` (`log_inventory_items_view_model`) |

## Implementation details

See **`LOG_INWARD_DAILY_REPORT_PLAN.md`** in this folder (data sources, assumptions, file layout).
