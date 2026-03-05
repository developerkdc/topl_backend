# Other Goods Inventory Stock Report Generator - Implementation Plan

## Objective

Build a **dynamic report generation system** that creates Other Goods inventory stock reports for any given date range. The report calculates opening stock, receives, consumption, sales, and closing stock with proper grouping by item name and item description.

## Discovery: Existing Export Functionality

The TOPL system already has built-in Other Goods inventory export functionality:

**Backend API Endpoints:**

- `POST /other-goods-inventory/download-excel-othergoods-logs` - exports current inventory data
- `POST /other-goods-inventory/download-excel-othergoods-history` - exports historical data

**Implementation Files:**

- Controller: `topl_backend/controllers/inventory/otherGoods/otherGoods.js`
- Excel Generator: `topl_backend/config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js`
- Routes: `topl_backend/routes/inventory/otherGoods/otherGoods.routes.js`

## Implementation Approach

Following the same pattern as the plywood stock report, we've created a **custom stock report export** that generates dynamic reports from the database.

### Report Structure (Dynamic - Data from Database)

- **Period**: User-specified date range (e.g., 01/05/2025 to 28/05/2025)
- **Data Source**: Real-time queries from MongoDB Other Goods inventory collections
- **Grouping**: Dynamically grouped by `item_name` and `item_sub_category_name`
- **Columns**: 
  1. **Item Name** - from database
  2. **Item Sub Category** - from database
  3. **Opening (Qty)** - calculated from date range
  4. **Opening (Amount)** - calculated amount
  5. **Receive (Qty)** - aggregated from inward data
  6. **Receive (Amount)** - aggregated amount
  7. **Consume (Qty)** - aggregated from history (order status)
  8. **Consume (Amount)** - aggregated amount
  9. **Sales (Qty)** - aggregated from history (challan status)
  10. **Sales (Amount)** - aggregated amount
  11. **Closing (Qty)** - calculated (Opening + Receive - Consume - Sales)
  12. **Closing (Amount)** - calculated closing amount

### Implementation Steps

#### 1. Create Stock Report Excel Generator

Added a new export function in `topl_backend/config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js`:

**Function Signature**: 

```javascript
export const createOtherGoodsStockReportExcel = async (aggregatedData, startDate, endDate, filters)
```

**Processing Logic**:

- Accept pre-calculated aggregated data from controller
- Sort data by: item_name → item_description
- Create worksheet with 12 columns
- Insert data rows grouped by item name
- Insert "Total" rows after each item name group
- Insert grand total row at the end
- Apply Excel formatting (bold headers, bold totals)
- Save to timestamped file
- Return download URL

#### 2. Add Controller Method

Added to `topl_backend/controllers/inventory/otherGoods/otherGoods.js`:

**Function**: `export const otherGoodsStockReportCsv = catchAsync(async (req, res, next) => {...})`

**Request Body**:

```javascript
{
  "startDate": "2025-05-01",  // required - period start date
  "endDate": "2025-05-28",    // required - period end date
  "filter": {                  // optional - filter by item name
    "item_name": "ITEM_NAME_HERE"
  }
}
```

**Processing Steps**:

1. **Validate Parameters**: Check startDate and endDate are valid
2. **Build Aggregation Pipeline**:
   - Get all unique other goods items (group by: item_name, item_description)
   - For each unique combination, calculate:
     - **Opening Stock**: Query items at startDate
     - **Receives**: Sum where invoice.inward_date between startDate and endDate
     - **Consumption**: Sum from other_goods_history where issue_status = 'order'
     - **Sales**: Sum from other_goods_history where issue_status = 'challan'
     - **Closing Stock**: Opening + Receive - Consume - Sales
3. **Execute Aggregation**: Get results from MongoDB
4. **Format Data**: Structure for Excel generator
5. **Generate Excel**: Call `createOtherGoodsStockReportExcel()`
6. **Return Response**: ApiResponse with download URL

#### 3. Add API Route

Added to `topl_backend/routes/inventory/otherGoods/otherGoods.routes.js`:

**Route Definition**:

```javascript
router.post(
  '/download-stock-report-othergoods',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  otherGoodsStockReportCsv
);
```

**API Endpoint**: `POST /other-goods-inventory/download-stock-report-othergoods`

**Request Example**:

```json
{
  "startDate": "2025-05-01",
  "endDate": "2025-05-28"
}
```

**Response Example**:

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Stock report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/inventory/othergoods/OtherGoods-Stock-Report-1234567890.xlsx"
}
```

#### 4. Excel Output Structure

```
Row 1: Title (merged) - "Other Goods [ FILTER ] stock in the period DD/MM/YYYY and DD/MM/YYYY"
Row 2: Empty
Row 3: Headers (bold, gray) - Item Name, Item Description, Opening (Qty), Opening (Amount), ...
Row 4+: Data rows with totals
```

## Detailed Data Aggregation Logic

### Database Schema Understanding

**Collections Involved:**

1. `othergoods_inventory_items_details` - Main inventory items with current stock
2. `othergoods_inventory_invoice_details` - Invoice/inward details
3. `other_goods_history_details` - Transaction history (issues for orders, challan)
4. `othergoods_inventory_items_view` - View with joins for efficient querying

**Key Fields from Schema:**

- `item_name` - Name of the item
- `item_sub_category_name` - Sub category of the item
- `total_quantity`, `available_quantity` - Quantity tracking
- `amount`, `available_amount` - Amount tracking
- `other_goods_history_details.issue_status` - Types: 'order', 'challan'
- `other_goods_history_details.issued_quantity` - Quantities issued
- `other_goods_history_details.issued_amount` - Amounts issued

### Stock Calculation Methodology

**IMPORTANT**: All calculations maintain BOTH quantity AND amount in parallel.

#### Opening Stock (at startDate)

**For Quantity:**
```
Opening Quantity = Current Available Quantity + (Consumed + Sold) Quantity - Received Quantity
```

**For Amount:**
```
Opening Amount = Current Available Amount + (Consumed + Sold) Amount - Received Amount
```

#### Receives (during period)

```
Items where inward_date >= startDate AND inward_date <= endDate
Group by: item_name, item_sub_category_name

Quantity: SUM(total_quantity)
Amount: SUM(amount)
```

#### Consumption

```
From other_goods_history_details where:
  - issue_status = 'order'
  - createdAt >= startDate AND createdAt <= endDate
Group by linked item's name and sub category

Quantity: SUM(issued_quantity)
Amount: SUM(issued_amount)
```

#### Sales

```
From other_goods_history_details where:
  - issue_status = 'challan'
  - createdAt >= startDate AND createdAt <= endDate
Group by linked item's name and sub category

Quantity: SUM(issued_quantity)
Amount: SUM(issued_amount)
```

#### Closing Stock

**For Quantity:**
```
Closing Quantity = Opening Quantity + Received Quantity - Consumed Quantity - Sales Quantity
```

**For Amount:**
```
Closing Amount = Opening Amount + Received Amount - Consumed Amount - Sales Amount
```

**Critical Note**: All calculations use direct database fields:
- `othergoods_inventory_items_details.total_quantity` for inventory quantity
- `othergoods_inventory_items_details.available_quantity` for current available quantity
- `other_goods_history_details.issued_quantity` for issued quantity
- `othergoods_inventory_items_details.amount` for inventory amount
- `othergoods_inventory_items_details.available_amount` for current available amount
- `other_goods_history_details.issued_amount` for issued amount

These values are aggregated using MongoDB's `$sum` operator to ensure accurate calculations.

### MongoDB Aggregation Pipeline Structure

**Step 1: Get all unique other goods item configurations**

```javascript
// Group by item_name, item_sub_category_name
// This gives us all unique combinations that exist in inventory
```

**Step 2: Calculate Opening Stock**

```javascript
// For each configuration:
// - Get current available_quantity and available_amount
// - Look up history transactions after startDate
// - Add back issued quantities/amounts, subtract receives
```

**Step 3: Calculate Period Transactions**

```javascript
// Join with other_goods_history_details
// Filter by date range
// Aggregate by transaction type (issue_status)
// Group by item configuration
```

**Step 4: Calculate Totals and Subtotals**

```javascript
// Group by item_name
// Calculate subtotals for each item name
// Calculate grand total
```

## Excel/CSV Report Structure

### Column Definitions

1. **Item Name** - From `item_name`
2. **Item Sub Category** - From `item_sub_category_name`
3. **Opening (Qty)** - Opening stock in quantity
4. **Opening (Amount)** - Opening stock in currency amount
5. **Receive (Qty)** - Items received in period (quantity)
6. **Receive (Amount)** - Items received in period (amount)
7. **Consume (Qty)** - Items consumed in period (quantity)
8. **Consume (Amount)** - Items consumed in period (amount)
9. **Sales (Qty)** - Items sold in period (quantity)
10. **Sales (Amount)** - Items sold in period (amount)
11. **Closing (Qty)** - Closing stock in quantity
12. **Closing (Amount)** - Closing stock in currency amount

### Row Hierarchy

```
Row 1: Other Goods [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025    [Title - Merged Cell, Bold]
Row 2: [Empty Row - Spacing]
Row 3: [Column Headers - Bold with Gray Background]

ITEM_NAME_1
  SubCategory_A    [data...]
  SubCategory_B    [data...]
  Total            [subtotal for ITEM_NAME_1]

ITEM_NAME_2
  SubCategory_A    [data...]
  Total            [subtotal for ITEM_NAME_2]
  
Total              [grand total row]
```

## Implementation Files Breakdown

### 1. Excel Generator Function

**File**: `topl_backend/config/downloadExcel/Logs/Inventory/OtherGoods/otherGoods.js`

**New Function**: `createOtherGoodsStockReportExcel(aggregatedData, startDate, endDate, filters)`

**Logic**:

- Create workbook with sheet name: "Other Goods Stock Report"
- Define 12 columns as per structure above
- Sort data by: item_name → item_sub_category_name
- Insert data rows with proper grouping
- Insert "Total" rows after each item name group
- Insert grand total at bottom
- Apply formatting (bold headers, subtotal rows)
- Save to: `public/upload/reports/inventory/othergoods/OtherGoods-Stock-Report-{timestamp}.xlsx`
- Return download URL

### 2. Controller Function

**File**: `topl_backend/controllers/inventory/otherGoods/otherGoods.js`

**New Function**: `otherGoodsStockReportCsv`

**Parameters**: 

- `req.body.startDate` (required)
- `req.body.endDate` (required)
- `req.body.filter` (optional - for item name filtering)

**Logic**:

1. Validate date parameters
2. Build aggregation pipeline for opening stock calculation
3. Build aggregation pipeline for period transactions
4. Combine data and calculate closing stock
5. Format data structure for Excel generator
6. Call `createOtherGoodsStockReportExcel()`
7. Return download link in ApiResponse

### 3. API Route

**File**: `topl_backend/routes/inventory/otherGoods/otherGoods.routes.js`

**New Route**:

```javascript
router.post(
  '/download-stock-report-othergoods',
  AuthMiddleware,
  RolesPermissions('other_goods_inventory', 'view'),
  otherGoodsStockReportCsv
);
```

## Testing Strategy

1. **Unit Tests**: Test aggregation logic with known data
2. **Date Range Tests**: Verify correct filtering by date
3. **Calculation Tests**: Verify opening + receive - consume - sales = closing
4. **Grouping Tests**: Verify proper grouping by item name and description
5. **Excel Format Tests**: Verify proper row hierarchy and totals
6. **Performance Tests**: Test with large date ranges
7. **Amount Tests**: Verify both quantity and amount are calculated correctly

## Frontend Integration (Optional)

If a frontend UI is needed:

- Add date range picker component
- Add item name filter input
- Add "Download Stock Report" button
- Call API: `POST /other-goods-inventory/download-stock-report-othergoods`
- Download generated Excel file

**Frontend File Location**: `topl_frontend/src/app/pages/Inventory/OtherGoods/`

## Deliverable

A new **dynamic stock report generation system** with the following capabilities:

### API Endpoint

- **Endpoint**: `POST /other-goods-inventory/download-stock-report-othergoods`
- **Authentication**: Required (AuthMiddleware + RolesPermissions)
- **Input**: Date range (startDate, endDate) + optional filters
- **Output**: Downloadable Excel file URL

### Report Features

- ✅ **Dynamic Data**: Pulls live data from Other Goods inventory database
- ✅ **Date Range Filtering**: Any custom period (e.g., 01/05/2025 to 28/05/2025)
- ✅ **Stock Calculations**: Opening, Receive, Consume, Sales, Closing
- ✅ **Dual Tracking**: Both Quantity and Amount for each metric
- ✅ **Hierarchical Grouping**: By item name → item sub category
- ✅ **Subtotals**: Automatic totals after each item name group
- ✅ **Grand Total**: Overall totals across all items
- ✅ **12 Columns**: Item Name, Item Sub Category, Opening Qty/Amount, Receive Qty/Amount, Consume Qty/Amount, Sales Qty/Amount, Closing Qty/Amount

### Format

- Excel (.xlsx) format with proper formatting
- Bold headers and total rows
- Professional layout matching the reference format
- Downloadable from public URL

### Data Flow

```
User Request → API Endpoint → Controller → MongoDB Aggregation → Excel Generator → Download URL
```

## Implementation Status

✅ **COMPLETED** - All components have been implemented:

1. ✅ Excel Generator Function - `createOtherGoodsStockReportExcel()` in `otherGoods.js`
2. ✅ Controller Method - `otherGoodsStockReportCsv()` in `otherGoods.js`
3. ✅ API Route - `POST /download-stock-report-othergoods` in `otherGoods.routes.js`
4. ✅ Documentation - API documentation created in `OTHER_GOODS_STOCK_REPORT_API.md`

The feature is now ready for testing and deployment!
