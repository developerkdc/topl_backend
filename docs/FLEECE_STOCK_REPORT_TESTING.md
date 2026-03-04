# Fleece Paper Stock Report - Testing & Verification Guide

## Testing Overview

This document outlines the testing strategy and verification steps for the Fleece Paper Stock Report feature.

## Testing Checklist

### 1. API Endpoint Testing

#### Basic Request Test
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-05-01",
    "endDate": "2025-05-28"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Stock report generated successfully",
  "data": "http://localhost:5000/public/upload/reports/inventory/fleecePaper/Fleece-Paper-Stock-Report-1234567890.xlsx"
}
```

#### With Filter Test
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-05-01",
    "endDate": "2025-05-28",
    "filter": {
      "item_sub_category_name": "IMPORTED"
    }
  }'
```

### 2. Validation Testing

#### Missing Date Parameters
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{}'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date and end date are required"
}
```

#### Invalid Date Format
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "invalid-date",
    "endDate": "2025-05-28"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Invalid date format"
}
```

#### Start Date After End Date
```bash
curl -X POST http://localhost:5000/fleece-inventory/download-stock-report-fleece \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-06-01",
    "endDate": "2025-05-01"
  }'
```

**Expected Response:**
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Start date cannot be after end date"
}
```

### 3. Excel Report Verification

When you open the generated Excel file, verify:

#### Row 1: Title Row
- **Format**: `Fleece Paper Type [ CATEGORY ]   stock  in the period  DD/MM/YYYY and DD/MM/YYYY`
- **Styling**: Bold, merged across all 15 columns, left-aligned
- **Examples**:
  - With filter: `Fleece Paper Type [ IMPORTED ]   stock  in the period  01/05/2025 and 28/05/2025`
  - Without filter: `Fleece Paper Type [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025`

#### Row 2: Empty Row
- Should be blank for spacing

#### Row 3: Header Row
- **Columns** (15 total):
  1. Fleece Paper Sub Type
  2. Thickness
  3. Size
  4. Opening
  5. Op Metres
  6. Receive
  7. Rec Mtrs
  8. Consume
  9. Cons Mtrs
  10. Sales
  11. Sales Mtrs
  12. Issue For Rec/Pressing Roll
  13. Issue For Rec/Pressing Sq Met
  14. Closing
  15. Cl Metres
- **Styling**: Bold, centered, gray background (#D3D3D3)

#### Data Rows
- Grouped by: Sub Type → Thickness → Size
- All numeric values should be >= 0
- Subtotal rows after each thickness group (bold)
- Grand total row at bottom (bold, gray background)

### 4. Stock Calculation Verification

#### Manual Verification Formula
For any item in the report, verify:

```
Opening Rolls + Receive Rolls - Consume Rolls - Sales Rolls = Closing Rolls
Opening Sqm + Receive Sqm - Consume Sqm - Sales Sqm = Closing Sqm
```

#### Sample Verification
Pick a random item from the report and verify:
1. Check opening stock calculation
2. Verify receives match database records
3. Verify consumption includes 'order' and 'pressing' statuses
4. Verify sales match 'challan' status
5. Verify closing stock calculation

### 5. Backend Console Logs

Check for these logs in the backend console:

```
Fleece Stock Report Request - Start Date: 2025-05-01
Fleece Stock Report Request - End Date: 2025-05-28
Fleece Stock Report Request - Filter: { item_sub_category_name: 'IMPORTED' }
Generated fleece stock report title: Fleece Paper Type [ IMPORTED ]   stock  in the period  01/05/2025 and 28/05/2025
Fleece stock report generated =>  http://localhost:5000/public/upload/reports/inventory/fleecePaper/Fleece-Paper-Stock-Report-1234567890.xlsx
```

### 6. Database Queries Verification

Verify the following aggregations are working correctly:

#### Current Inventory Query
```javascript
// Should group by item_sub_category_name, thickness, length, width
// Should sum available_number_of_roll and available_sqm
```

#### Receives Query
```javascript
// Should join with fleece_inventory_invoice_details
// Should filter by inward_date between startDate and endDate
// Should sum number_of_roll and total_sq_meter
```

#### Consumption Query
```javascript
// Should filter issue_status in ['order', 'pressing']
// Should filter createdAt between startDate and endDate
// Should sum issued_number_of_roll and issued_sqm
```

#### Sales Query
```javascript
// Should filter issue_status = 'challan'
// Should filter createdAt between startDate and endDate
// Should sum issued_number_of_roll and issued_sqm
```

#### Pressing Query
```javascript
// Should filter issue_status = 'pressing'
// Should filter createdAt between startDate and endDate
// Should sum issued_number_of_roll and issued_sqm
```

### 7. Edge Cases Testing

#### Empty Data Period
Test with a date range that has no inventory activity:
```json
{
  "startDate": "2020-01-01",
  "endDate": "2020-01-02"
}
```

**Expected Response:**
```json
{
  "statusCode": 404,
  "status": "No stock data found for the selected period"
}
```

#### Single Item
Test with a very narrow filter that returns only one item

#### Multiple Sub-Categories
Test without filter to ensure all categories are included and properly grouped

### 8. Performance Testing

#### Large Date Range
Test with a full year range:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-12-31"
}
```

Monitor:
- Response time
- Database query performance
- Excel file generation time

### 9. Authorization Testing

#### Without Authentication
Test without Authorization header:

**Expected Response:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

#### Without Permission
Test with user who doesn't have `fleece_paper_inventory` view permission:

**Expected Response:**
```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### 10. File System Verification

Check that files are created correctly:

1. **Folder**: `public/upload/reports/inventory/fleecePaper/`
2. **File naming**: `Fleece-Paper-Stock-Report-{timestamp}.xlsx`
3. **File accessibility**: URL should be accessible
4. **File cleanup**: Old files should be managed appropriately

## Common Issues & Solutions

### Issue 1: Dates Not Showing in Title
**Symptom**: Title shows "N/A and N/A"

**Solution**:
- Check if request body contains startDate and endDate
- Ensure date format is "YYYY-MM-DD"
- Check backend logs for actual values received

### Issue 2: Wrong Stock Calculations
**Symptom**: Opening + Receive - Consume - Sales ≠ Closing

**Solution**:
- Verify database field mappings
- Check if all issue_status values are correctly filtered
- Ensure date ranges are properly applied

### Issue 3: Missing Items in Report
**Symptom**: Some items not appearing in the report

**Solution**:
- Check if items have activity (non-zero values)
- Verify filter conditions
- Check if items have deleted_at = null

### Issue 4: Excel File Not Opening
**Symptom**: Downloaded file is corrupted

**Solution**:
- Check server logs for errors during Excel generation
- Verify folder permissions for write access
- Ensure exceljs package is properly installed

## Success Criteria

- ✅ API responds with 200 status code for valid requests
- ✅ API responds with appropriate error codes for invalid requests
- ✅ Excel file is generated and accessible via URL
- ✅ Title row displays correct filter and date range
- ✅ All 15 columns are present with correct headers
- ✅ Data is grouped hierarchically (Sub Type → Thickness → Size)
- ✅ Stock calculations are mathematically correct
- ✅ Subtotals and grand totals match detail rows
- ✅ Both rolls and square meters are tracked accurately
- ✅ Authentication and permissions are enforced
- ✅ Console logs provide useful debugging information

## Frontend Integration Test

If testing from frontend:

```javascript
const testFleeceStockReport = async () => {
  const requestData = {
    startDate: '2025-05-01',
    endDate: '2025-05-28',
    filter: {
      item_sub_category_name: 'IMPORTED' // Optional
    }
  };

  console.log('Sending request:', requestData);

  try {
    const response = await axios.post(
      '/fleece-inventory/download-stock-report-fleece',
      requestData
    );

    console.log('Response:', response.data);
    console.log('Download URL:', response.data.data);

    // Open file
    window.open(response.data.data, '_blank');
  } catch (error) {
    console.error('Error:', error.response?.data || error);
  }
};
```

## Meter-Based Calculations Verification

**All square meter calculations use these database fields:**

### Inventory Square Meters
- `fleece_inventory_items_details.total_sq_meter` - Square meter area
- `fleece_inventory_items_details.available_sqm` - Available square meters

### Transaction Square Meters
- `fleece_history_details.issued_sqm` - Square meters issued

### Calculation Formula Verification
```
Opening Sqm = Current Sqm + (Consumed Sqm + Sales Sqm) - Received Sqm
Closing Sqm = Opening Sqm + Received Sqm - Consumed Sqm - Sales Sqm
```

**MongoDB Aggregation**: Verify that `$sum` operator is used on these fields for accurate area calculations.

## Test Report Template

After testing, document results:

```
Test Date: [DATE]
Tester: [NAME]
Environment: [DEV/STAGING/PRODUCTION]

API Endpoint Tests:
  [ ] Basic request - PASS/FAIL
  [ ] With filter - PASS/FAIL
  [ ] Missing dates - PASS/FAIL
  [ ] Invalid dates - PASS/FAIL
  [ ] Date validation - PASS/FAIL

Excel Report Tests:
  [ ] Title row format - PASS/FAIL
  [ ] Header row - PASS/FAIL
  [ ] Data grouping - PASS/FAIL
  [ ] Subtotals - PASS/FAIL
  [ ] Grand total - PASS/FAIL

Calculation Tests:
  [ ] Opening stock - PASS/FAIL
  [ ] Receives - PASS/FAIL
  [ ] Consumption - PASS/FAIL
  [ ] Sales - PASS/FAIL
  [ ] Closing stock - PASS/FAIL

Issues Found: [LIST ANY ISSUES]
Notes: [ANY ADDITIONAL NOTES]
```
