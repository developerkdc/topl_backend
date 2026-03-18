import catchAsync from '../../../../utils/errors/catchAsync.js';
import ApiError from '../../../../utils/errors/apiError.js';
import ApiResponse from '../../../../utils/ApiResponse.js';
import {
  tapping_done_items_details_model,
} from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import { tapping_done_history_model } from '../../../../database/schema/factory/tapping/tapping_history/tapping_done_history.schema.js';
import issue_for_tapping_wastage_model from '../../../../database/schema/factory/tapping/tapping_wastage/tapping_wastage.schema.js';
import { GenerateTappingStockRegisterExcel } from '../../../../config/downloadExcel/reports2/Tapping/Stock_Register/tappingStockRegister.js';

/**
 * Tapping Stock Register — "Splicing Item Stock Register sales name wise"
 * Columns: Item Name | Sales Item Name | Opening Balance |
 *          Tapping [Hand Splice | Machine Splice] | Issue [Pressing] |
 *          Process Waste | Sales (0) | Closing Balance
 *
 * @route POST /api/V1/report/download-excel-tapping-stock-register
 */
export const TappingStockRegisterExcel = catchAsync(async (req, res, next) => {
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

  // Step 1: get distinct (item_sub_category_name, item_name) pairs with activity in the date range
  // Include: tapping in period, issue to pressing in period, process waste in period
  const [pairsFromTapping, pairsFromIssuePressing, pairsFromProcessWaste] =
    await Promise.all([
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
              item_name: '$item_name',
            },
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
              item_name: '$item_name',
            },
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
              item_name: '$issueFor.item_name',
            },
          },
        },
      ]),
    ]);

  // Merge and dedupe by (item_sub_category_name, item_name)
  const pairMap = new Map();
  for (const p of [
    ...pairsFromTapping,
    ...pairsFromIssuePressing,
    ...pairsFromProcessWaste,
  ]) {
    const key = `${p._id.item_sub_category_name}|${p._id.item_name}`;
    if (!pairMap.has(key)) {
      pairMap.set(key, {
        item_sub_category_name: p._id.item_sub_category_name,
        item_name: p._id.item_name,
      });
    }
  }

  const pairs = Array.from(pairMap.values()).sort((a, b) => {
    const cmpA = (a.item_sub_category_name || '').localeCompare(
      b.item_sub_category_name || ''
    );
    return cmpA !== 0 ? cmpA : (a.item_name || '').localeCompare(b.item_name || '');
  });

  if (!pairs.length) {
    return res.status(404).json(
      new ApiResponse(404, 'No tapping data found')
    );
  }

  // Step 2: compute per-pair aggregates in parallel
  const stockData = await Promise.all(
    pairs.map(async ({ item_sub_category_name, item_name }) => {
      const matchItem = { item_sub_category_name, item_name };

      // Current available (all-time stock still in tapping)
      const [
        currentResult,
        tappingHandResult,
        tappingMachineResult,
        issuePressingResult,
        salesResult,
        processWasteResult,
      ] = await Promise.all([
        // currentAvailable: sum available_details.sqm
        tapping_done_items_details_model.aggregate([
          { $match: matchItem },
          { $group: { _id: null, total: { $sum: '$available_details.sqm' } } },
        ]),

        // tappingHand: received in period via hand splicing
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

        // tappingMachine: received in period via machine splicing
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
              'session.splicing_type': { $in: ['MACHINE', 'MACHINE SPLICING'] },
            },
          },
          { $group: { _id: null, total: { $sum: '$sqm' } } },
        ]),

        // issuePressing: from tapping_done_history in period — exclude order+RAW (those go to Sales)
        tapping_done_history_model.aggregate([
          {
            $match: {
              ...matchItem,
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

        // sales: from tapping_done_history — order + RAW only
        tapping_done_history_model.aggregate([
          {
            $match: {
              ...matchItem,
              createdAt: { $gte: start, $lte: end },
              $or: [{ issued_for: 'ORDER' }],
              order_category: 'RAW',
            },
          },
          { $group: { _id: null, total: { $sum: '$sqm' } } },
        ]),

        // processWaste: from issue_for_tapping_wastage in period (joined to issue_for_tappings for item)
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
      const sales = salesResult[0]?.total ?? 0;
      const processWaste = processWasteResult[0]?.total ?? 0;

      // Opening = currentAvailable + (issuePressing + sales) − tappingReceived (min 0)
      const openingBalance = Math.max(
        0,
        currentAvailable + issuePressing + sales - tappingReceived
      );
      // Closing = Opening + tappingReceived − issuePressing − processWaste − sales (min 0)
      const closingBalance = Math.max(
        0,
        openingBalance + tappingReceived - issuePressing - processWaste - sales
      );

      return {
        item_name: item_sub_category_name,
        sales_item_name: item_name,
        opening_balance: openingBalance,
        tapping_hand: tappingHand,
        tapping_machine: tappingMachine,
        issue_pressing: issuePressing,
        process_waste: processWaste,
        sales,
        closing_balance: closingBalance,
      };
    })
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

  const excelLink = await GenerateTappingStockRegisterExcel(
    activeRows,
    startDate,
    endDate
  );

  return res.json(
    new ApiResponse(
      200,
      'Tapping stock register generated successfully',
      excelLink
    )
  );
});
