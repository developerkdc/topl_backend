# Other Goods Consumption Report – Implementation Plan (reports2)

## Objective

Provide an **Other Goods Consumption Report** under the reports2 structure that tracks dynamically grouping consumption and issuance of goods grouped explicitly by department boundaries. The layout produces an Excel report outlining quantities consumed over a designated interval mirroring other report implementations inside reports2.

## Implementation Approach

Leveraging a specialized history schema (`other_goods_history_model`), it compiles data tying consumption actions directly back to original invoice receipts ensuring unit standardisation mappings apply correctly within dedicated `Other_Goods` components via report mechanisms.

### Report Structure (dynamic, from database)

- **Period:** Range spanning (`startDate`, `endDate`).
- **Data source:** Primary interactions mapped directly from `other_goods_history`.
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
3. Construct deeply nested join architecture:
  - Acquire base item info against `othergoods_inventory_items_details`.
  - Gather receipt logs joining `othergoods_inventory_invoice_details`.
  - *Perform Match Phase*: Apply boundary filters querying invoice inward periods.
  - Source generalized names by querying `item_names`.
  - Pin target units executing final joining mapping `item_categories`.
4. Normalise naming references simplifying object structure aligning with script parameters (aliasing deep references mapping correctly, `department_name: '$item_details.department_name'`).
5. Process payload issuing 404 response on no-data conditions.
6. Assemble Excel structure launching configuration tooling binding result string towards end users.

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

- **other_goods_history:** Baseline of usage statistics tracking issued items (`issued_quantity`, `issued_amount`).
- **othergoods_inventory_items_details:** Item linking (`department_name`, `machine_name`, `item_name`).
- **othergoods_inventory_invoice_details:** For invoice date resolution (`inward_date`).
- **item_names:** Category retrieval pivot.
- **item_categories:** Target data fetch (determination of actual `calculate_unit`).

### Formulas

- **Quantity:** Sum of `issued_quantity` filtered by inward date.
- **Amount:** Sum of `issued_amount` filtered by inward date.

## Documentation

- **API:** `topl_backend/docs/reports2/Other_Goods/Consumption_report/OTHER_GOODS_CONSUMPTION_REPORT_API.md`
- **Plan:** This file – `topl_backend/docs/reports2/Other_Goods/Consumption_report/OTHER_GOODS_CONSUMPTION_REPORT_PLAN.md`

## Notes

- This utilizes a history-based model contrasting with the daily/inward variations dependent on inventory structures.
- Ensures tracking focuses around real-time consumption events rather than simply static inventory checks.
- Aligns with Core-style implementation plans and reports2 structure.
