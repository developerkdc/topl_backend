import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_miss_match_data_model from '../../../database/schema/factory/dressing/dressing_done/dressing.machine.mismatch.data.schema.js';
import { createLogWiseDressingReportExcel } from '../../../config/downloadExcel/reports2/Flitch/logWiseDressingReport.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';

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
      { $match: { dressing_date_in_period: { $ne: null } } },
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
          issue_status: { $in: [issues_for_status.grouping, issues_for_status.order, issues_for_status.smoking_dying] },
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
          issue_status: issues_for_status.order,
          updatedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const saleMap = new Map(saleInPeriod.map((s) => [s._id, s.total]));

    // Clipping (issue to Grouping) in period: issue_status === 'grouping'
    const groupingIssueInPeriod = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: issues_for_status.grouping,
          updatedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const groupingIssueMap = new Map(groupingIssueInPeriod.map((g) => [g._id, g.total]));

    // Dyeing (issue to Smoking/Dyeing) in period: issue_status === 'smoking_dying'
    const smokingDyingIssueInPeriod = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: issues_for_status.smoking_dying,
          updatedAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const smokingDyingIssueMap = new Map(smokingDyingIssueInPeriod.map((s) => [s._id, s.total]));

    // Mixmatch (dressing mismatch) in period: dressing_miss_match_data by log
    const mixmatchInPeriod = await dressing_miss_match_data_model.aggregate([
      {
        $match: {
          ...itemFilter,
          dressing_date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$log_no_code', total: { $sum: '$sqm' } } },
    ]);
    const mixmatchMap = new Map(mixmatchInPeriod.map((m) => [m._id, m.total]));

    // Receipt before period (per log, per day) – for day-by-day closing → opening balance
    const receiptBeforeByDay = await dressing_done_items_model.aggregate([
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
      {
        $group: {
          _id: {
            log_no_code: '$log_no_code',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$details.dressing_date' } },
          },
          total: { $sum: '$sqm' },
        },
      },
    ]);
    // Issue before period (per log, per day) – for day-by-day closing → opening balance
    const issueBeforeByDay = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: {
            $in: [issues_for_status.grouping, issues_for_status.order, issues_for_status.smoking_dying],
          },
          updatedAt: { $lt: start },
        },
      },
      {
        $group: {
          _id: {
            log_no_code: '$log_no_code',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          },
          total: { $sum: '$sqm' },
        },
      },
    ]);

    // Build per-log-per-day maps and compute opening = closing balance at end of (startDate - 1)
    const dayBeforeStart = new Date(start);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    const dayBeforeStartStr = dayBeforeStart.toISOString().slice(0, 10);

    const receiptByLogDay = new Map(); // logNo -> Map(day -> sqm)
    const issueByLogDay = new Map();
    for (const r of receiptBeforeByDay) {
      const logNo = r._id.log_no_code;
      const day = r._id.day;
      if (!receiptByLogDay.has(logNo)) receiptByLogDay.set(logNo, new Map());
      receiptByLogDay.get(logNo).set(day, r.total);
    }
    for (const i of issueBeforeByDay) {
      const logNo = i._id.log_no_code;
      const day = i._id.day;
      if (!issueByLogDay.has(logNo)) issueByLogDay.set(logNo, new Map());
      issueByLogDay.get(logNo).set(day, i.total);
    }

    const openingBalanceMap = new Map();
    for (const log of logsWithDetails) {
      const logNo = log.log_no_code;
      const receiptDays = receiptByLogDay.get(logNo);
      const issueDays = issueByLogDay.get(logNo);
      const allDays = new Set([
        ...(receiptDays ? receiptDays.keys() : []),
        ...(issueDays ? issueDays.keys() : []),
      ].filter((d) => d <= dayBeforeStartStr));
      let runningClosing = 0;
      for (const day of [...allDays].sort()) {
        const receipt = receiptDays?.get(day) ?? 0;
        const issue = issueDays?.get(day) ?? 0;
        runningClosing = Math.max(0, runningClosing + receipt - issue);
      }
      openingBalanceMap.set(logNo, runningClosing);
    }

    // Issue before period (total) – for "Issue From Old Balance" column
    const issueBefore = await dressing_done_items_model.aggregate([
      {
        $match: {
          ...itemFilter,
          issue_status: {
            $in: [issues_for_status.grouping, issues_for_status.order, issues_for_status.smoking_dying],
          },
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
      const clipping = groupingIssueMap.get(logNo) || 0;
      const dyeing = smokingDyingIssueMap.get(logNo) || 0;
      const mixmatch = mixmatchMap.get(logNo) || 0;
      const openingBalance = openingBalanceMap.get(logNo) ?? 0; // closing balance at end of day before date range
      const issueBeforeVal = issueBeforeMap.get(logNo) || 0;

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
        clipping,
        dyeing,
        mixmatch,
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
