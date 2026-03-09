# Flitch Daily Report API

## Overview
The Flitch Daily Report API generates an Excel report of flitch inward details for a specific date. Data is sourced from the flitch inventory view and filtered by **inward date**. The report lists flitch pieces with dimensions (length, width1–3, height), grouped by Inward Id and Item Name, with a summary section (Item Name, Supplier, Flitch CMT).

## Endpoint
```
POST /api/V1/report/download-excel-flitch-daily-report
```

## Authentication
- Requires: `AuthMiddleware`
- Permission: Standard user authentication

## Request Body

### Required Parameters
```json
{
  "filters": {
    "reportDate": "2025-03-31"
  }
}
```

**Note:** Only `reportDate` is used. Other filter fields (e.g. `item_name`) are not applied by the API.

## Response

### Success Response (200 OK)
```json
{
  "result": "http://localhost:5000/public/reports/Flitch/flitch_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Flitch daily report generated successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No flitching data found for the selected date"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title
Merged across 10 columns. Displays the report date.

**Format:** `Flitch Details Report Date: DD/MM/YYYY`  
**Example:** `Flitch Details Report Date: 31/03/2025`

### Row 2: Empty (spacing)

### Row 3: Main Data Headers (10 columns)

| # | Header         | Description |
|---|----------------|-------------|
| 1 | Inward Id      | Inward SR number from flitch inventory invoice |
| 2 | Supplier Name  | Supplier from invoice details |
| 3 | Item Name      | Wood type (e.g., RED OAK, TEAK) |
| 4 | Flitch No      | Individual flitch identifier |
| 5 | Flitch Length  | Length (meters) |
| 6 | Width1         | First width (meters) |
| 7 | Width2         | Second width (meters) |
| 8 | Width3         | Third width (meters) |
| 9 | Height         | Height/thickness (meters) |
| 10| Flitch CMT     | Flitch cubic measurement (CMT) |

### Data Rows: Grouping

- **Grouping:** Inward Id → Item Name → Flitch pieces (sorted).
- **Totals:** Per-item total row (grey background, bold “Total” in Item Name column); per-inward total row (“TOTAL &lt;Inward Id&gt;”, grey background).

### Summary Section (Summary 1)

After the main data, a summary table:

| Item Name | Supplier | Flitch CMT |
|-----------|----------|------------|
| RED OAK   | ABC Ltd  | 6.063      |
| **Total** |          | **6.063**  |
| …         | …        | …          |
| **Grand Total** |   | **…**  |

- One row per (Item Name, Supplier) with sum of Flitch CMT; item subtotals and grand total with grey background and bold.

## Report Features

- **Single-date filter**: Report for one specific day (by inward date).
- **Grouping**: Inward Id → Item Name → Flitch pieces.
- **Dimensions**: Flitch length, Width1–3, height; CMT per flitch.
- **Totals**: Per-item and per-inward total rows (grey background, bold).
- **Summary 1**: Item Name, Supplier, Flitch CMT with item and grand totals.
- **Numeric formatting**: CMT to 3 decimal places (0.000); dimensions to 2 (0.00).
- **Header styling**: Grey background (#D3D3D3) for header rows.

## Data Sources

### Source: Flitch Inventory View

- **flitch_inventory_items_view** (or equivalent view model: `flitch_inventory_items_view_model`)
- Uses: flitch inventory records with joined **flitch invoice details** (inward date, inward_sr_no, supplier_details).
- Key fields: `item_name`, `flitch_code` / `flitch_id`, `length`, `width1`, `width2`, `width3`, `height`, `flitch_cmt`, `flitch_invoice_details.inward_date`, `flitch_invoice_details.inward_sr_no`, `flitch_invoice_details.supplier_details`.

### Date Filter

- Records are included where **flitch_invoice_details.inward_date** is on the selected report date (00:00:00–23:59:59) and `deleted_at` is null.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-flitch-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "filters": {
      "reportDate": "2025-03-31"
    }
  }'
```

### Using JavaScript (Axios)
```javascript
const response = await axios.post(
  '/api/V1/report/download-excel-flitch-daily-report',
  { filters: { reportDate: '2025-03-31' } },
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const downloadUrl = response.data.result;
window.open(downloadUrl, '_blank');
```

## Notes

- Only **inward date** is used; the report shows flitch records whose invoice inward date falls on the given day.
- CMT: 3 decimal places; dimensions: 2 decimal places.
- Files are timestamped and stored in `public/reports/Flitch/`.

## File Storage

**Directory**: `public/reports/Flitch/`

**Filename Pattern**: `flitch_daily_report_{timestamp}.xlsx`

**Example**: `flitch_daily_report_1738234567890.xlsx`

## Report Example Structure

```
Flitch Details Report Date: 31/03/2025

Inward Id | Supplier Name | Item Name | Flitch No | Flitch Length | Width1 | Width2 | Width3 | Height | Flitch CMT
INV-001   | ABC Ltd       | RED OAK   | F001      | 3.20          | 0.19   | 0.44   | 0.20   | 0.39   | 0.433
          |               |           | F002      | 3.30          | 0.19   | 0.43   | 0.21   | 0.43   | 0.479
          |               | Total     |           |               |        |        |        |        | 0.912
TOTAL INV-001             |           |           |               |        |        |        |        | 0.912

Summary 1
Item Name | Supplier | Flitch CMT
RED OAK   | ABC Ltd  | 0.912
Total     |          | 0.912
Grand Total |        | 0.912
```

## Troubleshooting

- **404 No data:** Ensure the date is YYYY-MM-DD and that flitch inventory records exist with **inward date** on that day (`flitch_invoice_details.inward_date`). Check `deleted_at` is null.
- **400 Report date required:** Send `filters.reportDate` in the request body.

## Technical Implementation

| Purpose   | Path |
|----------|------|
| Controller | `topl_backend/controllers/reports2/Flitch/flitchDailyReport.js` |
| Excel generator | `topl_backend/config/downloadExcel/reports2/Flitch/flitchDailyReport.js` |
| Routes | `topl_backend/routes/report/reports2/Flitch/flitch.routes.js` |

### Data pipeline

Data is read from **flitch_inventory_items_view_model** with:

- **Match:** `flitch_invoice_details.inward_date` within the report date (start/end of day), and `deleted_at: null`.
- **Sort:** `item_name`, `log_no`.
