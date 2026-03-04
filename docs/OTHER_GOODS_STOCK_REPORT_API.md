# Other Goods Stock Report API

## Overview
The Other Goods Stock Report API generates dynamic inventory reports with opening stock, receives, consumption, sales, and closing stock calculations for any given date range.

## Endpoint
```
POST /other-goods-inventory/download-stock-report-othergoods
```

## Authentication
- Requires: `AuthMiddleware`
- Permission: `other_goods_inventory` with `view` access

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
    "item_name": "ITEM_NAME_HERE"
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
  "data": "http://localhost:5000/public/upload/reports/inventory/othergoods/OtherGoods-Stock-Report-1706432891234.xlsx"
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
Other Goods [ FILTER ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY
```

**Examples:**

**With specific item name:**
```
Other Goods [ ITEM_NAME ]   stock  in the period  01/05/2025 and 28/05/2025
```

**Without item name filter (all items):**
```
Other Goods [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025
```

### Row 2: Empty (spacing)

### Row 3 onwards: Data Table

The data table contains the following columns:

1. **Item Name** - Name of the item
2. **Item Sub Category** - Sub category of the item
3. **Opening (Qty)** - Opening stock (quantity)
4. **Opening (Amount)** - Opening stock (amount in currency)
5. **Receive (Qty)** - Items received during period (quantity)
6. **Receive (Amount)** - Items received (amount in currency)
7. **Consume (Qty)** - Items consumed during period (quantity)
8. **Consume (Amount)** - Items consumed (amount in currency)
9. **Sales (Qty)** - Items sold during period (quantity)
10. **Sales (Amount)** - Items sold (amount in currency)
11. **Closing (Qty)** - Closing stock (quantity)
12. **Closing (Amount)** - Closing stock (amount in currency)

## Report Features

- **Filter Information Row**: First row displays all applied filters (date range, item name, etc.)
- **Hierarchical Grouping**: Data is grouped by Item Name → Item Sub Category
- **Subtotals**: Automatic subtotals after each item name group
- **Grand Total**: Overall totals across all items
- **Bold Formatting**: Headers, filter info, and total rows are bold for easy reading
- **Visual Styling**: Header row has gray background for better visibility

## Stock Calculation Logic

**All calculations are performed in TWO metrics:**
- **Quantity** (count of items)
- **Amount** (monetary value in currency)

### Database Fields Used

**Quantity:**
- `total_quantity` - Quantity per item in inventory
- `available_quantity` - Available quantity in current stock
- `issued_quantity` - Quantity issued in transactions

**Amount:**
- `amount` - Amount per item
- `available_amount` - Available amount in current stock
- `issued_amount` - Amount issued in transactions

### Calculation Formulas

#### Opening Stock
```
Opening Quantity = Current Available Quantity + (Consumed + Sold) Quantity - Received Quantity
Opening Amount = Current Available Amount + (Consumed + Sold) Amount - Received Amount
```

#### Receives (during period)
Items added to inventory where `inward_date` is between startDate and endDate
```
Received Quantity = SUM(total_quantity)
Received Amount = SUM(amount)
```

#### Consumption
Issues from other goods history where `issue_status` = 'order' and date within period
```
Consumed Quantity = SUM(issued_quantity)
Consumed Amount = SUM(issued_amount)
```

#### Sales
Issues from other goods history where `issue_status` = 'challan' and date within period
```
Sales Quantity = SUM(issued_quantity)
Sales Amount = SUM(issued_amount)
```

#### Closing Stock
```
Closing Quantity = Opening Quantity + Received Quantity - Consumed Quantity - Sales Quantity
Closing Amount = Opening Amount + Received Amount - Consumed Amount - Sales Amount
```

**Important**: All calculations maintain both quantity and amount in parallel for accurate inventory and financial tracking.

## Example Usage

### Using cURL
```bash
curl -X POST http://localhost:5000/other-goods-inventory/download-stock-report-othergoods \
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
      '/other-goods-inventory/download-stock-report-othergoods',
      {
        startDate: '2025-05-01',
        endDate: '2025-05-28',
        filter: {
          item_name: 'ITEM_NAME_HERE' // Optional
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

1. **othergoods_inventory_items_view** - Current inventory data with joins
2. **othergoods_inventory_items_details** - Item details
3. **othergoods_inventory_invoice_details** - Inward/invoice information
4. **other_goods_history_details** - Transaction history

## Notes

- The report only includes items with activity during the period (non-zero values)
- All stock values are non-negative (Math.max(0, value))
- Excel files are timestamped to prevent overwrites
- Files are stored in: `public/upload/reports/inventory/othergoods/`
