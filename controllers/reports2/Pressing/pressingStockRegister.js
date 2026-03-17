import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
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
 * Columns: Category, Item Group, Item Name, OPBL SqMtr, Received SqMtr (Pressing Done),
 * Pur Sq Mtr (0), Issue SqMtr (Sales), Process Waste SqMtr (All Damage), New Sqmtr, Closing SqMtr.
 *
 * Row universe: distinct (category, item_group, item_name) from
 *   pressing_done_details output in the date range.
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
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return next(new ApiError('Invalid date format. Use YYYY-MM-DD', 400));
  }

  if (start > end) {
    return next(new ApiError('Start date cannot be after end date', 400));
  }

  try {
    const itemNameIdToCategory = new Map();

    // 1. Fetch distinct items that were pressed in the date range
    const pressingDoneRaw = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$group_no',
          sqm_total: { $sum: '$sqm' },
          pd_ids: { $push: '$_id' },
        },
      },
    ]);

    if (pressingDoneRaw.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    const allGroupNos = pressingDoneRaw.map((r) => r._id).filter(Boolean);

    // 2. Resolve item details from issues_for_pressing
    const groupDetailsDocs = await issues_for_pressing_model
      .find({ group_no: { $in: allGroupNos } })
      .lean();

    const groupToDetails = new Map();
    const itemNameIds = new Set();
    for (const doc of groupDetailsDocs) {
      if (!groupToDetails.has(doc.group_no)) {
        groupToDetails.set(doc.group_no, {
          item_name: doc.item_name ?? '',
          item_sub_category_name: doc.item_sub_category_name ?? '',
          item_name_id: doc.item_name_id,
        });
        if (doc.item_name_id) itemNameIds.add(doc.item_name_id);
      }
    }
    await resolveCategoryNames(itemNameIdToCategory, itemNameIds);

    // 3. Aggregate by Category | Item Group | Item Name
    const itemMap = new Map();
    for (const row of pressingDoneRaw) {
      const details = groupToDetails.get(row._id);
      if (!details) continue;

      const category = itemNameIdToCategory.get(String(details.item_name_id)) ?? '';
      const item_group = details.item_sub_category_name;
      const item_name = details.item_name;

      if (filter.item_name && item_name !== filter.item_name.toUpperCase().trim()) continue;
      if (filter.item_group_name && item_group !== filter.item_group_name.toUpperCase().trim()) continue;

      const key = `${category}|${item_group}|${item_name}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          category,
          item_group,
          item_name,
          received_sqm: 0,
          pd_ids: [],
          group_nos: [],
        });
      }
      const entry = itemMap.get(key);
      entry.received_sqm += row.sqm_total;
      entry.pd_ids.push(...row.pd_ids);
      entry.group_nos.push(row._id);
    }

    if (itemMap.size === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    const itemEntries = [...itemMap.values()];
    const allPdIds = itemEntries.flatMap((e) => e.pd_ids);
    const allFilteredGroupNos = itemEntries.flatMap((e) => e.group_nos);

    // 4. Batch fetch Sales and Damages
    const salesAgg = await pressing_done_history_model.aggregate([
      { $match: { issued_item_id: { $in: allPdIds } } },
      { $group: { _id: '$issued_item_id', total: { $sum: '$sqm' } } },
    ]);
    const salesMap = new Map(salesAgg.map((r) => [r._id.toString(), r.total]));

    const damageAgg = await pressing_damage_model.aggregate([
      { $match: { pressing_done_details_id: { $in: allPdIds } } },
      { $group: { _id: '$pressing_done_details_id', total: { $sum: '$sqm' } } },
    ]);
    const damageMap = new Map(damageAgg.map((r) => [r._id.toString(), r.total]));

    // 5. Stocks (current and issued-for-pressing)
    const currentAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: allFilteredGroupNos },
          is_pressing_done: false,
        },
      },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          total: { $sum: '$available_details.sqm' },
        },
      },
    ]);
    const currentStockMap = new Map(
      currentAgg.map((r) => [`${r._id.group_no}|${r._id.item_name}`, r.total])
    );

    const periodInflowAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: allFilteredGroupNos },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          total: { $sum: '$sqm' },
        },
      },
    ]);
    const periodInflowMap = new Map(
      periodInflowAgg.map((r) => [`${r._id.group_no}|${r._id.item_name}`, r.total])
    );

    // 6. Build report data
    const stockData = itemEntries.map((entry) => {
      let sales = 0;
      let damage = 0;
      for (const id of entry.pd_ids) {
        sales += salesMap.get(id.toString()) ?? 0;
        damage += damageMap.get(id.toString()) ?? 0;
      }

      let current_available = 0;
      let issued_for_pressing = 0;
      for (const gn of entry.group_nos) {
        current_available += currentStockMap.get(`${gn}|${entry.item_name}`) ?? 0;
        issued_for_pressing += periodInflowMap.get(`${gn}|${entry.item_name}`) ?? 0;
      }

      const received = entry.received_sqm;
      const process_waste = damage;
      const purchase = 0;

      const opening_balance = current_available + received + damage - issued_for_pressing;
      // Issue in this report = outflow out of pressing stage (Sales)
      const issue = sales;
      const new_sqmtr = received - process_waste;
      const closing_balance = opening_balance + issued_for_pressing - received - damage;

      return {
        category: entry.category,
        item_group_name: entry.item_group,
        item_name: entry.item_name,
        opening_balance,
        received,
        purchase,
        issue,
        process_waste,
        new_sqmtr,
        closing_balance,
      };
    });

    const activeStockData = stockData.filter(
      (row) =>
        row.received !== 0 ||
        row.issue !== 0 ||
        row.purchase !== 0 ||
        row.process_waste !== 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing stock data found for the selected period'));
    }

    const excelLink = await GeneratePressingStockRegisterExcel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(200, 'Pressing stock register generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating pressing stock register:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
