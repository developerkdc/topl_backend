import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { issues_for_flitching_model } from '../../../database/schema/factory/flitching/issuedForFlitching.schema.js';
import { issued_for_slicing_model } from '../../../database/schema/factory/slicing/issue_for_slicing/issuedForSlicing.js';
import { slicing_done_other_details_model } from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import issue_for_slicing_wastage_model from '../../../database/schema/factory/slicing/issue_for_slicing/issue_for_slicing_wastage_schema.js';
import { createLogWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/logWiseFlitch.js';

/** Issue − received style variances are never negative in the report output. */
function nonNegativeDiff(minuend, subtrahend) {
  const a = parseFloat(minuend) || 0;
  const b = parseFloat(subtrahend) || 0;
  return Math.max(0, a - b);
}

/**
 * Log Wise Flitch Report Export (v4)
 * Generates a 19-column Excel report tracking individual log journey through factory:
 * Inward Date, Status, Opening Stock CMT, Round Log Detail CMT (Invoice, Indian, Actual),
 * Recover From Rejected, Flitch Details CMT (Issue/Received/Diff),
 * Slicing Details CMT (Issue/Received/Diff), Issue for Sq.Edge, Sales, Rejected
 * (both flitch + slicing wastage), Closing Stock CMT.
 * Uses same inventory-flow calculations as Item Wise v4.
 *
 * @route POST /api/V1/reports2/flitch/download-excel-log-wise-flitch-report
 * @access Private
 */
export const LogWiseFlitchReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

  console.log('Log Wise Flitch Report Request - Start Date:', startDate);
  console.log('Log Wise Flitch Report Request - End Date:', endDate);
  console.log('Log Wise Flitch Report Request - Filter:', filter);

  if (!startDate || !endDate) {
    return next(new ApiError('Start date and end date are required', 400));
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  const itemFilter = {};
  if (filter.item_name) {
    itemFilter.item_name = filter.item_name;
  }

  try {
    // ── STEP 1: Collect log numbers with inward_date in date range ──
    // Inventory: flitch_inventory_invoice_details.inward_date
    // Factory: flitching_done.worker_details.flitching_date
    const [inventoryLogNos, factoryLogNos] = await Promise.all([
      flitch_inventory_items_model.aggregate([
        { $match: { ...itemFilter } },
        {
          $lookup: {
            from: 'flitch_inventory_invoice_details',
            localField: 'invoice_id',
            foreignField: '_id',
            as: 'invoice',
          },
        },
        { $unwind: '$invoice' },
        { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
        { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
      ]),
      flitching_done_model.aggregate([
        {
          $match: {
            deleted_at: null,
            'worker_details.flitching_date': { $gte: start, $lte: end },
            ...itemFilter,
          },
        },
        { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
      ]),
    ]);

    const allLogNosMap = new Map();
    [...inventoryLogNos, ...factoryLogNos].forEach((item) => {
      if (item._id.log_no && item._id.item_name) {
        allLogNosMap.set(item._id.log_no, item._id.item_name);
      }
    });

    if (allLogNosMap.size === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No flitch data found for the selected period'));
    }

    // ── STEP 2: Calculate all metrics per log ──
    const logDataWithMetrics = await Promise.all(
      Array.from(allLogNosMap.entries()).map(async ([logNo, itemName]) => {

        // ── INWARD DATE & INVOICE REFERENCE ──
        // Prefer the earliest inventory invoice date; fall back to earliest factory flitching date.
        const inwardData = await flitch_inventory_items_model.aggregate([
          { $match: { log_no: logNo } },
          {
            $lookup: {
              from: 'flitch_inventory_invoice_details',
              localField: 'invoice_id',
              foreignField: '_id',
              as: 'invoice',
            },
          },
          { $unwind: '$invoice' },
          {
            $group: {
              _id: null,
              inward_date: { $min: '$invoice.inward_date' },
              invoice_no: { $first: '$invoice.inward_sr_no' },
            },
          },
        ]);

        let inwardDate = inwardData[0]?.inward_date || null;
        let invoiceRef = inwardData[0]?.invoice_no || null;

        if (!inwardDate) {
          const factoryDateData = await flitching_done_model.aggregate([
            { $match: { log_no: logNo, deleted_at: null } },
            {
              $group: {
                _id: null,
                flitching_date: { $min: '$worker_details.flitching_date' },
              },
            },
          ]);
          inwardDate = factoryDateData[0]?.flitching_date || null;
        }

        // ── STATUS DERIVATION ──
        // Derived from the most recently updated flitch item's issue_status.
        // Priority: Rejected > Slicing (issue_for_slicing) > Flitch (flitching) > Sales (order/challan) > Stock
        const [latestInvItem, latestFactItem] = await Promise.all([
          flitch_inventory_items_model
            .findOne({ log_no: logNo })
            .sort({ updatedAt: -1 })
            .select('issue_status'),
          flitching_done_model
            .findOne({ log_no: logNo, deleted_at: null })
            .sort({ updatedAt: -1 })
            .select('issue_status is_rejected'),
        ]);

        let logStatus = 'Stock';
        const primaryStatus = latestInvItem?.issue_status || latestFactItem?.issue_status;
        if (latestFactItem?.is_rejected) {
          logStatus = 'Rejected';
        } else if (primaryStatus === 'issue_for_slicing') {
          logStatus = 'Slicing';
        } else if (primaryStatus === 'slicing') {
          logStatus = 'Flitch';
        } else if (primaryStatus === 'order' || primaryStatus === 'challan') {
          logStatus = 'Sales';
        }

        // ── OPENING STOCK: flitching_done with issue_status=null created BEFORE start date ──
        const openingStockData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              'worker_details.flitching_date': { $lt: start },
              issue_status: null,
              deleted_at: null,
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
        ]);
        const openingStockCmt = openingStockData[0]?.total_cmt || 0;

        // ── ROUND LOG DETAIL CMT (Invoice, Indian, Actual) from LOG sources ──
        // LOG source determined by: crosscut_done_id = null
        const roundLogDetailFromLogData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              'worker_details.flitching_date': { $gte: start, $lte: end },
              deleted_at: null,
              crosscut_done_id: null,  // LOG source indicator
            },
          },
          {
            $lookup: {
              from: 'log_inventory_items_details',
              localField: 'log_inventory_item_id',
              foreignField: '_id',
              as: 'log_data',
            },
          },
          { $unwind: { path: '$log_data', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              invoice_cmt: { $sum: { $ifNull: ['$log_data.invoice_cmt', 0] } },
              indian_cmt: { $sum: { $ifNull: ['$log_data.indian_cmt', 0] } },
              actual_cmt: { $sum: { $ifNull: ['$log_data.physical_cmt', 0] } },
            },
          },
        ]);
        const roundLogFromLog = roundLogDetailFromLogData[0] || { invoice_cmt: 0, indian_cmt: 0, actual_cmt: 0 };

        // ── ROUND LOG DETAIL CMT from CROSSCUT sources ──
        // CROSSCUT source determined by: crosscut_done_id != null
        const roundLogDetailFromCrosscut = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              'worker_details.flitching_date': { $gte: start, $lte: end },
              deleted_at: null,
              crosscut_done_id: { $ne: null },  // CROSSCUT source indicator
            },
          },
          {
            $lookup: {
              from: 'crosscutting_done',
              localField: 'crosscut_done_id',
              foreignField: '_id',
              as: 'crosscut_data',
            },
          },
          { $unwind: { path: '$crosscut_data', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              actual_cmt: { $sum: { $ifNull: ['$crosscut_data.crosscut_cmt', 0] } },
            },
          },
        ]);
        const roundLogFromCrosscut = roundLogDetailFromCrosscut[0] || { actual_cmt: 0 };

        // Combine LOG + CROSSCUT for total Round Log Detail
        const invoiceCmt = roundLogFromLog.invoice_cmt;
        const indianCmt = roundLogFromLog.indian_cmt;
        const actualCmt = roundLogFromLog.actual_cmt + roundLogFromCrosscut.actual_cmt;

        // ── ISSUE FOR FLITCH — from issues_for_flitching_model (actual issue records, in period) ──
        const issueForFlitchData = await issues_for_flitching_model.aggregate([
          {
            $match: {
              log_no: logNo,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$cmt' } } },
        ]);

        const issueForFlitch = issueForFlitchData[0]?.total_cmt || 0;

        // ── FLITCH RECEIVED — inventory + factory in period ──
        const [flitchReceivedData, ccReceivedData] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            { $match: { log_no: logNo } },
            {
              $lookup: {
                from: 'flitch_inventory_invoice_details',
                localField: 'invoice_id',
                foreignField: '_id',
                as: 'invoice',
              },
            },
            { $unwind: '$invoice' },
            { $match: { 'invoice.inward_date': { $gte: start, $lte: end } } },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
          flitching_done_model.aggregate([
            {
              $match: {
                log_no: logNo,
                deleted_at: null,
                'worker_details.flitching_date': { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);

        const flitchReceivedCmt = flitchReceivedData[0]?.total_cmt || 0;
        const ccReceivedCmt = ccReceivedData[0]?.total_cmt || 0;
        const totalFlitchReceived = flitchReceivedCmt + ccReceivedCmt;

        // ── ISSUE FOR SLICING — from issued_for_slicing_model (in period) ──
        const issueForSlicingData = await issued_for_slicing_model.aggregate([
          {
            $match: {
              log_no: logNo,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$cmt' } } },
        ]);
        const issueForSlicing = issueForSlicingData[0]?.total_cmt || 0;

        // ── SLICING RECEIVED — from slicing_done_other_details, lookup issued_for_slicing for log_no (in period) ──
        const slicingReceivedData = await slicing_done_other_details_model.aggregate([
          {
            $match: {
              slicing_date: { $gte: start, $lte: end },
            },
          },
          {
            $lookup: {
              from: 'issued_for_slicings',
              localField: 'issue_for_slicing_id',
              foreignField: '_id',
              as: 'slicing_issue',
            },
          },
          { $unwind: { path: '$slicing_issue', preserveNullAndEmptyArrays: true } },
          {
            $match: {
              'slicing_issue.log_no': logNo,
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$total_cmt' } } },
        ]);
        const slicingReceivedCmt = slicingReceivedData[0]?.total_cmt || 0;

        // ── SALES — order/challan only (in period) ──
        const [inventorySalesData, factorySalesData] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                issue_status: { $in: ['order', 'challan'] },
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
          flitching_done_model.aggregate([
            {
              $match: {
                log_no: logNo,
                deleted_at: null,
                issue_status: { $in: ['order', 'challan'] },
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);

        const salesCmt =
          (inventorySalesData[0]?.total_cmt || 0) +
          (factorySalesData[0]?.total_cmt || 0);

        // ── REJECTED — flitch wastage (wastage_info.wastage_sqm) + slicing wastage (issue_for_slicing_wastage.cmt) ──
        const [flitchWastageData, slicingWastageData] = await Promise.all([
          flitching_done_model.aggregate([
            {
              $match: {
                log_no: logNo,
                deleted_at: null,
                'worker_details.flitching_date': { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_wastage: { $sum: '$wastage_info.wastage_sqm' } } },
          ]),
          issue_for_slicing_wastage_model.aggregate([
            {
              $match: {
                log_no: logNo,
                'created_at': { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_wastage: { $sum: '$cmt' } } },
          ]),
        ]);

        const flitchWastage = flitchWastageData[0]?.total_wastage || 0;
        const slicingWastage = slicingWastageData[0]?.total_wastage || 0;
        const totalRejected = flitchWastage + slicingWastage;

        // ── BALANCE CALCULATIONS (inventory-flow based) ──
        // Closing Stock = MAX(0, Opening + Received - Issued - Sales)
        const closingStockCmt = Math.max(
          0,
          openingStockCmt + totalFlitchReceived - issueForFlitch - salesCmt
        );

        return {
          item_name: itemName,
          log_no: logNo,
          inward_date: inwardDate,
          status: logStatus,
          op_bal: openingStockCmt,
          invoice_cmt: invoiceCmt,
          indian_cmt: indianCmt,
          actual_cmt: actualCmt,
          recover_from_rejected: 0,           // placeholder – no source defined
          issue_for_flitch: issueForFlitch,
          flitch_received: totalFlitchReceived,
          flitch_diff: nonNegativeDiff(issueForFlitch, totalFlitchReceived),
          issue_for_slicing: issueForSlicing,
          slicing_received: slicingReceivedCmt,
          slicing_diff: nonNegativeDiff(issueForSlicing, slicingReceivedCmt),
          issue_for_sqedge: 0,                // placeholder – no source defined
          sales: salesCmt,
          rejected: totalRejected,
          fl_closing: closingStockCmt,
        };
      })
    );

    // ── STEP 3: Filter logs that have activity in the period or carry a balance ──
    const activeLogsData = logDataWithMetrics.filter(
      (log) =>
        log.op_bal > 0 ||
        log.flitch_received > 0 ||
        log.issue_for_flitch > 0 ||
        log.fl_closing > 0 ||
        log.slicing_received > 0 ||
        log.sales > 0 ||
        log.rejected > 0
    );

    if (activeLogsData.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No flitch data found for the selected period'));
    }

    // Sort by item_name, then log_no
    activeLogsData.sort((a, b) => {
      const nameCompare = a.item_name.localeCompare(b.item_name);
      if (nameCompare !== 0) return nameCompare;
      return a.log_no.localeCompare(b.log_no);
    });

    const excelLink = await createLogWiseFlitchReportExcel(
      activeLogsData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(200, 'Log wise flitch report generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating log wise flitch report:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
