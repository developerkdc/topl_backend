# Log Wise Flitch Report – Implementation Summary

## v2.0 Update: 2026-03-06

Applied client-requested changes to align the report with the **"Inward Item & Log Wise Report"** layout shown in the reference image. The report now uses a 19-column multi-level header structure.

---

## What Changed (v1 → v2)

| Aspect | v1 (original) | v2 (current) |
|--------|---------------|--------------|
| Column count | 11 flat columns | 19 columns with 4-row multi-level header |
| Report title | "Logwise Flitch between …" | "Inward Item & Log Wise Report From … To …" |
| New identity columns | — | Inward Date, Status |
| New stock columns | — | Recovered From rejected (placeholder), Invoice |
| Received group | Flat CC Received + Flitch Received | Group "Received Flitch Detail CMT" → Indian, Actual |
| Flitch tracking | FL Issued + FL Closing only | Group "Flitch Details CMT" → Issue/Received/Diff |
| Peeling tracking | Peel Received only | Group "Peeling Details CMT" → Issue/Received/Diff |
| Round log group | SQ Received + UN Received | Group "Round log+Cross Cu" → Issue for Sq.Edge, Sales, Rejected |
| Removed columns | Physical CMT, SQ Received, UN Received | (merged into new groups or dropped) |
| Data parallelism | Sequential aggregations | Paired `Promise.all` for inventory+factory queries |

---

## Files Modified

### 1. Controller
**`topl_backend/controllers/reports2/Flitch/logWiseFlitch.js`**

New aggregations added per log:
- **Inward Date**: Earliest `invoice.inward_date` from `flitch_inventory_invoice_details` (fallback: earliest `worker_details.flitching_date` from `flitching_done`).
- **Invoice Reference**: `inward_sr_no` from the first matched inventory invoice.
- **Status**: Derived by querying the most recently updated flitch item's `issue_status` and `is_rejected` flag.
- **Issue for Peeling**: `flitch_cmt` with `issue_status = 'slicing_peeling'` updated in period.
- **Sales**: `flitch_cmt` with `issue_status IN ['order','challan']` updated in period.
- **Rejected**: `flitch_cmt` with `is_rejected = true` updated in period.
- **Flitch Diff** + **Peeling Diff**: Derived by subtraction (Issue − Received).

Removed imports: `slicing_done_items_model`, `slicing_done_other_details_model`, `peeling_done_other_details_model` (no longer needed directly).

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
| 5 | `op_bal` | Opening Stock CMT | Decimal | Calc: CurrentAvail + Issued − Received |
| 6 | `recover_from_rejected` | Recovered From rejected | Decimal | **Placeholder 0** |
| 7 | `invoice_ref` | Invoice | Number | `inward_sr_no` from invoice |
| 8 | `indian_cmt` | Indian | Decimal | **Placeholder 0** |
| 9 | `actual_cmt` | Actual | Decimal | Inventory received + CC received (period) |
| 10 | `issue_for_flitch` | Issue for Flitch | Decimal | All issued (order/challan/slicing/slicing_peeling) in period |
| 11 | `flitch_received` | Flitch Received | Decimal | Same as Actual (col 9) |
| 12 | `flitch_diff` | Flitch Diff | Decimal | Col 10 − Col 11 |
| 13 | `issue_for_peeling` | Issue for Peeling | Decimal | `slicing_peeling` only (period) |
| 14 | `peel_received` | Peeling Received | Decimal | Peeling output face+core CMT (period) |
| 15 | `peeling_diff` | Peeling Diff | Decimal | Col 13 − Col 14 |
| 16 | `issue_for_sqedge` | Issue for Sq.Edge | Decimal | **Placeholder 0** |
| 17 | `sales` | Sales | Decimal | `order` / `challan` issued (period) |
| 18 | `rejected` | Rejected | Decimal | `is_rejected = true` (period) |
| 19 | `fl_closing` | Closing Stock CMT | Decimal | Calc: Opening + Received − Issued |

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
| `slicing_peeling` | Peeling |
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

## v1 Implementation (2025-02-03)

Original 11-column flat report. Superseded by v2.

---

**Status**: ✅ v2.0 Complete
