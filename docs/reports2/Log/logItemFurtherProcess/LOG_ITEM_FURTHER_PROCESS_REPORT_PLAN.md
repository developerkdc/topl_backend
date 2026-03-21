# Log Item Further Process Report — Implementation Plan

## Scope

Hierarchical Excel export that traces each inward log through every downstream factory stage. The output is **fully denormalized flat rows** — one row per leaf branch (e.g. per slicing side × grouping line, or per peeling path × grouping line). Stages not yet reached for a given path are filled with empty-string placeholders from the `empty*` helper functions.

---

## Code map

| Role | Path |
|------|------|
| Controller / handler | `controllers/reports2/Log/logItemFurtherProcess.js` → `LogItemFurtherProcessReportExcel` |
| Excel writer | `config/downloadExcel/reports2/Log/logItemFurtherProcess.js` → `createLogItemFurtherProcessReportExcel` |
| Route | `routes/report/reports2/Log/log.routes.js` |

---

## Utility helpers (top of controller)

| Helper | Purpose |
|--------|---------|
| `groupByKey(arr, keyFn)` | Builds a `Map<key → item[]>` in one pass. `keyFn` can be a function or a string field name. |
| `getVal(obj, path)` | Safe dot-path reader (e.g. `'available_details.sqm'`). |
| `sumField(arr, field)` | Reduces an array using `getVal` + `parseFloat`. |
| `round3(n)` | Rounds to 3 decimal places using `Math.round((n + EPSILON) * 1000) / 1000` to eliminate floating-point drift. |
| `buildChildPattern(code)` | Returns `/^{escaped_code}[A-Z]+$/` regex used to match peeling/CC child codes (e.g. `L0702A1` → children `L0702A1A`, `L0702A1B`, etc.). |
| `crosscutIssueForFlitchPeeling(cc)` | Returns `{ issue_for, status }` — populated when `cc.issue_status` is `flitching`, `peeling`, or `order`. For `order`, `issue_for` is `cc.crosscut_cmt` and `status` is `"order"`. |
| `formatOrderItemCbmOrSqm(item)` | Formats an order item's CBM or SQM into a display string (e.g. `"12.345 CBM"`). Prioritises `unit_name` hints; falls back to `cbm` then `sqm`. |
| `loadOrderItemDetailsByIds(ids)` | Fetches order item detail records from `raw_order_item_details`, `decorative_order_item_details`, and `series_product_order_item_details` by a list of `_id`s. Returns a `Map<id → item>`. |
| `formatTappingPressingIssueLabel(issueStatus, issuedFor)` | Formats tapping history issue label as `"Stage / Dest"` string. |
| `formatPressingIssueLabel(issueStatus, issuedFor)` | Same pattern for pressing history. |
| `resolveSplicingIssueStatusFromHistory(tappingItems, map)` | Returns the first non-empty formatted label from the tapping history map for the given items. |
| `resolvePressingIssueStatusFromHistory(pressingItems, map)` | Same for pressing. |

---

## Step 1 — Seed logs

- **Model:** `log_inventory_items_view_model`
- **Match:**
  - `log_invoice_details.inward_date` ∈ `[startDate, endDate]`
  - Optional `item_name` exact match
  - Optional `log_no` exact match
  - Optional `log_invoice_details.inward_sr_no` numeric match (from `filter.inward_id`)
- **Sort:** `item_name ASC`, `log_no ASC`
- Collect distinct `log_no` strings → `logNos[]` and inventory line `_id` ObjectIds → `logIds[]`

---

## Step 2 — Bulk fetches

All fetches below run in two parallel batches to minimise round-trips.

### Batch A (parallel)

| Data | Model | Key used |
|------|-------|---------|
| Crosscuts | `crosscutting_done_model` | `log_no` ∈ `logNos`, `deleted_at: null` |
| Flitches | `flitching_done_model` | `log_inventory_item_id` ∈ `logIds`; allows `deleted_at: null` or missing |
| Peeling items | `peeling_done_items_model` **aggregate** | `log_no` ∈ `logNos` |

**Peeling aggregate pipeline:**
1. `$match` on `log_no`
2. `$lookup` → `peeling_done_other_details` (join on `peeling_done_other_details_id`)
3. `$unwind` (preserveNull)
4. `$lookup` → `issues_for_peeling_available` via `peeling_done_other_details.issue_for_peeling_id` → `issue_for_peeling_id`
5. `$unwind` (preserveNull)
6. `$addFields`: `balance_rostroller = $ifNull(peeling_available.cmt, null)` — this record only exists when the operator selected type `rest_roller` in the Reject / Available Details table.
7. `$project` removes the joined sub-documents.

### Slicing (sequential, after Batch A)

`slicing_done_items_model` stores the **flitch code** in its `log_no` field (e.g. `"L2105A1"`), **not** the round-log number. Query uses flitch `log_no_code` values:

```
flitchLogNoCodes = distinct flitch.log_no_code values
```

**Slicing aggregate pipeline:**
1. `$match`: `log_no` ∈ `flitchLogNoCodes`
2. `$lookup` → `slicing_done_other_details` (on `slicing_done_other_details_id`)
3. `$unwind` (preserveNull)
4. `$lookup` → `slicing_done_items` self-join on `slicing_done_other_details_id` as `_batch_siblings`
5. `$addFields`: compute `item_cmt`:
   - If raw `cmt > 0` → use it directly
   - Else if `total_cmt > 0` and `sibling_count > 0` → `total_cmt ÷ sibling_count`
   - Else → `0`
6. `$lookup` → `issued_for_slicings` via `slicing_done_other_details.issue_for_slicing_id` (used for `slicing_balance_cmt`)
7. `$unwind` `issued_for_slicing` (preserveNull)
8. `$project` removes `_batch_siblings`

### Batch B (parallel, after slicing)

All leaf codes = union of `slicing_done_items.log_no_code` + `peeling_done_items.log_no_code`.

| Data | Model | Key used |
|------|-------|---------|
| Dressing | `dressing_done_items_model` | `log_no_code` ∈ leaf codes |
| Smoking/Dying | `process_done_items_details_model` | `log_no_code` ∈ leaf codes |
| Grouping | `grouping_done_items_details_model` | `log_no_code` ∈ leaf codes |

### Tapping & Pressing consumed (parallel)

Uses `groupNos` = distinct `group_no` from all grouping items.

**Tapping aggregate:**
1. `$match`: `group_no` ∈ `groupNos`
2. `$lookup` → `tapping_done_other_details` (joined for `splicing_type`)
3. `$unwind` (preserveNull)

**Pressing consumed aggregate** (`pressing_done_consumed_items_details_model`):
1. `$match`: `group_details.group_no` ∈ `groupNos`
2. `$unwind` `group_details`
3. `$match` again (post-unwind)
4. `$project`: `pressing_done_details_id`, `group_no`

> This approach correctly handles multi-group pressing runs. `pressing_done_details.group_no` only stores the primary group; `pressing_done_consumed_items_details` records every consumed group.

Deduplicate `pressing_done_details_id` ObjectIds, then fetch `pressing_done_details_model` by those IDs.

### CNC & Colour (parallel)

Fetched by `pressing_details_id` ∈ pressing IDs from the step above.

---

## Step 3 — History maps and direct-order lookups

All history aggregations follow the same pattern: `$match → $sort(updatedAt desc) → $group(_id = item_id, $first each field)`.

### Grouping history — `grouping_done_history_model`

Match on `grouping_done_item_id`.

Produces two Maps:
- `groupingIssuedForByItemId`: `item_id → issued_for` (values: `ORDER`, `STOCK`, `SAMPLE`)
- `groupingIssueStatusByItemId`: `item_id → issue_status` (values: `challan`, `order`, `tapping`)

### Tapping history — `tapping_done_history_model`

Match on `tapping_done_item_id`.

Produces one Map:
- `tappingIssueStatusByItemId`: `item_id → formatted label` via `formatTappingPressingIssueLabel(issue_status, issued_for)`

### Pressing history — `pressing_done_history_model`

Match on `issued_item_id`.

Produces three Maps:
- `pressingIssuedSheetsByItemId`: `pressing_detail_id → sum(no_of_sheets)`
- `pressingIssuedSqmByItemId`: `pressing_detail_id → sum(sqm)`
- `pressingIssueStatusByItemId`: `pressing_detail_id → formatted label` via `formatPressingIssueLabel`

### Active packing orders — `finished_ready_for_packing_model`

A single query provides CNC and Colour item→order links, and supplements the pressing order links.

**Query:**
```js
finished_ready_for_packing_model.find(
  { pressing_details_id: { $in: pressingIds }, order_id: { $ne: null } },
  { pressing_details_id: 1, issued_from_id: 1, issued_from: 1, order_id: 1, order_item_id: 1 }
)
```

Produces Maps (keyed by `issued_from_id`):
- `colourOrderIdByItemId` / `colourOrderItemIdByItemId`: rows where `issued_from === 'COLOR'`
- `cncOrderIdByItemId` / `cncOrderItemIdByItemId`: rows where `issued_from === 'CNC'`
- `pressingPackingOrderIdByItemId` / `pressingPackingOrderItemIdByItemId`: rows where `issued_from === 'PRESSING_FACTORY'` — merged into the pressing maps with priority over history data

> These maps are built for completeness and possible future use. They do **not** currently feed the Sales columns (see below).

### LOG direct orders — `issued_for_order_items`

```js
issue_for_order_model.find({
  issued_from: 'LOG',
  'item_details._id': { $in: logIds }
})
```

Produces `logDirectOrderByLogItemId`: `log_inventory_item._id → { order_id, order_item_id }`.

### CROSSCUT direct orders — `issued_for_order_items`

```js
issue_for_order_model.find({
  issued_from: 'CROSSCUTTING',
  'item_details._id': { $in: crosscutIds }
})
```

Produces `crosscutDirectOrderByCrosscutId`: `crosscutting_done._id → { order_id, order_item_id }`.

### Orders & order item details bulk fetch

All unique `order_id` values from the above maps are collected and fetched in one query:

```js
OrderModel.find({ _id: { $in: allOrderIds } }, { order_no: 1, orderDate: 1, owner_name: 1 })
→ orderById: Map<order_id → { order_no, orderDate, owner_name }>
```

All unique `order_item_id` values are passed to `loadOrderItemDetailsByIds` which queries all three order item detail collections in parallel, producing:

```
orderItemById: Map<order_item_id → item detail doc>
```

All maps are packed into a single `orderMaps` object.

---

## Step 4 — Lookup maps

```
crosscutsByLogNo         groupByKey(crosscuts, 'log_no')
flitchesByCrosscutId     groupByKey(flitches with crosscut_done_id, String(crosscut_done_id))
flitchesByLogInventoryItemId  groupByKey(flitches, String(log_inventory_item_id))
slicingByFlitchCode      groupByKey(slicingItems, 'log_no')   ← key is flitch code
peelingByLogNo           groupByKey(peelingItems, 'log_no')
dressingByCode           groupByKey(dressingItems, 'log_no_code')
smokingByCode            groupByKey(smokingItems, 'log_no_code')
groupingByCode           groupByKey(groupingItems, 'log_no_code')
tappingByGroupNo         groupByKey(tappingRaw, 'group_no')
pressingByGroupNo        built manually from pressingConsumedLinks + pressingById map
cncByPressingId          groupByKey(cncItems, String(pressing_details_id))
colourByPressingId       groupByKey(colourItems, String(pressing_details_id))
```

> **ObjectId string keys:** `flitchesByCrosscutId`, `flitchesByLogInventoryItemId`, and the pressing maps all use `String(objectId)` as keys. Map lookups use `String(id)` for consistency. This was a past bug-fix — do not change these to raw ObjectId keys.

---

## Step 5 — Row building

For each seed log, determine which path exists and emit rows accordingly:

```
1. crosscutsForLog = crosscutsByLogNo.get(log_no) || []
2. flitchesForLog  = flitchesByLogInventoryItemId.get(String(log._id)) || []
3. peelingForLog   = peelingByLogNo.get(log_no) || []
```

Each log row object carries two internal tracking fields that are deleted before Excel output:
- `log_inventory_item_id` — the log inventory `_id`, used in the post-process sales pass.
- `crosscut_done_id` — the crosscut record `_id`, used in the post-process sales pass.

### Tree walk (per log)

```
IF crosscutsForLog.length > 0:
  FOR each cc:
    flitchesForCc = flitchesByCrosscutId.get(String(cc._id))
    IF flitchesForCc.length > 0:
      → buildFlitchRows() per flitch
    ELSE IF cc.issue_status === 'peeling':
      → match peelingForLog whose log_no_code matches buildChildPattern(cc.log_no_code)
      → buildPeelingRow() per peeling item
    ELSE:
      → single "CC only" row with empty downstream
  Also process "direct flitches" not linked to any CC (linkedFlitchIds exclusion)

ELSE IF flitchesForLog.length > 0:
  → buildFlitchRows() per flitch (empty ccBase)

ELSE IF peelingForLog.length > 0:
  → buildPeelingRow() per peeling item (null flitch, empty ccBase)

ELSE:
  → single row with all downstream empty
```

---

## Row builder reference

### `buildFlitchRows(logBase, ccBase, flitch, slicingByFlitchCode, peelingByLogNo, ...)`

1. Builds `flitchBase` from `flitch.log_no_code`, `flitch_cmt`, `issue_status`.
2. Looks up slicing sides: `slicingByFlitchCode.get(flitch.log_no_code)` — **direct Map lookup**, no regex.
3. Finds peeling for this flitch: filters `peelingByLogNo.get(log_no)` using `buildChildPattern(flitch.log_no_code)`.
4. For each slicing side → `buildSlicingSideRows(...)`.
5. For each peeling item → `buildPeelingRow(...)`.
6. If no sides and no peeling → single flitch-only row with empty slicing, peeling, and downstream.

### `buildSlicingSideRows(logBase, ccBase, flitchBase, side, ...)`

1. Computes `slicingBase`: `slicing_side`, `slicing_process_cmt` (from `side.item_cmt ?? side.cmt`), `slicing_balance_cmt` (`max(0, issued_cmt − process_cmt)` or blank), `slicing_rec_leaf`.
2. Derives dressing and smoking data by `side.log_no_code`.
3. Looks up `groupingByCode.get(side.log_no_code)`.
4. If grouping items → one row per grouping item via `buildGroupingData`.
5. Else → single row with `emptyDownstream()`.

### `buildPeelingRow(logBase, ccBase, flitchBase, peel, ...)`

1. Builds `peelingData`: `peeling_process` (= `output_type`), `peeling_balance_rostroller` (from `peel.balance_rostroller`, null → blank), `peeling_output` (= `peel.cmt`, which stores SQM), `peeling_rec_leaf`.
2. Derives dressing and smoking data by `peel.log_no_code`.
3. Looks up `groupingByCode.get(peel.log_no_code)`.
4. If grouping items → `buildGroupingData` for the first item.
5. Else → row with `emptyDownstream()`.

### `buildGroupingData(groupItem, ..., groupingIssueStatusByItemId)`

Computes all Grouping → Tapping → Pressing → CNC → Colour columns. Does **not** accept or resolve sales/order data — sales columns are always returned as empty strings here.

| Column group | Logic |
|---|---|
| Grouping rec/issue | `no_of_sheets`, `sqm`, minus `available_details.*` |
| Grouping balance | `available_details.*` — always numeric (0 is meaningful) |
| **Grouping issue status** | `groupingIssueStatusByItemId.get(String(groupItem._id))` → from `grouping_done_history.issue_status` |
| Splicing rec (machine/hand) | Sum `sqm` by `tapping_details.splicing_type` |
| Splicing balance | Numeric when tapping exists; blank otherwise |
| Splicing issue status | `resolveSplicingIssueStatusFromHistory` → first non-empty from `tappingIssueStatusByItemId` |
| Pressing rec/issue | From `pressingByGroupNo` + `pressingIssuedSheetsByItemId` / `pressingIssuedSqmByItemId` |
| Pressing balance | Numeric when pressing exists; blank otherwise |
| Pressing issue status | `resolvePressingIssueStatusFromHistory` → `pressingIssueStatusByItemId` |
| CNC type / sheets | First CNC record via `cncByPressingId` |
| Colour sheets | Sum via `colourByPressingId` |
| **Sales / Order** | Always `''` — populated by the post-process pass below |

### `getDressingData(logNoCode, dressingByCode)`

- `dress_rec_sqm` = sum of all items' `sqm`
- `dress_issue_sqm` = sum of items where `issue_status` is non-null
- `dress_issue_status` = first non-null `issue_status`

### `getSmokingData(logNoCode, smokingByCode)`

- `smoking_process` = `round3(sumField(items, 'sqm'))` — total SQM through smoking/dying
- `smoking_issue_sqm` = `round3(sumField(issuedItems, 'sqm'))` — only items with `issue_status` set; blank if none
- `smoking_issue_status` = first `issue_status` from issued items

---

## Step 6 — Post-process: Sales columns

After all rows are built, two sequential passes fill the Sales columns. Neither pass overwrites an already-filled value.

### Pass 1 — LOG direct sales

For each row, look up `row.log_inventory_item_id` in `logDirectOrderByLogItemId`. If a match is found and `sales_rec_sheets` is blank, set:

- `sales_order_no` from `orderById`
- `sales_order_date` formatted as `DD/MM/YYYY`
- `sales_customer` from `orderById`
- `sales_rec_sheets` = `formatOrderItemCbmOrSqm(orderItemById.get(order_item_id))`

### Pass 2 — CROSSCUT direct sales

For each row, look up `row.crosscut_done_id` in `crosscutDirectOrderByCrosscutId`. Applies the same fields only if `sales_rec_sheets` is still blank (LOG sales take priority).

### Cleanup

After both passes, `log_inventory_item_id` and `crosscut_done_id` are deleted from every row before the data is written to Excel.

---

## Zero vs blank rule

Balance fields follow a **deliberate semantic**:

| Condition | Value shown |
|-----------|-------------|
| Process was performed, balance computes to 0 | `0` (numeric) |
| Process has not been performed for this path | `''` (blank) |

Affected fields: `grouping_balance_*`, `splicing_balance_*`, `pressing_balance_*`.  
The `||` short-circuit (which collapses `0` to `''`) is intentionally **avoided** for these fields.

---

## Decimal precision

All SQM and CMT aggregations that involve floating-point arithmetic use `round3()` (3 d.p.) to prevent values like `0.30000000000000004` appearing in the report. Currently applied to:
- `smoking_process`, `smoking_issue_sqm`

Other CMT/SQM fields use the raw database values (already stored as rounded numbers).

---

## Assumptions and caveats

- **`slicing_done_items.log_no` stores the flitch code**, not the round-log number (e.g. `"L2105A1"`, not `"L2105A"`). The slicing query and `slicingByFlitchCode` map depend on this.
- **Peeling `balance_rostroller`** is the `cmt` value entered by the operator in the "Reject / Available Details" table under type `rest_roller`. It is stored in `issues_for_peeling_available`. If that row does not exist (no rest-roller entry), the field is blank.
- **Peeling `output` shows SQM**, not leaves. `peeling_done_items.cmt` stores the SQM value (length × width × leaves). `no_of_leaves` is separately shown in `peeling_rec_leaf`.
- **Pressing multi-group:** Only `pressing_done_consumed_items_details` covers all groups in a multi-group pressing run. Using `pressing_done_details.group_no` alone misses secondary groups.
- **Map key type:** All `groupByKey` calls for ObjectId-based fields explicitly use `String(objectId)` — mixing raw ObjectId instances with string lookups causes silent misses.
- **Sales columns scope:** Sales columns are populated **only** from LOG and CROSSCUT direct-order issuances (`issued_for_order_items`). Factory-path stages (Grouping, Tapping, Pressing, CNC, Colour → Packing) do not contribute to the Sales columns, even if those stages have linked order IDs.
- **Sales column format:** `sales_rec_sheets` contains a formatted string (e.g. `"12.345 CBM"`) rather than a number. The column is excluded from Excel numeric-sum totals accordingly.
- **Revert safety:** `finished_ready_for_packing` is deleted by `revert_finished_ready_for_packing`, making it the correct signal for "order is no longer active". After packing-done is reverted (`revert_packing_done_items`), the record remains with `is_packing_done = false` (order still active). Only after ready-for-packing is reverted does the order disappear.
- **Console DEBUG blocks:** The controller still contains `console.log` blocks for slicing/flitch/pressing debugging. These should be removed or gated behind an environment flag before production deployment.
- **Performance note:** Wide date ranges can fan out across many collections in parallel. Monitor query count and heap usage on large datasets.

---

## Excel output

`createLogItemFurtherProcessReportExcel(allRows, startDate, endDate, filter)`:
- Writes one workbook with frozen headers and group-label rows.
- Title rows optionally show filter summary (inward ID, log no).
- Output folder: `public/upload/reports/reports2/Log/`
- Filename: `Log-Item-Further-Process-Report-<timestamp>.xlsx`

---

## Related reports

- **Flitch item further process** (`flitchItemFurtherProcess.js`) — same concept but starts from flitch records.
- **Log item wise inward / item wise inward** — CMT balance focus only, no downstream columns.

---

## Docs in this folder

| File | Role |
|------|------|
| `LOG_ITEM_FURTHER_PROCESS_REPORT_API.md` | Endpoint, request/response, and full column reference |
| `LOG_ITEM_FURTHER_PROCESS_REPORT_PLAN.md` | This file — pipeline design, fetch order, row-building logic |
