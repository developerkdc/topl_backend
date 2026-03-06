# Log Daily Inward Report - Testing Guide

## Testing Checklist

After implementing the Log Daily Inward Report API, use this guide to test all scenarios.

## Prerequisites

1. Ensure the backend server is running
2. Have test data with log inward entries in the database
3. Note a date that has inward data for testing

## Test Scenarios

### 1. Test: Valid Date with Data

**Request:**
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "2025-02-24"
    }
  }'
```

**Expected Response (200 OK):**
```json
{
  "result": "http://localhost:5000/public/reports/LogInward/log_inward_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Log inward daily report generated successfully"
}
```

**Verification:**
- [ ] Response status code is 200
- [ ] Response contains a valid download URL
- [ ] File is accessible at the returned URL
- [ ] Excel file opens successfully
- [ ] Report title shows correct date in DD/MM/YYYY format
- [ ] Data is grouped by item name
- [ ] Item totals are calculated correctly
- [ ] Grand total row is present
- [ ] Worker details section appears at bottom

---

### 2. Test: Valid Date without Data

**Request:**
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "2020-01-01"
    }
  }'
```

**Expected Response (404 Not Found):**
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No log inward data found for the selected date"
}
```

**Verification:**
- [ ] Response status code is 404
- [ ] Error message is clear and descriptive
- [ ] No file is generated

---

### 3. Test: Missing reportDate Parameter

**Request:**
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {}
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

**Verification:**
- [ ] Response status code is 400
- [ ] Error message indicates missing date
- [ ] No file is generated

---

### 4. Test: Invalid Date Format

**Request:**
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{
    "filters": {
      "reportDate": "invalid-date"
    }
  }'
```

**Expected Behavior:**
- Should either return 400 error or 404 (no data found)
- Check backend console logs for errors

**Verification:**
- [ ] Response has appropriate error status
- [ ] No file is generated
- [ ] No server crash or unhandled exception

---

### 5. Test: Multiple Items Grouping

**Request:** Use a date that has multiple different item types (e.g., RED OAK, TEAK, etc.)

**Verification:**
- [ ] Each item has its own section
- [ ] Item name appears only on first log of each item
- [ ] Each item has a "Total" row after its logs
- [ ] Grand total includes all items
- [ ] Items are sorted alphabetically

---

### 6. Test: Excel File Format

**After downloading a successful report, verify:**

#### Title Row (Row 1)
- [ ] Title is "Inward Details Report Date: {DD/MM/YYYY}"
- [ ] Text is bold and size 12
- [ ] Cell is merged across all columns
- [ ] Date format is DD/MM/YYYY (not YYYY-MM-DD)

#### Headers (Row 4)
- [ ] All 11 column headers are present:
  - Item Name
  - Supplier Item
  - Log No
  - Invoice Length
  - Invoice Dia.
  - Invoice CMT
  - Indian CMT
  - Physical Length
  - Physical Girth
  - Physical CMT
  - Remarks
- [ ] Headers are bold
- [ ] Headers have gray background color

#### Data Rows
- [ ] Item name shows only on first row of each group
- [ ] Supplier item shows only on first row of each group
- [ ] Each log has its own row
- [ ] Numbers are right-aligned
- [ ] CMT values show 3 decimal places (e.g., 181.000)
- [ ] Length/Diameter values show 2 decimal places (e.g., 10.00)

#### Total Rows
- [ ] "Total" appears in Supplier Item column (column 2)
- [ ] Total row is bold
- [ ] Invoice CMT total is correct
- [ ] Indian CMT total is correct
- [ ] Physical CMT total is correct
- [ ] Other columns are blank in total row

#### Grand Total Row
- [ ] "Total" appears in Item Name column (column 1)
- [ ] Row is bold
- [ ] Sums match the sum of all item totals

#### Worker Details Section
- [ ] Section appears after 2 empty rows following grand total
- [ ] Headers: Inward Id, Shift, Work Hours, Worker
- [ ] Headers are bold with gray background
- [ ] Worker data is populated from invoice details
- [ ] No duplicate worker entries for same inward ID + shift

---

## Backend Console Logs Verification

When making a request, check the backend console for these logs:

```
Log Inward Report - Date: 2025-02-24
Log Inward Report - Start: 2025-02-24T00:00:00.000Z
Log Inward Report - End: 2025-02-24T23:59:59.999Z
Log Inward Report - Records found: 21
Generating log inward report for date: 24/02/2025
Log inward report generated: http://localhost:5000/public/reports/LogInward/log_inward_daily_report_1738234567890.xlsx
```

**Verification:**
- [ ] Date logs show correct date
- [ ] Start time is 00:00:00.000
- [ ] End time is 23:59:59.999
- [ ] Records found count is accurate
- [ ] File generation URL is valid

---

## Manual Calculation Verification

For a test report, manually verify the calculations:

1. **Select one item group** (e.g., RED OAK with logs D298-D318)
2. **Count logs**: Should match the number of rows for that item
3. **Sum Invoice CMT**: Add up all invoice_cmt values for that item
4. **Sum Indian CMT**: Add up all indian_cmt values for that item
5. **Sum Physical CMT**: Add up all physical_cmt values for that item
6. **Compare with Total row**: Numbers should match exactly

**Example:**
```
RED OAK logs: D298 (181.000) + D299 (160.000) + ... + D318 (223.000)
Expected Total Invoice CMT: 3947.000
Actual Total in Excel: _______ (should match)
```

**Verification:**
- [ ] Item totals match manual calculation
- [ ] Grand total matches sum of all item totals
- [ ] No rounding errors (check decimal places)

---

## Error Handling Tests

### Test: Database Connection Issue
**Scenario:** Temporarily stop MongoDB or use invalid connection

**Expected:**
- Server should handle error gracefully
- Should return 500 error (or appropriate error)
- No crash or unhandled rejection

---

### Test: File System Permission Issue
**Scenario:** Make `public/reports/LogInward` read-only

**Expected:**
- Should return error about file creation failure
- Error message should be logged
- No partial file creation

---

## Performance Testing

### Test: Large Dataset
**Scenario:** Run report for a date with 100+ log entries

**Verification:**
- [ ] Request completes in reasonable time (<30 seconds)
- [ ] File generates successfully
- [ ] Excel file opens without issues
- [ ] All data is present and correct
- [ ] No memory issues or timeouts

---

## Browser Testing (if frontend integration exists)

If integrated with frontend:

1. **Test download in Chrome**
   - [ ] File downloads automatically
   - [ ] File opens in Excel/Google Sheets

2. **Test download in Firefox**
   - [ ] File downloads automatically
   - [ ] File opens correctly

3. **Test download in Safari**
   - [ ] File downloads automatically
   - [ ] File opens correctly

---

## Regression Testing

After any changes to the API:

- [ ] Re-run all test scenarios above
- [ ] Verify no breaking changes to existing functionality
- [ ] Check if file format remains consistent
- [ ] Verify backwards compatibility with existing frontend calls

---

## Debug Checklist

If tests fail, check:

1. **Backend Console**
   - Are there any error logs?
   - Are the date range logs correct?
   - Is the records count accurate?

2. **Database**
   - Does data exist for the test date?
   - Is `inward_date` field populated correctly?
   - Are item_name and log_no fields present?

3. **File System**
   - Does `public/reports/LogInward` directory exist?
   - Are file permissions correct?
   - Is there enough disk space?

4. **Environment Variables**
   - Is `APP_URL` set correctly in .env?
   - Does it match your server URL?

5. **Dependencies**
   - Is `exceljs` package installed?
   - Are all imports resolving correctly?

---

## Sign-Off Checklist

Before marking implementation complete:

- [ ] All test scenarios pass
- [ ] Excel file format matches requirements
- [ ] Calculations are accurate
- [ ] Error handling works correctly
- [ ] Console logs are informative
- [ ] File is accessible via returned URL
- [ ] Documentation is complete
- [ ] No linter errors
- [ ] Code follows project conventions
- [ ] Ready for production deployment

---

## Contact

If issues persist:
1. Share backend console logs
2. Share the exact request being sent
3. Share screenshot of Excel file (if generated)
4. Note the date used for testing
5. Check database for test data on that date
