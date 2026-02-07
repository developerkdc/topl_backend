import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_consumed_items_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import ItemNameModel from '../../../database/schema/masters/itemName.schema.js';
import { base_type_constants } from '../../../database/Utils/constants/constants.js';
import { GeneratePressingStockRegisterExcel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegister.js';

/** base_type to report Category display name */
const BASE_TYPE_CATEGORY_MAP = {
  [base_type_constants.plywood]: 'Plywood',
  [base_type_constants.mdf]: 'Decorative Mdf',
  [base_type_constants.fleece_paper]: 'Craft Back Paper',
};

/**
 * Resolve category name(s) for item_name_id; returns first category name or empty string.
 * @param {Map<string, string>} cache - cache of item_name_id -> category name
 * @param {ObjectId[]} itemNameIds - unique item name ids
 * @returns {Promise<Map<string, string>>} cache updated with category names
 */
async function resolveCategoryNames(cache, itemNameIds) {
  const uncached = [...itemNameIds].filter((id) => id && !cache.has(id.toString()));
  if (uncached.length === 0) return cache;
  const items = await ItemNameModel.find({ _id: { $in: uncached } })
    .populate('category')
    .lean();
  for (const item of items) {
    const name = item?.category?.[0]?.category ?? '';
    cache.set(item._id.toString(), name);
  }
  return cache;
}

/**
 * Pressing Item Stock Register Report Export
 * Generates Excel with Category, Item Group, Item Name, OPBL SqMtr, Received SqMtr,
 * Pur Sq Mtr, Issue SqMtr, Process Waste SqMtr, New Sqmtr, Closing SqMtr.
 * Uses issues_for_pressing, pressing_done_consumed_items_details, pressing_done_details.
 *
 * @route POST /report/download-excel-pressing-stock-register
 * @access Private
 */
export const PressingStockRegisterExcel = catchAsync(async (req, res, next) => {
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
    const itemNameIdToCategory = new Map();

    // 1. Distinct (category, item_group, item_name) from issues_for_pressing
    const fromIssues = await issues_for_pressing_model.aggregate([
      { $match: itemFilter },
      {
        $group: {
          _id: {
            item_name_id: '$item_name_id',
            item_sub_category_name: '$item_sub_category_name',
            item_name: '$item_name',
          },
        },
      },
    ]);
    const itemNameIdsFromIssues = [
      ...new Set(fromIssues.map((p) => p._id.item_name_id).filter(Boolean)),
    ];
    await resolveCategoryNames(itemNameIdToCategory, itemNameIdsFromIssues);

    const distinctSet = new Map();
    for (const p of fromIssues) {
      const cat = itemNameIdToCategory.get(String(p._id.item_name_id)) ?? '';
      const key = `${cat}|${p._id.item_sub_category_name ?? ''}|${p._id.item_name ?? ''}`;
      if (!distinctSet.has(key)) {
        distinctSet.set(key, {
          category: cat,
          item_group: p._id.item_sub_category_name ?? '',
          item_name: p._id.item_name ?? '',
        });
      }
    }

    // 2. Distinct from pressing_done_consumed_items_details (base_details)
    const fromBase = await pressing_done_consumed_items_details_model.aggregate([
      { $unwind: '$base_details' },
      {
        $match: {
          ...(itemFilter.item_name && { 'base_details.item_name': itemFilter.item_name }),
          ...(itemFilter.item_sub_category_name && {
            'base_details.item_sub_category_name': itemFilter.item_sub_category_name,
          }),
        },
      },
      {
        $group: {
          _id: {
            base_type: '$base_details.base_type',
            item_sub_category_name: '$base_details.item_sub_category_name',
            item_name: '$base_details.item_name',
          },
        },
      },
    ]);
    for (const p of fromBase) {
      const cat = BASE_TYPE_CATEGORY_MAP[p._id.base_type] ?? p._id.base_type ?? '';
      const key = `${cat}|${p._id.item_sub_category_name ?? ''}|${p._id.item_name ?? ''}`;
      if (!distinctSet.has(key)) {
        distinctSet.set(key, {
          category: cat,
          item_group: p._id.item_sub_category_name ?? '',
          item_name: p._id.item_name ?? '',
        });
      }
    }

    // 3. Distinct from group_details (need category from item_name_id)
    const fromGroup = await pressing_done_consumed_items_details_model.aggregate([
      { $unwind: '$group_details' },
      {
        $match: {
          ...(itemFilter.item_name && { 'group_details.item_name': itemFilter.item_name }),
          ...(itemFilter.item_sub_category_name && {
            'group_details.item_sub_category_name': itemFilter.item_sub_category_name,
          }),
        },
      },
      {
        $group: {
          _id: {
            item_name_id: '$group_details.item_name_id',
            item_sub_category_name: '$group_details.item_sub_category_name',
            item_name: '$group_details.item_name',
          },
        },
      },
    ]);
    const itemNameIdsFromGroup = [
      ...new Set(fromGroup.map((p) => p._id.item_name_id).filter(Boolean)),
    ];
    await resolveCategoryNames(itemNameIdToCategory, itemNameIdsFromGroup);

    for (const p of fromGroup) {
      const cat = itemNameIdToCategory.get(String(p._id.item_name_id)) ?? '';
      const key = `${cat}|${p._id.item_sub_category_name ?? ''}|${p._id.item_name ?? ''}`;
      if (!distinctSet.has(key)) {
        distinctSet.set(key, {
          category: cat,
          item_group: p._id.item_sub_category_name ?? '',
          item_name: p._id.item_name ?? '',
        });
      }
    }

    const distinctTriples = [...distinctSet.values()];
    if (distinctTriples.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing item data found for the selected period'));
    }

    const stockData = await Promise.all(
      distinctTriples.map(async ({ category, item_group, item_name }) => {
        const itemMatch = { item_sub_category_name: item_group, item_name };

        // Received: issues_for_pressing created in period (sqm)
        const receivedResult = await issues_for_pressing_model.aggregate([
          { $match: { ...itemMatch, createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$sqm' } } },
        ]);
        const received = receivedResult[0]?.total ?? 0;

        // Issue: consumption from pressing_done_consumed_items_details (base_details + group_details) where pressing_date in range
        const issueFromBase = await pressing_done_consumed_items_details_model.aggregate([
          { $unwind: '$base_details' },
          {
            $match: {
              'base_details.item_sub_category_name': item_group,
              'base_details.item_name': item_name,
            },
          },
          {
            $lookup: {
              from: 'pressing_done_details',
              localField: 'pressing_done_details_id',
              foreignField: '_id',
              as: 'pd',
            },
          },
          { $unwind: '$pd' },
          { $match: { 'pd.pressing_date': { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$base_details.sqm' } } },
        ]);
        const issueFromGroup = await pressing_done_consumed_items_details_model.aggregate([
          { $unwind: '$group_details' },
          {
            $match: {
              'group_details.item_sub_category_name': item_group,
              'group_details.item_name': item_name,
            },
          },
          {
            $lookup: {
              from: 'pressing_done_details',
              localField: 'pressing_done_details_id',
              foreignField: '_id',
              as: 'pd',
            },
          },
          { $unwind: '$pd' },
          { $match: { 'pd.pressing_date': { $gte: start, $lte: end } } },
          { $group: { _id: null, total: { $sum: '$group_details.sqm' } } },
        ]);
        const issue =
          (issueFromBase[0]?.total ?? 0) + (issueFromGroup[0]?.total ?? 0);

        const purchase = 0;
        const processWaste = 0;
        const newSqmtr = issue - processWaste;

        // Current available: issues_for_pressing where is_pressing_done = false
        const currentResult = await issues_for_pressing_model.aggregate([
          {
            $match: {
              ...itemMatch,
              is_pressing_done: false,
            },
          },
          { $group: { _id: null, total: { $sum: '$available_details.sqm' } } },
        ]);
        const currentAvailable = currentResult[0]?.total ?? 0;

        // Opening = current available + issue in period - received in period
        const openingBalance = currentAvailable + issue - received;
        const closingBalance = openingBalance + received + purchase - issue;

        return {
          category,
          item_group_name: item_group,
          item_name,
          opening_balance: openingBalance,
          received,
          purchase,
          issue,
          process_waste: processWaste,
          new_sqmtr: newSqmtr,
          closing_balance: closingBalance,
        };
      })
    );

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_balance !== 0 ||
        row.received !== 0 ||
        row.purchase !== 0 ||
        row.issue !== 0 ||
        row.process_waste !== 0 ||
        row.new_sqmtr !== 0 ||
        row.closing_balance !== 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(
          new ApiResponse(404, 'No pressing stock data found for the selected period')
        );
    }

    const excelLink = await GeneratePressingStockRegisterExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Pressing stock register generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating pressing stock register:', error);
    return next(
      new ApiError(error.message || 'Failed to generate report', 500)
    );
  }
});
