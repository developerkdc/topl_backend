# Log Wise Flitch Report – Implementation Summary

## v3.0 Update: 2026-03-20

Aligned Log Wise Flitch Report to **Item Wise Flitch v4 logic**: replaced Peeling with Slicing, implemented inventory-flow-based opening/closing stock calculations, added LOG/CROSSCUT source differentiation for Round Log Detail CMT, and integrated wastage aggregations (flitch + slicing) into Rejected column. Maintains 19-column multi-level layout with per-log parallelization.

---

## What Changed (v2 → v3)

| Aspect | v2 (Peeling) | v3 (current – Slicing) |
|--------|--------------|----------------------|
| Factory stage | Peeling (post-flitch) | Slicing (post-flitch) |
| Peeling columns | Issue for Peeling (13), Peeling Received (14), Peeling Diff (15) | Issue for Slicing (13), Slicing Received (14), Slicing Diff (15) |
| Data sources | `peeling_done_items_model` aggregation | `issued_for_slicing_model`, `slicing_done_other_details_model` |
| Opening Stock formula | `CurrentAvailable + Issued − Received` | `flitching_done` with `issue_status=null` created BEFORE start date |
| Closing Stock formula | `Opening + Received − Issued` | `MAX(0, Opening + Received − Issued − Sales)` |
| Round Log CMT source | Flat `invoice_cmt=0`, `indian_cmt=0` | LOG source: from `log_inventory_items_details`; CROSSCUT: from `crosscutting_done` |
| Round Log CMT fields | No LOG/CROSSCUT differentiation | `crosscut_done_id=null` → LOG; !=null → CROSSCUT |
| Rejected column | `is_rejected=true` flag only | Flitch wastage (`wastage_info.wastage_sqm`) + Slicing wastage (`issue_for_slicing_wastage.cmt`) |
| New data models | (none) | `issued_for_slicing_model`, `slicing_done_other_details_model`, `issue_for_slicing_wastage_model` |

---

## Files Modified

### 1. Controller
**`topl_backend/controllers/reports2/Flitch/logWiseFlitch.js`**

Refactored per-log aggregations to align with Item Wise v4:
- **Opening Stock**: `flitching_done` where `worker_details.flitching_date < start`, `issue_status=null`, `deleted_at=null`
- **Round Log Detail CMT**: Separated LOG/CROSSCUT sources using `crosscut_done_id` field:
  - **LOG** (`crosscut_done_id=null`): Invoice/Indian from `log_inventory_items_details`, Actual from `log_data.physical_cmt`
  - **CROSSCUT** (`crosscut_done_id!=null`): Actual from `crosscutting_done.crosscut_cmt`
- **Issue/Received for Slicing** (replaces Peeling): Aggregates from `issued_for_slicing_model` and `slicing_done_other_details_model`
- **Rejected**: Sum of two wastage sources (Flitch: `wastage_info.wastage_sqm` + Slicing: `issue_for_slicing_wastage.cmt`)
- **Closing Stock**: `MAX(0, Opening + Received − Issued − Sales)` inventory-flow formula
- **Flitch / Slicing Diff**: `max(0, issue − received)` via `nonNegativeDiff` so variance columns never show negative values

New imports: `issued_for_slicing_model`, `slicing_done_other_details_model`, `issue_for_slicing_wastage_model`

### 2. Excel Config
**`topl_backend/config/downloadExcel/reports2/Flitch/logWiseFlitch.js`**

Restructured to:
- 19 columns
- 4 header rows: Title / Spacer / Group headers / Sub-column headers
- Merged group header cells (rows 3): cols 8–9, 10–12, 13–15, 16–18
- Per-cell border application via loop (avoids ExcelJS merge-cell styling gaps)
- Date formatted as DD/MM/YY in Inward Date column
- Grand totals row (yellow background) with all numeric columns summed

---

## Column Summary (v2)

| # | Field key | Header | Type | Source |
|---|-----------|--------|------|--------|
| 1 | `item_name` | Item Name | String | Flitch inventory / factory |
| 2 | `log_no` | Flitch Log No. | String | Flitch inventory / factory |
| 3 | `inward_date` | Inward Date | Date (DD/MM/YY) | Invoice `inward_date` or factory `flitching_date` |
| 4 | `status` | Status | String | Derived from `issue_status` / `is_rejected` |
| 5 | `op_bal` | Opening Stock CMT | Decimal | `flitching_done` with `issue_status=null` before start date |
| 6 | `recover_from_rejected` | Recovered From rejected | Decimal | **Placeholder 0** |
| 7 | `invoice_cmt` | Invoice | Decimal | LOG source: `log_inventory_items_details.invoice_cmt` |
| 8 | `indian_cmt` | Indian | Decimal | LOG source: `log_inventory_items_details.indian_cmt` |
| 9 | `actual_cmt` | Actual (Round Log Detail) | Decimal | LOG: `log_data.physical_cmt` + CROSSCUT: `crosscut_done.crosscut_cmt` (period) |
| 10 | `issue_for_flitch` | Issue for Flitch | Decimal | All issued (order/challan/issue_for_slicing/slicing) in period |
| 11 | `flitch_received` | Flitch Received | Decimal | Inventory + factory flitch `flitch_cmt` (period) |
| 12 | `flitch_diff` | Flitch Diff | Decimal | `max(0, Col 10 − Col 11)` |
| 13 | `issue_for_slicing` | Issue for Slicing | Decimal | `issued_for_slicing_model.cmt` matched to log (period) |
| 14 | `slicing_received` | Slicing Received | Decimal | `slicing_done_other_details_model.total_cmt` (period) |
| 15 | `slicing_diff` | Slicing Diff | Decimal | `max(0, Col 13 − Col 14)` |
| 16 | `issue_for_sqedge` | Issue for Sq.Edge | Decimal | **Placeholder 0** |
| 17 | `sales` | Sales | Decimal | `order` / `challan` issued (period) |
| 18 | `rejected` | Rejected | Decimal | Flitch wastage (`wastage_info.wastage_sqm`) + Slicing wastage (`issue_for_slicing_wastage.cmt`) (period) |
| 19 | `fl_closing` | Closing Stock CMT | Decimal | `MAX(0, Opening + Received − Issued − Sales)` |

---

## Placeholder Columns (client to provide sources)

| Column | Status | Notes |
|--------|--------|-------|
| Recovered From rejected (col 6) | Placeholder 0 | No "recovered" flag in flitch/peeling schema |
| Indian CMT (col 8) | Placeholder 0 | Flitch schema stores only `flitch_cmt`; no Indian measurement |
| Issue for Sq.Edge (col 16) | Placeholder 0 | No square-edge tracking in current factory module |

---

## Status Derivation Mapping

| `issue_status` / flag | Display value |
|-----------------------|---------------|
| `is_rejected = true` on factory item | Rejected |
| `issue_for_slicing` | Slicing |
| `slicing` | Flitch |
| `order` or `challan` | Sales |
| null / no match | Stock |

---

## Feasibility Notes

All changes from the client's reference image have been implemented:

| Change | Status |
|--------|--------|
| Inward Date | ✅ Implemented |
| Status column | ✅ Implemented (derived) |
| Opening / Closing Stock CMT | ✅ Implemented (renamed) |
| Invoice column | ✅ Implemented (`inward_sr_no`) |
| Received Flitch Detail CMT: Actual | ✅ Implemented |
| Received Flitch Detail CMT: Indian | ⚠️ Placeholder 0 (no schema field) |
| Flitch Details: Issue / Received / Diff | ✅ Implemented |
| Peeling Details: Issue / Received / Diff | ✅ Implemented |
| Round log + Cross Cu: Sales | ✅ Implemented |
| Round log + Cross Cu: Rejected | ✅ Implemented |
| Round log + Cross Cu: Issue for Sq.Edge | ⚠️ Placeholder 0 (no data source) |
| Recovered From rejected | ⚠️ Placeholder 0 (no data source) |
| Multi-level Excel header layout | ✅ Implemented |

---

## API Endpoint

**POST** `/api/V1/reports2/flitch/download-excel-log-wise-flitch-report`

See [LOG_WISE_FLITCH_REPORT_API.md](./LOG_WISE_FLITCH_REPORT_API.md) for full request/response documentation.

---

## Version History

| Version | Date       | Changes |
|---------|------------|----------|
| 1.0.0   | 2025-02-03 | Initial 11-column flat report |
| 2.0.0   | 2026-03-06 | Restructured to 19-column multi-level layout; added Inward Date, Status, Invoice columns |
| 3.0.0   | 2026-03-20 | Aligned to Item Wise v4: Slicing instead of Peeling; inventory-flow opening/closing; LOG/CROSSCUT Round Log sourcing; wastage aggregation (flitch+slicing) in Rejected |

---

**Status**: ✅ v3.0 Complete
