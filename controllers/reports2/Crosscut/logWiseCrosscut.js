import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_crosscutting_model } from '../../../database/schema/factory/crossCutting/issuedForCutting.schema.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import { createLogWiseCrosscutReportExcel } from '../../../config/downloadExcel/reports2/Crosscut/logWiseCrosscut.js';

/**
 * Log Wise Crosscut Report Export
 * Generates Excel report: one row per log (grouped by Item Name) with
 * Invoice CMT, Indian CMT, Physical CMT, Op Bal, CC Received, CC Issued, CC Closing,
 * Physical Length, CC Length, Flitch Received, SQ Received, UN Received, Peel Received.
 * Totals row after each item group and grand total at end.
 *
 * @route POST /api/V1/report/download-excel-log-wise-crosscut-report
 * @access Private
 */
export const LogWiseCrosscutReportExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {} } = req.body;

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

  const itemFilter = filter.item_name ? { item_name: filter.item_name } : {};

  try {
    // Distinct (log_no, item_name) from issues_for_crosscutting
    const fromIssues = await issues_for_crosscutting_model.aggregate([
      { $match: itemFilter },
      { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
    ]);

    // Distinct (log_no, item_name) from crosscutting_done (exclude soft-deleted)
    const fromDone = await crosscutting_done_model.aggregate([
      { $match: { deleted_at: null, ...itemFilter } },
      { $group: { _id: { log_no: '$log_no', item_name: '$item_name' } } },
    ]);

    const logKeys = new Map();
    [...fromIssues, ...fromDone].forEach((item) => {
      if (item._id?.log_no && item._id?.item_name) {
        logKeys.set(`${item._id.log_no}|${item._id.item_name}`, {
          log_no: item._id.log_no,
          item_name: item._id.item_name,
        });
      }
    });

    if (logKeys.size === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No crosscut data found for the selected criteria')
        );
    }

    const logs = Array.from(logKeys.values());

    // One aggregation: issues_for_crosscutting – first row per log for invoice/indian/physical/physical_length
    const issueDetails = await issues_for_crosscutting_model.aggregate([
      { $match: itemFilter },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { log_no: '$log_no', item_name: '$item_name' },
          invoice_cmt: { $first: '$invoice_cmt' },
          indian_cmt: { $first: '$indian_cmt' },
          physical_cmt: { $first: '$physical_cmt' },
          physical_length: { $first: '$physical_length' },
        },
      },
    ]);
    const issueMap = new Map(
      issueDetails.map((d) => [
        `${d._id.log_no}|${d._id.item_name}`,
        {
          invoice_cmt: d.invoice_cmt ?? 0,
          indian_cmt: d.indian_cmt ?? 0,
          physical_cmt: d.physical_cmt ?? 0,
          physical_length: d.physical_length ?? 0,
        },
      ])
    );

    const logDataWithMetrics = await Promise.all(
      logs.map(async ({ log_no: logNo, item_name: itemName }) => {
        const key = `${logNo}|${itemName}`;
        const issue = issueMap.get(key) || {
          invoice_cmt: 0,
          indian_cmt: 0,
          physical_cmt: 0,
          physical_length: 0,
        };

        // Op Bal: crosscut stock at period start (not yet issued, crosscut before start)
        const opBalAgg = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              item_name: itemName,
              deleted_at: null,
              $or: [{ issue_status: null }, { issue_status: { $exists: false } }],
              'worker_details.crosscut_date': { $lt: start },
            },
          },
          { $group: { _id: null, total: { $sum: '$crosscut_cmt' } } },
        ]);
        const opBal = opBalAgg[0]?.total ?? 0;

        // CC Received: crosscut done in period (by crosscut_date)
        const ccRecAgg = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              item_name: itemName,
              deleted_at: null,
              'worker_details.crosscut_date': { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$crosscut_cmt' }, length: { $sum: '$length' } } },
        ]);
        const ccReceived = ccRecAgg[0]?.total ?? 0;
        const ccLengthInPeriod = ccRecAgg[0]?.length ?? 0;

        // CC Issued: issues_for_crosscutting created in period
        const ccIssuedAgg = await issues_for_crosscutting_model.aggregate([
          {
            $match: {
              log_no: logNo,
              item_name: itemName,
              createdAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$physical_cmt' } } },
        ]);
        const ccIssued = ccIssuedAgg[0]?.total ?? 0;

        const ccClosing = Math.max(0, opBal + ccReceived - ccIssued);

        // Flitch Received: crosscutting_done issued for flitching in period
        const flitchAgg = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              item_name: itemName,
              deleted_at: null,
              issue_status: 'flitching',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$crosscut_cmt' } } },
        ]);
        const flitchReceived = flitchAgg[0]?.total ?? 0;

        // Peel Received: crosscutting_done issued for peeling in period
        const peelAgg = await crosscutting_done_model.aggregate([
          {
            $match: {
              log_no: logNo,
              item_name: itemName,
              deleted_at: null,
              issue_status: 'peeling',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$crosscut_cmt' } } },
        ]);
        const peelReceived = peelAgg[0]?.total ?? 0;

        return {
          item_name: itemName,
          log_no: logNo,
          invoice_cmt: issue.invoice_cmt,
          indian_cmt: issue.indian_cmt,
          physical_cmt: issue.physical_cmt,
          op_bal: opBal,
          cc_received: ccReceived,
          cc_issued: ccIssued,
          cc_closing: ccClosing,
          physical_length: issue.physical_length,
          cc_length: ccLengthInPeriod,
          flitch_received: flitchReceived,
          sq_received: 0,
          un_received: 0,
          peel_received: peelReceived,
        };
      })
    );

    logDataWithMetrics.sort((a, b) => {
      const c = a.item_name.localeCompare(b.item_name);
      return c !== 0 ? c : a.log_no.localeCompare(b.log_no);
    });

    const excelLink = await createLogWiseCrosscutReportExcel(
      logDataWithMetrics,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Log wise crosscut report generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating log wise crosscut report:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
