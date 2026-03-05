# Other Goods Inward Report – Implementation Plan (reports2)

## Objective

Provide an **Other Goods Inward Report** under the reports2 structure that generates Excel reports showing incoming inventory items (inward transactions) for a requested date range. This report breaks down details to the supplier level and calculates individual GST proportions dynamically, complementing broader stock/consumption reporting modules.

## Implementation Approach

The reporting function aligns closely with the `reports2` standard structure, encapsulating routing, logic, and Excel building functionality within `Other_Goods` directories mapped out to the central `/report` express router.

### Report Structure (dynamic, from database)

- **Period:** User-supplied date range (`startDate`, `endDate`).
- **Data source:** `othergoods_inventory_items_view_modal` combined with subcategory mappings for accurate tracking.
- **Sorting:** Prioritises item characteristics, ordering primarily by `item_name`.
- **Columns:**
  1. Sr. No
  2. Supplier Name
  3. Inv. No/Challan N
  4. Inv./Challan Date
  5. Item Name
  6. Department
  7. Machine
  8. Qty
  9. Rate
  10. Value
  11. (Sub header Gst split) Cgst
  12. (Sub header Gst split) Sgst
  13. (Sub header Gst split) Igst
  14. Total Gst
  15. Remark
  16. Authorised

A unified totals row summarizes Value, Cgst, Sgst, Igst, and Total Gst.

## Implementation Files

### 1. Excel generator

**File:** `topl_backend/config/downloadExcel/reports2/Other_Goods/otherGoodsInward.js`

**Function:** `GenerateOtherGoodsInwardReport(details, startDate, endDate)`

**Behaviour:**

- Assemble dates and merge top row to portray "Store Inward Report Date: ...".
- Configure complex nested headers accommodating sub-grouping of taxation segments (Cgst, Sgst, Igst under a single Gst banner).
- Execute loops translating document fields to formatted rows. Addresses fallback possibilities (e.g. `invoice_no` vs `inward_sr_no`) using null coalescing implementations.
- Sum up monetary fields and imprint totals on the trailing line.
- Render styled borders emphasizing standard excel grids.
- Generate timestamped filename storing inside `public/reports/OtherGoods`.
- Expose the HTTP pathing reference via `.env` parameter matching.

### 2. Controller

**File:** `topl_backend/controllers/reports2/Other_Goods/otherGoodsInwardReport.js`

**Function:** `otherGoodsInwardReportExcel` (catchAsync handler)

**Request body:**

```javascript
{
  "filters": {
    "startDate": "2025-01-01",  // required
    "endDate": "2025-01-31"     // required
  }
}
```

**Steps:**

1. Normalise input parameters taking into account alias properties (like `to`, `from`, `reportDate`).
2. Establish a boundary using start and end matching time constraints ensuring all entries of target days are trapped.
3. Design MongoDB aggregation array focusing on `othergoods_inventory_items_view_modal`:
   - Enact range match on `othergoods_invoice_details.inward_date`.
   - Facilitate data expansion via lookups (`item_subcategories`, `item_categories`).
   - Project new taxation parameters using `$divide` and `$multiply` logic tied to stored percentiles inside invoice configuration fields.
4. If empty sequence is yielded, surface a 404 response.
5. Invoke generating tool and await workbook formation returning derived hyperlink back to requester.

### 3. Route

**File:** `topl_backend/routes/report/reports2/Other_Goods/otherGoods.routes.js`

**Route:**

```javascript
router.post('/download-other-goods-inward-report', otherGoodsInwardReportExcel);
```

**API endpoint:** `POST /report/download-other-goods-inward-report`  
*(Full: `POST /api/V1/report/download-other-goods-inward-report`)*

## Data aggregation summary

### Collections

- **othergoods_inventory_items_view_modal:** Central data store grouping invoice, supplier, unit calculations.
- **item_subcategories:** Relational connection.
- **item_categories:** Relational connection.

### Formulas

- **Value:** `rate * quantity`.
- **CGST:** `(value * invoice_details.cgst_percent) / 100`.
- **SGST:** `(value * invoice_details.sgst_percent) / 100`.
- **IGST:** `(value * invoice_details.igst_percent) / 100`.
- **Total GST:** `cgst + sgst + igst`.

## Documentation

- **API:** `topl_backend/docs/reports2/Other_Goods/Inward_report/OTHER_GOODS_INWARD_REPORT_API.md`
- **Plan:** This file – `topl_backend/docs/reports2/Other_Goods/Inward_report/OTHER_GOODS_INWARD_REPORT_PLAN.md`

## Notes

- Distinctly separates rate percentage configuration stored deep within `invoice_details`.
- Applies math formulas during standard retrieval execution, optimizing Excel plotting.
- Aligns with Core-style implementation plans and reports2 structure.
