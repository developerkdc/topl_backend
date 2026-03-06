import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { flitch_inventory_items_model } from '../../../database/schema/inventory/Flitch/flitch.schema.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import { peeling_done_items_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import { createLogWiseFlitchReportExcel } from '../../../config/downloadExcel/reports2/Flitch/logWiseFlitch.js';

/**
 * Log Wise Flitch Report Export
 * Generates a comprehensive Excel report tracking the complete journey of individual
 * flitch logs with multi-level columns: Inward Date, Status, Opening/Closing Stock,
 * Recovered From rejected, Invoice, Received Flitch Detail CMT (Indian/Actual),
 * Flitch Details CMT (Issue/Received/Diff), Peeling Details CMT (Issue/Received/Diff),
 * Round log + Cross Cu (Issue for Sq.Edge, Sales, Rejected).
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
    // ── STEP 1: Collect all unique log numbers ──
    const [inventoryLogNos, factoryLogNos] = await Promise.all([
      flitch_inventory_items_model.aggregate([
        { $match: { ...itemFilter } },
        { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
      ]),
      flitching_done_model.aggregate([
        { $match: { deleted_at: null, ...itemFilter } },
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
        // Priority: Rejected > Peeling (slicing_peeling) > Flitch (slicing) > Sales (order/challan) > Stock
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
        } else if (primaryStatus === 'slicing_peeling') {
          logStatus = 'Peeling';
        } else if (primaryStatus === 'slicing') {
          logStatus = 'Flitch';
        } else if (primaryStatus === 'order' || primaryStatus === 'challan') {
          logStatus = 'Sales';
        }

        // ── CURRENT AVAILABLE CMT (all-time balance, both sources) ──
        const [currentInventoryCmt, currentFactoryCmt] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
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
          (currentInventoryCmt[0]?.total_cmt || 0) +
          (currentFactoryCmt[0]?.total_cmt || 0);

        // ── FLITCH RECEIVED — inventory (invoice date in period) ──
        const flitchReceivedData = await flitch_inventory_items_model.aggregate([
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
        ]);
        const flitchReceivedCmt = flitchReceivedData[0]?.total_cmt || 0;

        // ── CC RECEIVED — factory flitching (flitching_date in period) ──
        const ccReceivedData = await flitching_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              deleted_at: null,
              'worker_details.flitching_date': { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
        ]);
        const ccReceivedCmt = ccReceivedData[0]?.total_cmt || 0;

        // Total flitch received in period (both sources)
        const totalFlitchReceived = flitchReceivedCmt + ccReceivedCmt;

        // ── ISSUE FOR FLITCH — total issued from flitch stock (all statuses, in period) ──
        const [inventoryIssuedData, factoryIssuedData] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                issue_status: { $in: ['order', 'challan', 'slicing', 'slicing_peeling'] },
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
                issue_status: { $in: ['order', 'challan', 'slicing', 'slicing_peeling'] },
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);

        const flIssuedCmt =
          (inventoryIssuedData[0]?.total_cmt || 0) +
          (factoryIssuedData[0]?.total_cmt || 0);

        // ── ISSUE FOR PEELING — slicing_peeling status only (in period) ──
        const [inventoryPeelingData, factoryPeelingData] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                issue_status: 'slicing_peeling',
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
                issue_status: 'slicing_peeling',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);

        const issueForPeeling =
          (inventoryPeelingData[0]?.total_cmt || 0) +
          (factoryPeelingData[0]?.total_cmt || 0);

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

        // ── REJECTED — is_rejected = true (in period) ──
        const [inventoryRejectedData, factoryRejectedData] = await Promise.all([
          flitch_inventory_items_model.aggregate([
            {
              $match: {
                log_no: logNo,
                is_rejected: true,
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
                is_rejected: true,
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total_cmt: { $sum: '$flitch_cmt' } } },
          ]),
        ]);

        const rejectedCmt =
          (inventoryRejectedData[0]?.total_cmt || 0) +
          (factoryRejectedData[0]?.total_cmt || 0);

        // ── PEELING RECEIVED — peeling output (face/core) in period ──
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
          { $unwind: '$peeling_details' },
          { $match: { 'peeling_details.peeling_date': { $gte: start, $lte: end } } },
          { $group: { _id: null, total_cmt: { $sum: '$cmt' } } },
        ]);
        const peelReceivedCmt = peelReceivedData[0]?.total_cmt || 0;

        // ── BALANCE CALCULATIONS ──
        // Opening = Current Available + Total Issued (period) − Total Received (period)
        const openingBalanceCmt = currentAvailableCmt + flIssuedCmt - totalFlitchReceived;
        // Closing = Opening + Received − Issued  (= currentAvailableCmt)
        const closingBalanceCmt = openingBalanceCmt + totalFlitchReceived - flIssuedCmt;

        return {
          item_name: itemName,
          log_no: logNo,
          inward_date: inwardDate,
          status: logStatus,
          op_bal: Math.max(0, openingBalanceCmt),
          recover_from_rejected: 0,         // placeholder – no source defined
          invoice_ref: invoiceRef,
          indian_cmt: 0,                    // placeholder – no indian_cmt in flitch schema
          actual_cmt: totalFlitchReceived,  // total flitch received (inventory + CC)
          issue_for_flitch: flIssuedCmt,
          flitch_received: totalFlitchReceived,
          flitch_diff: flIssuedCmt - totalFlitchReceived,
          issue_for_peeling: issueForPeeling,
          peel_received: peelReceivedCmt,
          peeling_diff: issueForPeeling - peelReceivedCmt,
          issue_for_sqedge: 0,              // placeholder – no source defined
          sales: salesCmt,
          rejected: rejectedCmt,
          fl_closing: Math.max(0, closingBalanceCmt),
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
        log.peel_received > 0 ||
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
