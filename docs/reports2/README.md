# Reports2 - Daily Reports API Documentation

This folder contains documentation for daily report APIs in the TOPL backend system.

## Available Reports

### 1. Cross Cutting Daily Report
- **Endpoint**: `POST /reports2/download-excel-crosscutting-daily-report`
- **Purpose**: Generate daily cross-cutting activity report
- **Implementation**: `topl_backend/controllers/reports2/crossCutting.js`
- **Documentation**: See existing implementation

### 2. Log Inward Daily Report
- **Endpoint**: `POST /reports2/download-excel-log-inward-daily-report`
- **Purpose**: Generate daily log inward report with item grouping and totals
- **Documentation**: [`logInward/LOG_INWARD_DAILY_REPORT_API.md`](logInward/LOG_INWARD_DAILY_REPORT_API.md)
- **Implementation Plan**: [`logInward/LOG_INWARD_DAILY_REPORT_IMPLEMENTATION_PLAN.md`](logInward/LOG_INWARD_DAILY_REPORT_IMPLEMENTATION_PLAN.md)
- **Testing Guide**: [`logInward/LOG_INWARD_DAILY_REPORT_TESTING.md`](logInward/LOG_INWARD_DAILY_REPORT_TESTING.md)

### 3. Flitch Reports
- **Documentation**: [`Flitch/README.md`](Flitch/README.md)
- **Daily**: `POST /report/download-excel-flitch-daily-report`
- **Item Wise**: `POST /report/download-excel-item-wise-flitch-report`
- **Log Wise**: `POST /report/download-excel-log-wise-flitch-report`

### 4. Slicing Reports
- **Documentation**: [`Slicing/README.md`](Slicing/README.md)
- **Daily**: `POST /report/download-excel-slicing-daily-report`

### 5. Dressing Reports
- **Documentation**: [`Dressing/README.md`](Dressing/README.md)
- **Daily**: `POST /report/download-excel-dressing-daily-report`
- **Log Wise**: `POST /api/V1/reports2/dressing/download-excel-log-wise-dressing-report`

## Report Structure

All reports2 APIs follow a consistent pattern:

### Request Format
```json
{
  "filters": {
    "reportDate": "YYYY-MM-DD"  // Required - specific date for the report
  }
}
```

### Response Format

#### Success (200)
```json
{
  "result": "http://localhost:5000/public/reports/[ReportType]/report_file_name.xlsx",
  "statusCode": 200,
  "status": "success",
  "message": "Report generated successfully"
}
```

#### Error - Missing Date (400)
```json
{
  "statusCode": 400,
  "status": "error",
  "message": "Report date is required"
}
```

#### Error - No Data (404)
```json
{
  "statusCode": 404,
  "status": "error",
  "message": "No data found for the selected date"
}
```

## Implementation Pattern

Each report follows this structure:

### 1. Controller (`topl_backend/controllers/reports2/[reportName].js`)
- Validates `reportDate` parameter
- Sets up date range (start of day to end of day)
- Queries database with aggregation pipeline
- Checks if data exists
- Calls Excel generator function
- Returns download link

### 2. Excel Generator (`topl_backend/config/downloadExcel/reports2/[reportName]/[reportName].js`)
- Creates Excel workbook with ExcelJS
- Formats report title with date
- Adds column headers with styling
- Groups and processes data
- Calculates totals/subtotals
- Applies number formatting
- Saves file to `public/reports/[ReportType]/`
- Returns download URL

### 3. Route (`topl_backend/routes/report/reports2.routes.js`)
- Imports controller function
- Defines POST endpoint
- Exports router

## File Locations

### Generated Reports
All generated Excel files are stored in:
```
public/reports/[ReportType]/
```

### Directory Structure
```
topl_backend/
├── config/
│   └── downloadExcel/
│       └── reports2/
│           ├── crossCutting/
│           ├── Dressing/
│           ├── Flitch/
│           ├── logInward/
│           └── Slicing/
├── controllers/
│   └── reports2/
│       ├── crossCutting.js
│       ├── Dressing/
│       ├── Flitch/
│       ├── logInward/
│       └── Slicing/
├── routes/
│   └── report/
│       ├── reports2.routes.js
│       └── reports2/
│           ├── Dressing/
│           ├── Flitch/
│           ├── Log/
│           └── Slicing/
└── docs/
    └── reports2/
        ├── README.md (this file)
        ├── Dressing/
        │   ├── README.md
        │   └── Daily_Dressing/
        │       └── DRESSING_DAILY_REPORT_API.md
        ├── Flitch/
        │   ├── README.md
        │   ├── Daily_Flitch/
        │   ├── Item_wise_flitch/
        │   └── Log_wise_flitch/
        ├── Log/
        ├── Slicing/
        │   ├── README.md
        │   └── Daily_Slicing/
        │       └── SLICING_DAILY_REPORT_API.md
        └── logInward/
```

## Common Features

All reports include:
- ✅ Date-based filtering
- ✅ Excel file generation with ExcelJS
- ✅ Bold headers with gray background
- ✅ Proper number formatting
- ✅ Title row with report date
- ✅ Timestamped file names
- ✅ Error handling (400, 404)
- ✅ Console logging for debugging

## Adding a New Report

To add a new daily report, follow these steps:

1. **Create Excel Generator**
   - Location: `config/downloadExcel/reports2/[reportName]/[reportName].js`
   - Export function: `Generate[ReportName]Report(details, reportDate)`

2. **Create Controller**
   - Location: `controllers/reports2/[reportName].js`
   - Export function: `[ReportName]DailyReportExcel`
   - Use `catchAsync` wrapper
   - Validate `reportDate`
   - Query with date range
   - Call Excel generator

3. **Add Route**
   - File: `routes/report/reports2.routes.js`
   - Import controller
   - Add POST endpoint: `/download-excel-[report-name]-daily-report`

4. **Create Documentation**
   - API documentation (API.md)
   - Implementation plan (IMPLEMENTATION_PLAN.md)
   - Testing guide (TESTING.md)

## Testing

Each report should be tested for:
- ✅ Valid date with data (200 response)
- ✅ Valid date without data (404 response)
- ✅ Missing reportDate (400 response)
- ✅ Excel file format correctness
- ✅ Data calculations accuracy
- ✅ Console logs visibility

See individual testing guides for detailed test cases.

## Dependencies

All reports require:
- `exceljs` - Excel file generation
- `fs/promises` - File system operations
- `catchAsync` - Error handling wrapper
- Mongoose models - Database queries

## Environment Variables

Required in `.env`:
```
APP_URL=http://localhost:5000
```

This is used to generate download URLs for Excel files.

## Support

For questions or issues with any report:
1. Check the specific report's API documentation
2. Review the implementation plan
3. Run tests from the testing guide
4. Check backend console logs
5. Verify database data exists for test dates
