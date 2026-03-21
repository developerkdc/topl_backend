# Quick Reference — Inward Log Item Further Process Report

## Endpoint
```
POST /api/V1/reports2/log/download-excel-log-item-further-process-report
```

---

## Minimal Request
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-01-31"
}
```

## With Filters
```json
{
  "startDate": "2026-01-01",
  "endDate": "2026-05-31",
  "filter": {
    "inward_id": 5
  }
}
```

---

## All 56 Columns

| # | Section Group | Column Header | Notes |
|---|---|---|---|
| 1 | *(standalone)* | Item Name | Merged vertically |
| 2 | Inward in(CMT) | LogNo | Merged vertically |
| 3 | Inward in(CMT) | Indian CMT | |
| 4 | Inward in(CMT) | RECE CMT | |
| 5 | Inward in(CMT) | Issue For Cross cut/Flitch/Peeling/Sales | From log's issue_status and physical_cmt fields |
| 6 | Inward in(CMT) | Issue Status | |
| 7 | Cross Cut Issue in(CMT) | Cross Cut Log No | Merged vertically |
| 8 | Cross Cut Issue in(CMT) | CC REC | |
| 9 | Cross Cut Issue in(CMT) | Issue For Flitch/Peeling | `crosscut_cmt` if `issue_status` is peeling or flitching |
| 10 | Cross Cut Issue in(CMT) | Status | Same row’s `issue_status` (when col 9 filled) |
| 11 | Flitch Issue in(CMT) | Log No code | `log_no_code` (merged vertically) |
| 12 | Flitch Issue in(CMT) | REC | `flitch_cmt` |
| 13 | Flitch Issue in(CMT) | Issue For Slicing/Peeling | `flitch_cmt` (quantity issued) |
| 14 | Flitch Issue in(CMT) | Status | `issue_status` (slicing, peeling, order, or challan) |
| 15 | Slicing Issue in(CMT) | Side | Merged vertically |
| 16 | Slicing Issue in(CMT) | Process Cmt | Placeholder |
| 17 | Slicing Issue in(CMT) | Balance Cmt | Placeholder |
| 18 | Slicing Issue in(CMT) | REC (Leaf) | |
| 19 | Peeling | Process | |
| 20 | Peeling | Balance Rostroller | Placeholder |
| 21 | Peeling | Output | |
| 22 | Peeling | Rec (Leaf) | |
| 23 | Dressing | Rec Sq. Mtr. | Merged vertically |
| 24 | Dressing | Issue (Sq.Mtr.) | |
| 25 | Dressing | Issue Status | |
| 26 | Smoking/Dying | Process | Merged vertically |
| 27 | Smoking/Dying | Issue (Sq.Mtr.) | |
| 28 | Smoking/Dying | Issue Status | |
| 29 | Clipping/Grouping | New Group Number | |
| 30 | Clipping/Grouping | Rec Sheets | |
| 31 | Clipping/Grouping | Rec Sq.Mtr. | |
| 32 | Clipping/Grouping | Issue (Sheets) | |
| 33 | Clipping/Grouping | Issue (Sq.Mtr.) | |
| 34 | Clipping/Grouping | Issue Status | Placeholder |
| 35 | Clipping/Grouping | Balance (Sheets) | |
| 36 | Clipping/Grouping | Balance Sq. Mtr. | |
| 37 | Splicing | Rec Machine (Sq.mtr.) | |
| 38 | Splicing | Rec Hand (Sq.Mtr.) | |
| 39 | Splicing | Splicing Sheets | |
| 40 | Splicing | Issue (Sheets) | |
| 41 | Splicing | Issue Status | |
| 42 | Splicing | Balance (Sheets) | |
| 43 | Splicing | Balance (Sq. Mtr.) | |
| 44 | Pressing | Pressing (Sheets) | `pressing_done_details` sum |
| 45 | Pressing | Pressing (Sq.mtr.) | `pressing_done_details` sum |
| 46 | Pressing | Issue (Sheets) | `pressing_done_history` sum |
| 47 | Pressing | Issue (Sq. Mtr.) | `pressing_done_history` sum |
| 48 | Pressing | Issue Status | `pressing_done_history` |
| 49 | Pressing | Balance (Sheets) | received − issued (hist.) |
| 50 | Pressing | Balance (Sq. Mtr.) | received − issued (hist.) |
| 51 | CNC | Cnc Type | |
| 52 | CNC | REC (Sheets) | |
| 53 | COLOUR | REC (Sheets) | |
| 54 | Sales | REC (Sheets) | Placeholder |
| 55 | Job Work Challan | Veneer | Placeholder |
| 56 | Adv Work Challan | Pressing Sheets | Placeholder |

---

## Header Row Layout

| Row | Content | Condition |
|---|---|---|
| 1 | `Inward Log Further Process Report` | Always |
| 2 | `Date: DD/MM/YYYY  To  DD/MM/YYYY` | Always |
| 3 | `Inward Id :- {n}` or `Log No :- {x}` | Only when filter provided, else empty |
| 4 | Section group headers | Always |
| 5 | Column headers (frozen here) | Always |

---

## Error Reference

| HTTP | Meaning |
|---|---|
| 400 | Missing / invalid dates or start > end |
| 404 | No records found for the date range + filters |
| 500 | Server or DB error |

---

## Models Used

| Model | Stage |
|---|---|
| `log_inventory_items_view_model` | Inward logs |
| `crosscutting_done_model` | Cross cut |
| `flitching_done_model` | Flitch |
| `slicing_done_items_model` | Slicing sides |
| `peeling_done_items_model` | Peeling items |
| `dressing_done_items_model` | Dressing |
| `process_done_items_details_model` | Smoking / Dying |
| `grouping_done_items_details_model` | Clipping / Grouping |
| `tapping_done_items_details_model` | Splicing (tapping) |
| `tapping_done_other_details_model` | Splicing type lookup |
| `pressing_done_details_model` | Pressing (received) |
| `pressing_done_history_model` | Pressing issue / issue status / balances |
| `cnc_done_details_model` | CNC |
| `color_done_details_model` | Colour |
