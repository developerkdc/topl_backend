# Veneer Inward Report API Documentation

## Overview

The Veneer Inward Report API generates an Excel report that shows one row per **item** (`item_name`) with Opening, Purchase, Issue Total, Smoking (Issue to Smoke, Smoke Done), Grouping (Issue to group, Issue to group Done), Sales, Job Work Challan, Damage, and Closing for a specified date range. All numeric values are in **SQM** (square meters) with 3 decimal places.

**Concepts a developer must know:**

- **Opening** = Veneer stock at period start (items whose invoice inward_date is before start date; sum of total_sq_meter).
- **Purchase** = All inward in period (any `inward_type`: inventory, job_work, challan); sum of total_sq_meter by item.
- **Issue Total** = Sum of Issue to Smoke + Issue to group + Sales in the period.
- **Smoking – Issue to Smoke** = Veneer issued for smoking in period (`issues_for_smoking_dying`, `issued_from: 'veneer'`, `createdAt` in period); sum sqm by item.
- **Smoking – Smoke Done** = Smoking process completed in period (`process_done_details.process_done_date` in period, linked to veneer); sum sqm by item.
- **Grouping – Issue to group** = Veneer issued for grouping in period (`issues_for_grouping`, `issued_from: 'veneer'`); sum sqm by item.
- **Grouping – Issue to group Done** = Grouping completed in period (`grouping_done_details.grouping_done_date` in period, from veneer); sum sqm by item.
- **Sales** = Veneer issued for order in period (`veneer_inventory_items` with `issue_status: 'order'`, `updatedAt` in period).
- **Job Work Challan** = Veneer issued to challan in period (from veneer history: `issue_status: 'challan'` on veneer inventory history view); sum SQM by item.
- **Damage** = Grouping damage: `grouping_done_items_details` with `is_damaged: true`, linked to veneer via `issues_for_grouping` (`issued_from: 'veneer'`); sum sqm by item_name.
- **Closing** = Opening + Purchase − Issue Total − Damage (capped at 0).

## API Endpoint

**POST** `/api/V1/report/download-excel-veneer-inward-report`

## Request Body

```json
{
  "startDate": "2025-04-01",
  "endDate": "2026-02-13",
  "filter": {
    "item_name": "OAK"
  }
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | String | Yes | Start date in YYYY-MM-DD format |
| `endDate` | String | Yes | End date in YYYY-MM-DD format |
| `filter.item_name` | String | No | Filter by specific item name |

## Response

### Success Response (200 OK)

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Veneer inward report generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Veneer/VeneerInwardReport_1738598745123.xlsx"
}
```

### Error Responses

#### 400 Bad Request - Missing Required Parameters

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date and end date are required"
}
```

#### 400 Bad Request - Invalid Date Format

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Invalid date format. Use YYYY-MM-DD"
}
```

#### 400 Bad Request - Invalid Date Range

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Start date cannot be after end date"
}
```

#### 404 Not Found - No Data

```json
{
  "statusCode": 404,
  "success": false,
  "message": "No veneer data found for the selected criteria"
}
```

#### 500 Internal Server Error

```json
{
  "statusCode": 500,
  "success": false,
  "message": "Failed to generate report"
}
```

## Report Structure

### Excel File Format

- **File Name**: `VeneerInwardReport_[timestamp].xlsx`
- **Sheet Name**: "Veneer Inward Report"
- **Save Path**: `public/upload/reports/reports2/Veneer/`

### Report Columns (12 columns)

| Column # | Column Name | Description | Data Type |
|----------|-------------|-------------|-----------|
| 1 | Item Name | Item name | String |
| 2 | Opening | Stock at period start (SQM) | Decimal (3 places) |
| 3 | Purchase | Inward (inventory) in period (SQM) | Decimal (3 places) |
| 4 | Issue Total | Total issued in period (SQM) | Decimal (3 places) |
| 5 | Issue to Smoke | Veneer issued for smoking in period (SQM) | Decimal (3 places) |
| 6 | Smoke Done | Smoking done in period (SQM) | Decimal (3 places) |
| 7 | Issue to group | Veneer issued for grouping in period (SQM) | Decimal (3 places) |
| 8 | Issue to group Done | Grouping done in period (SQM) | Decimal (3 places) |
| 9 | Sales | Veneer issued for order in period (SQM) | Decimal (3 places) |
| 10 | Job Work Challan | Veneer issued to challan in period (SQM) | Decimal (3 places) |
| 11 | Damage | Grouping damage (is_damaged, veneer-originated) (SQM) | Decimal (3 places) |
| 12 | Closing | Closing stock (SQM) | Decimal (3 places) |

### Report Layout

1. **Title Row**: "Veneer Inward Report From DD/MM/YYYY to DD/MM/YYYY"
2. **Empty Row**: Spacing
3. **Header Row 1**: Column group headers with "Smoking" merged over Issue to Smoke / Smoke Done, "Grouping" merged over Issue to group / Issue to group Done (gray background, borders)
4. **Header Row 2**: Sub-labels under Smoking and Grouping
5. **Data Rows**: One row per item, sorted by item_name
6. **Total Row**: One row at the end with "Total" and summed numeric columns (yellow background, bold)

## Data Sources

### Primary Models

1. **Veneer Inventory** (`veneer_inventory_items_model`, `veneer_inventory_invoice_model`)
   - Collections: `veneer_inventory_items_details`, `veneer_inventory_invoice_details`
   - Fields used: `item_name`, `total_sq_meter`, `available_sqm`, `invoice_id`, `issue_status`, `inward_date`, `inward_type`

2. **Issues For Smoking/Dying** (`issues_for_smoking_dying_model`)
   - Collection: `issues_for_smoking_dyings`
   - Fields used: `issued_from`, `item_name`, `sqm`, `createdAt`

3. **Issues For Grouping** (`issues_for_grouping_model`)
   - Collection: `issues_for_groupings`
   - Fields used: `issued_from`, `item_name`, `sqm`, `unique_identifier`, `createdAt`

4. **Process Done (Smoking)** (`process_done_details_model`, `process_done_items_details_model`)
   - Collections: `process_done_details`, `process_done_items_details`
   - Fields used: `process_done_date`, `item_name`, `sqm`, `issue_for_smoking_dying_id`

5. **Grouping Done** (`grouping_done_details_model`, `grouping_done_items_details_model`)
   - Collections: `grouping_done_details`, `grouping_done_items_details`
   - Fields used: `grouping_done_date`, `issue_for_grouping_unique_identifier`, `item_name`, `sqm`, **is_damaged**

### Damage Source

**Damage** is sourced from **grouping**: `grouping_done_items_details` where `is_damaged: true`, joined to `grouping_done_details` and then to `issues_for_grouping` where `issued_from: 'veneer'`. Sum of `sqm` by `item_name`.

## Calculation Formulas

| Column | Formula / source |
|--------|------------------|
| **Opening** | Sum of `total_sq_meter` from veneer items whose invoice `inward_date` < start. |
| **Purchase** | Sum of `total_sq_meter` from veneer items where invoice `inward_date` in [start, end] (all inward types: inventory, job_work, challan). |
| **Issue to Smoke** | Sum of `sqm` from `issues_for_smoking_dying` where `issued_from: 'veneer'`, `createdAt` in [start, end]. |
| **Smoke Done** | Sum of `sqm` from `process_done_items_details` linked to `process_done_details` (process_done_date in period) and `issues_for_smoking_dying` (issued_from veneer). |
| **Issue to group** | Sum of `sqm` from `issues_for_grouping` where `issued_from: 'veneer'`, `createdAt` in [start, end]. |
| **Group Done** | Sum of `sqm` from `grouping_done_items_details` linked to `grouping_done_details` (grouping_done_date in period) and `issues_for_grouping` (issued_from veneer). |
| **Sales** | Sum of `total_sq_meter` from veneer items where `issue_status: 'order'`, `updatedAt` in [start, end]. |
| **Job Work Challan** | Sum of `total_sq_meter` from veneer history where `issue_status: 'challan'` and `updatedAt` in [start, end]. |
| **Damage** | Sum of `sqm` from `grouping_done_items_details` where `is_damaged: true`, linked to veneer via `grouping_done_details` → `issues_for_grouping` (issued_from veneer). |
| **Issue Total** | Issue to Smoke + Issue to group + Sales. |
| **Closing** | max(0, Opening + Purchase − Issue Total − Damage). |

## Example Usage

### Request with Date Range Only

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-veneer-inward-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-04-01",
    "endDate": "2026-02-13"
  }'
```

### Request with Item Filter

```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-veneer-inward-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-04-01",
    "endDate": "2026-02-13",
    "filter": {
      "item_name": "OAK"
    }
  }'
```

## Implementation Files

| Role | Path |
|------|------|
| Controller | `topl_backend/controllers/reports2/Veneer/veneerInwardReport.js` |
| Excel config | `topl_backend/config/downloadExcel/reports2/Veneer/veneerInwardReport.js` |
| Route | `topl_backend/routes/report/reports2/Veneer/veneer.routes.js` |

**Implementation plan:** [VENEER_INWARD_REPORT_PLAN.md](./VENEER_INWARD_REPORT_PLAN.md)
