# Fleece Paper Stock Report API

## Overview
The Fleece Paper Stock Report API generates dynamic inventory reports with opening stock, receives, consumption, sales, and closing stock calculations for any given date range.

## Endpoint
```
POST /fleece-inventory/download-stock-report-fleece
```

## Authentication
- Requires: `AuthMiddleware`
- Permission: `fleece_paper_inventory` with `view` access

## Request Body

### Required Parameters
```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28"
}
```

### Optional Parameters
```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28",
  "filter": {
    "item_sub_category_name": "IMPORTED"
  }
}
```

## Response

### Success Response (200 OK)
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Stock report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/inventory/fleecePaper/Fleece-Paper-Stock-Report-1706432891234.xlsx"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

#### 404 Not Found
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No stock data found for the selected period"
}
```

## Report Structure

The generated Excel report has the following structure:

### Row 1: Report Title with Filters
Displays a descriptive title with applied filters in a merged cell.

**Format:**
```
Fleece Paper Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

**Examples:**

**With specific category:**
```
Fleece Paper Type [ IMPORTED ]   stock  in the period  01/05/2025 and 28/05/2025
```

**Without category filter (all types):**
```
Fleece Paper Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025
```

### Row 2: Empty (spacing)

### Row 3 onwards: Data Table

The data table contains the following columns:

1. **Fleece Paper Sub Type** - Category (e.g., IMPORTED, LOCAL, etc.)
2. **Thickness** - Thickness in mm
3. **Size** - Dimensions (e.g., "2.44 X 1.22")
4. **Opening** - Opening stock (rolls)
5. **Op Metres** - Opening stock (square meters)
6. **Receive** - Items received during period (rolls)
7. **Rec Mtrs** - Items received (square meters)
8. **Consume** - Items consumed during period (rolls)
9. **Cons Mtrs** - Items consumed (square meters)
10. **Sales** - Items sold during period (rolls)
11. **Sales Mtrs** - Items sold (square meters)
12. **Issue For Rec/Pressing Roll** - Items issued for pressing (rolls)
13. **Issue For Rec/Pressing Sq Met** - Items issued for pressing (square meters)
14. **Closing** - Closing stock (rolls)
15. **Cl Metres** - Closing stock (square meters)

## Report Features

- **Filter Information Row**: First row displays all applied filters (date range, category, etc.)
- **Hierarchical Grouping**: Data is grouped by Fleece Paper Sub Type → Thickness → Size
- **Subtotals**: Automatic subtotals after each thickness group
- **Grand Total**: Overall totals across all categories
- **Bold Formatting**: Headers, filter info, and total rows are bold for easy reading
- **Visual Styling**: Header row has gray background for better visibility

## Stock Calculation Logic

**All calculations are performed in TWO units:**
- **Rolls** (quantity count)
- **Square Meters** (area measurement)

### Database Fields Used

**Square Meters (Meters-based):**
- `total_sq_meter` - Square meter area per item in inventory
- `available_sqm` - Available square meters in current stock
- `issued_sqm` - Square meters issued in transactions

**Rolls:**
- `number_of_roll` - Number of rolls per item
- `available_number_of_roll` - Available rolls count
- `issued_number_of_roll` - Rolls issued in transactions

### Calculation Formulas

#### Opening Stock
```
Opening Rolls = Current Available Rolls + (Consumed + Sold) Rolls - Received Rolls
Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm
```

#### Receives (during period)
Items added to inventory where `inward_date` is between startDate and endDate
```
Received Rolls = SUM(number_of_roll)
Received Sqm = SUM(total_sq_meter)
```

#### Consumption
Issues from fleece history where `issue_status` in ['order', 'pressing'] and date within period
```
Consumed Rolls = SUM(issued_number_of_roll)
Consumed Sqm = SUM(issued_sqm)
```

#### Sales
Issues from fleece history where `issue_status` = 'challan' and date within period
```
Sales Rolls = SUM(issued_number_of_roll)
Sales Sqm = SUM(issued_sqm)
```

#### Issue for Recalibration/Pressing
Issues from fleece history where `issue_status` = 'pressing' and date within period
```
Issue Pressing Rolls = SUM(issued_number_of_roll)
Issue Pressing Sqm = SUM(issued_sqm)
```

#### Closing Stock
```
Closing Rolls = Opening Rolls + Received Rolls - Consumed Rolls - Sales Rolls
Closing Sqm = Opening Sqm + Received Sqm - Consumed Sqm - Sales Sqm
```

**Important**: All square meter (Sqm) values are directly sourced from database fields (`total_sq_meter`, `issued_sqm`) and aggregated using MongoDB's `$sum` operator. The calculations ensure accurate area measurements in square meters.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "startDate": "2025-05-01",
    "endDate": "2025-05-28"
  }'
```

### Using JavaScript (Axios)
```javascript
import axios from 'axios';

const generateStockReport = async () => {
  try {
    const response = await axios.post(
      '/fleece-inventory/download-stock-report-fleece',
      {
        startDate: '2025-05-01',
        endDate: '2025-05-28',
        filter: {
          item_sub_category_name: 'IMPORTED' // Optional
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Download URL
    const downloadUrl = response.data.data;
    console.log('Download report from:', downloadUrl);
    
    // Open in new window
    window.open(downloadUrl, '_blank');
  } catch (error) {
    console.error('Error generating report:', error);
  }
};
```

## Database Collections Used

1. **fleece_inventory_items_view_modal** - Current inventory data
2. **fleece_inventory_items_modal** - Item details (used for receives calculation)
3. **fleece_inventory_invoice_details** - Inward/invoice information
4. **fleece_history_details** - Transaction history

## Notes

- The report only includes items with activity during the period (non-zero values)
- All stock values are non-negative (Math.max(0, value))
- Excel files are timestamped to prevent overwrites
- Files are stored in: `public/upload/reports/inventory/fleecePaper/`
