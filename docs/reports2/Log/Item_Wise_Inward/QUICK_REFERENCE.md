# Item Wise Inward Report - Quick Reference

## API Endpoint
```
POST /api/V1/report/download-excel-item-wise-inward-daily-report
```

## Quick Test (cURL)
```bash
curl -X POST http://localhost:5000/api/V1/report/download-excel-item-wise-inward-daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"startDate": "2025-03-01", "endDate": "2025-03-31"}'
```

## Files Location

### Controller
- `topl_backend/controllers/reports2/Log/itemWiseInward.js`
- Function: `ItemWiseInwardDailyReportExcel`

### Excel Utility
- `topl_backend/config/downloadExcel/reports2/Log/itemWiseInward.js`
- Function: `createItemWiseInwardReportExcel`

### Route
- `topl_backend/routes/report/reports2/Log/log.routes.js`

### Documentation
- API: `topl_backend/docs/reports2/Log/Item_Wise_Inward/API.md`
- Testing: `topl_backend/docs/reports2/Log/Item_Wise_Inward/TESTING.md`
- Implementation: `topl_backend/docs/reports2/Log/Item_Wise_Inward/IMPLEMENTATION_SUMMARY.md`

## Report Columns (21 Total)

1. **ItemName** – Item identifier
2. **Opening Stock CMT** – Physical CMT of logs received in period
3. **Invoice** – Invoice CMT (Round Log)
4. **Indian** – Indian CMT (Round Log)
5. **Actual** – Physical CMT (Round Log)
6. **Recover From Rejected** – Placeholder (0.000)
7. **Issue for CC** – Issued for crosscutting
8. **CC Received** – Crosscutting completed
9. **CC Issued** – Crosscut pieces forwarded to next stage
10. **CC Diff** – Issue for CC − CC Received
11. **Issue for Flitch** – Issued for flitching
12. **Flitch Received** – Flitch output
13. **Flitch Diff** – Issue for Flitch − Flitch Received
14. **Issue for SqEdge** – Placeholder (0.000)
15. **Peeling Issued** – Issued for peeling
16. **Peeling Received** – Peeling output
17. **Peeling Diff** – Peeling Issued − Peeling Received
18. **Sales** – Issued to orders/challan across all stages
19. **Job Work Challan** – Placeholder (0.000)
20. **Rejected** – Rejected across all stages
21. **Closing Stock CMT** – Closing balance

## Request Format

```json
{
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "filter": {
    "item_name": "ITEM_NAME"  // Optional
  }
}
```

## Response Format

```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Item wise inward report generated successfully",
  "result": "http://localhost:5000/public/upload/reports/reports2/Log/Item-Wise-Inward-Report-1706432891234.xlsx"
}
```

## Excel Output Location
```
public/upload/reports/reports2/Log/Item-Wise-Inward-Report-[timestamp].xlsx
```

## Database Collections Used

- `log_inventory_items_details`
- `log_inventory_invoice_details`
- `crosscutting_done`
- `flitching_done`
- `issues_for_flitching`
- `issues_for_peeling`
- `peeling_done_other_details` + `peeling_done_items`

## Key Calculations

**Opening Stock:**
```
Opening = SUM(physical_cmt) where invoice.inward_date in period
```

**Closing Stock:**
```
Closing = SUM(physical_cmt) of logs (invoice in period, issue_status != null) − Opening
```

## Common Errors

| Code | Message | Solution |
|------|---------|----------|
| 400 | Start date and end date are required | Provide both dates |
| 400 | Invalid date format. Use YYYY-MM-DD | Use correct format |
| 400 | Start date cannot be after end date | Check date order |
| 404 | No stock data found for the selected period | Choose different dates |

## Development Notes

- All CMT values use 3 decimal places
- Aggregation uses Map-based batch approach (one pipeline per data category)
- Placeholder columns: Recover From Rejected, Issue for SqEdge, Job Work Challan (0.000)
- Files are timestamped to prevent overwrites
- Multi-level headers for better visualization

## Testing Checklist

- [ ] Basic report generation works
- [ ] Date validation working
- [ ] Filter by item_name working
- [ ] Excel file generated correctly
- [ ] All 21 columns present
- [ ] Data sorted alphabetically
- [ ] Totals calculated correctly
- [ ] Multi-level headers displayed
- [ ] File saved in correct location
