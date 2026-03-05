# Other Item Summary Report – Implementation Plan

## Objective

Implement a high-level **Other Item Summary Report** that provides a bird's-eye view of "Other Goods" inventory lifecycle. This report is designed to show the flow of materials from opening stock through consumption and sales to final closing balances.

## Implementation Approach

The report is built as a modular component within the `reports2` framework, consisting of a controller for heavy-lifting aggregation and an Excel config for visual output.

### Key Logic & Aggregation

- **Item Discovery:** Distinct `item_name` from current inventory.
- **Dynamic Opening Stock:** Calculated by aggregating historical inward (invoices) vs outward (issues & dispatches) prior to the `startDate`.
- **Period Movements:**
  - **Inwards (Purchase):** From `othergoods_inventory_items_details` filtered by invoice date.
  - **Outwards (Issue):** Internal consumption from history.
  - **Sales (Dispatch):** External sales pulled directly from `dispatch_items`.
- **Performance:** Implements batch-level aggregation (bulk fetching) and in-memory `Map` indexing to minimize database roundtrips.

## Implementation Files

### 1. Excel Generator

**File:** `config/downloadExcel/reports2/Other_Goods/otherItemReport.js`

**Behaviour:**

- Generates a single-sheet Excel workbook.
- Implements a clean, single-row header structure.
- Applies premium styling with gray headers, borders, and bold titles.
- Auto-sizes columns for item names and quantity fields.
- Saves files with unique timestamps to the public upload directory.

### 2. Controller

**File:** `controllers/reports2/Other_Goods/OtherItemReport.js`

**Internal Workings:**

- Validates date inputs.
- Performs **Batch Aggregations** to fetch data for all items in a few queries:
  - `purchaseMap`: Purchases in period.
  - `issueMap`: Internal issues in period.
  - `salesMap`: Dispatches (Sales) in period.
  - `inBeforeMap`/`outBeforeMap`: Opening balance components.
- Calculates final `Opening` and `Closing` values in memory for efficiency.
- Filters out items with no activity and zero opening stock.

### 3. Route Registration

**File:** `routes/report/reports2/Other_Goods/otherGoods.routes.js`

**Endpoint:**

```javascript
router.post('/download-excel-other-item-report', OtherItemReportExcel);
```

## Formulas

- **OpeningQty:** $\sum Inward(<start) - (\sum InternalIssue(<start) + \sum Dispatched(<start))$
- **ClosingQty:** $Opening + Purchase - (Issue + Sales + Damage)$

## Documentation

- **API Specification:** `docs/reports2/Other_Goods/other_Item/OTHER_ITEM_REPORT_API.md`
- **Implementation Strategy:** `docs/reports2/Other_Goods/other_Item/OTHER_ITEM_REPORT_PLAN.md` (This file)
