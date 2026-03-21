# Item wise inward report — API

## Purpose

Excel report of **stock movement by item** (`item_id` + `item_name`) over a date range. For each item that had **log inward** in the range (by invoice `inward_date`), the report computes opening/closing CMT and movement columns (crosscut, flitch, peeling, sales, rejections, etc.) using aggregations across log inventory and factory collections.

## Routing

| Item | Value |
|------|--------|
| Mount | `/api/V1/report` (see `topl_backend/index.js`) |
| Route file | `topl_backend/routes/report/reports2/Log/log.routes.js` |
| Method / path | `POST /api/V1/report/download-excel-item-wise-inward-daily-report` |

## Request

**Content-Type:** `application/json`

```json
{
  "startDate": "2025-03-01",
  "endDate": "2025-03-31",
  "filter": {
    "item_name": "ASH"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `startDate` | Yes | Range start (`YYYY-MM-DD` recommended). |
| `endDate` | Yes | Range end; server sets time to `23:59:59.999` on that day. |
| `filter.item_name` | No | Restricts queries that support `itemFilter` to one species name. |

## Responses

Uses `ApiResponse` (`utils/ApiResponse.js`): `statusCode`, `success`, `message`, `result`.

### Success — 200

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Item wise inward report generated successfully",
  "result": "<APP_URL>/public/upload/reports/reports2/Log/Item-Wise-Inward-Report-<timestamp>.xlsx"
}
```

### Errors — 400 / 404 / 500

| Condition | Typical handling |
|-----------|-------------------|
| Missing `startDate` or `endDate` | `ApiError` 400 |
| Invalid dates or `start > end` | `ApiError` 400 |
| No items / no report rows | `ApiResponse` 404 — `"No stock data found for the selected period"` |
| Uncaught failure | `ApiError` 500 |

## Logic summary (for consumers)

- **Who appears on the report:** Only items that have at least one log line with `invoice.inward_date` in `[start, end]` (the set `itemsInPeriod`). Rows are **not** included for items that only have stock movements without inward in range.
- **Opening / closing:** Derived from “period-end closing” stock and the identity `opening = closing + issued − received` (with `received = actual_cmt` in period). See **`ITEM_WISE_INWARD_REPORT_PLAN.md`** in this folder for formulas.
- **Output:** Excel via `createItemWiseInwardReportExcel` in `config/downloadExcel/reports2/Log/itemWiseInward.js`.

## Related code

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Log/itemWiseInward.js` |
| Excel | `topl_backend/config/downloadExcel/reports2/Log/itemWiseInward.js` |
