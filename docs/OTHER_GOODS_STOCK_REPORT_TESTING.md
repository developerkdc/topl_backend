# Other Goods Stock Report - Testing & Debugging Guide

## Issue: First Row Title Not Displaying Correctly

### What Was Fixed

1. **Better Date Formatting** - Added error handling for invalid dates
2. **Console Logging** - Added debug logs to track date values
3. **Row Height** - Set proper row height for title display
4. **Error Handling** - Prevents crashes if dates are missing

### Expected Title Format

The first row should display:
```
Other Goods [ ALL ]   stock  in the period  01/05/2025 and 28/05/2025
```

Or with item name filter:
```
Other Goods [ ITEM_NAME ]   stock  in the period  01/05/2025 and 28/05/2025
```

## Testing Steps

### 1. Check Backend Logs

When you make a request, check the backend console for these logs:

```
Stock Report Request - Start Date: 2025-05-01
Stock Report Request - End Date: 2025-05-28
Stock Report Request - Filter: { item_name: 'ITEM_NAME_HERE' }
Generated report title: Other Goods [ ITEM_NAME_HERE ]   stock  in the period  01/05/2025 and 28/05/2025
```

### 2. Test Request Examples

#### Basic Request (All Items)
```bash
curl -X POST http://localhost:5000/other-goods-inventory/download-stock-report-othergoods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-05-01",
    "endDate": "2025-05-28"
  }'
```

#### Request with Item Name Filter
```bash
curl -X POST http://localhost:5000/other-goods-inventory/download-stock-report-othergoods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2025-05-01",
    "endDate": "2025-05-28",
    "filter": {
      "item_name": "ITEM_NAME_HERE"
    }
  }'
```

### 3. Common Issues & Solutions

#### Issue 1: Dates Not Showing
**Symptom**: Title shows "Other Goods [ ALL ]   stock  in the period  N/A and N/A"

**Cause**: startDate or endDate not passed correctly

**Solution**:
- Check if request body contains startDate and endDate
- Ensure date format is: "YYYY-MM-DD" (e.g., "2025-05-01")
- Check backend logs for the actual values received

#### Issue 2: Wrong Date Format
**Symptom**: Title shows "Other Goods [ ALL ]   stock  in the period  2025-05-01 and 2025-05-28"

**Cause**: Date formatting function not working

**Solution**:
- Check console logs for "Generated report title"
- Verify formatDate function is working correctly
- Dates should be in DD/MM/YYYY format

#### Issue 3: Title Row Not Visible in Excel
**Symptom**: Excel file opens but title is not visible

**Solution**:
- Check if you're scrolled down - the title is in Row 1
- Column A should be very wide to show the full title
- The title is merged across columns 1-12

#### Issue 4: No Data Found
**Symptom**: 404 error with message "No stock data found for the selected period"

**Possible Causes**:
- Date range has no inventory activity
- All items have zero values for the period
- Database collections are empty

**Solution**:
- Verify there is inventory data in the database
- Try a different date range
- Check if items have transactions in the period

#### Issue 5: Amount Values Incorrect
**Symptom**: Quantity values look correct but amounts are wrong

**Possible Causes**:
- Currency conversion issues
- Exchange rate not applied correctly
- Expense amounts not included

**Solution**:
- Verify database has correct `amount` and `available_amount` fields
- Check if `issued_amount` in history is calculated correctly
- Review the amount calculation logic in the controller

### 4. Verify Excel Output

When you open the generated Excel file:

**Row 1**: Should display the title with dates
- Font: Bold, Size 12
- Merged across all 12 columns
- Left-aligned

**Row 2**: Empty row (spacing)

**Row 3**: Column headers
- Bold with gray background
- Headers: Item Name, Item Sub Category, Opening (Qty), Opening (Amount), etc.

**Row 4+**: Data rows
- Grouped by item name → sub category
- Subtotals after each item name (bold)
- Grand total at the end (bold + gray background)

### 5. JavaScript Frontend Test

```javascript
const testStockReport = async () => {
  const requestData = {
    startDate: '2025-05-01',
    endDate: '2025-05-28',
    filter: {
      item_name: 'ITEM_NAME_HERE' // Optional
    }
  };

  console.log('Sending request:', requestData);

  try {
    const response = await axios.post(
      '/other-goods-inventory/download-stock-report-othergoods',
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

## Quantity and Amount Calculations Verification

**All calculations use these database fields:**

### Inventory Fields
- `othergoods_inventory_items_details.total_quantity` - Quantity
- `othergoods_inventory_items_details.available_quantity` - Available quantity
- `othergoods_inventory_items_details.amount` - Amount
- `othergoods_inventory_items_details.available_amount` - Available amount

### Transaction Fields
- `other_goods_history_details.issued_quantity` - Quantity issued
- `other_goods_history_details.issued_amount` - Amount issued

### Calculation Formula
```
Opening Qty = Current Qty + (Consumed Qty + Sales Qty) - Received Qty
Opening Amt = Current Amt + (Consumed Amt + Sales Amt) - Received Amt

Closing Qty = Opening Qty + Received Qty - Consumed Qty - Sales Qty
Closing Amt = Opening Amt + Received Amt - Consumed Amt - Sales Amt
```

**MongoDB Aggregation**: Uses `$sum` operator on these fields to ensure accurate calculations.

## Debug Checklist

- [ ] Check backend console logs for date values
- [ ] Verify request body has startDate and endDate
- [ ] Confirm dates are in "YYYY-MM-DD" format
- [ ] Check if "Generated report title" log shows correct format
- [ ] Open Excel and check Row 1 (might need to scroll to top)
- [ ] Verify column A is wide enough to show full title
- [ ] Check if dates are formatted as DD/MM/YYYY in title
- [ ] Verify quantity values match database `total_quantity` and `issued_quantity` fields
- [ ] Verify amount values match database `amount` and `issued_amount` fields
- [ ] Confirm Opening Qty + Receive Qty - Consume Qty - Sales Qty = Closing Qty
- [ ] Confirm Opening Amt + Receive Amt - Consume Amt - Sales Amt = Closing Amt
- [ ] Check that subtotals sum correctly
- [ ] Verify grand total matches sum of all subtotals

## Expected vs Actual

### Expected Output in Excel Row 1:
```
Other Goods [ ITEM_NAME_HERE ]   stock  in the period  01/05/2025 and 28/05/2025
```

### If You See:
- `Other Goods [ ALL ]   stock  in the period  N/A and N/A` 
  → Dates not passed correctly
  
- `Other Goods [ ALL ]   stock  in the period  2025-05-01 and 2025-05-28` 
  → Date formatting not working

- Nothing in Row 1 
  → Check if Excel is scrolled down

## Test Scenarios

### Scenario 1: Basic Report Generation
**Test**: Generate report for a month with known data
**Expected**: 
- Report generated successfully
- All items with activity are listed
- Calculations are correct

### Scenario 2: Date Range with No Activity
**Test**: Generate report for a date range with no transactions
**Expected**: 404 error with message "No stock data found for the selected period"

### Scenario 3: Item Name Filter
**Test**: Generate report with specific item name filter
**Expected**: 
- Only items matching the filter are shown
- Title shows the filtered item name

### Scenario 4: Invalid Date Format
**Test**: Send request with invalid date format (e.g., "01-05-2025")
**Expected**: 400 error with message "Invalid date format"

### Scenario 5: Start Date After End Date
**Test**: Send request where startDate > endDate
**Expected**: 400 error with message "Start date cannot be after end date"

### Scenario 6: Missing Required Fields
**Test**: Send request without startDate or endDate
**Expected**: 400 error with message "Start date and end date are required"

### Scenario 7: Large Date Range
**Test**: Generate report for a very large date range (e.g., 1 year)
**Expected**: 
- Report generated successfully (may take longer)
- All transactions included
- Performance acceptable

### Scenario 8: Verify Stock Continuity
**Test**: Generate reports for consecutive periods and verify closing = next opening
**Expected**: 
- Closing stock of Period 1 should match Opening stock of Period 2
- Demonstrates data continuity

## Performance Considerations

**Expected Response Times:**
- Small dataset (< 100 items): 1-3 seconds
- Medium dataset (100-1000 items): 3-10 seconds
- Large dataset (> 1000 items): 10-30 seconds

**If performance is slow:**
- Check database indexes on `item_name`, `item_description`, `inward_date`, `createdAt`
- Verify aggregation pipelines are optimized
- Consider adding indexes on `other_goods_item_id` in history collection

## Database Verification Queries

### Check Current Inventory Count
```javascript
db.othergoods_inventory_items_details.countDocuments({ deleted_at: null })
```

### Check History Records Count
```javascript
db.other_goods_history_details.countDocuments({
  createdAt: { $gte: new Date("2025-05-01"), $lte: new Date("2025-05-28") }
})
```

### Check Unique Item Names
```javascript
db.othergoods_inventory_items_details.distinct("item_name", { deleted_at: null })
```

### Verify Sample Calculations
```javascript
// Get a sample item
const item = db.othergoods_inventory_items_details.findOne({ deleted_at: null });

// Check its history
db.other_goods_history_details.find({ other_goods_item_id: item._id });
```

## Contact Points

If issue persists:
1. Share backend console logs
2. Share the exact request being sent
3. Share screenshot of Excel Row 1
4. Check if Excel file opens with Row 1 visible
5. Verify database has data for the requested period

## Additional Notes

- Report generation is CPU-intensive for large datasets
- Consider implementing caching for frequently requested date ranges
- Monitor MongoDB aggregation performance
- Ensure adequate server resources for concurrent report generation
