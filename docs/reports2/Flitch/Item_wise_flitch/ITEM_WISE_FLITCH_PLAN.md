# Item Wise Flitch Report – 16-Column Implementation Plan

**Overview:** The flitching factory report tracks inventory movements by item across a date range.
The **16-column layout** groups data across:
Round Log Detail CMT (Invoice, Indian, Actual), Flitch Details CMT (Issue, Received, Diff),
Slicing Details CMT (Issue, Received, Diff), Sales, Rejected, and Closing Stock.

**Key Features:**
- **Opening Stock:** Items with `issue_status=null` created BEFORE the start date
- **Closing Stock Formula:** Opening Stock + Flitch Received − Issue for Slicing − Sales (clamped to 0)
- **Rejected:** Flitch wastage (wastage_info.wastage_sqm) + Slicing wastage (issue_for_slicing_wastage.cmt)
- **Round Log Detail CMT:** Intelligently sources from LOG or CROSSCUT based on issue origin

---

## Current 16-Column Layout

| # | Column | Group Header | Data Source | Notes |
|---|--------|--------------|-------------|-------|
| 1 | Item Name | – | flitching_done.item_name | Product species |
| 2 | Opening Stock CMT | – | flitching_done (issue_status=null before period) | Inventory carried forward |
| 3 | Invoice CMT | Round Log Detail | log_inventory.invoice_cmt OR 0 (crosscut) | From LOG inward in period |
| 4 | Indian CMT | Round Log Detail | log_inventory.indian_cmt OR 0 (crosscut) | From LOG inward in period |
| 5 | Actual CMT | Round Log Detail | log_inventory.physical_cmt OR crosscut.crosscut_cmt | Actual received in period |
| 6 | Recover From Rejected | Round Log Detail | *(placeholder – 0)* | Data source TBD |
| 7 | Issue for Flitch | Flitch Details | issues_for_flitching.cmt (createdAt in period) | CMT issued to flitching |
| 8 | Flitch Received | Flitch Details | flitching_done.flitch_cmt (in period) | CMT completed by flitching |
| 9 | Flitch Diff | Flitch Details | Issue for Flitch − Flitch Received | Variance |
| 10 | Issue for Slicing | Slicing Details | issued_for_slicing.cmt (createdAt in period) | CMT sent to slicing |
| 11 | Slicing Received | Slicing Details | slicing_done_other_details.total_cmt (slicing_date in period) | CMT completed by slicing |
| 12 | Slicing Diff | Slicing Details | Issue for Slicing − Slicing Received | Variance |
| 13 | Issue for Sq.Edge | – | *(placeholder – 0)* | Data source TBD |
| 14 | Sales | – | flitching_done where issue_status IN [order, challan] | CMT sold/invoiced |
| 15 | Rejected | – | flitch wastage + slicing wastage | Total waste |
| 16 | Closing Stock CMT | – | MAX(0, Opening + Flitch Rcvd − Issue Slicing − Sales) | Ending inventory |

**Replacements from previous versions:**
- Removed: Issue for CC, CC Received, CC Issue, CC Diff (crosscut section)
- Removed: Job Work Challan
- Changed: "Peeling Details CMT" → "Slicing Details CMT"

---

## Report Layout (16 columns)

- **Row 1 (Title):** "Inward Item Wise Report From DD/MM/YYYY to DD/MM/YYYY" – merged across columns 1–16
- **Row 2:** Empty (spacing)
- **Row 3 (Group Headers):** Merged cells for grouped sections (see table below)
- **Row 4 (Column Headers):** 16 individual column labels
- **Rows 5+:** Data rows (one per item, sorted A–Z by item_name), all CMT values to 3 decimal places
- **Last Row:** Grand totals (bold, light gray background #FFE0E0E0), sums 15 numeric columns

### Group Header Merges (Row 3)

| Merge | Label |
|-------|-------|
| cols 3–5 | Round Log Detail CMT |
| cols 7–9 | Flitch Details CMT |
| cols 10–12 | Slicing Details CMT |
| col 1, 2, 6, 13, 14, 15, 16 | Standalone (no merge) |

---

## Data Sources & Calculations

| Field(s) | Source | Filter | Special Logic |
|----------|--------|--------|---------------|
| **Opening Stock CMT** | `flitching_done` | `worker_details.flitching_date < start date`, `issue_status = null`, `deleted_at = null` | Items not yet allocated |
| **Invoice/Indian/Actual CMT** | `log_inventory` (LOG) or hardcoded 0 (CROSSCUT) | `worker_details.flitching_date` in period | Determined by `crosscut_done_id`: null=LOG, !=null=CROSSCUT |
| **Issue for Flitch** | `issues_for_flitching` | `createdAt` in period | CMT sent to flitching station |
| **Flitch Received** | `flitching_done` | `worker_details.flitching_date` in period, `deleted_at = null` | CMT completed at flitching |
| **Flitch Diff** | *computed* | – | Issue for Flitch − Flitch Received |
| **Issue for Slicing** | `issued_for_slicing` | `createdAt` in period | CMT sent from flitching to slicing |
| **Slicing Received** | `slicing_done_other_details.total_cmt` | `slicing_date` in period (lookup via `issue_for_slicing_id`) | CMT completed at slicing |
| **Slicing Diff** | *computed* | – | Issue for Slicing − Slicing Received |
| **Sales** | `flitching_done` | `worker_details.flitching_date` in period, `issue_status IN ['order','challan']`, `deleted_at = null` | CMT invoiced or ordered |
| **Rejected** | `flitching_done` (wastage) + `issue_for_slicing_wastage` | flitch: any in period; wastage: `createdAt` in period | Sum of `flitching_done.wastage_info.wastage_sqm` + `issue_for_slicing_wastage.cmt` |
| **Closing Stock CMT** | *computed* | – | MAX(0, Opening Stock + Flitch Received − Issue for Slicing − Sales) |
| **Recover From Rejected, Issue for Sq.Edge** | *(placeholder)* | – | Always 0; data source TBD |

---

## API contract (unchanged)

- **Endpoint:** `POST /api/V1/reports2/flitch/download-excel-item-wise-flitch-report`
- **Request:** `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "filter": { "item_name": "..." } }`
- **Success (200):** `{ result: "<APP_URL>/public/upload/reports/reports2/Flitch/Item-Wise-Flitch-Report-<ts>.xlsx", statusCode: 200, message: "Item wise flitch report generated successfully" }`
- **Errors:** 400 for missing/invalid dates; 404 when no inward items found in the date range

---

## Implementation Summary

### Controller: [itemWiseFlitch.js](topl_backend/controllers/reports2/Flitch/itemWiseFlitch.js)

**Item Universe:**
- Unique `item_name` from `flitching_done` flitched in date range
- PLUS unique `item_name` from `flitching_done` with `issue_status=null` created before start date (for opening stock)

**Architecture (11 sequential aggregation steps):**
1. **STEP 1:** Get item universe (flitched in period + opening stock items)
2. **STEP 2:** Initialize report map (16 fields, all 0)
3. **STEP 3a:** Opening Stock (flitching_done before start date, issue_status=null)
3. **STEP 3b:** Round Log Detail CMT from LOG sources (flitching_done.crosscut_done_id=null, in period, joined to log_inventory)
3. **STEP 3c:** Round Log Detail CMT from CROSSCUT sources (flitching_done.crosscut_done_id!=null, in period)
4. **STEP 4:** Issue for Flitch (issues_for_flitching, createdAt in period)
5. **STEP 5:** Flitch Received (flitching_done, worker_details.flitching_date in period)
6. **STEP 6:** Issue for Slicing (issued_for_slicing, createdAt in period)
7. **STEP 7:** Slicing Received (slicing_done_other_details, slicing_date in period, joined to issued_for_slicing)
8. **STEP 8:** Sales (flitching_done, issue_status IN [order,challan], in period)
9. **STEP 9:** Rejected (flitch wastage: flitching_done.wastage_info.wastage_sqm + slicing wastage: issue_for_slicing_wastage.cmt)
10. **STEP 10:** *(No query; closing calculated in STEP 11)*
11. **STEP 11:** Build final 16-field report, compute diffs and closing stock, filter actives

**Imports:** `issues_for_flitching_model`, `issued_for_slicing_model`, `slicing_done_other_details_model`, `issue_for_slicing_wastage_model`

**Return Shape:** 16 fields per item (item_name, opening_stock_cmt, invoice_cmt, indian_cmt, actual_cmt, recover_from_rejected, issue_for_flitch, flitch_received, flitch_diff, issue_for_slicing, slicing_received, slicing_diff, issue_for_sqedge, sales, rejected, closing_stock_cmt)

**Activity Filter:** Excludes items where all numeric fields = 0

### Excel Config: [itemWiseFlitch.js](topl_backend/config/downloadExcel/reports2/Flitch/itemWiseFlitch.js)

- **Columns:** 16 with appropriate widths (item_name=25, CMT columns=12-18)
- **Row 1:** Title merged across columns 1–16, format "Inward Item Wise Report From DD/MM/YYYY to DD/MM/YYYY"
- **Row 2:** Spacing (empty)
- **Row 3:** Group headers with merges (3–5 Round Log, 7–9 Flitch Details, 10–12 Slicing Details)
- **Row 4:** 16 column header labels
- **Data rows:** Sorted A–Z by item_name, all CMT values formatted to 3 decimals
- **Last row:** Grand totals (15 numeric columns), bold with gray background (#FFE0E0E0)

---

## Pending / Future Work

- **Recover From Rejected** (col 6): Data source TBD – placeholder value 0
- **Issue for Sq.Edge** (col 13): Data source TBD – placeholder value 0

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0.0 | 2025-02-03 | Initial 7-column implementation |
| 2.0.0 | 2026-03-06 | Expanded to 21 columns (Round Log, Cross Cut, Flitch, Peeling) |
| 3.0.0 | 2026-03-06 | 20 columns (removed Job Work Challan) |
| 4.0.0 | 2026-03-20 | 16 columns; Peeling→Slicing; Fixed Opening/Closing formulas; Wastage aggregation |

### v4 Changes (Current)

**Strategic Shift:** From transaction-focused reporting to inventory-flow tracking

- **Opening Stock Logic Changed:** Now represents items carried forward (`issue_status=null` before period), not items inwarded in period
- **Closing Stock Formula Changed:** From `MAX(0, closing_transactions − opening_stock)` to `MAX(0, opening_stock + flitch_received − issue_for_slicing − sales)`
- **Peeling → Slicing:** Replaced peeling factory tracking with slicing factory data
- **Wastage Calculation:** Flitch wastage now uses `wastage_info.wastage_sqm` instead of is_rejected flag; added slicing wastage aggregation
- **Round Log Detail CMT:** Intelligent sourcing based on `crosscut_done_id` (null=LOG with invoice/indian/actual; !=null=CROSSCUT with zeros and actual_cmt)
- **Cross Cut Section Removed:** Eliminated Issue for CC, CC Received, CC Issue, CC Diff columns (10→9 columns removed); crosscut data no longer primary but still used in Sales/Rejected
- **Column Count:** Reduced from 20 to 16 by removing crosscut section

**Rationale:** The flitching report now reflects actual inventory movements (what enters, what is processed, what exits) rather than transaction records, providing better operational visibility.
