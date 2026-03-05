# Face Stock Report – Implementation Plan (reports2)

## Objective

Provide a **Face Stock Report** under the reports2 structure that generates Excel reports for face inventory for any given date range, with opening balance, received metres, issued metres, and closing balance, grouped by item name and thickness. The implementation follows the same pattern as other reports2 modules (e.g. Dressing Stock Register).

## Implementation Approach

The report lives under the **reports2** report module: routes, controller, and Excel config are in dedicated Face folders and use the shared report router mounted at `/report`.

### Report Structure (dynamic, from database)

- **Period:** User-supplied date range (startDate, endDate).
- **Data source:** MongoDB face inventory and history collections.
- **Grouping:** By `item_name`, then by `thickness`.
- **Columns:**
  1. Item name  
  2. Thickness  
  3. Opening Balance (sq m)  
  4. Received Metres (sq m)  
  5. Issued Metres (sq m)  
  6. Closing Bal (sq m)  

Subtotal row per item; grand total row at bottom.

## Implementation Files

### 1. Excel generator

**File:** `topl_backend/config/downloadExcel/reports2/Face/faceStockReport.js`

**Function:** `GenerateFaceStockReportExcel(aggregatedData, startDate, endDate, filter = {})`

**Behaviour:**

- Accept pre-aggregated data from the controller.
- Sort by item_name, then thickness.
- Build worksheet with title row, blank row, header row (6 columns).
- Add data rows grouped by item name; after each group add a "Total" subtotal row.
- Add grand total row at the end.
- Format: bold headers and totals; header row with gray fill.
- Write to `public/upload/reports/reports2/Face/Face-Stock-Report-{timestamp}.xlsx`.
- Return download URL (e.g. `APP_URL` + file path).

### 2. Controller

**File:** `topl_backend/controllers/reports2/Face/faceStockReport.js`

**Function:** `FaceStockReportExcel` (catchAsync handler)

**Request body:**

```javascript
{
  "startDate": "2025-01-01",  // required
  "endDate": "2025-01-31",    // required
  "filter": {                  // optional
    "item_name": "ASH"
  }
}
```

**Steps:**

1. Validate startDate and endDate (required, valid dates, start ≤ end).
2. Build item filter from `filter.item_name` if present.
3. Get unique (item_name, thickness) from `face_inventory_items_details` (deleted_at: null + item filter).
4. For each (item_name, thickness):
   - Current available sqm: sum of `available_sqm` in face_inventory_items_details.
   - Received sqm in period: lookup face_inventory_invoice_details by invoice_id, filter by inward_date in [start, end], sum `total_sq_meter`.
   - Issued sqm in period: face_history with createdAt in [start, end], lookup face_inventory_items_details by face_item_id, match item_name/thickness, sum `issued_sqm`.
   - Opening = current available + issued − received; Closing = opening + received − issued (both clamped ≥ 0).
5. Filter out rows where all of opening, received, issued, closing are zero.
6. Call `GenerateFaceStockReportExcel(activeStockData, startDate, endDate, filter)`.
7. Return success with download URL; on validation/aggregation errors return appropriate 400/404/500 with ApiError/ApiResponse.

### 3. Route

**File:** `topl_backend/routes/report/reports2/Face/face.routes.js`

**Route:**

```javascript
router.post('/download-stock-report-face', FaceStockReportExcel);
```

**Mounted in:** `topl_backend/routes/report/reports2.routes.js` via `router.use(faceRoutes)` (no path prefix), so:

**API endpoint:** `POST /report/download-stock-report-face`  
(Full: `POST /api/V1/report/download-stock-report-face`)

## Data aggregation summary

### Collections

- **face_inventory_items_details:** item_name, thickness, available_sqm, total_sq_meter, invoice_id, deleted_at.
- **face_inventory_invoice_details:** _id, inward_date.
- **face_history:** face_item_id, issued_sqm, createdAt.

### Formulas

- **Opening:** Current available + Issued (in period) − Received (in period); then max(0, …).
- **Closing:** Opening + Received − Issued; then max(0, …).

All in square metres; only items with at least one non-zero movement are included in the report.

## Documentation

- **API:** `topl_backend/routes/report/reports2/FACE_STOCK_REPORT_API.md`
- **Plan:** This file – `topl_backend/routes/report/reports2/FACE_STOCK_REPORT_PLAN.md`

## Notes

- Report output directory is created if it does not exist (`public/upload/reports/reports2/Face`).
- Auth/permission middleware can be added on the route if required (e.g. face_inventory view).
- Aligns with Dressing-style docs and reports2 structure (controller + config + route in respective Face folders).
