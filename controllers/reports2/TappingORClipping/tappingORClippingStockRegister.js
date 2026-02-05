import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  tapping_done_items_details_model,
  tapping_done_other_details_model,
} from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import issue_for_tapping_wastage_model from '../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import { GenerateTappingORClippingStockRegisterExcel } from '../../../config/downloadExcel/reports2/TappingORClipping/tappingORClippingStockRegister.js';

/**
 * Tapping OR Clipping Stock Register Report Export
 * Generates Excel report with Item Group Name, Item Name, Opening Balance,
 * Received Sq. Mtr., Issue Sq. Mtr., Issue For (Hand Splicing, Splicing, Clipped Packing, Damaged, Cal Ply Production),
 * Closing Balance. Uses tapping_done_items_details, tapping_done_other_details, tapping_done_history, issue_for_tapping_wastage.
 *
 * @route POST /report/download-excel-tapping-or-clipping-stock-register
 * @access Private
 */
export const TappingORClippingStockRegisterExcel = catchAsync(
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
      const distinctPairs = await tapping_done_items_details_model.aggregate([
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
            'No tapping/clipping data found for the selected period'
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

            // Current available: sum available_details.sqm from tapping_done_items_details
            const currentResult =
              await tapping_done_items_details_model.aggregate([
                { $match: matchItem },
                {
                  $group: {
                    _id: null,
                    total: { $sum: '$available_details.sqm' },
                  },
                },
              ]);
            const currentAvailable = currentResult[0]?.total ?? 0;

            // Received in period: tapping_done with tapping_date in range
            const receivedResult =
              await tapping_done_items_details_model.aggregate([
                { $match: matchItem },
                {
                  $lookup: {
                    from: 'tapping_done_other_details',
                    localField: 'tapping_done_other_details_id',
                    foreignField: '_id',
                    as: 'details',
                  },
                },
                { $unwind: '$details' },
                {
                  $match: {
                    'details.tapping_date': { $gte: start, $lte: end },
                  },
                },
                { $group: { _id: null, total: { $sum: '$sqm' } } },
              ]);
            const received = receivedResult[0]?.total ?? 0;

            // Issue total in period: tapping_done_history, createdAt in range
            const issueTotalResult = await tapping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  createdAt: { $gte: start, $lte: end },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const issueTotal = issueTotalResult[0]?.total ?? 0;

            // Issue For Hand Splicing: history in period, join to tapping_done_other_details, splicing_type = HAND SPLICING
            const handSplicingResult = await tapping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  createdAt: { $gte: start, $lte: end },
                },
              },
              {
                $lookup: {
                  from: 'tapping_done_items_details',
                  localField: 'tapping_done_item_id',
                  foreignField: '_id',
                  as: 'itemDetail',
                },
              },
              { $unwind: '$itemDetail' },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'itemDetail.tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'otherDetail',
                },
              },
              { $unwind: '$otherDetail' },
              {
                $match: {
                  'otherDetail.splicing_type': 'HAND SPLICING',
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const hand_splicing = handSplicingResult[0]?.total ?? 0;

            // Issue For Splicing: splicing_type MACHINE SPLICING or SPLICING
            const splicingResult = await tapping_done_history_model.aggregate([
              {
                $match: {
                  ...matchItem,
                  createdAt: { $gte: start, $lte: end },
                },
              },
              {
                $lookup: {
                  from: 'tapping_done_items_details',
                  localField: 'tapping_done_item_id',
                  foreignField: '_id',
                  as: 'itemDetail',
                },
              },
              { $unwind: '$itemDetail' },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'itemDetail.tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'otherDetail',
                },
              },
              { $unwind: '$otherDetail' },
              {
                $match: {
                  'otherDetail.splicing_type': {
                    $in: ['MACHINE SPLICING', 'SPLICING'],
                  },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const splicing = splicingResult[0]?.total ?? 0;

            // Issue For Damaged: issue_for_tapping_wastage + lookup issue_for_tappings, createdAt in period
            const damagedResult = await issue_for_tapping_wastage_model.aggregate([
              { $match: { createdAt: { $gte: start, $lte: end } } },
              {
                $lookup: {
                  from: 'issue_for_tappings',
                  localField: 'issue_for_tapping_item_id',
                  foreignField: '_id',
                  as: 'issueFor',
                },
              },
              { $unwind: '$issueFor' },
              {
                $match: {
                  'issueFor.item_sub_category_name': item_sub_category_name,
                  'issueFor.item_name': item_name,
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]);
            const damaged = damagedResult[0]?.total ?? 0;

            const clipped_packing = 0;
            const cal_ply_production = 0;

            const issuedInPeriod = issueTotal;

            // Opening = current available + issued in period - received in period
            const openingBalance =
              currentAvailable + issuedInPeriod - received;

            // Closing = opening + received - issue total
            const closingBalance = openingBalance + received - issueTotal;

            return {
              item_group_name: item_sub_category_name,
              item_name,
              opening_balance: openingBalance,
              received,
              issue_total: issueTotal,
              hand_splicing,
              splicing,
              clipped_packing,
              damaged,
              cal_ply_production,
              closing_balance: closingBalance,
            };
          }
        )
      );

      const activeStockData = stockData.filter(
        (row) =>
          row.opening_balance !== 0 ||
          row.received !== 0 ||
          row.issue_total !== 0 ||
          row.hand_splicing !== 0 ||
          row.splicing !== 0 ||
          row.clipped_packing !== 0 ||
          row.damaged !== 0 ||
          row.cal_ply_production !== 0 ||
          row.closing_balance !== 0
      );

      if (activeStockData.length === 0) {
        return res.status(404).json(
          new ApiResponse(
            404,
            'No tapping/clipping stock data found for the selected period'
          )
        );
      }

      const excelLink = await GenerateTappingORClippingStockRegisterExcel(
        activeStockData,
        startDate,
        endDate,
        filter
      );

      return res.json(
        new ApiResponse(
          200,
          'Tapping/Clipping stock register generated successfully',
          excelLink
        )
      );
    } catch (error) {
      console.error(
        'Error generating tapping/clipping stock register:',
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
