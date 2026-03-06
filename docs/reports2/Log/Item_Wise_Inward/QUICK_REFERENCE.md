# Item Wise Inward Report - Quick Reference

## API Endpoint
```
POST /api/V1/reports2/download-excel-item-wise-inward-daily-report
```

## Quick Test (cURL)
```bash
curl -X POST http://localhost:5000/api/V1/reports2/download-excel-item-wise-inward-daily-report \
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

## Report Columns (15 Total)

1. **ItemName** - Item identifier
2. **Opening Stock CMT** - Opening balance
3. **Invoice** - Invoice CMT (Round Log)
4. **Indian** - Indian CMT (Round Log)
5. **Actual** - Physical CMT (Round Log)
6. **Issue for CC** - Issued for crosscutting
7. **CC Received** - Crosscutting completed
8. **Diff** - Difference (Issue - Received)
9. **Flitching** - Issued for flitching
10. **Sawing** - Placeholder (0.000)
11. **Wooden Tile** - Placeholder (0.000)
12. **UnEdge** - Placeholder (0.000)
13. **Peel** - Issued for peeling
14. **Sales** - Issued to orders/challan
15. **Closing Stock CMT** - Closing balance

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
  "data": "http://localhost:5000/public/upload/reports/reports2/Log/Item-Wise-Inward-Report-1706432891234.xlsx"
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

## Key Calculations

**Opening Stock:**
```
Opening = Current Available + Total Issued - Total Received (during period)
```

**Closing Stock:**
```
Closing = Opening + Actual - Issue for CC + CC Received - Flitching - Peel - Sales
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
- Items with no activity are filtered out
- Files are timestamped to prevent overwrites
- Multi-level headers for better visualization
- Columns 10-12 (Sawing, Wooden Tile, UnEdge) are placeholders

## Testing Checklist

- [ ] Basic report generation works
- [ ] Date validation working
- [ ] Filter by item_name working
- [ ] Excel file generated correctly
- [ ] All 15 columns present
- [ ] Data sorted alphabetically
- [ ] Totals calculated correctly
- [ ] Multi-level headers displayed
- [ ] File saved in correct location
