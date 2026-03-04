# Fleece Paper Inventory Stock Report Generator - Implementation Plan

## Objective

Build a **dynamic report generation system** that creates fleece paper inventory stock reports for any given date range. The report calculates opening stock, receives, consumption, sales, and closing stock with proper grouping by fleece paper sub-type, thickness, and size.

## Implementation Approach

The system follows the same pattern as plywood stock reports but adapted for fleece paper inventory tracking rolls instead of sheets.

### Report Structure (Dynamic - Data from Database)

- **Period**: User-specified date range (e.g., 01/05/2025 to 28/05/2025)
- **Data Source**: Real-time queries from MongoDB fleece inventory collections
- **Categories**: Dynamically grouped by `item_sub_category_name` (e.g., Imported, Local, etc.)
- **Columns**: 
  1. **Fleece Paper Sub Type** - from database
  2. **Thickness** - from database
  3. **Size** - calculated (length X width)
  4. **Opening** - calculated from date range (rolls)
  5. **Op Metres** - calculated square meters
  6. **Receive** - aggregated from inward data (rolls)
  7. **Rec Mtrs** - aggregated square meters
  8. **Consume** - aggregated from history (rolls)
  9. **Cons Mtrs** - aggregated square meters
  10. **Sales** - aggregated from challan history (rolls)
  11. **Sales Mtrs** - aggregated square meters
  12. **Issue For Rec/Pressing Roll** - aggregated from pressing (rolls)
  13. **Issue For Rec/Pressing Sq Met** - aggregated square meters
  14. **Closing** - calculated (Opening + Receive - Consume - Sales) (rolls)
  15. **Cl Metres** - calculated closing square meters

## Implementation Files

### 1. Excel Generator Function

**File**: `topl_backend/config/downloadExcel/Logs/Inventory/fleece/fleece.js`

**Function**: `createFleeceStockReportExcel(aggregatedData, startDate, endDate, filters = {})`

**Processing Logic**:
- Accept pre-calculated aggregated data from controller
- Sort data by: item_sub_category_name → thickness → size (length x width)
- Create worksheet with 15 columns
- Insert data rows grouped by fleece paper sub-type
- Insert "Total" rows after each thickness group
- Insert category totals after each sub-type
- Insert grand total row at the end
- Apply Excel formatting (bold headers, bold totals)
- Save to timestamped file
- Return download URL

### 2. Controller Function

**File**: `topl_backend/controllers/inventory/fleece/fleece.controller.js`

**Function**: `fleeceStockReportCsv`

**Request Body**:
```javascript
{
  "startDate": "2025-05-01",  // required - period start date
  "endDate": "2025-05-28",    // required - period end date
  "filter": {                  // optional - filter by category
    "item_sub_category_name": "IMPORTED"
  }
}
```

**Processing Steps**:
1. **Validate Parameters**: Check startDate and endDate are valid
2. **Build Aggregation Pipeline**:
   - Get all unique fleece items (group by: item_sub_category_name, thickness, length, width)
   - For each unique combination, calculate:
     - **Opening Stock**: Query items at startDate
     - **Receives**: Sum inward_date between startDate and endDate
     - **Consumption**: Sum from fleece_history where issue_status in ['order', 'pressing']
     - **Sales**: Sum from fleece_history where issue_status = 'challan'
     - **Issue for Pressing**: Sum from fleece_history where issue_status = 'pressing'
     - **Closing Stock**: Opening + Receive - Consume - Sales
3. **Execute Aggregation**: Get results from MongoDB
4. **Format Data**: Structure for Excel generator
5. **Generate Excel**: Call `createFleeceStockReportExcel()`
6. **Return Response**: ApiResponse with download URL

### 3. API Route

**File**: `topl_backend/routes/inventory/fleece/fleece.routes.js`

**Route Definition**:
```javascript
fleece_router.post(
  '/download-stock-report-fleece',
  AuthMiddleware,
  RolesPermissions('fleece_paper_inventory', 'view'),
  fleeceStockReportCsv
);
```

**API Endpoint**: `POST /fleece-inventory/download-stock-report-fleece`

## Detailed Data Aggregation Logic

### Database Schema Understanding

**Collections Involved:**
1. `fleece_inventory_items_details` - Main inventory items with current stock
2. `fleece_inventory_invoice_details` - Invoice/inward details
3. `fleece_history_details` - Transaction history (issues for orders, challan, pressing)

**Key Fields from Schema:**
- `item_sub_category_name` - Maps to "Fleece Paper Sub Type"
- `thickness`, `length`, `width` - Dimensions
- `number_of_roll`, `available_number_of_roll` - Quantity tracking
- `total_sq_meter`, `available_sqm` - Area tracking
- `fleece_history_details.issue_status` - Types: 'order', 'pressing', 'challan'
- `fleece_history_details.issued_number_of_roll` - Quantities issued
- `fleece_history_details.issued_sqm` - Area issued

### Stock Calculation Methodology

**IMPORTANT**: All calculations maintain BOTH units (Rolls AND Square Meters) in parallel.

#### Opening Stock (at startDate)

**For Rolls:**
```
Opening Rolls = Current Available Rolls + (Consumed + Sold) Rolls - Received Rolls
```

**For Square Meters:**
```
Opening Sqm = Current Available Sqm + (Consumed + Sold) Sqm - Received Sqm
```

#### Receives (during period)

```
Items where inward_date >= startDate AND inward_date <= endDate
Group by: item_sub_category_name, thickness, size (length x width)

Rolls: SUM(number_of_roll)
Square Meters: SUM(total_sq_meter)  ← Uses database meter field
```

#### Consumption

```
From fleece_history_details where:
  - issue_status = 'order' OR 'pressing'
  - createdAt >= startDate AND createdAt <= endDate
Group by linked fleece item's sub_category, thickness, size

Rolls: SUM(issued_number_of_roll)
Square Meters: SUM(issued_sqm)  ← Uses database meter field
```

#### Sales

```
From fleece_history_details where:
  - issue_status = 'challan'
  - createdAt >= startDate AND createdAt <= endDate
Group by linked fleece item's sub_category, thickness, size

Rolls: SUM(issued_number_of_roll)
Square Meters: SUM(issued_sqm)  ← Uses database meter field
```

#### Issue For Rec/Pressing

```
From fleece_history_details where:
  - issue_status = 'pressing'
  - createdAt >= startDate AND createdAt <= endDate
Group by linked fleece item's sub_category, thickness, size

Rolls: SUM(issued_number_of_roll)
Square Meters: SUM(issued_sqm)  ← Uses database meter field
```

#### Closing Stock

**For Rolls:**
```
Closing Rolls = Opening Rolls + Received Rolls - Consumed Rolls - Sales Rolls
```

**For Square Meters:**
```
Closing Sqm = Opening Sqm + Received Sqm - Consumed Sqm - Sales Sqm
```

**Critical Note**: All square meter calculations use direct database fields:
- `fleece_inventory_items_details.total_sq_meter` for inventory area
- `fleece_inventory_items_details.available_sqm` for current available area
- `fleece_history_details.issued_sqm` for issued area

These values are aggregated using MongoDB's `$sum` operator to ensure accurate meter-based calculations.

## Excel/CSV Report Structure

### Column Definitions

1. **Fleece Paper Sub Type** - Category from `item_sub_category_name`
2. **Thickness** - In mm (from `thickness`)
3. **Size** - Format: "length X width" (e.g., "2.44 X 1.22")
4. **Opening** - Opening stock in rolls
5. **Op Metres** - Opening stock in square meters
6. **Receive** - Items received in period (rolls)
7. **Rec Mtrs** - Items received in period (sq meters)
8. **Consume** - Items consumed in period (rolls)
9. **Cons Mtrs** - Items consumed in period (sq meters)
10. **Sales** - Items sold in period (rolls)
11. **Sales Mtrs** - Items sold in period (sq meters)
12. **Issue For Rec/Pressing Roll** - Items issued for pressing (rolls)
13. **Issue For Rec/Pressing Sq Met** - Items issued for pressing (sq meters)
14. **Closing** - Closing stock in rolls
15. **Cl Metres** - Closing stock in square meters

### Row Hierarchy

```
Row 1: Fleece Paper Type [ IMPORTED ]   stock  in the period  01/05/2025 and 28/05/2025    [Title - Merged Cell, Bold]
Row 2: [Empty Row - Spacing]
Row 3: [Column Headers - Bold with Gray Background]

IMPORTED
  0.5  2.44 X 0.92    [data...]
       2.44 X 1.22    [data...]
       Total          [subtotal for thickness 0.5]
  1.0  2.14 X 0.92    [data...]
       Total          [subtotal for thickness 1.0]
  
LOCAL
  0.5  2.44 X 1.22    [data...]
       Total          [subtotal]
  
Total                 [grand total row]
```

## Implementation Status

✅ **COMPLETED** - All components have been implemented:

1. ✅ Excel Generator Function - `createFleeceStockReportExcel()` in `fleece.js`
2. ✅ Controller Method - `fleeceStockReportCsv()` in `fleece.controller.js`
3. ✅ API Route - `POST /download-stock-report-fleece` in `fleece.routes.js`
4. ✅ Documentation - API documentation created

The feature is now ready for testing and deployment!
