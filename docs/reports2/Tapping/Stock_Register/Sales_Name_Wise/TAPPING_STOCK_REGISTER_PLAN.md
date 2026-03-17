# Tapping Stock Register API Plan

**Overview:** Add a new "Splicing Item Stock Register sales name wise" API under `reports2 > Tapping > Stock_Register`. The report shows stock movement (Opening Balance, Tapping Hand/Machine, Issue Pressing, Process Waste, Sales, Closing Balance) for each (item_sub_category_name, item_name) pair over a user-supplied date range. The existing `TappingORClipping/tappingORClippingStockRegister` API is not modified.

---

## Report Layout (from client image)

- **Title:** "Splicing Item Stock Register sales name wise - DD/MM/YYYY and DD/MM/YYYY"
- **Column headers (2-row):**
  - Row 1: Item Name | Sales Item Name | Opening Balance | `Tapping` ← merged cols 4–5 | `Issue` (col 6 label) | Process Waste | Sales | Closing Balance
  - Row 2: (cols 1,2,3,7,8,9 merged from row 1) | Hand Splice | Machine Splice | Pressing
- **One row per** (Item Name, Sales Item Name) pair — all-zero rows are filtered out.
- **Total row** at the bottom (sum of all numeric columns).

## Column → Data Source Mapping


| Column                 | Collection                                                  | Field                    | Notes                                                                                                          |
| ---------------------- | ----------------------------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Item Name              | `tapping_done_items_details`                                | `item_sub_category_name` | Category/group name                                                                                            |
| Sales Item Name        | `tapping_done_items_details`                                | `item_name`              | Specific item                                                                                                  |
| Opening Balance        | Calculated                                                  | —                        | `currentAvailable + issueInPeriod −`                                                                           |
| Tapping Hand Splice    | `tapping_done_items_details` + `tapping_done_other_details` | `sqm`                    | Join by `tapping_done_other_details_id`; `tapping_date` in range; `splicing_type IN ['HAND', 'HAND SPLICING']` |
| Tapping Machine Splice | Same join                                                   | `sqm`                    | `splicing_type IN ['MACHINE', 'MACHINE SPLICING']`                                                             |
| Issue → Pressing       | `tapping_done_history`                                      | `sqm`                    | `createdAt` in range, match item                                                                               |
| Process Waste          | `issue_for_tapping_wastage` + `issue_for_tappings`          | `sqm`                    | Wastage `createdAt` in range; match item via lookup                                                            |
| Sales                  | —                                                           | —                        | **0** (placeholder — no schema source)                                                                         |
| Closing Balance        | Calculated                                                  | —                        | `Opening + Tapping(Hand+Machine) − IssuePressing − ProcessWaste − Sales`                                       |


## Balance Formulas

```
currentAvailable = SUM(tapping_done_items_details.available_details.sqm)
tappingReceived  = tappingHand + tappingMachine
issueInPeriod    = issuePressing

Opening  = currentAvailable + issueInPeriod − tappingReceived
Closing  = Opening + tappingReceived − issuePressing − processWaste − sales
```

Negative values are allowed (shown in parentheses in Excel).

## API Contract

- **Endpoint:** `POST /api/V1/report/download-excel-tapping-stock-register`
- **Request body:** `{ "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD" }`
- **Success (200):** `{ result: "<APP_URL>/public/reports/Tapping/...", statusCode: 200, ... }`
- **Errors:** 400 if dates missing/invalid; 404 if no data or all rows zero.

## File Structure


| Purpose         | Path                                                                           |
| --------------- | ------------------------------------------------------------------------------ |
| Controller      | `controllers/reports2/Tapping/Stock_Register/tappingStockRegister.js`          |
| Excel generator | `config/downloadExcel/reports2/Tapping/Stock_Register/tappingStockRegister.js` |
| Routes          | `routes/report/reports2/Tapping/tapping.routes.js` (endpoint added)            |


## Implementation Summary

1. **Controller:** Validate dates; get distinct (item_sub_category_name, item_name) pairs; for each pair run 5 parallel aggregations (currentAvailable, tappingHand, tappingMachine, issuePressing, processWaste); compute Opening/Closing; filter all-zero rows; call Excel generator.
2. **Excel config:** 2-row merged header (Tapping merged cols 4–5; cols 1,2,3,7,8,9 merged vertically); data rows with negative-format for balance columns; Total row.
3. **Routes:** Endpoint added to existing `tapping.routes.js` (no new routes file needed).

## Notes

- `Sales` is output as 0 (placeholder). When a data source is available, it should be wired into the controller's parallel aggregations and the Closing Balance formula.
- Negative balance values use Excel format `0.00;(0.00)` (parentheses notation).
- Files saved to `public/reports/Tapping/tapping_stock_register_{timestamp}.xlsx`.
- Unlike the existing `TappingORClipping` stock register, this report does NOT filter by item_group_name/item_name via request body — it returns all items.

