import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import { createLogWiseDressingReportExcel } from '../../../config/downloadExcel/reports2/Flitch/logWiseDressingReport.js';

/**
 * Log Wise Dressing Report Export
 * Dressing Stock Register By LogX – one row per log_no_code with opening/closing balance,
 * receipt, issue, sale, and one Total row at the end.
 *
 * @route POST /api/V1/reports2/dressing/download-excel-log-wise-dressing-report
 * @access Private
 */
export const LogWiseDressingReportExcel = catchAsync(async (req, res, next) => {
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

  const itemFilter = {};
  if (filter.item_name) itemFilter.item_name = filter.item_name;
  if (filter.item_sub_category_name) itemFilter.item_sub_category_name = filter.item_sub_category_name;

  try {
    // Unique logs with item info and a dressing date in period (for display)
    const logsWithDetails = await dressing_done_items_model.aggregate([
      { $match: itemFilter },
      {
        $lookup: {
          from: 'dressing_done_other_details',
          localField: 'dressing_done_other_details_id',
          foreignField: '_id',
          as: 'details',
        },
      },
      { $unwind: '$details' },
      {
        $group: {
          _id: '$log_no_code',
          item_name: { $first: '$item_name' },
          item_sub_category_name: { $first: '$item_sub_category_name' },
          dressing_date_in_period: {
            $max: {
              $cond: [
                {
                  $and: [
                    { $gte: ['$details.dressing_date', start] },
                    { $lte: ['$details.dressing_date', end] },
                  ],
                },
                '$details.dressing_date',
                null,
              ],
            },
          },
          fallback_dressing_date: { $max: '$details.dressing_date' },
        },
      },
      {
        $project: {
          log_no_code: '$_id',
          item_name: 1,
          item_sub_category_name: 1,
          dressing_date: { $ifNull: ['$dressing_date_in_period', '$fallback_dressing_date'] },
        },
      },
    ]);

    if (logsWithDetails.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No dressing data found for the selected period'));
    }

    // Receipt in period: sum(sqm) where dressing_date in [start, end]
    const receiptInPeriod = await dressing_done_items_model.aggregate([
      {
        $lookup: {
          from: 'dressing_done_other_details',
          localField: 'dressing_done_other_details_id',
          foreignField: '_id',
          as: 'details',
        },
      },
      { $unwind: '$details' },
      {
        $match: {
          ...itemFilter,
          'details.dressing_date': { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const receiptMap = new Map(receiptInPeriod.map((r) => [r._id, r.total]));

    // Issue in period: issue_status set and updatedAt in [start, end]
    const issueInPeriod = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: { $in: ['grouping', 'order', 'smoking_dying'] },
          updatedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const issueMap = new Map(issueInPeriod.map((i) => [i._id, i.total]));

    // Sale in period: issue_status === 'order'
    const saleInPeriod = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: 'order',
          updatedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const saleMap = new Map(saleInPeriod.map((s) => [s._id, s.total]));

    // Receipt before period
    const receiptBefore = await dressing_done_items_model.aggregate([
      {
        $lookup: {
          from: 'dressing_done_other_details',
          localField: 'dressing_done_other_details_id',
          foreignField: '_id',
          as: 'details',
        },
      },
      { $unwind: '$details' },
      {
        $match: {
          ...itemFilter,
          'details.dressing_date': { $lt: start },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const receiptBeforeMap = new Map(receiptBefore.map((r) => [r._id, r.total]));

    // Issue before period
    const issueBefore = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: { $in: ['grouping', 'order', 'smoking_dying'] },
          updatedAt: { $lt: start },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const issueBeforeMap = new Map(issueBefore.map((i) => [i._id, i.total]));

    const formatDressingDate = (d) => {
      if (!d) return '';
      const dt = new Date(d);
      const day = String(dt.getDate()).padStart(2, '0');
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const year = dt.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const rows = logsWithDetails.map((log) => {
      const logNo = log.log_no_code;
      const receipt = receiptMap.get(logNo) || 0;
      const issue = issueMap.get(logNo) || 0;
      const sale = saleMap.get(logNo) || 0;
      const receiptBeforeVal = receiptBeforeMap.get(logNo) || 0;
      const issueBeforeVal = issueBeforeMap.get(logNo) || 0;

      const openingBalance = Math.max(0, receiptBeforeVal - issueBeforeVal);
      const closingBalance = Math.max(0, openingBalance + receipt - issue);
      const issueFromOldBalance = issueBeforeVal;
      const closingBalanceOld = openingBalance;
      const issueFromNewBalance = issue;
      const closingBalanceNew = closingBalance;

      const itemGroupName = log.item_sub_category_name || log.item_name || '';

      return {
        item_group_name: itemGroupName,
        item_name: log.item_name || '',
        dressing_date: formatDressingDate(log.dressing_date),
        log_x: logNo,
        opening_balance: openingBalance,
        purchase: 0,
        receipt,
        issue_sq_mtr: issue,
        clipping: 0,
        dyeing: 0,
        mixmatch: 0,
        edgebanding: 0,
        lipping: 0,
        redressing: 0,
        sale,
        closing_balance: closingBalance,
        issue_from_old_balance: issueFromOldBalance,
        closing_balance_old: closingBalanceOld,
        issue_from_new_balance: issueFromNewBalance,
        closing_balance_new: closingBalanceNew,
      };
    });

    // Sort by item_group_name, item_name, log_x
    rows.sort((a, b) => {
      const g = (a.item_group_name || '').localeCompare(b.item_group_name || '');
      if (g !== 0) return g;
      const n = (a.item_name || '').localeCompare(b.item_name || '');
      if (n !== 0) return n;
      return (a.log_x || '').localeCompare(b.log_x || '');
    });

    const excelLink = await createLogWiseDressingReportExcel(rows, startDate, endDate, filter);

    return res.json(
      new ApiResponse(200, 'Log wise dressing report generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating log wise dressing report:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
