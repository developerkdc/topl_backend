# Item Wise Inward Report - Testing Guide

## Overview
This document provides comprehensive testing procedures for the Item Wise Inward Report feature in the reports2 module.

## Prerequisites
- Backend server running on `http://localhost:5000`
- Valid authentication token
- Test data in the database (log inventory, crosscutting, flitching records)

## Test Cases

### 1. Basic Functionality Tests

#### Test 1.1: Generate Report with Date Range
**Request:**
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

**Expected Result:**
- Status: 200 OK
- Response contains download URL
- Excel file is generated with correct date range in title
- All 15 columns are present
- Data is sorted alphabetically by item name

#### Test 1.2: Generate Report with Item Filter
**Request:**
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31",
    "filter": {
      "item_name": "ASH"
    }
  }'
```

**Expected Result:**
- Status: 200 OK
- Title shows: "Inward Item Wise Stock Details [ ASH ] Between 01/03/2025 and 31/03/2025"
- Only ASH item data is included

#### Test 1.3: Generate Report for Large Date Range
**Request:**
```json
{
  "startDate": "2024-01-01",
  "endDate": "2025-12-31"
}
```

**Expected Result:**
- Report generates without timeout
- All items with activity in the 2-year period are included
- Performance is acceptable (< 30 seconds)

### 2. Validation Tests

#### Test 2.1: Missing Start Date
**Request:**
```json
{
  "endDate": "2025-03-31"
}
```

**Expected Result:**
- Status: 400 Bad Request
- Error: "Start date and end date are required"

#### Test 2.2: Missing End Date
**Request:**
```json
{
  "startDate": "2025-03-01"
}
```

**Expected Result:**
- Status: 400 Bad Request
- Error: "Start date and end date are required"

#### Test 2.3: Invalid Date Format
**Request:**
```json
{
  "startDate": "01/03/2025",
  "endDate": "31/03/2025"
}
```

**Expected Result:**
- Status: 400 Bad Request
- Error: "Invalid date format. Use YYYY-MM-DD"

#### Test 2.4: Start Date After End Date
**Request:**
```json
{
  "startDate": "2025-03-31",
  "endDate": "2025-03-01"
}
```

**Expected Result:**
- Status: 400 Bad Request
- Error: "Start date cannot be after end date"

#### Test 2.5: No Data in Period
**Request:**
```json
{
  "startDate": "2099-01-01",
  "endDate": "2099-12-31"
}
```

**Expected Result:**
- Status: 404 Not Found
- Error: "No stock data found for the selected period"

### 3. Data Accuracy Tests

#### Test 3.1: Opening Balance Calculation
**Setup:**
1. Note current available CMT for an item
2. Calculate expected opening: Current Available + Issued - Received (in period)

**Verification:**
- Opening Stock CMT in report matches calculated value
- Value is non-negative

#### Test 3.2: Round Log Details
**Setup:**
1. Query log_inventory_items for item in date range
2. Sum invoice_cmt, indian_cmt, physical_cmt

**Verification:**
- Invoice CMT column matches SUM(invoice_cmt)
- Indian CMT column matches SUM(indian_cmt)
- Actual CMT column matches SUM(physical_cmt)

#### Test 3.3: Cross Cut Details
**Setup:**
1. Query logs issued for crosscutting (issue_status='crosscutting')
2. Query crosscutting_done created in period
3. Calculate diff

**Verification:**
- Issue for CC matches sum of issued logs
- CC Received matches sum of crosscutting_done
- Diff = Issue for CC - CC Received

#### Test 3.4: Flitching
**Setup:**
1. Query crosscutting_done with issue_status='flitching' in period

**Verification:**
- Flitching column matches sum of crosscut_cmt

#### Test 3.5: Peel
**Setup:**
1. Query crosscutting_done with issue_status='peeling' in period

**Verification:**
- Peel column matches sum of crosscut_cmt

#### Test 3.6: Sales
**Setup:**
1. Query items with issue_status in ['order', 'challan'] from:
   - log_inventory_items
   - crosscutting_done
   - flitching_done

**Verification:**
- Sales column matches total of all sales across sources

#### Test 3.7: Closing Balance
**Formula:**
```
Closing = Opening + Actual - Issue for CC + CC Received - Flitching - Peel - Sales
```

**Verification:**
- Closing Stock CMT matches calculated value
- Value is non-negative

### 4. Excel Format Tests

#### Test 4.1: Title Row
**Check:**
- Row 1 contains title merged across 15 columns
- Title format: "Inward Item Wise Stock Details Between DD/MM/YYYY and DD/MM/YYYY"
- Date format is DD/MM/YYYY (not YYYY-MM-DD)
- Font is bold, size 12

#### Test 4.2: Group Headers
**Check:**
- Row 3 contains group headers
- "ROUND LOG DETAIL CMT" spans columns 3-5
- "Cross Cut Details CMT" spans columns 6-8
- "CrossCut Log Issue For CMT" spans columns 11-14
- Background color is gray (FFD3D3D3)

#### Test 4.3: Column Headers
**Check:**
- Row 4 contains 15 column headers
- Headers match specification:
  1. ItemName
  2. Opening Stock CMT
  3. Invoice
  4. Indian
  5. Actual
  6. Issue for CC
  7. CC Received
  8. Diff
  9. Flitching
  10. Sawing
  11. Wooden Tile
  12. UnEdge
  13. Peel
  14. Sales
  15. Closing Stock CMT
- Font is bold
- Background color is gray

#### Test 4.4: Data Rows
**Check:**
- Data starts from row 5
- Items sorted alphabetically by item_name
- All numeric values have 3 decimal places
- No negative values

#### Test 4.5: Total Row
**Check:**
- Last row contains "Total" in ItemName column
- All numeric columns show sum of values above
- Font is bold
- Background color is light gray (FFE0E0E0)

#### Test 4.6: Column Widths
**Check:**
- ItemName: 25 characters
- All CMT columns: 12-15 characters
- All columns are readable without horizontal scrolling

### 5. Edge Cases

#### Test 5.1: Single Day Period
**Request:**
```json
{
  "startDate": "2025-03-15",
  "endDate": "2025-03-15"
}
```

**Expected Result:**
- Report generates successfully
- Only activity on that specific day is included

#### Test 5.2: Item with No Activity
**Setup:**
- Item exists in inventory but has no transactions in period

**Expected Result:**
- Item is not included in report (filtered out)

#### Test 5.3: Item with Only Opening Stock
**Setup:**
- Item has opening stock but no transactions in period

**Expected Result:**
- Item is not included (filtered out as no activity)

#### Test 5.4: Very Long Item Name
**Setup:**
- Item name with 50+ characters

**Expected Result:**
- Item name displays completely
- Column width adjusts or wraps text

#### Test 5.5: Multiple Items Same Name (Case Sensitivity)
**Setup:**
- Items with names: "ASH", "Ash", "ash"

**Expected Result:**
- Each treated as separate item (uppercase normalization in schema)
- Sorted alphabetically

### 6. Authentication & Authorization Tests

#### Test 6.1: No Token
**Request:**
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

**Expected Result:**
- Status: 401 Unauthorized

#### Test 6.2: Invalid Token
**Request:**
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer INVALID_TOKEN" \
  -d '{
    "startDate": "2025-03-01",
    "endDate": "2025-03-31"
  }'
```

**Expected Result:**
- Status: 401 Unauthorized

### 7. Performance Tests

#### Test 7.1: Large Dataset
**Setup:**
- Database with 100+ items
- 1 year date range
- Thousands of transactions

**Expected Result:**
- Report generates in < 30 seconds
- No memory issues
- Excel file size is reasonable (< 10MB)

#### Test 7.2: Concurrent Requests
**Setup:**
- 5 users generate reports simultaneously

**Expected Result:**
- All reports generate successfully
- No file naming conflicts (timestamp differentiation)
- No server crashes

### 8. Placeholder Columns Test

#### Test 8.1: Verify Placeholders
**Check:**
- Sawing column (column 10) shows 0.000 for all items
- Wooden Tile column (column 11) shows 0.000 for all items
- UnEdge column (column 12) shows 0.000 for all items

**Documentation:**
- API documentation mentions these are placeholders
- Comments in code indicate clarification needed

## Test Execution Checklist

- [ ] All basic functionality tests pass
- [ ] All validation tests return correct errors
- [ ] Data accuracy verified against database queries
- [ ] Excel format matches specification exactly
- [ ] All edge cases handled gracefully
- [ ] Authentication and authorization working correctly
- [ ] Performance is acceptable
- [ ] Placeholder columns documented

## Known Issues / Future Enhancements

1. **Sawing Column**: Awaiting clarification on data source
2. **Wooden Tile Column**: Awaiting clarification on whether it's a sub-category or output type
3. **UnEdge Column**: Awaiting clarification on whether it's a sub-category or output type

## Testing Tools

### Postman Collection
You can import this collection for easier testing:

```json
{
  "info": {
    "name": "Item Wise Inward Report - reports2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Generate Report - Basic",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"startDate\": \"2025-03-01\",\n  \"endDate\": \"2025-03-31\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/V1/reports2/download-excel-item-wise-inward-daily-report",
          "host": ["{{baseUrl}}"],
          "path": ["api", "V1", "reports2", "download-excel-item-wise-inward-daily-report"]
        }
      }
    },
    {
      "name": "Generate Report - With Filter",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"startDate\": \"2025-03-01\",\n  \"endDate\": \"2025-03-31\",\n  \"filter\": {\n    \"item_name\": \"ASH\"\n  }\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/api/V1/reports2/download-excel-item-wise-inward-daily-report",
          "host": ["{{baseUrl}}"],
          "path": ["api", "V1", "reports2", "download-excel-item-wise-inward-daily-report"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000"
    },
    {
      "key": "token",
      "value": "YOUR_AUTH_TOKEN"
    }
  ]
}
```

## Test Results Log

Document your test results here:

| Test ID | Test Name | Date | Result | Notes |
|---------|-----------|------|--------|-------|
| 1.1 | Basic Report Generation | | | |
| 1.2 | Report with Filter | | | |
| 2.1 | Missing Start Date | | | |
| 3.1 | Opening Balance | | | |
| 4.1 | Title Row Format | | | |
| ... | ... | | | |
