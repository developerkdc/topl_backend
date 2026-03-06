# Item Wise Flitch Report – Extra Fields Implementation Plan

**Overview:** The client requested additional columns to match the Inward Item Wise Report layout.
The existing 7-column report was expanded to **21 columns** across grouped sections:
Opening Stock, Round Log Details, Cross Cut Details, Flitch Details, Peeling Details,
Sales, Rejected, and Closing Stock. All required data existed in the codebase; the same
aggregation patterns from `controllers/reports2/Log/itemWiseInward.js` were reused.

---

## Column mapping (old → new)

| Old (7 cols) | New (21 cols) |
|---|---|
| Item Name | ItemName (col 1) |
| Physical GMT | *(removed – replaced by Opening Stock CMT)* |
| CC Received | CC Received (col 8) |
| Op Bal | Opening Stock CMT (col 2) |
| Flitch Received | Flitch Received (col 12) |
| FL Issued | Issue for Flitch (col 11) |
| FL Closing | Closing Stock CMT (col 21) |
| *(new)* | Invoice, Indian, Actual (cols 3-5) |
| *(new)* | Recover From rejected (col 6) – placeholder 0 |
| *(new)* | Issue for CC, CC Issue, CC Diff (cols 7, 9, 10) |
| *(new)* | Flitch Diff (col 13) |
| *(new)* | Issue for Peeling, Peeling Received, Peeling Diff (cols 14-16) |
| *(new)* | Issue for Sq.Edge (col 17) – placeholder 0 |
| *(new)* | Sales (col 18) |
| *(new)* | Job Work Challan (col 19) – placeholder 0 |
| *(new)* | Rejected (col 20) |

---

## Report layout

- **Title (row 1):** "Itemwise Flitch between DD/MM/YYYY and DD/MM/YYYY" – merged across all 21 cols
- **Spacing (row 2):** empty
- **Group headers (row 3):** merged labels per group (see table below)
- **Column headers (row 4):** 21 individual column labels
- **Data rows:** one row per item (sorted A–Z), all values to 3 decimal places
- **Total row:** grand totals, bold, gray background (#FFE0E0E0)

### Group header merges (row 3)

| Merge | Label |
|-------|-------|
| cols 3–5 | ROUND LOG DETAIL CMT |
| cols 7–10 | Cross Cut Details CMT |
| cols 11–13 | Flitch Details CMT |
| cols 14–16 | Peeling Details CMT |
| col 18 | Round log +Cross Cut *(Sales label)* |
| col 20 | (Cc+Flitch+Peeling) *(Rejected label)* |

---

## Data sources

| Field(s) | Source | Filter |
|----------|--------|--------|
| Opening Stock CMT, Invoice, Indian, Actual | `log_inventory_items` + `log_inventory_invoice_details` | `inward_date` in period |
| Issue for CC | `log_inventory_items` | `issue_status = 'crosscutting'`, `createdAt` in period |
| CC Received | `crosscutting_done` | `createdAt` in period |
| CC Issue | `crosscutting_done` | `issue_status != null`, `createdAt` in period |
| CC Diff | computed | Issue for CC − CC Received |
| Issue for Flitch | `issues_for_flitching` | `createdAt` in period |
| Flitch Received | `flitching_done` | `createdAt` in period, `deleted_at null` |
| Flitch Diff | computed | Issue for Flitch − Flitch Received |
| Issue for Peeling | `issues_for_peeling` | `createdAt` in period |
| Peeling Received | `peeling_done_other_details` + `peeling_done_items` (lookup) | `createdAt` in period |
| Peeling Diff | computed | Issue for Peeling − Peeling Received |
| Sales | `log_inventory_items` + `crosscutting_done` + `flitching_done` | `issue_status IN ['order','challan']`, `createdAt` in period |
| Rejected | `crosscutting_done` + `flitching_done` + `peeling_done_items` | `is_rejected = true`, `createdAt` in period |
| Closing Stock CMT | `log_inventory_items` + `log_inventory_invoice_details` | `inward_date` in period, `issue_status != null`; formula: closingAgg − Opening |
| Recover From rejected, Issue for Sq.Edge, Job Work Challan | *(placeholder)* | always 0 |

---

## API contract (unchanged)

- **Endpoint:** `POST /api/V1/reports2/flitch/download-excel-item-wise-flitch-report`
- **Request:** `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "filter": { "item_name": "..." } }`
- **Success (200):** `{ result: "<APP_URL>/public/upload/reports/reports2/Flitch/Item-Wise-Flitch-Report-<ts>.xlsx", statusCode: 200, message: "Item wise flitch report generated successfully" }`
- **Errors:** 400 for missing/invalid dates; 404 when no flitch items found

---

## Implementation summary

### Controller – `controllers/reports2/Flitch/itemWiseFlitch.js`

- **Item universe:** Unique `item_name` values from `flitching_done_model` (deleted_at null) – report stays "flitch-centric".
- **Architecture:** Replaced the old N+1 `Promise.all` loop with a **Map-based single-pass** approach: 14 global aggregations (each grouped by `item_name`) are run in sequence; results are merged into a `reportMap` via an `addValue` helper.
- **New imports added:** `issues_for_flitching_model`, `issues_for_peeling_model`, `peeling_done_other_details_model`.
- **Return shape:** 21 fields per item including computed diffs and closing stock.
- **Activity filter:** Items where all relevant fields are zero are excluded from output.

### Excel config – `config/downloadExcel/reports2/Flitch/itemWiseFlitch.js`

- **Columns:** Expanded from 7 to 21 with appropriate widths.
- **Row structure:** Title (row 1, merged 1–21), spacing (row 2), group headers with merges (row 3), column headers (row 4), data rows, total row.
- **Grand totals:** Accumulated inline while writing data rows; rendered as the last row with bold + gray fill.
- **No API contract change:** Same `POST` body, same response shape, same file naming convention.

---

## Pending / future work

- **Recover From rejected** (col 6): needs client to define source collection/field.
- **Issue for Sq.Edge** (col 13 in current 16-col layout): needs client to define source collection/field.

---

## v3 – Match to client reference image (16-column layout)

**Overview:** The 21-column layout was further revised to match the client's reference image exactly.
Cross Cut columns and Job Work Challan were removed; group header labels and merges were updated.

### Columns removed (21 → 16)

| Column | Reason |
|--------|--------|
| Issue for CC | Not shown in client image |
| CC Received | Not shown in client image |
| CC Issue | Not shown in client image |
| CC Diff | Not shown in client image |
| Job Work Challan | Not shown in client image (was already 0) |

### New 16-column layout

| # | Column | Group (row 3) |
|---|--------|---------------|
| 1 | ItemName | – |
| 2 | Opening Stock CMT | – |
| 3 | Invoice | – |
| 4 | Indian | Flitch Detail CMT (merged 4–6) |
| 5 | Actual | Flitch Detail CMT |
| 6 | Recover From rejected | Flitch Detail CMT |
| 7 | Issue for Flitch | Flitch Details CMT (merged 7–9) |
| 8 | Flitch Received | Flitch Details CMT |
| 9 | Flitch Diff | Flitch Details CMT |
| 10 | Issue for Peeling | Peeling Details CMT (merged 10–12) |
| 11 | Peeling Received | Peeling Details CMT |
| 12 | Peeling Diff | Peeling Details CMT |
| 13 | Issue for Sq.Edge | – |
| 14 | Sales | Round log +Cross Cut (Cc+Flitch+Peeling) (merged 14–15) |
| 15 | Rejected | Round log +Cross Cut (Cc+Flitch+Peeling) |
| 16 | Closing Stock CMT | – |

### Title change
- Old: `Itemwise Flitch between DD/MM/YYYY and DD/MM/YYYY`
- New: `Inward Item Wise Report From DD/MM/YYYY to DD/MM/YYYY`

### Controller changes
- Removed aggregation STEPs for Issue for CC (log_inventory_items, issue_status=crosscutting), CC Issued (crosscutting_done, issue_status!=null), and CC Received (crosscutting_done).
- Removed fields `issue_for_cc`, `cc_received`, `cc_issued`, `cc_diff`, `job_work_challan` from the report map entry and final row shape.
- Aggregation step count reduced from 14 to 10.
- Activity filter updated to remove checks on `issue_for_cc` and `cc_received`.
- Note: crosscutting data is still used for **Sales** and **Rejected** aggregations (order/challan and is_rejected).

### Excel config changes
- Column definitions reduced from 21 to 16.
- Title merge updated: `mergeCells(1,1,1,16)`.
- Group header row (row 3) merges updated to 16-column positions.
- Grand totals accumulate 15 numeric columns only.
