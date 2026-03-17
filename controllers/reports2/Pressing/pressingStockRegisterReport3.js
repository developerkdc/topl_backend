import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { GeneratePressingStockRegisterReport3Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport3.js';

/**
 * Pressing Stock Register Report 3 — Sales name - Thickness
 * Columns: Item Name, Sales item Name, Thickness, Size,
 *          Opening SqMtr, Issued for pressing, Pressing received,
 *          Sales, All Damage, Closing SqMtr
 *
 * Row universe: distinct (group_no, thickness, length, width) from
 *   pressing_done_details with pressing_date in [start, end].
 *
 * @route POST /report/download-excel-pressing-stock-register-sales-thickness
 * @access Private
 */
export const PressingStockRegisterReport3Excel = catchAsync(async (req, res, next) => {
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
    // 1. Fetch distinct pressing output rows in the date range
    const pressingDoneRaw = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            group_no: '$group_no',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          pressing_received: { $sum: '$sqm' },
          pressing_done_ids: { $push: '$_id' },
        },
      },
    ]);

    if (pressingDoneRaw.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    const allGroupNos = [...new Set(pressingDoneRaw.map((r) => r._id.group_no).filter(Boolean))];

    // 2. Resolve item_name from issues_for_pressing
    const itemNameDocs = await issues_for_pressing_model
      .find({ group_no: { $in: allGroupNos } }, { group_no: 1, item_name: 1 })
      .lean();
    const itemNameMap = new Map();
    for (const doc of itemNameDocs) {
      if (!itemNameMap.has(doc.group_no)) {
        itemNameMap.set(doc.group_no, doc.item_name ?? '');
      }
    }

    // Apply item_name filter if present
    const filteredGroups = filter.item_name
      ? pressingDoneRaw.filter((r) => itemNameMap.get(r._id.group_no) === filter.item_name.toUpperCase().trim())
      : pressingDoneRaw;

    if (filteredGroups.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    const filteredGroupNos = [...new Set(filteredGroups.map((r) => r._id.group_no))];

    // 3. Opening: SUM(pressing_done_details.sqm) where pressing_date < start
    const openingAgg = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $lt: start },
          group_no: { $in: filteredGroupNos },
        },
      },
      {
        $group: {
          _id: {
            group_no: '$group_no',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          opening_sqm: { $sum: '$sqm' },
        },
      },
    ]);
    const openingByGroupDim = new Map(
      openingAgg.map((r) => [
        `${r._id.group_no}|${r._id.thickness ?? 0}|${r._id.length ?? 0}|${r._id.width ?? 0}`,
        r.opening_sqm,
      ])
    );

    // 4. All pressing_done IDs for each (group_no, thickness, length, width) where pressing_date <= end
    const allPdIdsAgg = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $lte: end },
          group_no: { $in: filteredGroupNos },
        },
      },
      {
        $group: {
          _id: {
            group_no: '$group_no',
            thickness: '$thickness',
            length: '$length',
            width: '$width',
          },
          pressing_done_ids: { $push: '$_id' },
        },
      },
    ]);
    const allPdIdsByGroupDim = new Map(
      allPdIdsAgg.map((r) => [
        `${r._id.group_no}|${r._id.thickness ?? 0}|${r._id.length ?? 0}|${r._id.width ?? 0}`,
        r.pressing_done_ids,
      ])
    );
    const allPdIdsForDamageSales = allPdIdsAgg.flatMap((r) => r.pressing_done_ids);

    // 5. Resolve sales_item_name from photos
    const photoDocs = await photoModel
      .find({ group_no: { $in: filteredGroupNos } }, { group_no: 1, sales_item_name: 1 })
      .lean();
    const salesNameMap = new Map(photoDocs.map((p) => [p.group_no, p.sales_item_name ?? '']));

    // 6. Sales from pressing_done_history (ALL pressing_done for each group)
    const salesAgg = await pressing_done_history_model.aggregate([
      { $match: { issued_item_id: { $in: allPdIdsForDamageSales } } },
      { $group: { _id: '$issued_item_id', total: { $sum: '$sqm' } } },
    ]);
    const salesByPdId = new Map(salesAgg.map((r) => [r._id.toString(), r.total]));

    // 7. All Damage from pressing_damage (ALL pressing_done for each group)
    const damageAgg = await pressing_damage_model.aggregate([
      { $match: { pressing_done_details_id: { $in: allPdIdsForDamageSales } } },
      { $group: { _id: '$pressing_done_details_id', total: { $sum: '$sqm' } } },
    ]);
    const damageByPdId = new Map(damageAgg.map((r) => [r._id.toString(), r.total]));

    // 8. Issued for pressing (inflow in period)
    const issuedAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: filteredGroupNos },
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$group_no',
          total: { $sum: '$sqm' },
        },
      },
    ]);
    const issuedMap = new Map(issuedAgg.map((r) => [r._id, r.total]));

    // 9. Group by (item_name, sales_item_name, thickness, size)
    const comboMap = new Map();
    for (const group of filteredGroups) {
      const { group_no, thickness, length, width } = group._id;
      const item_name = itemNameMap.get(group_no) ?? '';
      const sales_item_name = salesNameMap.get(group_no) ?? '';
      const size = `${length ?? 0} X ${width ?? 0}`;
      const comboKey = `${item_name}||${sales_item_name}||${thickness ?? 0}||${size}`;

      if (!comboMap.has(comboKey)) {
        comboMap.set(comboKey, {
          item_name,
          sales_item_name,
          thickness: thickness ?? 0,
          size,
          groupDims: [],
          pressing_received: 0,
        });
      }
      const combo = comboMap.get(comboKey);
      combo.groupDims.push({ group_no, thickness: thickness ?? 0, length: length ?? 0, width: width ?? 0 });
      combo.pressing_received += group.pressing_received;
    }

    const stockData = [...comboMap.values()].map((combo) => {
      const { item_name, sales_item_name, thickness, size, groupDims } = combo;

      let opening_sqm = 0;
      const allPdIdsForCombo = [];
      for (const dim of groupDims) {
        const dimKey = `${dim.group_no}|${dim.thickness}|${dim.length}|${dim.width}`;
        opening_sqm += openingByGroupDim.get(dimKey) ?? 0;
        allPdIdsForCombo.push(...(allPdIdsByGroupDim.get(dimKey) ?? []));
      }

      let sales = 0;
      let all_damage = 0;
      for (const id of allPdIdsForCombo) {
        sales += salesByPdId.get(id.toString()) ?? 0;
        all_damage += damageByPdId.get(id.toString()) ?? 0;
      }

      let issued_for_pressing = 0;
      for (const dim of groupDims) {
        issued_for_pressing += issuedMap.get(dim.group_no) ?? 0;
      }

      const pressing_received = combo.pressing_received;
      const pressing_waste = all_damage;

      const closing_sqm = Math.max(0, opening_sqm + pressing_received - all_damage - sales);

      return {
        item_name,
        sales_item_name,
        thickness,
        size,
        opening_sqm,
        issued_for_pressing,
        pressing_received,
        pressing_waste,
        sales,
        all_damage,
        closing_sqm,
      };
    });

    const activeStockData = stockData.filter(
      (row) =>
        row.issued_for_pressing !== 0 ||
        row.pressing_received !== 0 ||
        row.all_damage !== 0 ||
        row.sales !== 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing stock data found for the selected period'));
    }

    const excelLink = await GeneratePressingStockRegisterReport3Excel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(200, 'Pressing stock register (sales name - thickness) generated successfully', excelLink)
    );
  } catch (error) {
    console.error('Error generating pressing stock register report 3:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
