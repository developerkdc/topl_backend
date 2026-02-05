import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { createItemWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/itemWiseFlitch.js';

/**
 * Item Wise Flitch Report Export
 * Generates a comprehensive Excel report tracking flitch inventory movements
 * including opening balance, crosscut received, flitch received, issued, and closing balance
 * 
 * @route POST /api/V1/reports2/flitch/download-excel-item-wise-flitch-report
 * @access Private
 */
export const ItemWiseFlitchReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Item Wise Flitch Report Request - Start Date:', startDate);
  console.log('Item Wise Flitch Report Request - End Date:', endDate);
  console.log('Item Wise Flitch Report Request - Filter:', filter);

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
    // Step 1: Get all unique item names from flitching inventory
    const allItemNames = await flitching_done_model.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
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
            'No flitch data found for the selected period'
          )
        );
    }

    // Step 2: For each item name, calculate stock movements
    const stockData = await Promise.all(
      itemNames.map(async (item_name) => {
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

        const currentAvailableFlitchCmt = currentFlitchCmt[0]?.total_cmt || 0;

        // Get current available Physical GMT from log_inventory (where issue_status = null)
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

        const physicalGmt = currentLogCmt[0]?.total_cmt || 0;

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

        // Flitch Received - Flitching completed during period
        const flitchReceived = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              'worker_details.flitching_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);

        const flitchReceivedCmt = flitchReceived[0]?.total_cmt || 0;

        // Flitch Issued - Flitch items issued during period
        const flitchIssued = await flitching_done_model.aggregate([
          {
            $match: {
              item_name,
              deleted_at: null,
              issue_status: { $in: ['slicing', 'slicing_peeling', 'order', 'challan'] },
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

        const flitchIssuedCmt = flitchIssued[0]?.total_cmt || 0;

        // Calculate Opening Balance = Current Available + Issued - Received
        const openingBalanceCmt = currentAvailableFlitchCmt + flitchIssuedCmt - flitchReceivedCmt;

        // Calculate Closing Balance = Opening + Flitch Received - Flitch Issued
        const closingBalanceCmt = openingBalanceCmt + flitchReceivedCmt - flitchIssuedCmt;

        return {
          item_name,
          physical_gmt: Math.max(0, physicalGmt),
          cc_received: ccReceivedCmt,
          opening_balance: Math.max(0, openingBalanceCmt),
          flitch_received: flitchReceivedCmt,
          flitch_issued: flitchIssuedCmt,
          closing_balance: Math.max(0, closingBalanceCmt),
        };
      })
    );

    // Filter out items with no activity (all zeros)
    const activeStockData = stockData.filter(
      (item) =>
        item.physical_gmt > 0 ||
        item.cc_received > 0 ||
        item.opening_balance > 0 ||
        item.flitch_received > 0 ||
        item.flitch_issued > 0 ||
        item.closing_balance > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No flitch data found for the selected period'
          )
        );
    }

    // Generate Excel file
    const excelLink = await createItemWiseFlitchReportExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Item wise flitch report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating item wise flitch report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
