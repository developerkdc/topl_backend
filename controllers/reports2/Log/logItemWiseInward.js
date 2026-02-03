import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { createLogItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemWiseInward.js';

/**
 * Log Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of individual logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * Shows one row per log with item grouping
 * 
 * @route POST /api/V1/reports2/log/download-excel-log-item-wise-inward-daily-report
 * @access Private
 */
export const LogItemWiseInwardDailyReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Log Item Wise Inward Report Request - Start Date:', startDate);
  console.log('Log Item Wise Inward Report Request - End Date:', endDate);
  console.log('Log Item Wise Inward Report Request - Filter:', filter);

  // Validate required parameters
  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  // Parse dates
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999); // Include full end date

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  // Build filter for item_name if provided
  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // Step 1: Get all logs received during the period with invoice details
    const logsInPeriod = await log_inventory_items_view_model.aggregate([
      {
        $match: {
          ...itemFilter,
          'log_invoice_details.inward_date': { $gte: start, $lte: end },
        },
      },
      {
        $sort: {
          item_name: 1,
          log_no: 1,
        },
      },
    ]);

    if (logsInPeriod.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No log data found for the selected period'
          )
        );
    }

    // Step 2: For each log, calculate all metrics
    const logDataWithMetrics = await Promise.all(
      logsInPeriod.map(async (log) => {
        const logNo = log.log_no;
        const itemName = log.item_name;

        // Get current status of the log
        const currentLogStatus = await log_inventory_items_view_model.findOne({
          log_no: logNo,
        });

        // ROUND LOG DETAILS - Direct from log item
        const invoiceCmt = log.invoice_cmt || 0;
        const indianCmt = log.indian_cmt || 0;
        const actualCmt = log.physical_cmt || 0;

        // CROSS CUT DETAILS - Check if this log was issued for crosscutting during period
        const issueForCc = (log.issue_status === 'crosscutting' && 
                           log.updatedAt >= start && 
                           log.updatedAt <= end) ? actualCmt : 0;

        // CC Received - Check if crosscutting was completed for this log during period
        const ccReceivedData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);
        const ccReceivedCmt = ccReceivedData[0]?.total_cmt || 0;
        const diffCmt = issueForCc - ccReceivedCmt;

        // FLITCHING - Check if crosscut items from this log were issued for flitching
        const flitchingData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              issue_status: 'flitching',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);
        const flitchingCmt = flitchingData[0]?.total_cmt || 0;

        // SAWING - Placeholder (awaiting clarification on data source)
        const sawingCmt = 0;

        // WOODEN TILE - Placeholder (awaiting clarification on data source)
        const woodenTileCmt = 0;

        // UNEDGE - Placeholder (awaiting clarification on data source)
        const unedgeCmt = 0;

        // PEEL - Check if crosscut items from this log were issued for peeling
        const peelingData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              issue_status: 'peeling',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);
        const peelCmt = peelingData[0]?.total_cmt || 0;

        // SALES - Check if this log was issued for orders/challan during period
        const logSales = (log.issue_status && 
                         ['order', 'challan'].includes(log.issue_status) && 
                         log.updatedAt >= start && 
                         log.updatedAt <= end) ? actualCmt : 0;

        // Sales from crosscut items of this log
        const crosscutSalesData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);
        const crosscutSales = crosscutSalesData[0]?.total_cmt || 0;

        // Sales from flitch items of this log
        const flitchSalesData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);
        const flitchSales = flitchSalesData[0]?.total_cmt || 0;

        const salesCmt = logSales + crosscutSales + flitchSales;

        // OPENING BALANCE CALCULATION
        // Calculate total issued before period start
        const totalIssuedBeforeStart = 
          (currentLogStatus?.issue_status === 'crosscutting' && currentLogStatus?.updatedAt < start ? actualCmt : 0) +
          (currentLogStatus?.issue_status && ['order', 'challan'].includes(currentLogStatus?.issue_status) && currentLogStatus?.updatedAt < start ? actualCmt : 0);

        // Opening Balance = 0 (since this log was received during the period)
        const openingBalanceCmt = 0;

        // CLOSING BALANCE CALCULATION
        // Closing = Opening + Actual - Issue For CC + CC Received - Flitching - Sawing - Wooden Tile - UnEdge - Peel - Sales
        const closingBalanceCmt = openingBalanceCmt + actualCmt - issueForCc + ccReceivedCmt - flitchingCmt - sawingCmt - woodenTileCmt - unedgeCmt - peelCmt - salesCmt;

        return {
          item_name: itemName,
          log_no: logNo,
          opening_balance_cmt: Math.max(0, openingBalanceCmt),
          invoice_cmt: invoiceCmt,
          indian_cmt: indianCmt,
          actual_cmt: actualCmt,
          issue_for_cc: issueForCc,
          cc_received: ccReceivedCmt,
          diff: diffCmt,
          flitching: flitchingCmt,
          sawing: sawingCmt,
          wooden_tile: woodenTileCmt,
          unedge: unedgeCmt,
          peel: peelCmt,
          sales: salesCmt,
          closing_stock_cmt: Math.max(0, closingBalanceCmt),
        };
      })
    );

    // Step 3: Filter out logs with no activity (optional - keep all for now)
    const activeLogs = logDataWithMetrics;

    if (activeLogs.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No log data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createLogItemWiseInwardReportExcel(
      activeLogs,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Log item wise inward report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating log item wise inward report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
