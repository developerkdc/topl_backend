# Log Item Further Process Report - Quick Reference

## Quick Start

### Endpoint
```
POST /api/V1/reports2/log/download-excel-log-item-further-process-report
```

### Request Example
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filter": {
    "item_name": "RED OAK"
  }
}
```

### Response Example
```json
{
  "statusCode": 200,
  "status": "success",
  "message": "Log item further process report generated successfully",
  "result": "http://localhost:3000/public/upload/reports/reports2/Log/Log-Item-Further-Process-Report-1234567890.xlsx"
}
```

## Report Columns (44 Total)

### Inward Details (Columns 1-4)
1. Item Name
2. LogNo
3. Indian CMT
4. RECE

### Inward in(CMT) (Columns 5-10)
5. Total Stock
6. CC RECE
7. Saw.
8. UE
9. Peel
10. Flitch

### Cross Cut Issue in(CMT) (Columns 11-13)
11. Total Stock
12. Total Issue
13. Total Stock

### Slice Issue (Columns 14-18)
14. Slice RECE
15. Dress
16. Dye
17. Total issue
18. Total Stock

### Dressing Issue (Columns 19-24)
19. Dress RECE
20. Clipp
21. Dye
22. Mix Match
23. Total issue
24. Total Stock

### Dyeing (Columns 25-27)
25. Total Issue
26. Total Stock
27. Dye RECE

### Clip Issue (Columns 28-32)
28. Clip RECE
29. MSplic
30. HSplic
31. Total Issue
32. Total Stock

### Machine Splicing (Columns 33-35)
33. RECE
34. Total Issue
35. Total Stock

### Hand Splicing (Columns 36-38)
36. RECE
37. Total Issue
38. Total Stock

### End Tapping (Columns 39-41)
39. Total RECE
40. Total Issue
41. Total Stock

### Splicing (Columns 42-43)
42. Total Issue
43. Total Stock

### Pressing (Column 44)
44. RECE

## Key Features

✅ **Comprehensive Tracking**: Tracks logs from inward through all processing stages  
✅ **Item Grouping**: Groups logs by item name with subtotals  
✅ **Grand Totals**: Overall totals across all items  
✅ **Date Range**: Filter by inward date range  
✅ **Item Filter**: Optional filter by item name  
✅ **Excel Format**: Professional multi-level headers with formatting

## Files Created

### 1. Controller
**Path**: `topl_backend/controllers/reports2/Log/logItemFurtherProcess.js`  
**Size**: ~15.8 KB  
**Purpose**: Handles API request, aggregates data from all processing stages

### 2. Excel Generator
**Path**: `topl_backend/config/downloadExcel/reports2/Log/logItemFurtherProcess.js`  
**Size**: ~22.2 KB  
**Purpose**: Creates formatted Excel file with multi-level headers

### 3. Route
**Path**: `topl_backend/routes/report/reports2/Log/log.routes.js`  
**Updated**: Added new route and import

### 4. Documentation
**Path**: `topl_backend/docs/reports2/Log/logItemFurtherProcess/API_DOCUMENTATION.md`  
**Purpose**: Complete API documentation

## Processing Stages Tracked

1. **Inward** → Log received with measurements
2. **Crosscutting** → Logs cut into crosscut pieces
3. **Flitching** → Logs converted to flitches
4. **Slicing** → Flitches sliced into veneers
5. **Dressing** → Veneers dressed/trimmed
6. **Dyeing** → Veneers dyed/smoked
7. **Tapping/Splicing** → Veneers joined (machine/hand)
8. **Pressing** → Final pressing into plywood

## Data Sources

| Stage | Database Model |
|-------|----------------|
| Inward | `log_inventory_items_view_model` |
| Crosscut | `crosscutting_done_model` |
| Flitch | `flitching_done_model` |
| Slice | `slicing_done_items_model` |
| Dress | `dressing_done_items_model` |
| Dye | `process_done_items_details_model` |
| Tap/Splice | `tapping_done_items_details_model` |
| Press | `pressing_done_details_model` |

## Testing Checklist

- [ ] Test with valid date range
- [ ] Test with item name filter
- [ ] Test with no data in date range (should return 404)
- [ ] Test with invalid date format (should return 400)
- [ ] Test with start date > end date (should return 400)
- [ ] Verify Excel file downloads correctly
- [ ] Verify all 44 columns are present
- [ ] Verify item grouping works
- [ ] Verify subtotals calculate correctly
- [ ] Verify grand totals are accurate

## Common Issues & Solutions

### Issue: "No log data found"
**Solution**: Check that logs were actually received during the date range

### Issue: "Invalid date format"
**Solution**: Use YYYY-MM-DD format (e.g., "2025-01-31")

### Issue: "Start date cannot be after end date"
**Solution**: Ensure startDate ≤ endDate

### Issue: Excel file not downloading
**Solution**: Check folder permissions and APP_URL environment variable

## Example Scenarios

### Scenario 1: Monthly Report
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31"
}
```

### Scenario 2: Single Day Report
```json
{
  "startDate": "2025-01-15",
  "endDate": "2025-01-15"
}
```

### Scenario 3: Specific Item
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "filter": {
    "item_name": "WHITE OAK"
  }
}
```

## Report Layout Preview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Inward Log Wise Stock   Inward Date: 01/01/2025                   │
├─────┬───────┬────────┬──────┬────────────────┬─────────────┬───────┤
│Item │ LogNo │ Indian │ RECE │ Inward in(CMT) │ Slice Issue │  ...  │
│Name │       │  CMT   │      │                │             │       │
├─────┼───────┼────────┼──────┼────────────────┼─────────────┼───────┤
│RED  │ D372  │ 0.788  │0.788 │ ...            │ ...         │ ...   │
│OAK  │ D373  │ 0.688  │0.688 │ ...            │ ...         │ ...   │
│     │ Total │ 1.476  │1.476 │ ...            │ ...         │ ...   │
├─────┼───────┼────────┼──────┼────────────────┼─────────────┼───────┤
│WHITE│ D370  │ 0.561  │0.561 │ ...            │ ...         │ ...   │
│OAK  │ D371  │ 1.134  │1.134 │ ...            │ ...         │ ...   │
│     │ Total │ 1.695  │1.695 │ ...            │ ...         │ ...   │
├─────┼───────┼────────┼──────┼────────────────┼─────────────┼───────┤
│Total│       │ 3.171  │3.171 │ ...            │ ...         │ ...   │
└─────┴───────┴────────┴──────┴────────────────┴─────────────┴───────┘
```

## Support

For issues or questions:
1. Check API_DOCUMENTATION.md for detailed information
2. Verify database schemas are properly configured
3. Ensure all processing models are accessible
4. Check server logs for detailed error messages
