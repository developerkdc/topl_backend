# Other Goods Consumption Report – Implementation Plan (reports2)

## Objective

Provide an **Other Goods Consumption Report** under the reports2 structure that tracks dynamically grouping consumption and issuance of goods grouped explicitly by department boundaries. The layout produces an Excel report outlining quantities consumed over a designated interval mirroring other report implementations inside reports2.

## Implementation Approach

Leveraging a specialized history schema (`other_goods_history_model`), it compiles data tying consumption actions directly back to original invoice receipts ensuring unit standardisation mappings apply correctly within dedicated `Other_Goods` components via report mechanisms.

### Report Structure (dynamic, from database)

- **Period:** Range spanning (`startDate`, `endDate`), applied to **consumption date** (`issue_date`).
- **Data source:** Only **consume** (direct consumption) records from `other_goods_history_details` where `issue_status` is `'consume'` and `issue_date` falls within the period. Order and challan issues are excluded.
- **Grouping/Sorting:** Clustered sequentially based on `department_name`, mapped down into `machine_name`, finally filtering by `item_name`.
- **Columns:**
  1. Department
  2. Machine
  3. Item
  4. Qty
  5. Unit
  6. Amt

Provides department level subtotal metrics as department values switch, summarizing a master Grand Total upon document completion.

## Implementation Files

### 1. Excel generator

**File:** `topl_backend/config/downloadExcel/reports2/Other_Goods/otherGoodsConsumption.js`

**Function:** `createOtherGoodsConsumptionReportExcel(aggregatedData, startDate, endDate)`

**Behaviour:**

- Ensures folder scaffolding using standard Node `fs/promises`.
- Format input dates formulating "Store Consumption Report Date: ...".
- Establishes a six-column design framework.
- Progressively iterates payload tracking changes representing departments (`currentDept`).
- When iterations depict change across depart boundaries, construct and format specific subtotal demarcation row elements, reseting summation references.
- Output raw content lines matching object inputs, defaulting to empty indicators when parameters are blank.
- Complete iteration phase rendering trailing department calculations alongside complete dataset 'Grand Total'.
- Generate output bound into `public/upload/reports/reports2/Other_Goods` producing HTTP response values.

### 2. Controller

**File:** `topl_backend/controllers/reports2/Other_Goods/otherGoodsConsumptionReport.js`

**Function:** `otherGoodsConsumptionReportExcel` (catchAsync handler)

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

1. Interrogate arguments isolating starting bounds validating temporal structure details.
2. Build aggregation configuration upon `other_goods_history_model`.
3. **Match Phase (before lookups):** Filter to `issue_status: 'consume'` only; then filter to records where `issue_date` exists and is within `[startDate, endDate]`.
4. Construct deeply nested join architecture:
  - Acquire base item info against `othergoods_inventory_items_details`.
  - Gather receipt logs joining `othergoods_inventory_invoice_details` (for item context; no date filter).
  - Source generalized names by querying `item_names`.
  - Pin target units executing final joining mapping `item_categories`.
5. Normalise naming references simplifying object structure aligning with script parameters (aliasing deep references mapping correctly, `department_name: '$item_details.department_name'`).
6. Process payload issuing 404 response on no-data conditions.
7. Assemble Excel structure launching configuration tooling binding result string towards end users.

### 3. Route

**File:** `topl_backend/routes/report/reports2/Other_Goods/otherGoods.routes.js`

**Route:**

```javascript
router.post('/download-other-goods-consumption-report', otherGoodsConsumptionReportExcel);
```

**API endpoint:** `POST /report/download-other-goods-consumption-report`  
*(Full: `POST /api/V1/report/download-other-goods-consumption-report`)*

## Data aggregation summary

### Collections

- **other_goods_history_details:** Filtered by `issue_status: 'consume'` and `issue_date` in range; baseline of consumption data (`issued_quantity`, `issued_amount`, `issue_date`).
- **othergoods_inventory_items_details:** Item linking (`department_name`, `machine_name`, `item_name`).
- **othergoods_inventory_invoice_details:** Invoice mapping for item context (not used for date filtering).
- **item_names:** Category retrieval pivot.
- **item_categories:** Target data fetch (determination of actual `calculate_unit`).

### Formulas

- **Scope:** Only records with `issue_status: 'consume'` and `issue_date` within the selected date range.
- **Quantity:** `issued_quantity` from each matched history record.
- **Amount:** `issued_amount` from each matched history record.

## Documentation

- **API:** `topl_backend/docs/reports2/Other_Goods/Consumption_report/OTHER_GOODS_CONSUMPTION_REPORT_API.md`
- **Plan:** This file – `topl_backend/docs/reports2/Other_Goods/Consumption_report/OTHER_GOODS_CONSUMPTION_REPORT_PLAN.md`

## Notes

- This report includes **only consumed data**: history records where `issue_status` is `'consume'` (from the Consume modal). Order and challan issues are excluded.
- The date range is applied to `issue_date` (when consumption occurred), not to invoice inward date.
- This utilizes a history-based model contrasting with the daily/inward variations dependent on inventory structures.
- Ensures tracking focuses around direct consumption events (store consume) rather than order/challan issues or static inventory checks.
- Aligns with Core-style implementation plans and reports2 structure.
