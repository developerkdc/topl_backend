import { GenerateLogDailyInwardReport } from '../../../config/downloadExcel/reports2/Log/logInward.js';
import { log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

export const LogInwardDailyReportExcel = catchAsync(
  async (req, res, next) => {
    // Debug logging
    console.log('Log Inward Report - Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Log Inward Report - Filters:', req.body?.filters);
    
    const { reportDate, ...data } = req?.body?.filters || {};

    // Validate reportDate
    if (!reportDate) {
      console.log('Log Inward Report - ERROR: No reportDate found');
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    // Set up date filter for the specific day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Log Inward Report - Date:', reportDate);
    console.log('Log Inward Report - Start:', startOfDay);
    console.log('Log Inward Report - End:', endOfDay);

    // Build match query
    const matchQuery = {
      'log_invoice_details.inward_date': {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    };

    // Build aggregation pipeline
    const logInwardData = await log_inventory_items_view_model.aggregate([
      {
        $match: matchQuery,
      },
      {
        $sort: {
          item_name: 1,
          log_no: 1,
        },
      },
    ]);

    console.log('Log Inward Report - Records found:', logInwardData.length);

    // Check if data exists
    if (!logInwardData || logInwardData.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No log inward data found for the selected date',
      });
    }

    // Generate Excel report
    const excelLink = await GenerateLogDailyInwardReport(
      logInwardData,
      reportDate
    );

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Log inward daily report generated successfully',
    });
  }
);
