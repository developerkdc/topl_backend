# Veneer Inward Report – Implementation Plan

> **Purpose:** Preserve the implementation plan alongside the API documentation so future developers can see how the feature was scoped and built.

---

## Goal

Implement the **Veneer Inward Report** that:

- Shows one row per **item** (`item_name`) with columns matching the reference image
- Columns: Item Name, Opening, Purchase, Issue Total, Smoking (Issue to Smoke, Smoke Done), Grouping (Issue to group, Issue to group Done), Sales, Job Work Challan, Damage, Closing
- Accepts `startDate` and `endDate` (and optional `filter.item_name`) in request body, consistent with Crosscut/Log reports
- Adds a **Total** row at the end (grand total of all numeric columns)

## Reference Image Columns (in order)

1. Item Name  
2. Opening  
3. Purchase  
4. Issue Total  
5. Smoking → Issue to Smoke, Smoke Done  
6. Grouping → Issue to group, Issue to group Done  
7. Sales  
8. Job Work Challan  
9. Damage  
10. Closing  

## Schema and Data Sources

**Relevant collections:**

- **veneer_inventory_items_details** (venner.schema.js): `item_name`, `total_sq_meter`, `available_sqm`, `invoice_id`, `issue_status`, `deleted_at`
- **veneer_inventory_invoice_details**: `inward_date`, `inward_type` (inventory, job_work, challan)
- **issues_for_smoking_dying**: `issued_from` (veneer), `item_name`, `sqm`, `createdAt`
- **issues_for_grouping**: `issued_from` (veneer), `item_name`, `sqm`, `unique_identifier`, `createdAt`
- **process_done_details** / **process_done_items_details**: `process_done_date`, `item_name`, `sqm`, `issue_for_smoking_dying_id`
- **grouping_done_details** / **grouping_done_items_details**: `grouping_done_date`, `issue_for_grouping_unique_identifier`, `item_name`, `sqm`, **is_damaged**

**Column mapping:**

| Column | Source / note |
|--------|----------------|
| Item Name | Distinct item_name from veneer inventory, issues_for_smoking_dying (veneer), issues_for_grouping (veneer). |
| Opening | Veneer items whose invoice inward_date < start; sum total_sq_meter by item. |
| Purchase | Invoices with inward_type inventory, inward_date in [start, end]; sum total_sq_meter by item. |
| Issue to Smoke | issues_for_smoking_dying (issued_from veneer), createdAt in period; sum sqm by item. |
| Smoke Done | process_done (process_done_date in period) linked to issues_for_smoking_dying (veneer); sum sqm by item. |
| Issue to group | issues_for_grouping (issued_from veneer), createdAt in period; sum sqm by item. |
| Group Done | grouping_done_details (grouping_done_date in period) linked to issues_for_grouping (veneer); sum sqm by item. |
| Sales | veneer_inventory_items where issue_status order, updatedAt in period; sum by item. |
| Job Work Challan | Inward with inward_type job_work or challan, inward_date in period; sum by item. |
| Damage | **Grouping damage:** grouping_done_items_details where is_damaged true, linked to veneer via grouping_done_details → issues_for_grouping (issued_from veneer); sum sqm by item_name. |
| Issue Total | Issue to Smoke + Issue to group + Sales. |
| Closing | Opening + Purchase − Issue Total − Damage (capped at 0). |

## File and Route Layout

- **Controller:** `topl_backend/controllers/reports2/Veneer/veneerInwardReport.js`
- **Excel config:** `topl_backend/config/downloadExcel/reports2/Veneer/veneerInwardReport.js`
- **Route:** `topl_backend/routes/report/reports2/Veneer/veneer.routes.js`
- **Mount:** `topl_backend/routes/report/reports2.routes.js` (import veneerRoutes, router.use(veneerRoutes))

**Endpoint:** `POST /api/V1/report/download-excel-veneer-inward-report`  
**Request body:** `{ startDate, endDate, filter?: { item_name? } }`

## Implementation Steps (Completed)

1. **Controller** – Validate dates, get distinct item_name, run batch aggregations per metric (opening, purchase, issue to smoke, smoke done, issue to group, group done, sales, job work challan, damage), compute issue_total and closing, sort by item_name, call Excel generator, return download URL or 404.
2. **Excel config** – Title row, two header rows (merged parent headers for Smoking and Grouping), data rows (one per item, 3 decimals), Total row (yellow, bold). Save to `public/upload/reports/reports2/Veneer/VeneerInwardReport_{timestamp}.xlsx`.
3. **Routes** – New veneer.routes.js with POST `/download-excel-veneer-inward-report`; mount in reports2.routes.js.
4. **Documentation** – API doc and this plan.

## References

- **Crosscut report:** logWiseCrosscut.js (controller + config), LOG_WISE_CROSSCUT_REPORT_API.md
- **Veneer schema:** venner.schema.js (note spelling), issues_for_smoking_dying.schema.js, issues_for_grouping.schema.js, smoking_dying_done.schema.js, grouping_done.schema.js

## Assumptions and Notes

- **Damage** is sourced from **grouping**: `grouping_done_items_details.is_damaged` for veneer-originated grouping; sum sqm by item_name.
- **Job Work Challan** is interpreted as **inward** with `inward_type` in ['job_work','challan'] in the period. If business meaning is outward issue for job work challan, adjust and document.
- **Unit:** SQM for all numeric columns.
- **Closing** formula: Opening + Purchase − Issue Total − Damage.
