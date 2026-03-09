import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import {
  tapping_done_items_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import issue_for_tapping_wastage_model from '../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import { GenerateTappingStockRegisterThicknessWiseExcel } from '../../../../config/downloadExcel/reports2/Tapping/Stock_Register/tappingStockRegisterThicknessWise.js';

/**
 * Tapping Stock Register Thickness Wise — "Splicing Item Stock Register sales name - thickness wise"
 * Extends the sales-name-wise report with Thickness, Log No, and Date columns.
 * Groups by (item_sub_category_name, item_name, thickness, log_no_code).
 *
 * @route POST /api/V1/report/download-excel-tapping-stock-register-thickness-wise
 */
export const TappingStockRegisterThicknessWiseExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate } = req.body;

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

    // Step 1: distinct (item_sub_category_name, item_name, thickness, log_no_code) tuples
    // Also retrieve the tapping_date from the joined session
    const distinctTuples = await tapping_done_items_details_model.aggregate([
      {
        $lookup: {
          from: 'tapping_done_other_details',
          localField: 'tapping_done_other_details_id',
          foreignField: '_id',
          as: 'session',
        },
      },
      { $unwind: { path: '$session', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            item_sub_category_name: '$item_sub_category_name',
            item_name: '$item_name',
            thickness: '$thickness',
            log_no_code: '$log_no_code',
          },
          // Use the earliest tapping_date associated with this log entry
          tapping_date: { $min: '$session.tapping_date' },
        },
      },
      {
        $sort: {
          '_id.item_sub_category_name': 1,
          '_id.item_name': 1,
          '_id.thickness': 1,
          '_id.log_no_code': 1,
        },
      },
    ]);

    if (!distinctTuples.length) {
      return res.status(404).json(
        new ApiResponse(404, 'No tapping data found')
      );
    }

    const tuples = distinctTuples.map((t) => ({
      item_sub_category_name: t._id.item_sub_category_name,
      item_name: t._id.item_name,
      thickness: t._id.thickness,
      log_no_code: t._id.log_no_code,
      tapping_date: t.tapping_date ?? null,
    }));

    // Step 2: compute per-tuple aggregates in parallel
    const stockData = await Promise.all(
      tuples.map(
        async ({ item_sub_category_name, item_name, thickness, log_no_code, tapping_date }) => {
          const matchItem = {
            item_sub_category_name,
            item_name,
            thickness,
            log_no_code,
          };

          const [
            currentResult,
            tappingHandResult,
            tappingMachineResult,
            issuePressingResult,
            processWasteResult,
          ] = await Promise.all([
            // currentAvailable: sum available_details.sqm for this (item, thickness, log)
            tapping_done_items_details_model.aggregate([
              { $match: matchItem },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$available_details.sqm' },
                },
              },
            ]),

            // tappingHand: sqm received in period via hand splicing for this log
            tapping_done_items_details_model.aggregate([
              { $match: matchItem },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'session',
                },
              },
              { $unwind: '$session' },
              {
                $match: {
                  'session.tapping_date': { $gte: start, $lte: end },
                  'session.splicing_type': { $in: ['HAND', 'HAND SPLICING'] },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]),

            // tappingMachine: sqm received in period via machine splicing for this log
            tapping_done_items_details_model.aggregate([
              { $match: matchItem },
              {
                $lookup: {
                  from: 'tapping_done_other_details',
                  localField: 'tapping_done_other_details_id',
                  foreignField: '_id',
                  as: 'session',
                },
              },
              { $unwind: '$session' },
              {
                $match: {
                  'session.tapping_date': { $gte: start, $lte: end },
                  'session.splicing_type': {
                    $in: ['MACHINE', 'MACHINE SPLICING'],
                  },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]),

            // issuePressing: sqm issued to pressing for this (item, thickness, log) in period
            tapping_done_history_model.aggregate([
              {
                $match: {
                  item_sub_category_name,
                  item_name,
                  thickness,
                  log_no_code,
                  createdAt: { $gte: start, $lte: end },
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]),

            // processWaste: wastage for this item (via issue_for_tappings lookup) in period
            issue_for_tapping_wastage_model.aggregate([
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
            ]),
          ]);

          const currentAvailable = currentResult[0]?.total ?? 0;
          const tappingHand = tappingHandResult[0]?.total ?? 0;
          const tappingMachine = tappingMachineResult[0]?.total ?? 0;
          const tappingReceived = tappingHand + tappingMachine;
          const issuePressing = issuePressingResult[0]?.total ?? 0;
          const processWaste = processWasteResult[0]?.total ?? 0;
          const sales = 0; // placeholder — no schema source

          const openingBalance = currentAvailable + issuePressing - tappingReceived;
          const closingBalance =
            openingBalance + tappingReceived - issuePressing - processWaste - sales;

          return {
            item_name: item_sub_category_name,
            sales_item_name: item_name,
            thickness,
            log_no: log_no_code,
            date: tapping_date,
            opening_balance: openingBalance,
            tapping_hand: tappingHand,
            tapping_machine: tappingMachine,
            issue_pressing: issuePressing,
            process_waste: processWaste,
            sales,
            closing_balance: closingBalance,
          };
        }
      )
    );

    // Step 3: filter out all-zero rows
    const activeRows = stockData.filter(
      (row) =>
        row.opening_balance !== 0 ||
        row.tapping_hand !== 0 ||
        row.tapping_machine !== 0 ||
        row.issue_pressing !== 0 ||
        row.process_waste !== 0 ||
        row.sales !== 0 ||
        row.closing_balance !== 0
    );

    if (!activeRows.length) {
      return res.status(404).json(
        new ApiResponse(
          404,
          'No tapping stock data found for the selected period'
        )
      );
    }

    const excelLink = await GenerateTappingStockRegisterThicknessWiseExcel(
      activeRows,
      startDate,
      endDate
    );

    return res.json(
      new ApiResponse(
        200,
        'Tapping stock register (thickness wise) generated successfully',
        excelLink
      )
    );
  }
);
