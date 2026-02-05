import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { slicing_done_items_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { slicing_done_other_details_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import { peeling_done_items_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { createLogWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/logWiseFlitch.js';

/**
 * Log Wise Flitch Report Export
 * Generates a comprehensive Excel report tracking complete journey of individual flitch logs
 * from inward receipt through crosscutting, slicing, peeling, and sales
 * Shows one row per log with item grouping
 * 
 * @route POST /api/V1/reports2/flitch/download-excel-log-wise-flitch-report
 * @access Private
 */
export const LogWiseFlitchReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Log Wise Flitch Report Request - Start Date:', startDate);
  console.log('Log Wise Flitch Report Request - End Date:', endDate);
  console.log('Log Wise Flitch Report Request - Filter:', filter);

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
    // Step 1: Get all unique log_no values from both flitch inventory and factory
    // Get log_no from flitch inventory items
    const inventoryLogNos = await flitch_inventory_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { log_no: '$log_no', item_name: '$item_name' },
        },
      },
    ]);

    // Get log_no from flitching done (factory)
    const factoryLogNos = await flitching_done_model.aggregate([
      {
        $match: {
          deleted_at: null,
          ...itemFilter,
        },
      },
      {
        $group: {
          _id: { log_no: '$log_no', item_name: '$item_name' },
        },
      },
    ]);

    // Combine unique log numbers
    const allLogNosMap = new Map();
    [...inventoryLogNos, ...factoryLogNos].forEach((item) => {
      if (item._id.log_no && item._id.item_name) {
        allLogNosMap.set(item._id.log_no, item._id.item_name);
      }
    });

    if (allLogNosMap.size === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No flitch data found for the selected period'
          )
        );
    }

    // Step 2: For each log_no, calculate all metrics
    const logDataWithMetrics = await Promise.all(
      Array.from(allLogNosMap.entries()).map(async ([logNo, itemName]) => {
        // CURRENT AVAILABLE CMT - Sum from both inventory and factory where issue_status is null
        const currentInventoryCmt = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
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

        const currentFactoryCmt = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
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
          (currentInventoryCmt[0]?.total_cmt || 0) +
          (currentFactoryCmt[0]?.total_cmt || 0);

        // FLITCH RECEIVED (from inventory during period)
        const flitchReceivedData = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
            },
          },
          {
            $lookup: {
              from: 'flitch_inventory_invoice_details',
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
              total_cmt: { $sum: '$flitch_cmt' },
            },
          },
        ]);
        const flitchReceivedCmt = flitchReceivedData[0]?.total_cmt || 0;

        // CC RECEIVED (from factory flitching done during period)
        const ccReceivedData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
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
        const ccReceivedCmt = ccReceivedData[0]?.total_cmt || 0;

        // FL ISSUED (issued for orders/challan during period from both sources)
        const inventoryIssuedData = await flitch_inventory_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
              issue_status: { $in: ['order', 'challan', 'slicing', 'slicing_peeling'] },
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

        const factoryIssuedData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
              issue_status: { $in: ['order', 'challan', 'slicing', 'slicing_peeling'] },
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

        const flIssuedCmt =
          (inventoryIssuedData[0]?.total_cmt || 0) +
          (factoryIssuedData[0]?.total_cmt || 0);

        // SQ RECEIVED (slicing done from this log during period)
        const sqReceivedData = await slicing_done_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
            },
          },
          {
            $lookup: {
              from: 'slicing_done_other_details',
              localField: 'slicing_done_other_details_id',
              foreignField: '_id',
              as: 'slicing_details',
            },
          },
          {
            $unwind: '$slicing_details',
          },
          {
            $match: {
              'slicing_details.slicing_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_sqm: { $sum: '$natural_sqm' },
            },
          },
        ]);
        const sqReceivedSqm = sqReceivedData[0]?.total_sqm || 0;

        // UN RECEIVED (placeholder - not implemented in system)
        const unReceivedCmt = 0;

        // PEEL RECEIVED (peeling done from this log during period)
        const peelReceivedData = await peeling_done_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
              output_type: { $in: ['face', 'core'] },
            },
          },
          {
            $lookup: {
              from: 'peeling_done_other_details',
              localField: 'peeling_done_other_details_id',
              foreignField: '_id',
              as: 'peeling_details',
            },
          },
          {
            $unwind: '$peeling_details',
          },
          {
            $match: {
              'peeling_details.peeling_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$cmt' },
            },
          },
        ]);
        const peelReceivedCmt = peelReceivedData[0]?.total_cmt || 0;

        // CALCULATE OPENING BALANCE
        // Total Received in period
        const totalReceivedInPeriod = flitchReceivedCmt + ccReceivedCmt;

        // Opening = Current Available + Issued - Received
        const openingBalanceCmt = currentAvailableCmt + flIssuedCmt - totalReceivedInPeriod;

        // CALCULATE CLOSING BALANCE
        // Closing = Opening + Received - Issued
        const closingBalanceCmt = openingBalanceCmt + totalReceivedInPeriod - flIssuedCmt;

        // Physical CMT = Closing Balance
        const physicalCmt = closingBalanceCmt;

        return {
          item_name: itemName,
          log_no: logNo,
          physical_cmt: Math.max(0, physicalCmt),
          cc_received: ccReceivedCmt,
          op_bal: Math.max(0, openingBalanceCmt),
          flitch_received: flitchReceivedCmt,
          fl_issued: flIssuedCmt,
          fl_closing: Math.max(0, closingBalanceCmt),
          sq_received: sqReceivedSqm,
          un_received: unReceivedCmt,
          peel_received: peelReceivedCmt,
        };
      })
    );

    // Step 3: Filter logs that have activity in the period or have balances
    const activeLogsData = logDataWithMetrics.filter(
      (log) =>
        log.op_bal > 0 ||
        log.flitch_received > 0 ||
        log.cc_received > 0 ||
        log.fl_issued > 0 ||
        log.fl_closing > 0 ||
        log.sq_received > 0 ||
        log.peel_received > 0
    );

    if (activeLogsData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            404,
            'No flitch data found for the selected period'
          )
        );
    }

    // Sort by item_name, then log_no
    activeLogsData.sort((a, b) => {
      const nameCompare = a.item_name.localeCompare(b.item_name);
      if (nameCompare !== 0) return nameCompare;
      return a.log_no.localeCompare(b.log_no);
    });

    // Generate Excel file
    const excelLink = await createLogWiseFlitchReportExcel(
      activeLogsData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Log wise flitch report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating log wise flitch report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
