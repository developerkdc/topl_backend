import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { log_inventory_items_model, log_inventory_items_view_model } from '../../../database/schema/inventory/log/log.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { rejected_crosscutting_model } from '../../../database/schema/factory/crossCutting/rejectedCrosscutting.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import issues_for_peeling_wastage_model from '../../../database/schema/factory/peeling/issues_for_peeling/issues_for_peeling_wastage.schema.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { createLogItemWiseInwardReportExcel } from '../../../config/downloadExcel/reports2/Log/logItemWiseInward.js';

/**
 * Log Item Wise Inward Daily Report Export
 * Generates a comprehensive CSV/Excel report tracking complete journey of individual logs
 * from inward receipt through crosscutting, flitching, peeling, and sales
 * Shows one row per log with item grouping
 * 
 * @route POST /api/V1/report/download-excel-log-item-wise-inward-daily-report
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
    // Step 1: Get logs with inward_date in the selected date range
    const logsInPeriodByInward = await log_inventory_items_model.aggregate([
      { $match: itemFilter },
      {
        $lookup: {
          from: 'log_inventory_invoice_details',
          localField: 'invoice_id',
          foreignField: '_id',
          as: 'invoice',
        },
      },
      { $unwind: '$invoice' },
      { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
      { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
    ]);

    const allLogsMap = new Map();
    logsInPeriodByInward.forEach((item) => {
      if (item._id.log_no && item._id.item_name) {
        allLogsMap.set(item._id.log_no, item._id.item_name);
      }
    });

    if (allLogsMap.size === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No log data found for the selected date range (inward_date filter)'));
    }

    const now = new Date();
    const isCurrentPeriod = end >= now;

    // Step 2: For each log, calculate all metrics using formula: Opening = Closing + Issued - Received
    const logDataWithMetrics = await Promise.all(
      Array.from(allLogsMap.entries()).map(async ([logNo, itemName]) => {
        // Get log details (inward_date, invoice, indian, actual) from first matching inventory item
        const logView = await log_inventory_items_view_model.findOne({ log_no: logNo }).sort({ updatedAt: -1 });
        const inwardDate = logView?.log_invoice_details?.inward_date || null;
        const status = logView?.issue_status || '';
        const invoiceCmt = logView?.invoice_cmt || 0;
        const indianCmt = logView?.indian_cmt || 0;
        const actualCmt = logView?.physical_cmt || 0;

        let recoverFromRejected = 0;
        let issueForSqedge = 0;

        // CURRENT AVAILABLE (Closing) = round log + crosscut + flitch with issue_status=null
        const [currentLogCmt, currentCcCmt, currentFlitchCmt] = await Promise.all([
          log_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
          ]),
          crosscutting_done_model.aggregate([
            {
              $match: {
                log_no: logNo,
                $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
          ]),
          flitching_done_model.aggregate([
            {
              $match: {
                log_no: logNo,
                deleted_at: null,
                $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);
        const currentAvailableCmt =
          (currentLogCmt[0]?.total_cmt || 0) +
          (currentCcCmt[0]?.total_cmt || 0) +
          (currentFlitchCmt[0]?.total_cmt || 0);

        // RECEIVED IN PERIOD = physical_cmt for logs with inward_date in period
        const receivedInPeriodData = await log_inventory_items_model.aggregate([
          { $match: { log_no: logNo } },
          {
            $lookup: {
              from: 'log_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          { $unwind: '$invoice' },
          { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
          { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
        ]);
        const receivedCmt = receivedInPeriodData[0]?.total_cmt || 0;

        // ISSUE FOR CC – issued during period
        const issueForCcData = await log_inventory_items_model.aggregate([
          {
            $match: {
              log_no: logNo,
              issue_status: 'crosscutting',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
        ]);
        const issueForCc = issueForCcData[0]?.total_cmt || 0;

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

        // Crosscut issued ahead (for cc_issued)
        const ccIssuedData = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              createdAt: { $gte: start, $lte: end },
              issue_status: { $ne: null },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
        ]);
        const ccIssuedCmt = ccIssuedData[0]?.total_cmt || 0;

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

        // Flitch received from flitching_done
        const flitchReceivedData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
        ]);
        const flitchReceivedCmt = flitchReceivedData[0]?.total_cmt || 0;

        // SAWING - Placeholder (awaiting clarification on data source)
        const sawingCmt = 0;

        // WOODEN TILE - Placeholder (awaiting clarification on data source)
        const woodenTileCmt = 0;

        // UNEDGE - Placeholder (awaiting clarification on data source)
        const unedgeCmt = 0;

        // PEELING ISSUED - Crosscut items from this log issued for peeling during period
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

        // PEELING RECEIVED - from peeling_done_other_details.total_cmt, allocated by log_no
        const peelingReceivedData = await peeling_done_other_details_model.aggregate([
          {
            $match: {
              peeling_date: { $gte: start, $lte: end },
            },
          },
          {
            $lookup: {
              from: 'peeling_done_items',
              localField: '_id',
              foreignField: 'peeling_done_other_details_id',
              as: 'items',
            },
          },
          {
            $addFields: {
              itemsSum: { $sum: '$items.cmt' },
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.log_no': logNo } },
          {
            $group: {
              _id: '$_id',
              total_cmt: { $first: '$total_cmt' },
              itemsSum: { $first: '$itemsSum' },
              logItemsCmt: { $sum: '$items.cmt' },
            },
          },
          {
            $addFields: {
              allocatedCmt: {
                $cond: [
                  { $eq: ['$itemsSum', 0] },
                  0,
                  { $multiply: ['$total_cmt', { $divide: ['$logItemsCmt', '$itemsSum'] }] },
                ],
              },
            },
          },
          {
            $group: {
              _id: null,
              total_cmt: { $sum: '$allocatedCmt' },
            },
          },
        ]);
        const peelingReceivedCmt = peelingReceivedData[0]?.total_cmt || 0;

        // SALES (order only) and JOB WORK CHALLAN (challan only)
        const [logOrderData, logChallanData, crosscutOrderData, crosscutChallanData, flitchOrderData, flitchChallanData] = await Promise.all([
          log_inventory_items_model.aggregate([
            { $match: { log_no: logNo, issue_status: 'order', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
          ]),
          log_inventory_items_model.aggregate([
            { $match: { log_no: logNo, issue_status: 'challan', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
          ]),
          crosscutting_done_model.aggregate([
            { $match: { log_no: logNo, issue_status: 'order', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
          ]),
          crosscutting_done_model.aggregate([
            { $match: { log_no: logNo, issue_status: 'challan', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
          ]),
          flitching_done_model.aggregate([
            { $match: { log_no: logNo, deleted_at: null, issue_status: 'order', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
          flitching_done_model.aggregate([
            { $match: { log_no: logNo, deleted_at: null, issue_status: 'challan', updatedAt: { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);
        const salesCmt =
          (logOrderData[0]?.total_cmt || 0) +
          (crosscutOrderData[0]?.total_cmt || 0) +
          (flitchOrderData[0]?.total_cmt || 0);
        const jobWorkChallan =
          (logChallanData[0]?.total_cmt || 0) +
          (crosscutChallanData[0]?.total_cmt || 0) +
          (flitchChallanData[0]?.total_cmt || 0);

        // REJECTED (Cc+Flitch+Peeling): CC=rejected crosscutting, Flitch=wastage CMT, Peeling=peeling wastage
        const rejectedCrosscutData = await rejected_crosscutting_model.aggregate([
          {
            $match: {
              log_no: logNo,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$rejected_quantity.physical_cmt' } } },
        ]);
        const rejectedFlitchData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
              createdAt: { $gte: start, $lte: end },
            },
          },
          {
            $addFields: {
              wastageCmt: {
                $multiply: [
                  { $ifNull: ['$wastage_info.wastage_sqm', 0] },
                  { $ifNull: ['$sqm_factor', 1] },
                ],
              },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$wastageCmt' } } },
        ]);
        const rejectedPeelData = await issues_for_peeling_wastage_model.aggregate([
          { $match: { createdAt: { $gte: start, $lte: end } } },
          {
            $lookup: {
              from: 'issues_for_peelings',
              localField: 'issue_for_peeling_id',
              foreignField: '_id',
              as: 'issue',
            },
          },
          { $unwind: '$issue' },
          { $match: { 'issue.log_no': logNo } },
          { $group: { _id: null, total_cmt: { $sum: '$cmt' } } },
        ]);
        const rejectedCc = rejectedCrosscutData[0]?.total_cmt || 0;
        const rejectedFlitch = rejectedFlitchData[0]?.total_cmt || 0;
        const rejectedPeel = rejectedPeelData[0]?.total_cmt || 0;
        const rejected = rejectedCc + rejectedFlitch + rejectedPeel;

        if (rejected > 0) {
          console.log('Rejected Stock [Log Item Wise]:', logNo, itemName, '| CC:', rejectedCc, '| Flitch:', rejectedFlitch, '| Peeling:', rejectedPeel, '| Total:', rejected);
        }

        // Period-end closing: for past periods, reconstruct from current - received_after + issued_after
        let periodEndClosingCmt = currentAvailableCmt;
        if (!isCurrentPeriod) {
          const [recAfterData, issueCcAfterData, flitchAfterData, peelAfterData, logSalesAfterData, ccSalesAfterData, flitchSalesAfterData, rejCcAfterData, rejFlitchAfterData, rejPeelAfterData] = await Promise.all([
            log_inventory_items_model.aggregate([
              { $match: { log_no: logNo } },
              { $lookup: { from: 'log_inventory_invoice_details', localField: 'invoice_id', foreignField: '_id', as: 'invoice' } },
              { $unwind: '$invoice' },
              { $match: { 'invoice.inward_date': { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
            ]),
            log_inventory_items_model.aggregate([
              { $match: { log_no: logNo, issue_status: 'crosscutting', updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
            ]),
            crosscutting_done_model.aggregate([
              { $match: { log_no: logNo, issue_status: 'flitching', updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
            ]),
            crosscutting_done_model.aggregate([
              { $match: { log_no: logNo, issue_status: 'peeling', updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
            ]),
            log_inventory_items_model.aggregate([
              { $match: { log_no: logNo, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$physical_cmt' } } },
            ]),
            crosscutting_done_model.aggregate([
              { $match: { log_no: logNo, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$crosscut_cmt' } } },
            ]),
            flitching_done_model.aggregate([
              { $match: { log_no: logNo, deleted_at: null, issue_status: { $in: ['order', 'challan'] }, updatedAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
            ]),
            rejected_crosscutting_model.aggregate([
              { $match: { log_no: logNo, createdAt: { $gt: end } } },
              { $group: { _id: null, total_cmt: { $sum: '$rejected_quantity.physical_cmt' } } },
            ]),
            flitching_done_model.aggregate([
              {
                $match: { log_no: logNo, deleted_at: null, createdAt: { $gt: end } },
              },
              {
                $addFields: {
                  wastageCmt: {
                    $multiply: [
                      { $ifNull: ['$wastage_info.wastage_sqm', 0] },
                      { $ifNull: ['$sqm_factor', 1] },
                    ],
                  },
                },
              },
              { $group: { _id: null, total_cmt: { $sum: '$wastageCmt' } } },
            ]),
            issues_for_peeling_wastage_model.aggregate([
              { $match: { createdAt: { $gt: end } } },
              { $lookup: { from: 'issues_for_peelings', localField: 'issue_for_peeling_id', foreignField: '_id', as: 'issue' } },
              { $unwind: '$issue' },
              { $match: { 'issue.log_no': logNo } },
              { $group: { _id: null, total_cmt: { $sum: '$cmt' } } },
            ]),
          ]);
          const receivedAfter = recAfterData[0]?.total_cmt || 0;
          const issuedAfter =
            (issueCcAfterData[0]?.total_cmt || 0) +
            (flitchAfterData[0]?.total_cmt || 0) +
            (peelAfterData[0]?.total_cmt || 0) +
            (logSalesAfterData[0]?.total_cmt || 0) +
            (ccSalesAfterData[0]?.total_cmt || 0) +
            (flitchSalesAfterData[0]?.total_cmt || 0) +
            (rejCcAfterData[0]?.total_cmt || 0) +
            (rejFlitchAfterData[0]?.total_cmt || 0) +
            (rejPeelAfterData[0]?.total_cmt || 0);
          periodEndClosingCmt = Math.max(0, currentAvailableCmt - receivedAfter + issuedAfter);
        }

        // FORMULA: Opening = Closing + Issued - Received
        // Issued = issue_for_cc + issue_for_flitch + peeling_issued + sales + job_work_challan + rejected
        const totalIssued =
          issueForCc +
          flitchingCmt +
          peelCmt +
          salesCmt +
          jobWorkChallan +
          rejected;
        const openingBalanceCmt = Math.max(0, periodEndClosingCmt + totalIssued - receivedCmt);
        const closingBalanceCmt = openingBalanceCmt + receivedCmt - totalIssued;

        return {
          item_name: itemName,
          log_no: logNo,
          inward_date: inwardDate,
          status,
          opening_balance_cmt: openingBalanceCmt,
          received_cmt: receivedCmt,
          invoice_cmt: invoiceCmt,
          indian_cmt: indianCmt,
          actual_cmt: actualCmt,
          recover_from_rejected: recoverFromRejected,
          issue_for_cc: issueForCc,
          cc_received: ccReceivedCmt,
          cc_issued: ccIssuedCmt,
          cc_diff: issueForCc - ccReceivedCmt,
          issue_for_flitch: flitchingCmt,
          flitch_received: flitchReceivedCmt,
          flitch_diff: flitchingCmt - flitchReceivedCmt,
          issue_for_sqedge: issueForSqedge,
          peeling_issued: peelCmt,
          peeling_received: peelingReceivedCmt,
          peeling_diff: peelCmt - peelingReceivedCmt,
          sales: salesCmt,
          job_work_challan: jobWorkChallan,
          rejected,
          closing_stock_cmt: Math.max(0, closingBalanceCmt),
        };
      })
    );

    // Step 3: Filter logs that have activity or carry a balance
    const activeLogs = logDataWithMetrics.filter(
      (log) =>
        log.opening_balance_cmt > 0 ||
        log.received_cmt > 0 ||
        log.issue_for_cc > 0 ||
        log.closing_stock_cmt > 0 ||
        log.cc_received > 0 ||
        log.issue_for_flitch > 0 ||
        log.flitch_received > 0 ||
        log.peeling_issued > 0 ||
        log.peeling_received > 0 ||
        log.sales > 0 ||
        log.rejected > 0
    );

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
