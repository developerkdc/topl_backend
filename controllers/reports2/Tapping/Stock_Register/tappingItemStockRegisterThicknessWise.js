import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import {
  tapping_done_items_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import issue_for_tapping_wastage_model from '../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import { GenerateTappingItemStockRegisterThicknessWiseExcel } from '../../../../config/downloadExcel/reports2/Tapping/Stock_Register/tappingItemStockRegisterThicknessWise.js';

/**
 * Tapping Item Stock Register Thickness Wise — "Splicing Item Stock Register thickness wise" (Report -2)
 * Simplified variant of Report -1 (tappingStockRegisterThicknessWise).
 * Groups by (item_sub_category_name, thickness, log_no_code) — no item_name dimension.
 * Produces 11 columns (no "Sales Item Name" column).
 *
 * @route POST /api/V1/report/download-excel-tapping-item-stock-register-thickness-wise
 */
export const TappingItemStockRegisterThicknessWiseExcel = catchAsync(
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

    // Step 1: distinct (item_sub_category_name, thickness, log_no_code) tuples
    // Include: tapping in period, issue to pressing in period, process waste in period (Report -2: no item_name)
    const [
      tuplesFromTapping,
      tuplesFromIssuePressing,
      tuplesFromProcessWaste,
    ] = await Promise.all([
      // Source 1: tapping done in period
      tapping_done_items_details_model.aggregate([
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
          },
        },
        {
          $group: {
            _id: {
              item_sub_category_name: '$item_sub_category_name',
              thickness: '$thickness',
              log_no_code: '$log_no_code',
            },
            tapping_date: { $min: '$session.tapping_date' },
          },
        },
      ]),
      // Source 2: issued to pressing in period (tapped earlier, issued in period)
      tapping_done_history_model.aggregate([
        {
          $match: { createdAt: { $gte: start, $lte: end } },
        },
        {
          $group: {
            _id: {
              item_sub_category_name: '$item_sub_category_name',
              thickness: '$thickness',
              log_no_code: '$log_no_code',
            },
            tapping_date: { $min: '$createdAt' },
          },
        },
      ]),
      // Source 3: process waste in period
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
          $group: {
            _id: {
              item_sub_category_name: '$issueFor.item_sub_category_name',
              thickness: '$issueFor.thickness',
              log_no_code: '$issueFor.log_no_code',
            },
            tapping_date: { $min: '$createdAt' },
          },
        },
      ]),
    ]);

    // Merge and dedupe; for date use earliest from any source
    const tupleMap = new Map();
    for (const t of [
      ...tuplesFromTapping,
      ...tuplesFromIssuePressing,
      ...tuplesFromProcessWaste,
    ]) {
      const key =
        `${t._id.item_sub_category_name}|${t._id.thickness}|${t._id.log_no_code}`;
      const existing = tupleMap.get(key);
      const date = t.tapping_date ?? null;
      if (!existing || (date && (!existing.tapping_date || date < existing.tapping_date))) {
        tupleMap.set(key, {
          item_sub_category_name: t._id.item_sub_category_name,
          thickness: t._id.thickness,
          log_no_code: t._id.log_no_code,
          tapping_date: date,
        });
      }
    }

    const tuples = Array.from(tupleMap.values()).sort((a, b) => {
      const c1 = (a.item_sub_category_name || '').localeCompare(b.item_sub_category_name || '');
      if (c1) return c1;
      const c2 = (a.thickness ?? 0) - (b.thickness ?? 0);
      if (c2) return c2;
      return (a.log_no_code || '').localeCompare(b.log_no_code || '');
    });

    if (!tuples.length) {
      return res.status(404).json(
        new ApiResponse(404, 'No tapping data found')
      );
    }

    // Step 2: compute per-tuple aggregates in parallel
    const stockData = await Promise.all(
      tuples.map(
        async ({ item_sub_category_name, thickness, log_no_code, tapping_date }) => {
          // Match by (item_sub_category_name, thickness, log_no_code) — no item_name
          const matchItem = {
            item_sub_category_name,
            thickness,
            log_no_code,
          };

          const [
            currentResult,
            tappingHandResult,
            tappingMachineResult,
            issuePressingResult,
            salesResult,
            processWasteResult,
          ] = await Promise.all([
            // currentAvailable: sum available_details.sqm for this (item_sub_category, thickness, log)
            tapping_done_items_details_model.aggregate([
              { $match: matchItem },
              {
                $group: {
                  _id: null,
                  total: { $sum: '$available_details.sqm' },
                },
              },
            ]),

            // tappingHand: sqm received in period via hand splicing
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

            // tappingMachine: sqm received in period via machine splicing
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

            // issuePressing: sqm issued to pressing — exclude order+RAW (those go to Sales)
            tapping_done_history_model.aggregate([
              {
                $match: {
                  item_sub_category_name,
                  thickness,
                  log_no_code,
                  createdAt: { $gte: start, $lte: end },
                  $or: [
                    { issued_for: 'STOCK' },
                    { issued_for: 'SAMPLE' },
                    {
                      $and: [
                        { issued_for: 'ORDER' },
                        { order_category: { $ne: 'RAW' } },
                      ],
                    },
                  ],
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]),

            // sales: order + RAW only
            tapping_done_history_model.aggregate([
              {
                $match: {
                  item_sub_category_name,
                  thickness,
                  log_no_code,
                  createdAt: { $gte: start, $lte: end },
                  issued_for: 'ORDER',
                  order_category: 'RAW',
                },
              },
              { $group: { _id: null, total: { $sum: '$sqm' } } },
            ]),

            // processWaste: wastage for this (item_sub_category, thickness, log) from tapping damage (via issue_for_tappings lookup) in period
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
                  'issueFor.thickness': thickness,
                  'issueFor.log_no_code': log_no_code,
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
          const sales = salesResult[0]?.total ?? 0;
          const processWaste = processWasteResult[0]?.total ?? 0;

          const openingBalance = Math.max(
            0,
            currentAvailable + issuePressing + sales - tappingReceived
          );
          const closingBalance = Math.max(
            0,
            openingBalance + tappingReceived - issuePressing - processWaste - sales
          );

          return {
            item_name: item_sub_category_name,
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

    const excelLink = await GenerateTappingItemStockRegisterThicknessWiseExcel(
      activeRows,
      startDate,
      endDate
    );

    return res.json(
      new ApiResponse(
        200,
        'Tapping item stock register (thickness wise) generated successfully',
        excelLink
      )
    );
  }
);
