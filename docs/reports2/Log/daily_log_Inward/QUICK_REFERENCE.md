# LOG Inward Daily Report - Quick Reference

## API Endpoint
```
POST /reports2/download-excel-log-inward-daily-report
```

## Quick Test
```bash
curl -X POST http://localhost:5000/reports2/download-excel-log-inward-daily-report \
  -H "Content-Type: application/json" \
  -d '{"filters":{"reportDate":"2025-02-24"}}'
```

## Request
```json
{
  "filters": {
    "reportDate": "2025-02-24"
  }
}
```

## Response
```json
{
  "result": "http://localhost:5000/public/reports/LogInward/log_inward_daily_report_1738234567890.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Log inward daily report generated successfully"
}
```

## Report Columns
1. Item Name
2. Supplier Item
3. Log No
4. Invoice Length
5. Invoice Dia.
6. Invoice CMT
7. Indian CMT
8. Physical Length
9. Physical Girth
10. Physical CMT
11. Remarks

## Features
- ✅ Groups by item name
- ✅ Shows item totals
- ✅ Shows grand total
- ✅ Includes worker details
- ✅ Date formatted as DD/MM/YYYY
- ✅ CMT values: 3 decimals
- ✅ Length/Diameter: 2 decimals

## Files Created
- **Controller**: `controllers/reports2/logInward.js`
- **Excel Generator**: `config/downloadExcel/reports2/logInward/logInward.js`
- **Route**: `routes/report/reports2.routes.js` (modified)
- **Docs**: `docs/reports2/logInward/*.md`

## Error Codes
- **400**: Missing reportDate
- **404**: No data for date
- **500**: Server error

## Database Query
```javascript
log_inventory_items_view_model.aggregate([
  {
    $match: {
      'log_invoice_details.inward_date': {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }
  },
  {
    $sort: { item_name: 1, log_no: 1 }
  }
])
```

## Console Logs to Check
```
Log Inward Report - Date: 2025-02-24
Log Inward Report - Start: 2025-02-24T00:00:00.000Z
Log Inward Report - End: 2025-02-24T23:59:59.999Z
Log Inward Report - Records found: 21
Generating log inward report for date: 24/02/2025
Log inward report generated: http://localhost:5000/public/reports/LogInward/...
```

## Common Issues

### Issue: 404 - No data found
**Solution**: Check if database has log entries with `inward_date` matching the requested date

### Issue: 400 - Report date required
**Solution**: Ensure request body has `filters.reportDate` field

### Issue: File not accessible
**Solution**: Check that `public/reports/LogInward/` directory exists and has write permissions

### Issue: Wrong date format in Excel
**Solution**: Check `formatDate()` function is converting to DD/MM/YYYY

## Testing Checklist
- [ ] Test with valid date + data → 200
- [ ] Test with valid date + no data → 404
- [ ] Test with missing date → 400
- [ ] Verify Excel file format
- [ ] Verify calculations are correct
- [ ] Verify grouping works
- [ ] Verify worker section appears

## Documentation
- **API Docs**: [`docs/reports2/logInward/LOG_INWARD_DAILY_REPORT_API.md`](LOG_INWARD_DAILY_REPORT_API.md)
- **Implementation**: [`docs/reports2/logInward/LOG_INWARD_DAILY_REPORT_IMPLEMENTATION_PLAN.md`](LOG_INWARD_DAILY_REPORT_IMPLEMENTATION_PLAN.md)
- **Testing**: [`docs/reports2/logInward/LOG_INWARD_DAILY_REPORT_TESTING.md`](LOG_INWARD_DAILY_REPORT_TESTING.md)
