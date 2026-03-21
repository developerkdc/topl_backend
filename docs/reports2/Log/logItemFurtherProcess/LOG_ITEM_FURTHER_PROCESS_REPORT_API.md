# Log Item Further Process Report — API Reference

## Purpose

Excel "genealogy" report: for each inward log (optionally filtered by date range, item name, log number, or inward ID), trace downstream factory processing through:

**Crosscut → Flitch → Slicing and/or Peeling → Dressing → Smoking/Dying → Grouping/Clipping → Tapping/Splicing → Pressing → CNC → Colour**

Each stage that branches (multiple flitches, multiple slicing sides, multiple grouping lines) produces **separate rows**, making the output fully denormalized. Empty placeholder values are written for stages not yet reached by a particular log path.

---

## Routing

| Item | Value |
|------|--------|
| Mount point | `/api/V1/report` |
| Route file | `topl_backend/routes/report/reports2/Log/log.routes.js` |
| Method / path | `POST /api/V1/report/download-excel-log-item-further-process-report` |

> The app mounts `reports2.routes.js` at `/api/V1/report`. Older references to `/api/V1/reports2/...` are incorrect.

---

## Request

```json
{
  "startDate": "2026-01-01",
  "endDate":   "2026-01-31",
  "filter": {
    "item_name": "AMERICAN WALNUT",
    "inward_id": 5,
    "log_no": "L0702"
  }
}
```

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `startDate` | Yes | ISO date string | Inclusive range start. Matched against `log_invoice_details.inward_date`. |
| `endDate` | Yes | ISO date string | Inclusive range end; extended to 23:59:59 internally. |
| `filter.item_name` | No | string | Exact match on the log's `item_name` field. |
| `filter.log_no` | No | string | Exact log number. |
| `filter.inward_id` | No | number | Matches `log_invoice_details.inward_sr_no`. |

All filter fields are optional and can be combined.

---

## Response

Uses `ApiResponse` wrapper with fields: `statusCode`, `success`, `message`, `result`.

### 200 — Success

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Log item further process report generated successfully",
  "result": "<APP_URL>/public/upload/reports/reports2/Log/Log-Item-Further-Process-Report-<timestamp>.xlsx"
}
```

`result` is the public download URL for the generated Excel file.

### Error responses

| HTTP | Condition |
|------|-----------|
| 400 | Dates missing, unparseable, or `startDate > endDate` |
| 404 | No logs found for the given filters, or tree building yields zero rows |
| 500 | Unexpected DB error or Excel write failure |

---

## Output columns (row data keys)

Each row object contains the following keys. Groups correspond to Excel header groups in the workbook.

### Inward / Log

| Key | Source |
|-----|--------|
| `item_name` | Log item name |
| `log_no` | Round-log number |
| `indian_cmt` | Indian CMT from log |
| `rec_cmt` | Received CMT |
| `inward_issue_for` | CMT issued downstream (when status is crosscutting / flitching / peeling) |
| `inward_issue_status` | Downstream stage name |

### Crosscut

| Key | Source |
|-----|--------|
| `cc_log_no` | Crosscut `log_no_code` |
| `cc_rec` | `crosscut_cmt` |
| `cc_issue_for` | CC CMT issued (populated when `issue_status` is `flitching`, `peeling`, or `order`) |
| `cc_status` | `flitching`, `peeling`, or `order` |

### Flitch

| Key | Source |
|-----|--------|
| `flitch_no` | `log_no_code` (preferred) or `flitch_code` |
| `flitch_rec` | `flitch_cmt` |
| `flitch_issue_for` | Same as `flitch_cmt` |
| `flitch_status` | `issue_status` from flitch record |

### Slicing

| Key | Source |
|-----|--------|
| `slicing_side` | Side `log_no_code` from `slicing_done_items` |
| `slicing_process_cmt` | `item_cmt` (computed: `total_cmt ÷ sibling count`, or raw `cmt` if > 0) |
| `slicing_balance_cmt` | `max(0, issued_for_slicing.cmt − process_cmt)`; blank if issued CMT unknown |
| `slicing_rec_leaf` | `no_of_leaves` |

### Peeling

| Key | Source |
|-----|--------|
| `peeling_process` | `output_type` |
| `peeling_balance_rostroller` | CMT from `issues_for_peeling_available` (only present when type = `rest_roller`); blank otherwise |
| `peeling_output` | `cmt` field — stores SQM (length × width × leaves) |
| `peeling_rec_leaf` | `no_of_leaves` |

### Dressing

| Key | Source |
|-----|--------|
| `dress_rec_sqm` | Sum of all dressing SQM for the leaf code |
| `dress_issue_sqm` | SQM of items with a non-null `issue_status` |
| `dress_issue_status` | First `issue_status` found |

### Smoking / Dying

| Key | Source |
|-----|--------|
| `smoking_process` | Total SQM processed (sum of `sqm`, rounded to 3 d.p.) |
| `smoking_issue_sqm` | SQM of items where `issue_status` is set (rounded to 3 d.p.); blank if none issued |
| `smoking_issue_status` | First `issue_status` from issued items |

### Grouping / Clipping

| Key | Source |
|-----|--------|
| `grouping_new_group_no` | `group_no` |
| `grouping_rec_sheets` | `no_of_sheets` |
| `grouping_rec_sqm` | `sqm` |
| `grouping_issue_sheets` | `rec_sheets − available_details.no_of_sheets` |
| `grouping_issue_sqm` | `rec_sqm − available_details.sqm` |
| `grouping_issue_status` | From `grouping_done_history.issue_status` (latest record) — values: `challan`, `order`, `tapping` |
| `grouping_balance_sheets` | `available_details.no_of_sheets` (always numeric when grouping exists) |
| `grouping_balance_sqm` | `available_details.sqm` (always numeric when grouping exists) |

### Tapping / Splicing

| Key | Source |
|-----|--------|
| `splicing_rec_machine_sqm` | SQM sum of items with `tapping_details.splicing_type = MACHINE SPLICING` |
| `splicing_rec_hand_sqm` | SQM sum of items with `tapping_details.splicing_type = HAND SPLICING` |
| `splicing_sheets` | Total sheets from all tapping items |
| `splicing_issue_sheets` | `total_sheets − available_details.no_of_sheets` |
| `splicing_issue_status` | Formatted from `tapping_done_history` (`issue_status / issued_for`) |
| `splicing_balance_sheets` | `available_details.no_of_sheets` (numeric `0` when tapping done; blank if tapping not done) |
| `splicing_balance_sqm` | `available_details.sqm` (same zero-vs-blank rule) |

### Pressing

| Key | Source |
|-----|--------|
| `pressing_sheets` | Total sheets from pressing output |
| `pressing_sqm` | Total SQM from pressing output |
| `pressing_issue_sheets` | Sum from `pressing_done_history` |
| `pressing_issue_sqm` | Sum from `pressing_done_history` |
| `pressing_issue_status` | Formatted from `pressing_done_history` (`issue_status / issued_for`) |
| `pressing_balance_sheets` | `pressing_sheets − pressing_issue_sheets` (numeric `0` when pressing done; blank otherwise) |
| `pressing_balance_sqm` | `pressing_sqm − pressing_issue_sqm` (same zero-vs-blank rule) |

### CNC & Colour

| Key | Source |
|-----|--------|
| `cnc_type` | `product_type` from first CNC record linked to pressing |
| `cnc_rec_sheets` | Sum of CNC `no_of_sheets` |
| `colour_rec_sheets` | Sum of colour `no_of_sheets` |

### Sales / Order

These columns are populated **only** when a log or crosscut item was directly issued to a customer order via `issued_for_order_items`. Factory-path stages (Grouping, Tapping, Pressing, CNC, Colour) do **not** contribute to these columns.

| Key | Source |
|-----|--------|
| `sales_order_no` | `orders.order_no` |
| `sales_order_date` | `orders.orderDate` formatted as `DD/MM/YYYY` |
| `sales_customer` | `orders.owner_name` |
| `sales_rec_sheets` | Order item CBM or SQM formatted as `"12.345 CBM"` / `"12.345 SQM"` (from `raw_order_item_details`, `decorative_order_item_details`, or `series_product_order_item_details`) |
| `jwc_veneer` | Reserved — always blank |
| `awc_pressing_sheets` | Reserved — always blank |

**Sources and priority:**

1. **LOG direct** — `issued_for_order_items` where `issued_from = "LOG"` and `item_details._id` matches the log inventory item. Applied to all rows sharing that log.
2. **CROSSCUT direct** — `issued_for_order_items` where `issued_from = "CROSSCUTTING"` and `item_details._id` matches the crosscut record. Applied only to rows that have that crosscut in their lineage; only fills when `sales_rec_sheets` is still empty (LOG takes priority).

> **Blank when:** neither the log nor any of its crosscuts were issued directly to a customer order.

---

## Zero vs blank rule (balance columns)

Balance fields in this report follow a deliberate rule:

- **Numeric `0`** — the upstream process was done and the balance is genuinely zero (all issued out).
- **Blank `''`** — the process has not occurred yet for this log path, so a balance is meaningless.

This applies to `grouping_balance_*`, `splicing_balance_*`, and `pressing_balance_*`.

---

## Related code

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Log/logItemFurtherProcess.js` |
| Excel writer | `topl_backend/config/downloadExcel/reports2/Log/logItemFurtherProcess.js` |
| Route | `topl_backend/routes/report/reports2/Log/log.routes.js` |

## See also

**`LOG_ITEM_FURTHER_PROCESS_REPORT_PLAN.md`** — pipeline design, bulk-fetch order, row-building logic, and slicing CMT math.
