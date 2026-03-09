# Other Goods Daily Report – Implementation Plan (reports2)

## Objective

Provide an **Other Goods Daily Report** under the reports2 structure that generates Excel reports showing the store daily details for a specific date. The report provides a snapshot of inward details, identifying items by category and calculating values. The implementation follows the same architectural pattern as other reports2 modules.

## Implementation Approach

The report lives under the **reports2** module: route, controller, and Excel generator function are in dedicated `Other_Goods` folders and accessible via the `/report` router.

### Report Structure (dynamic, from database)

- **Date:** User-supplied report date (`reportDate`).
- **Data source:** MongoDB `othergoods_inventory_items_view_modal` aggregated with `item_subcategories` and `item_categories`.
- **Sorting:** By `item_name`, `item_sr_no`, and `invoice_no`.
- **Columns:**
  1. Sr. No
  2. Item
  3. Inward id
  4. Department
  5. Machine
  6. Qty
  7. Unit
  8. amount

Total amount row is appended at the bottom.

## Implementation Files

### 1. Excel generator

**File:** `topl_backend/config/downloadExcel/reports2/Other_Goods/otherGoodsDaily.js`

**Function:** `GenerateOtherGoodsDailyReport(details, reportDate)`

**Behaviour:**

- Extract report date for the header title.
- Build the worksheet with a merged title row displaying the target date.
- Create header row with 8 formatted columns.
- Iterate through details, mapping fields logic:
  - Extract the invoice/inward number from sub-documents.
  - Determine unit taking fallback values if none returned from joins.
- Populate data rows and calculate the running totals.
- Append a total amount row.
- Save report temporarily at `public/reports/OtherGoods/store_daily_report_{timestamp}.xlsx`.
- Return the full download link based on `process.env.APP_URL`.

### 2. Controller

**File:** `topl_backend/controllers/reports2/Other_Goods/otherGoodsDailyReport.js`

**Function:** `otherGoodsDailyReportExcel` (catchAsync handler)

**Request body:**

```javascript
{
  "filters": {
    "reportDate": "2025-01-31" // required
  }
}
```

**Steps:**

1. Validate `reportDate` exists.
2. Build match queries filtering exactly for the full day provided from `00:00:00` to `23:59:59` against `othergoods_invoice_details.inward_date`.
3. Build the MongoDB aggregation pipeline:
   - Match by date.
   - Convert string ID to object ID for lookup on `item_subcategories`.
   - Unwrap nested information by unwinding `subcategory_info`.
   - Perform a secondary lookup to connect `item_categories` relying on `subcategory_info.category`.
   - Project fields keeping the desired unit values.
   - Sort logically.
4. Execute pipeline and handle missing data with 404 response.
5. Invoke generator `GenerateOtherGoodsDailyReport` with data and `reportDate`.
6. Formulate success response holding the URL hyperlink to the file.

### 3. Route

**File:** `topl_backend/routes/report/reports2/Other_Goods/otherGoods.routes.js`

**Route:**

```javascript
router.post('/download-other-goods-daily-report', otherGoodsDailyReportExcel);
```

**API endpoint:** `POST /report/download-other-goods-daily-report`  
*(Full: `POST /api/V1/report/download-other-goods-daily-report`)*

## Data aggregation summary

### Collections

- **othergoods_inventory_items_view_modal:** Source item details with invoice data embedded.
- **item_subcategories:** Subcategory linkage.
- **item_categories:** For determining calculation units.

### Formulas

- **Amount:** Sum of `total_amount` (calculated as `rate * quantity`) for the specific `reportDate`.
- **Unit:** Derived from `item_categories.calculate_unit` with fallback to item level units.

## Documentation

- **API:** `topl_backend/docs/reports2/Other_Goods/Daily_report/OTHER_GOODS_DAILY_REPORT_API.md`
- **Plan:** This file – `topl_backend/docs/reports2/Other_Goods/Daily_report/OTHER_GOODS_DAILY_REPORT_PLAN.md`

## Notes

- Uses view model for abstraction.
- Joins perform dual lookups ensuring the master unit parameter reflects standard configurations.
- Aligns with Core-style implementation plans and reports2 structure.
