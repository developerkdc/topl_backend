import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { dressing_done_items_model } from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import dressing_miss_match_data_model from '../../../database/schema/factory/dressing/dressing_done/dressing.machine.mismatch.data.schema.js';
import { GenerateDressingStockRegisterExcel } from '../../../config/downloadExcel/reports2/Dressing/dressingStockRegister.js';

/**
 * Dressing Stock Register Report Export
 * Generates Excel report with Item Group Name, Item Name, Opening Balance, Purchase,
 * Receipt, Issue Sq Mtr, Clipping, Dyeing, Mixmatch, Edgebanding, Lipping, Redressing,
 * Sale, Closing Balance. Uses dressing_done_items, dressing_done_other_details, and
 * dressing_miss_match_data.
 *
 * @route POST /report/download-excel-dressing-stock-register
 * @access Private
 */
export const DressingStockRegisterExcel = catchAsync(async (req, res, next) => {
  const { startDate, endDate, filter = {}, includeCostAndExpense } = req.body;

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
  if (filter.item_group_name) itemFilter.item_sub_category_name = filter.item_group_name;

  try {
    // Distinct (item_sub_category_name, item_name) from dressing_done_items
    const distinctPairs = await dressing_done_items_model.aggregate([
      { $match: itemFilter },
      {
        $group: {
          _id: {
            item_sub_category_name: '$item_sub_category_name',
            item_name: '$item_name',
          },
        },
      },
      { $sort: { '_id.item_sub_category_name': 1, '_id.item_name': 1 } },
    ]);

    const pairs = distinctPairs.map((p) => ({
      item_sub_category_name: p._id.item_sub_category_name,
      item_name: p._id.item_name,
    }));

    if (pairs.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No dressing data found for the selected period')
        );
    }

    // Receipt before period (per item pair, per day) – for day-by-day closing → opening balance
    const receiptBeforeByDay = await dressing_done_items_model.aggregate([
      { $match: itemFilter },
      { $lookup: { from: 'dressing_done_other_details', localField: 'dressing_done_other_details_id', foreignField: '_id', as: 'details' } },
      { $unwind: '$details' },
      { $match: { 'details.dressing_date': { $lt: start } } },
      {
        $group: {
          _id: {
            item_sub_category_name: '$item_sub_category_name',
            item_name: '$item_name',
            day: { $dateToString: { format: '%Y-%m-%d', date: '$details.dressing_date' } },
          },
          total: { $sum: '$sqm' },
          amount: { $sum: '$amount' },
          expense_amount: { $sum: '$expense_amount' },
        },
      },
    ]);

    const issueBeforeByDay = await dressing_done_items_model.aggregate([
      { $match: { ...itemFilter, issue_status: { $in: ['grouping', 'order', 'smoking_dying'] }, updatedAt: { $lt: start } } },
      {
        $group: {
          _id: { item_sub_category_name: '$item_sub_category_name', item_name: '$item_name', day: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } } },
          total: { $sum: '$sqm' },
          amount: { $sum: '$amount' },
          expense_amount: { $sum: '$expense_amount' },
        },
      },
    ]);

    const dayBeforeStart = new Date(start);
    dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
    const dayBeforeStartStr = dayBeforeStart.toISOString().slice(0, 10);

    const pairKey = (a, b) => `${a}|${b}`;
    const receiptByPairDay = new Map();
    const issueByPairDay = new Map();
    const receiptAmountByPairDay = new Map();
    const receiptExpenseAmountByPairDay = new Map();
    const issueAmountByPairDay = new Map();
    const issueExpenseAmountByPairDay = new Map();

    for (const r of receiptBeforeByDay) {
      const key = pairKey(r._id.item_sub_category_name, r._id.item_name);
      if (!receiptAmountByPairDay.has(key)) receiptAmountByPairDay.set(key, new Map());
      receiptAmountByPairDay.get(key).set(r._id.day, r.amount);
      if (!receiptExpenseAmountByPairDay.has(key)) receiptExpenseAmountByPairDay.set(key, new Map());
      receiptExpenseAmountByPairDay.get(key).set(r._id.day, r.expense_amount);
    }
    for (const i of issueBeforeByDay) {
      const key = pairKey(i._id.item_sub_category_name, i._id.item_name);
      if (!issueAmountByPairDay.has(key)) issueAmountByPairDay.set(key, new Map());
      issueAmountByPairDay.get(key).set(i._id.day, i.amount);
      if (!issueExpenseAmountByPairDay.has(key)) issueExpenseAmountByPairDay.set(key, new Map());
      issueExpenseAmountByPairDay.get(key).set(i._id.day, i.expense_amount);
    }

    for (const r of receiptBeforeByDay) {
      const key = pairKey(r._id.item_sub_category_name, r._id.item_name);
      if (!receiptByPairDay.has(key)) receiptByPairDay.set(key, new Map());
      receiptByPairDay.get(key).set(r._id.day, r.total);
    }
    for (const i of issueBeforeByDay) {
      const key = pairKey(i._id.item_sub_category_name, i._id.item_name);
      if (!issueByPairDay.has(key)) issueByPairDay.set(key, new Map());
      issueByPairDay.get(key).set(i._id.day, i.total);
    }

    const openingBalanceByPair = new Map();
    for (const { item_sub_category_name, item_name } of pairs) {
      const key = pairKey(item_sub_category_name, item_name);
      const receiptDays = receiptByPairDay.get(key);
      const issueDays = issueByPairDay.get(key);
      const allDays = new Set(
        [
          ...(receiptDays ? receiptDays.keys() : []),
          ...(issueDays ? issueDays.keys() : []),
        ].filter((d) => d <= dayBeforeStartStr)
      );
      let runningClosing = 0;
      for (const day of [...allDays].sort()) {
        const receipt = receiptDays?.get(day) ?? 0;
        const issue = issueDays?.get(day) ?? 0;
        runningClosing = Math.max(0, runningClosing + receipt - issue);
      }
      openingBalanceByPair.set(key, Math.max(0, runningClosing))
    }

    const openingBalanceAmountByPair = new Map();
    for (const { item_sub_category_name, item_name } of pairs) {
      const key = pairKey(item_sub_category_name, item_name);
      const receiptDays = receiptAmountByPairDay.get(key);
      const issueDays = issueAmountByPairDay.get(key);
      const allDays = new Set([
        ...(receiptDays ? receiptDays.keys() : []),
        ...(issueDays ? issueDays.keys() : []),
      ].filter((d) => d <= dayBeforeStartStr));
      let running = 0;
      for (const day of [...allDays].sort()) {
        running += (receiptDays?.get(day) ?? 0) - (issueDays?.get(day) ?? 0);
      }
      openingBalanceAmountByPair.set(key, Math.max(0, running));
    }

    const openingBalanceExpenseAmountByPair = new Map();
    for (const { item_sub_category_name, item_name } of pairs) {
      const key = pairKey(item_sub_category_name, item_name);
      const receiptDays = receiptExpenseAmountByPairDay.get(key);
      const issueDays = issueExpenseAmountByPairDay.get(key);
      const allDays = new Set(
        [
          ...(receiptDays ? receiptDays.keys() : []),
          ...(issueDays ? issueDays.keys() : []),
        ].filter((d) => d <= dayBeforeStartStr)
      );
      let runningClosing = 0;
      for (const day of [...allDays].sort()) {
        const receipt = receiptDays?.get(day) ?? 0;
        const issue = issueDays?.get(day) ?? 0;
        runningClosing = Math.max(0, runningClosing + receipt - issue);
      }
      openingBalanceExpenseAmountByPair.set(key, Math.max(0, runningClosing));
    }

    const stockData = await Promise.all(
      pairs.map(
        async ({ item_sub_category_name, item_name }) => {
          const matchItem = {
            item_sub_category_name,
            item_name,
          };

          // Opening = closing balance at end of day before date range (from precomputed map, min 0)
          const openingBalance = Math.max(
            0,
            openingBalanceByPair.get(
              pairKey(item_sub_category_name, item_name)
            ) ?? 0
          );

          const openingBalanceAmount = Math.max(
            0,
            openingBalanceAmountByPair.get(
              pairKey(item_sub_category_name, item_name)
            ) ?? 0
          );

          const openingBalanceExpenseAmount = Math.max(
            0,
            openingBalanceExpenseAmountByPair.get(
              pairKey(item_sub_category_name, item_name)
            ) ?? 0
          );

          // Receipt in period: join with dressing_done_other_details, dressing_date in range
          const receiptResult = await dressing_done_items_model.aggregate([
            { $match: matchItem },
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
                'details.dressing_date': { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' }, amount: { $sum: '$amount' }, expense_amount: { $sum: '$expense_amount' } } },
          ]);
          const receipt = receiptResult[0]?.total ?? 0;
          const receiptAmount = receiptResult[0]?.amount ?? 0;
          const receiptExpenseAmount = receiptResult[0]?.expense_amount ?? 0;

          // Issued in period: by issue_status (order + grouping -> Issue Sq Mtr, smoking_dying -> Dyeing)
          const issuedOrderResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'order',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' }, amount: { $sum: '$amount' }, expense_amount: { $sum: '$expense_amount' } } },
          ]);
          const issuedGroupingResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'grouping',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' }, amount: { $sum: '$amount' }, expense_amount: { $sum: '$expense_amount' } } },
          ]);
          const issuedDyeingResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'smoking_dying',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' }, amount: { $sum: '$amount' }, expense_amount: { $sum: '$expense_amount' } } },
          ]);

          const issue_sq_mtr =
            (issuedOrderResult[0]?.total ?? 0) +
            (issuedGroupingResult[0]?.total ?? 0);
          const dyeing = issuedDyeingResult[0]?.total ?? 0;
          const issue_sq_mtr_amount =
            (issuedOrderResult[0]?.amount ?? 0) +
            (issuedGroupingResult[0]?.amount ?? 0);

          const issue_sq_mtr_expense_amount =
            (issuedOrderResult[0]?.expense_amount ?? 0) +
            (issuedGroupingResult[0]?.expense_amount ?? 0);
          const dyeing_amount = issuedDyeingResult[0]?.amount ?? 0;
          const dyeing_expense_amount = issuedDyeingResult[0]?.expense_amount ?? 0;
          const clipping = issuedGroupingResult[0]?.total ?? 0; // Clipping = issue to Grouping
          const clipping_amount = issuedGroupingResult[0]?.amount ?? 0;
          const clipping_expense_amount = issuedGroupingResult[0]?.expense_amount ?? 0;

          // Mixmatch in period: dressing_miss_match_data
          const mixmatchResult = await dressing_miss_match_data_model.aggregate([
            {
              $match: {
                ...matchItem,
                dressing_date: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);
          const mixmatch = mixmatchResult[0]?.total ?? 0;

          const purchase = 0;
          const edgebanding = 0;
          const lipping = 0;
          const redressing = 0;
          const sale = 0;

          // Closing = opening + purchase + receipt - all issues
          const totalIssues =
            issue_sq_mtr +
            clipping +
            dyeing +
            mixmatch +
            edgebanding +
            lipping +
            redressing +
            sale;
          const closingBalance = Math.max(
            0,
            openingBalance + purchase + receipt - totalIssues
          );
          const totalIssueAmount =
            issue_sq_mtr_amount +
            clipping_amount +
            dyeing_amount +
            0 /* mixmatch has no amount tracked */ +
            0 /* edgebanding */ +
            0 /* lipping */ +
            0 /* redressing */ +
            0 /* sale */;

          const totalIssueExpenseAmount =
            issue_sq_mtr_expense_amount +
            clipping_expense_amount +
            dyeing_expense_amount;

          const closing_balance_amount = Math.max(
            0,
            openingBalanceAmount + receiptAmount - totalIssueAmount
          );
          const closing_balance_expense_amount = Math.max(
            0,
            openingBalanceExpenseAmount + receiptExpenseAmount - totalIssueExpenseAmount
          );

          return {
            item_group_name: item_sub_category_name,
            item_name,
            opening_balance: openingBalance,
            purchase,
            receipt,
            issue_sq_mtr,
            clipping,
            dyeing,
            mixmatch,
            edgebanding,
            lipping,
            redressing,
            sale,
            closing_balance: closingBalance,
            ...(includeCostAndExpense ? {
              opening_balance_amount: openingBalanceAmount,
              opening_balance_expense_amount: openingBalanceExpenseAmount,
              receipt_amount: receiptAmount,
              receipt_expense_amount: receiptExpenseAmount,
              issue_sq_mtr_amount: issue_sq_mtr_amount,
              issue_sq_mtr_expense_amount: issue_sq_mtr_expense_amount,
              clipping_amount: clipping_amount,
              clipping_expense_amount: clipping_expense_amount,
              dyeing_amount: dyeing_amount,
              dyeing_expense_amount: dyeing_expense_amount,
              edgebanding_amount: 0,
              edgebanding_expense_amount: 0,
              lipping_amount: 0,
              lipping_expense_amount: 0,
              redressing_amount: 0,
              redressing_expense_amount: 0,
              closing_balance_amount: closing_balance_amount,
              closing_balance_expense_amount: closing_balance_expense_amount,
            } : {}),
          };
        }
      )
    );

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_balance > 0 ||
        row.purchase > 0 ||
        row.receipt > 0 ||
        row.issue_sq_mtr > 0 ||
        row.clipping > 0 ||
        row.dyeing > 0 ||
        row.mixmatch > 0 ||
        row.edgebanding > 0 ||
        row.lipping > 0 ||
        row.redressing > 0 ||
        row.sale > 0 ||
        row.closing_balance > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No dressing stock data found for the selected period')
        );
    }

    const excelLink = await GenerateDressingStockRegisterExcel(
      activeStockData,
      startDate,
      endDate,
      filter,
      includeCostAndExpense
    );

    return res.json(
      new ApiResponse(
        200,
        'Dressing stock register generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating dressing stock register:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
