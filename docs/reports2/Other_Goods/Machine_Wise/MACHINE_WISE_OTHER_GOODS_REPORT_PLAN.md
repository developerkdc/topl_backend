# Machine Wise Other Goods Report – Implementation Plan

## Objective

Provide a **Machine Wise Other Goods Report** under the `reports2` module. This report tracks quantities and values of consumables ("Other Goods") assigned to machines during a specific period. The report features dynamic unit calculation based on the item's category.

## Implementation Approach

The report follows the standard `reports2` pattern:

- Dedicated controller for aggregation.
- Dedicated Excel configuration for styling and output.
- Route registered under the unified `reports2` router.

### Report Specifications

- **Period:** User-supplied `startDate` and `endDate`.
- **Data Source:** `othergoods_inventory_items_details` (assignments) joined with `invoice_details`.
- **Unit Logic:** Navigate from Item -> Subcategory -> Category -> `calculate_unit`.
- **Bug Fix (Duplication)**: Replaced `$unwind` on category array with a bulk lookup and `$arrayElemAt` to prevent row multiplication when a subcategory maps to multiple categories.
- **Columns:**
  1. Machine
  2. Item
  3. Qty
  4. Unit
  5. Amt
- **Grand Total:** Summarizes the total `Amt` at the bottom.

## Implementation Files

### 1. Excel Generator

**File:** `config/downloadExcel/reports2/Other_Goods/machineWiseReport.js`

**Behaviour:**

- Creates a styled workbook using `exceljs`.
- Merges the first row for a descriptive title.
- Styles the header row with a gray background and borders.
- Adds data rows with borders.
- Appends a "Grand Total" row with a light gray background and bold text.
- Saves the file to `public/reports/Other_Goods/MachineWiseReport/`.

### 2. Controller

**File:** `controllers/reports2/Other_Goods/MachineWiseReport.js`

**Aggregation Pipeline:**

1. Match items between `startDate` and `endDate` based on `invoice.inward_date`.
2. Apply optional `machine_id` filter.
3. `$lookup` with `item_subcategories` (converting `item_sub_category_id` string to ObjectId).
4. `$lookup` with `item_categories` to retrieve all associated category data.
5. `$addFields` with `$arrayElemAt` to select the primary category, preventing row duplication when multiple categories exist for a subcategory.
6. Project final fields: machine (from `machine_name`), item (from `item_name`), qty, unit, and amt.
7. Sort by machine and item.

### 3. Route

**File:** `routes/report/reports2/Other_Goods/otherGoods.routes.js`

**Endpoint:**

```javascript
router.post(
  '/download-excel-machine-wise-report',
  OtherGoodsMachineWiseReportExcel
);
```

- **Unit Join Path:**
  - `othergoods_inventory_items_details.item_sub_category_id` (String -> ObjectId)
  - `item_subcategory.category` (Array of ObjectIds)
  - Primary category selection via `$arrayElemAt` from `$lookup` results.
  - Final: `category_data.calculate_unit`

## Documentation

- **API Doc:** `docs/reports2/Other_Goods/Machine_Wise/MACHINE_WISE_OTHER_GOODS_REPORT_API.md`
- **Plan Doc:** `docs/reports2/Other_Goods/Machine_Wise/MACHINE_WISE_OTHER_GOODS_REPORT_PLAN.md`
