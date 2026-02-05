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

    const stockData = await Promise.all(
      pairs.map(
        async ({ item_sub_category_name, item_name }) => {
          const matchItem = {
            item_sub_category_name,
            item_name,
          };

          // Current available SQM (issue_status null/not set)
          const currentResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                $or: [
                  { issue_status: null },
                  { issue_status: { $exists: false } },
                ],
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);
          const currentAvailable = currentResult[0]?.total ?? 0;

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
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);
          const receipt = receiptResult[0]?.total ?? 0;

          // Issued in period: by issue_status (order + grouping -> Issue Sq Mtr, smoking_dying -> Dyeing)
          const issuedOrderResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'order',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);
          const issuedGroupingResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'grouping',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);
          const issuedDyeingResult = await dressing_done_items_model.aggregate([
            {
              $match: {
                ...matchItem,
                issue_status: 'smoking_dying',
                updatedAt: { $gte: start, $lte: end },
              },
            },
            { $group: { _id: null, total: { $sum: '$sqm' } } },
          ]);

          const issue_sq_mtr =
            (issuedOrderResult[0]?.total ?? 0) +
            (issuedGroupingResult[0]?.total ?? 0);
          const dyeing = issuedDyeingResult[0]?.total ?? 0;
          const issuedInPeriod = issue_sq_mtr + dyeing;

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
          const clipping = 0;
          const edgebanding = 0;
          const lipping = 0;
          const redressing = 0;
          const sale = 0;

          // Opening = current available + issued in period - receipt in period
          const openingBalance = Math.max(
            0,
            currentAvailable + issuedInPeriod - receipt
          );
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
      filter
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
