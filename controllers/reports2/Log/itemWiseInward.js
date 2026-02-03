import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model, log_inventory_invoice_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { createItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/itemWiseInward.js';

/**
 * Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * 
 * @route POST /api/V1/reports2/download-excel-item-wise-inward-daily-report
 * @access Private
 */
export const ItemWiseInwardDailyReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Item Wise Inward Report Request - Start Date:', startDate);
  console.log('Item Wise Inward Report Request - End Date:', endDate);
  console.log('Item Wise Inward Report Request - Filter:', filter);

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
    // Step 1: Get all unique item names from log inventory
    const allItemNames = await log_inventory_items_model.aggregate([
      {
        $match: itemFilter,
      },
      {
        $group: {
          _id: '$item_name',
        },
      },
    ]);

    const itemNames = allItemNames.map((i) => i._id).filter((name) => name);

    if (itemNames.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No stock data found for the selected period'
          )
        );
    }

    // Step 2: For each item name, calculate stock movements
    const stockData = await Promise.all(
      itemNames.map(async (item_name) => {
        // Get current available CMT from log_inventory (where issue_status = null)
        const currentLogCmt = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        // Get current available CMT from crosscutting_done (where issue_status = null)
        const currentCrosscutCmt = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$crosscut_cmt' },
            },
          },
        ]);

        // Get current available CMT from flitching_done (where issue_status = null)
        const currentFlitchCmt = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        const currentAvailableCmt =
          (currentLogCmt[0]?.total_cmt || 0) +
          (currentCrosscutCmt[0]?.total_cmt || 0) +
          (currentFlitchCmt[0]?.total_cmt || 0);

        // ROUND LOG DETAILS - Logs received during period (Invoice/Indian/Actual CMT)
        const logsReceived = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
            },
          },
          {
            $lookup: {
              from: 'log_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          {
            $unwind: '$invoice',
          },
          {
            $match: {
              'invoice.inward_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              invoice_cmt: { $sum: '$invoice_cmt' },
              indian_cmt: { $sum: '$indian_cmt' },
              actual_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        const invoiceCmt = logsReceived[0]?.invoice_cmt || 0;
        const indianCmt = logsReceived[0]?.indian_cmt || 0;
        const actualCmt = logsReceived[0]?.actual_cmt || 0;

        // CROSS CUT DETAILS - Issue for CC
        const issuedForCC = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: 'crosscutting',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        const issueForCc = issuedForCC[0]?.total_cmt || 0;

        // CC Received - Crosscutting completed during period
        const ccReceived = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
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

        const ccReceivedCmt = ccReceived[0]?.total_cmt || 0;
        const diffCmt = issueForCc - ccReceivedCmt;

        // FLITCHING - Crosscut items issued for flitching
        const flitchingIssued = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
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

        const flitchingCmt = flitchingIssued[0]?.total_cmt || 0;

        // PEEL - Crosscut items issued for peeling
        const peelingIssued = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
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

        const peelCmt = peelingIssued[0]?.total_cmt || 0;

        // SALES - Items issued to orders/challan from logs
        const logSales = await log_inventory_items_model.aggregate([
          {
            $match: {
              item_name,
              issue_status: { $in: ['order', 'challan'] },
              updatedAt: { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$physical_cmt' },
            },
          },
        ]);

        // Sales from crosscut items
        const crosscutSales = await crosscutting_done_model.aggregate([
          {
            $match: {
              item_name,
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

        // Sales from flitch items
        const flitchSales = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
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

        const salesCmt =
          (logSales[0]?.total_cmt || 0) +
          (crosscutSales[0]?.total_cmt || 0) +
          (flitchSales[0]?.total_cmt || 0);

        // Calculate total issued during period (for opening calculation)
        const totalIssuedCmt = issueForCc + salesCmt;

        // Calculate total received during period (for opening calculation)
        const totalReceivedCmt = actualCmt + ccReceivedCmt;

        // Opening Balance = Current Available + Issued - Received
        const openingBalanceCmt = currentAvailableCmt + totalIssuedCmt - totalReceivedCmt;

        // Closing Balance = Opening + Actual Received - Issue for CC + CC Received - Flitching - Peel - Sales
        const closingBalanceCmt = openingBalanceCmt + actualCmt - issueForCc + ccReceivedCmt - flitchingCmt - peelCmt - salesCmt;

        return {
          item_name,
          opening_stock_cmt: Math.max(0, openingBalanceCmt),
          invoice_cmt: invoiceCmt,
          indian_cmt: indianCmt,
          actual_cmt: actualCmt,
          issue_for_cc: issueForCc,
          cc_received: ccReceivedCmt,
          diff: diffCmt,
          flitching: flitchingCmt,
          sawing: 0, // Placeholder - needs clarification
          wooden_tile: 0, // Placeholder - needs clarification
          unedge: 0, // Placeholder - needs clarification
          peel: peelCmt,
          sales: salesCmt,
          closing_stock_cmt: Math.max(0, closingBalanceCmt),
        };
      })
    );

    // Filter out items with no activity (all zeros)
    const activeStockData = stockData.filter(
      (item) =>
        item.opening_stock_cmt > 0 ||
        item.invoice_cmt > 0 ||
        item.indian_cmt > 0 ||
        item.actual_cmt > 0 ||
        item.issue_for_cc > 0 ||
        item.cc_received > 0 ||
        item.flitching > 0 ||
        item.peel > 0 ||
        item.sales > 0 ||
        item.closing_stock_cmt > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No stock data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createItemWiseInwardReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Item wise inward report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating item wise inward report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
