# Log item wise inward report — API

## Purpose

Excel report with **one row per log number** (plus `item_name`) for logs whose **invoice inward date** falls in the selected range. Similar business story to the item-wise inward report, but metrics are scoped with **`log_no`** filters instead of aggregating entire items in one row.

## Routing

| Item | Value |
|------|--------|
| Mount | `/api/V1/report` |
| Route file | `topl_backend/routes/report/reports2/Log/log.routes.js` |
| Method / path | `POST /api/V1/report/download-excel-log-item-wise-inward-daily-report` |

## Request

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "TEAK"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `startDate` / `endDate` | Yes | Same semantics as item-wise report (`end` inclusive through end of day). |
| `filter.item_name` | No | Applied in initial log discovery `$match`. |

## Responses

`ApiResponse` shape: `statusCode`, `success`, `message`, `result`.

### Success — 200

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log item wise inward report generated successfully",
  "result": "<APP_URL>/public/upload/reports/reports2/Log/Log-Item-Wise-Inward-Report-<timestamp>.xlsx"
}
```

### Errors

| HTTP | Message / cause |
|------|------------------|
| 400 | Missing dates, invalid dates, `start > end` |
| 404 | No logs with inward in range; or no “active” rows after filter |
| 500 | `ApiError` from catch |

## Logic summary

1. Find distinct `(log_no, item_name)` with `invoice.inward_date` in range (and optional item filter).
2. For **each** log, run parallel aggregations / lookups (N+1 pattern per log — performance note for large sets).
3. Derive opening/closing via `Opening = periodEndClosing + totalIssued − receivedCmt` with the same period-end reconstruction as item-wise when `end < now`.
4. Drop rows with no meaningful activity (see controller `activeLogs` filter).
5. Build Excel via `createLogItemWiseInwardReportExcel`.

## Related code

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Log/logItemWiseInward.js` |
| Excel | `topl_backend/config/downloadExcel/reports2/Log/logItemWiseInward.js` |

## Implementation details

See **`LOG_ITEM_WISE_INWARD_REPORT_PLAN.md`** in this folder (per-log metrics, differences from item-wise report, placeholders).
