import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { GeneratePressingStockRegisterReport2Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport2.js';

/**
 * Pressing Stock Register Report 2 — Group No Wise
 * Columns: Item Name, Group no, Photo No, Order No, Thickness, Size,
 *          Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr,
 *          Pressing Waste SqMtr, Closing SqMtr
 * Grouping: Item Name → rows per group; subtotal per Item Name; grand total.
 *
 * @route POST /report/download-excel-pressing-stock-register-group-wise
 * @access Private
 */
export const PressingStockRegisterReport2Excel = catchAsync(async (req, res, next) => {
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

  try {
    // 1. Distinct (group_no, item_name) from issues_for_pressing (all time — opening balance needs full history)
    const distinctGroups = await issues_for_pressing_model.aggregate([
      { $match: itemFilter },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          thickness: { $first: '$thickness' },
          length: { $first: '$length' },
          width: { $first: '$width' },
        },
      },
      { $sort: { '_id.item_name': 1, '_id.group_no': 1 } },
    ]);

    if (distinctGroups.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing group data found for the selected period'));
    }

    const allGroupNos = [...new Set(distinctGroups.map((g) => g._id.group_no).filter(Boolean))];

    // 2. Bulk fetch photo_number keyed by group_no
    const photoDocs = await photoModel
      .find({ group_no: { $in: allGroupNos } }, { group_no: 1, photo_number: 1 })
      .lean();
    const photoMap = new Map(photoDocs.map((p) => [p.group_no, p.photo_number ?? '']));

    // 3. Bulk fetch pressing_id (used as Order No) keyed by group_no — take first match per group
    const pressingDetailsList = await pressing_done_details_model
      .find({ group_no: { $in: allGroupNos } }, { group_no: 1, pressing_id: 1 })
      .lean();
    const pressingIdMap = new Map();
    for (const pd of pressingDetailsList) {
      if (!pressingIdMap.has(pd.group_no)) {
        pressingIdMap.set(pd.group_no, pd.pressing_id ?? '');
      }
    }

    // 4. Bulk: Issued for pressing in period, keyed by "group_no|item_name"
    const issuedAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          ...(itemFilter.item_name ? { item_name: itemFilter.item_name } : {}),
        },
      },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          total: { $sum: '$sqm' },
        },
      },
    ]);
    const issuedMap = new Map(
      issuedAgg.map((r) => [`${r._id.group_no}|${r._id.item_name}`, r.total])
    );

    // 5. Bulk: Pressing done (received) in period, keyed by group_no
    const pressingDoneAgg = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $gte: start, $lte: end },
          group_no: { $in: allGroupNos },
        },
      },
      { $group: { _id: '$group_no', total: { $sum: '$sqm' } } },
    ]);
    const pressingDoneMap = new Map(pressingDoneAgg.map((r) => [r._id, r.total]));

    // 6. Bulk: Pressing waste in period — join pressing_damage to pressing_done_details by pressing_date
    const pressingDoneDocsForDamage = await pressing_done_details_model
      .find(
        { pressing_date: { $gte: start, $lte: end }, group_no: { $in: allGroupNos } },
        { _id: 1, group_no: 1 }
      )
      .lean();
    const pdIdToGroupNo = new Map(
      pressingDoneDocsForDamage.map((pd) => [pd._id.toString(), pd.group_no])
    );
    const pdIds = pressingDoneDocsForDamage.map((pd) => pd._id);

    const damageAgg = await pressing_damage_model.aggregate([
      { $match: { pressing_done_details_id: { $in: pdIds } } },
      { $group: { _id: '$pressing_done_details_id', total: { $sum: '$sqm' } } },
    ]);
    const damageByGroupNo = new Map();
    for (const d of damageAgg) {
      const groupNo = pdIdToGroupNo.get(d._id.toString());
      if (groupNo) {
        damageByGroupNo.set(groupNo, (damageByGroupNo.get(groupNo) ?? 0) + d.total);
      }
    }

    // 7. Bulk: Current available (is_pressing_done = false), keyed by "group_no|item_name"
    const currentAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          is_pressing_done: false,
          ...(itemFilter.item_name ? { item_name: itemFilter.item_name } : {}),
        },
      },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          total: { $sum: '$available_details.sqm' },
        },
      },
    ]);
    const currentMap = new Map(
      currentAgg.map((r) => [`${r._id.group_no}|${r._id.item_name}`, r.total])
    );

    // 8. Build per-row stock data
    const stockData = distinctGroups.map((group) => {
      const { group_no, item_name } = group._id;
      const key = `${group_no}|${item_name}`;

      const issued_for_pressing = issuedMap.get(key) ?? 0;
      const pressing_received = pressingDoneMap.get(group_no) ?? 0;
      const pressing_waste = damageByGroupNo.get(group_no) ?? 0;
      const current_available = currentMap.get(key) ?? 0;

      // Opening = current_available + pressing_received + pressing_waste - issued_in_period
      const opening_sqm = current_available + pressing_received + pressing_waste - issued_for_pressing;
      // Closing = Opening + issued - pressing_received - pressing_waste = current_available
      const closing_sqm = current_available;

      return {
        item_name,
        group_no: group_no ?? '',
        photo_no: photoMap.get(group_no) ?? '',
        order_no: pressingIdMap.get(group_no) ?? '',
        thickness: group.thickness ?? 0,
        size: `${group.length ?? 0} X ${group.width ?? 0}`,
        opening_sqm,
        issued_for_pressing,
        pressing_received,
        pressing_waste,
        closing_sqm,
      };
    });

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_sqm !== 0 ||
        row.issued_for_pressing !== 0 ||
        row.pressing_received !== 0 ||
        row.pressing_waste !== 0 ||
        row.closing_sqm !== 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing stock data found for the selected period'));
    }

    const excelLink = await GeneratePressingStockRegisterReport2Excel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(200, 'Pressing stock register (group wise) generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating pressing stock register report 2:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
