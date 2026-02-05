import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import {
  process_done_details_model,
  process_done_items_details_model,
} from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import { GenerateSmokingDyingStockRegisterExcel } from '../../../config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js';

/**
 * Map process_name (uppercase) to "direct_dye" or "dr_dyed". Other values map to null (excluded from both columns).
 */
const PROCESS_NAME_DIRECT_DYE = ['DIRECT DYE', 'DIRECT DYEING'];
const PROCESS_NAME_DR_DYED = ['DR DYED', 'DR DYE'];

function getProcessBucket(processName) {
  if (!processName || typeof processName !== 'string') return null;
  const upper = processName.toUpperCase().trim();
  if (PROCESS_NAME_DIRECT_DYE.some((p) => upper === p || upper.includes('DIRECT'))) return 'direct_dye';
  if (PROCESS_NAME_DR_DYED.some((p) => upper === p || (upper.includes('DR') && (upper.includes('DYED') || upper.includes('DYE'))))) return 'dr_dyed';
  return null;
}

/**
 * Smoking&Dying Stock Register Report Export
 * Generates Excel report with Item Group Name, Item Name, Opening Balance, Direct Dye, DR Dyed,
 * Issue Sq Mtr, Clipping, Mixmatch, Edgebanding, Lipping, Sale, Closing Balance.
 * Uses process_done_items_details and process_done_details.
 *
 * @route POST /report/download-excel-smoking-dying-stock-register
 * @access Private
 */
export const SmokingDyingStockRegisterExcel = catchAsync(async (req, res, next) => {
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
    // Distinct (item_sub_category_name, item_name) from process_done_items_details
    const distinctPairs = await process_done_items_details_model.aggregate([
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
          new ApiResponse(404, 'No smoking & dying data found for the selected period')
        );
    }

    const stockData = await Promise.all(
      pairs.map(async ({ item_sub_category_name, item_name }) => {
        const matchItem = {
          item_sub_category_name,
          item_name,
        };

        // Current available SQM (issue_status null/not set)
        const currentResult = await process_done_items_details_model.aggregate([
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

        // Receipt in period: join with process_done_details, process_done_date in range; split by process_name -> Direct Dye / DR Dyed
        const receiptInPeriodResult = await process_done_items_details_model.aggregate([
          { $match: matchItem },
          {
            $lookup: {
              from: 'process_done_details',
              localField: 'process_done_id',
              foreignField: '_id',
              as: 'details',
            },
          },
          { $unwind: '$details' },
          {
            $match: {
              'details.process_done_date': { $gte: start, $lte: end },
            },
          },
          {
            $group: {
              _id: '$process_name',
              total: { $sum: '$sqm' },
            },
          },
        ]);

        let directDye = 0;
        let drDyed = 0;
        let receiptInPeriod = 0;
        for (const row of receiptInPeriodResult) {
          const bucket = getProcessBucket(row._id);
          if (bucket === 'direct_dye') {
            directDye += row.total ?? 0;
          } else if (bucket === 'dr_dyed') {
            drDyed += row.total ?? 0;
          }
          receiptInPeriod += row.total ?? 0;
        }

        // Issued in period: issue_status === 'grouping' and updatedAt in range -> Issue Sq Mtr
        const issueSqMtrResult = await process_done_items_details_model.aggregate([
          {
            $match: {
              ...matchItem,
              issue_status: 'grouping',
              updatedAt: { $gte: start, $lte: end },
            },
          },
          { $group: { _id: null, total: { $sum: '$sqm' } } },
        ]);
        const issue_sq_mtr = issueSqMtrResult[0]?.total ?? 0;
        const issuedInPeriod = issue_sq_mtr;

        const clipping = 0;
        const mixmatch = 0;
        const edgebanding = 0;
        const lipping = 0;
        const sale = 0;

        // Opening = current available + issued in period - (direct_dye + dr_dyed) in period
        const openingBalance = Math.max(
          0,
          currentAvailable + issuedInPeriod - receiptInPeriod
        );
        // Closing = Opening + Direct Dye + DR Dyed - Issue Sq Mtr - Clipping - Mixmatch - Edgebanding - Lipping - Sale
        const totalIssues =
          issue_sq_mtr + clipping + mixmatch + edgebanding + lipping + sale;
        const closingBalance = Math.max(
          0,
          openingBalance + directDye + drDyed - totalIssues
        );

        return {
          item_group_name: item_sub_category_name,
          item_name,
          opening_balance: openingBalance,
          direct_dye: directDye,
          dr_dyed: drDyed,
          issue_sq_mtr,
          clipping,
          mixmatch,
          edgebanding,
          lipping,
          sale,
          closing_balance: closingBalance,
        };
      })
    );

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_balance > 0 ||
        row.direct_dye > 0 ||
        row.dr_dyed > 0 ||
        row.issue_sq_mtr > 0 ||
        row.clipping > 0 ||
        row.mixmatch > 0 ||
        row.edgebanding > 0 ||
        row.lipping > 0 ||
        row.sale > 0 ||
        row.closing_balance > 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No smoking & dying stock data found for the selected period')
        );
    }

    const excelLink = await GenerateSmokingDyingStockRegisterExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Smoking & dying stock register generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating smoking & dying stock register:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
