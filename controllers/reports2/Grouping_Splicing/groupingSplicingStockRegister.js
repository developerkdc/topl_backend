import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { grouping_done_items_details_model } from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import grouping_done_history_model from '../../../database/schema/factory/grouping/grouping_done_history.schema.js';
import { GenerateGroupingSplicingStockRegisterExcel } from '../../../config/downloadExcel/reports2/Grouping_Splicing/groupingSplicingStockRegister.js';

/** process_name indicating hand splice (case-insensitive match) */
const HAND_SPLICE_PATTERN = /HAND/i;

/**
 * Grouping/Splicing Stock Register Report Export
 * Generates Excel report with Item Group Name, Item Name, Opening Balance, Purchase Sq. Mtr,
 * Received SqMtr (Hand Splice, Machine Splice), Issue Sqmtr (Pressing, Demage, Sale, Issue For Cal Ply Pressing),
 * Process Waste, Closing Balance. Uses grouping_done_items_details, grouping_done_details, grouping_done_history.
 *
 * @route POST /report/download-excel-grouping-splicing-stock-register
 * @access Private
 */
export const GroupingSplicingStockRegisterExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, filter = {} } = req.body;

    if (!startDate || !endDate) {
      return next(new ApiError('Start date and end date are required', 400));
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return next(
        new ApiError('Invalid date format. Use YYYY-MM-DD', 400)
      );
    }

    if (start > end) {
      return next(
        new ApiError('Start date cannot be after end date', 400)
      );
    }

    const itemFilter = {};
    if (filter.item_name) itemFilter.item_name = filter.item_name;
    if (filter.item_group_name)
      itemFilter.item_sub_category_name = filter.item_group_name;

    try {
      const distinctPairs = await grouping_done_items_details_model.aggregate([
        { $match: itemFilter },
        {
          $group: {
            _id: {
              item_sub_category_name: '$item_sub_category_name',
              item_name: '$item_name',
            },
          },
        },
        {
          $sort: {
            '_id.item_sub_category_name': 1,
            '_id.item_name': 1,
          },
        },
      ]);

      const pairs = distinctPairs.map((p) => ({
        item_sub_category_name: p._id.item_sub_category_name,
        item_name: p._id.item_name,
      }));

      if (pairs.length === 0) {
        return res.status(404).json(
          new ApiResponse(
            404,
            'No grouping/splicing data found for the selected period'
          )
        );
      }

      const stockData = await Promise.all(
        pairs.map(
          async ({ item_sub_category_name, item_name }) => {
            const matchItem = {
              item_sub_category_name,
              item_name,
            };

            // Current available SQM: sum available_details.sqm
            const currentResult =
              await grouping_done_items_details_model.aggregate([
                { $match: matchItem },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$available_details.sqm' },
                  },
                },
              ]);
            const currentAvailable = currentResult[0]?.total ?? 0;

            // Receipt in period: join to grouping_done_details, filter by date
            const receiptTotalResult =
              await grouping_done_items_details_model.aggregate([
                { $match: matchItem },
                {
                  $lookup: {
                    from: 'grouping_done_details',
                    localField: 'grouping_done_other_details_id',
                    foreignField: '_id',
                    as: 'details',
                  },
                },
                { $unwind: '$details' },
                {
                  $match: {
                    'details.grouping_done_date': {
                      $gte: start,
                      $lte: end,
                    },
                  },
                },
                { $group: { _id: null, total: { $sum: '$sqm' } } },
              ]);
            const receiptTotal = receiptTotalResult[0]?.total ?? 0;

            // Hand splice: same receipt where process_name matches HAND
            const receiptHandResult =
              await grouping_done_items_details_model.aggregate([
                { $match: matchItem },
                {
                  $lookup: {
                    from: 'grouping_done_details',
                    localField: 'grouping_done_other_details_id',
                    foreignField: '_id',
                    as: 'details',
                  },
                },
                { $unwind: '$details' },
                {
                  $match: {
                    'details.grouping_done_date': {
                      $gte: start,
                      $lte: end,
                    },
                    process_name: { $regex: HAND_SPLICE_PATTERN },
                  },
                },
                { $group: { _id: null, total: { $sum: '$sqm' } } },
              ]);
            const handSplice = receiptHandResult[0]?.total ?? 0;
            const machineSplice = receiptTotal - handSplice;

            // Issued in period: grouping_done_history by issue_status
            const pressingResult = await grouping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  issue_status: 'order',
                  updatedAt: { $gte: start, $lte: end },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const pressing = pressingResult[0]?.total ?? 0;

            const saleResult = await grouping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  issue_status: 'challan',
                  updatedAt: { $gte: start, $lte: end },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const sale = saleResult[0]?.total ?? 0;

            const calPlyResult = await grouping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  issue_status: 'tapping',
                  updatedAt: { $gte: start, $lte: end },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const issue_for_cal_ply_pressing = calPlyResult[0]?.total ?? 0;

            const issuedInPeriod = pressing + sale + issue_for_cal_ply_pressing;

            // Demage in period: grouping_done_items_details where is_damaged and updatedAt in range
            const demageResult =
              await grouping_done_items_details_model.aggregate([
                {
                  $match: {
                    ...matchItem,
                    is_damaged: true,
                    updatedAt: { $gte: start, $lte: end },
                  },
                },
                { $group: { _id: null, total: { $sum: '$sqm' } } },
              ]);
            const demage = demageResult[0]?.total ?? 0;

            const purchase = 0;
            const processWaste = 0;

            // Opening = current available + issued in period - receipt in period (allow negative)
            const openingBalance =
              currentAvailable + issuedInPeriod - receiptTotal;

            // Closing = Opening + Purchase + (Hand + Machine) - (Pressing + Demage + Sale + Cal Ply) - Process Waste
            const closingBalance =
              openingBalance +
              purchase +
              (handSplice + machineSplice) -
              (pressing + demage + sale + issue_for_cal_ply_pressing) -
              processWaste;

            return {
              item_group_name: item_sub_category_name,
              item_name,
              opening_balance: openingBalance,
              purchase,
              hand_splice: handSplice,
              machine_splice: machineSplice,
              pressing,
              demage,
              sale,
              issue_for_cal_ply_pressing,
              process_waste: processWaste,
              closing_balance: closingBalance,
            };
          }
        )
      );

      const activeStockData = stockData.filter(
        (row) =>
          row.opening_balance !== 0 ||
          row.purchase !== 0 ||
          row.hand_splice !== 0 ||
          row.machine_splice !== 0 ||
          row.pressing !== 0 ||
          row.demage !== 0 ||
          row.sale !== 0 ||
          row.issue_for_cal_ply_pressing !== 0 ||
          row.process_waste !== 0 ||
          row.closing_balance !== 0
      );

      if (activeStockData.length === 0) {
        return res.status(404).json(
          new ApiResponse(
            404,
            'No grouping/splicing stock data found for the selected period'
          )
        );
      }

      const excelLink = await GenerateGroupingSplicingStockRegisterExcel(
        activeStockData,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Grouping/splicing stock register generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error(
        'Error generating grouping/splicing stock register:',
        error
      );
      return next(
        new ApiError(
          error.message || 'Failed to generate report',
          500
        )
      );
    }
  }
);
