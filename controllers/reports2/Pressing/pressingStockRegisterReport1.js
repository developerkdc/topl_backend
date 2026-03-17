import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { item_issued_for } from '../../../database/Utils/constants/constants.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import cnc_damage_model from '../../../database/schema/factory/cnc/cnc_damage/cnc_damage.schema.js';
import color_damage_model from '../../../database/schema/factory/colour/colour_damage/colour_damage.schema.js';
import polishing_damage_model from '../../../database/schema/factory/polishing/polishing_damage/polishing_damage.schema.js';
import { GeneratePressingStockRegisterReport1Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport1.js';

/**
 * Pressing Stock Register Report 1 — Sales name - Thickness - Other Process Wise
 * Columns: Item Name, Sales item Name, Thickness, Size,
 *          Opening SqMtr, Pressing SqMtr,
 *          Sales (total issued from pressing to further processes via pressing_done_history),
 *          Issue for Challan (0 — schema gap),
 *          All Damage (Pressing + CNC + Colour + Polish damage sqm),
 *          Process Waste (pressing damage only),
 *          Closing SqMtr
 * Grouping: Item Name → Sales item Name; subtotal per Item Name; grand total.
 *
 * Row universe: distinct (item_name, sales_item_name, thickness, size) combos from
 *   pressing_done_details with pressing_date in [start, end].
 *   item_name is resolved via group_no → issues_for_pressing.
 *   sales_item_name is resolved via group_no → photos.
 *
 * @route POST /report/download-excel-pressing-stock-register-sales-thickness-process
 * @access Private
 */
export const PressingStockRegisterReport1Excel = catchAsync(async (req, res, next) => {
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
    // ─────────────────────────────────────────────────────────────────────────
    // 1. Fetch distinct pressing_done_details rows in the date range
    //    Each pressing_done_details has group_no, thickness, length, width, sqm, _id
    // ─────────────────────────────────────────────────────────────────────────
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
          pressing_sqm: { $sum: '$sqm' },
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

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Resolve item_name per group_no from issues_for_pressing
    // ─────────────────────────────────────────────────────────────────────────
    const itemNameDocs = await issues_for_pressing_model
      .find({ group_no: { $in: allGroupNos } }, { group_no: 1, item_name: 1 })
      .lean();
    const itemNameMap = new Map();
    for (const doc of itemNameDocs) {
      if (!itemNameMap.has(doc.group_no)) {
        itemNameMap.set(doc.group_no, doc.item_name ?? '');
      }
    }

    // Apply optional item_name filter
    const filteredGroupNos = filter.item_name
      ? allGroupNos.filter((gn) => itemNameMap.get(gn) === filter.item_name.toUpperCase().trim())
      : allGroupNos;

    if (filteredGroupNos.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Resolve sales_item_name per group_no from photos
    // ─────────────────────────────────────────────────────────────────────────
    const photoDocs = await photoModel
      .find({ group_no: { $in: filteredGroupNos } }, { group_no: 1, sales_item_name: 1 })
      .lean();
    const salesNameMap = new Map(
      photoDocs.map((p) => [p.group_no, p.sales_item_name ?? ''])
    );

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Build combo map: (item_name, sales_item_name, thickness, size) → group_nos + pressing_done_ids
    // ─────────────────────────────────────────────────────────────────────────
    const comboMap = new Map();
    for (const row of pressingDoneRaw) {
      const { group_no, thickness, length, width } = row._id;
      if (!filteredGroupNos.includes(group_no)) continue;

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
          pressing_sqm: 0,
        });
      }
      const combo = comboMap.get(comboKey);
      combo.groupDims.push({ group_no, thickness: thickness ?? 0, length: length ?? 0, width: width ?? 0 });
      combo.pressing_sqm += row.pressing_sqm;
    }

    const combos = [...comboMap.values()];

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Opening: SUM(pressing_done_details.sqm) where pressing_date < start,
    //    grouped by (group_no, thickness, length, width)
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 6. All pressing_done IDs for each (group_no, thickness, length, width)
    //    where pressing_date <= end — for full damage/sales scope (not just period)
    // ─────────────────────────────────────────────────────────────────────────
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

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Sales: sum sqm from pressing_done_history where issued_for = ORDER
    // ─────────────────────────────────────────────────────────────────────────
    const salesAgg = await pressing_done_history_model.aggregate([
      {
        $match: {
          issued_item_id: { $in: allPdIdsForDamageSales },
          issued_for: item_issued_for.order,
        },
      },
      { $group: { _id: '$issued_item_id', total: { $sum: '$sqm' } } },
    ]);
    const salesByPdId = new Map(salesAgg.map((r) => [r._id.toString(), r.total]));

    // ─────────────────────────────────────────────────────────────────────────
    // 8. All Damage: Pressing + CNC + Colour + Polish (via pressing_details_id)
    // ─────────────────────────────────────────────────────────────────────────
    const [pressingDamageAgg, cncDamageAgg, colorDamageAgg, polishingDamageAgg] = await Promise.all([
      pressing_damage_model.aggregate([
        { $match: { pressing_done_details_id: { $in: allPdIdsForDamageSales } } },
        { $group: { _id: '$pressing_done_details_id', total: { $sum: '$sqm' } } },
      ]),
      cnc_damage_model.aggregate([
        { $lookup: { from: 'cnc_done_details', localField: 'cnc_done_id', foreignField: '_id', as: 'cnc_done' } },
        { $unwind: '$cnc_done' },
        { $match: { 'cnc_done.pressing_details_id': { $in: allPdIdsForDamageSales } } },
        { $group: { _id: '$cnc_done.pressing_details_id', total: { $sum: '$sqm' } } },
      ]),
      color_damage_model.aggregate([
        { $lookup: { from: 'color_done_details', localField: 'color_done_id', foreignField: '_id', as: 'color_done' } },
        { $unwind: '$color_done' },
        { $match: { 'color_done.pressing_details_id': { $in: allPdIdsForDamageSales } } },
        { $group: { _id: '$color_done.pressing_details_id', total: { $sum: '$sqm' } } },
      ]),
      polishing_damage_model.aggregate([
        { $lookup: { from: 'polishing_done_details', localField: 'polishing_done_id', foreignField: '_id', as: 'polishing_done' } },
        { $unwind: '$polishing_done' },
        { $match: { 'polishing_done.pressing_details_id': { $in: allPdIdsForDamageSales } } },
        { $group: { _id: '$polishing_done.pressing_details_id', total: { $sum: '$sqm' } } },
      ]),
    ]);

    const damageByPdId = new Map();
    for (const r of [...pressingDamageAgg, ...cncDamageAgg, ...colorDamageAgg, ...polishingDamageAgg]) {
      const key = r._id.toString();
      damageByPdId.set(key, (damageByPdId.get(key) ?? 0) + r.total);
    }
    const processWasteByPdId = new Map(pressingDamageAgg.map((r) => [r._id.toString(), r.total]));

    // CNC + Colour + Polish damage per pressing_done_id (for Sales = sales_raw - downstream damage)
    const cncColorPolishDamageByPdId = new Map();
    for (const r of [...cncDamageAgg, ...colorDamageAgg, ...polishingDamageAgg]) {
      const key = r._id.toString();
      cncColorPolishDamageByPdId.set(key, (cncColorPolishDamageByPdId.get(key) ?? 0) + r.total);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Build per-combo stock data
    // Sales (displayed) = sales_raw - CNC+Colour+Polish damage. Closing uses sales_raw.
    // ─────────────────────────────────────────────────────────────────────────
    const stockData = combos.map((combo) => {
      const { item_name, sales_item_name, thickness, size, groupDims } = combo;

      // Opening: sum pressing_done.sqm before start for each (group_no, thickness, length, width) in combo
      let opening_sqm = 0;
      const allPdIdsForCombo = [];
      for (const dim of groupDims) {
        const dimKey = `${dim.group_no}|${dim.thickness}|${dim.length}|${dim.width}`;
        opening_sqm += openingByGroupDim.get(dimKey) ?? 0;
        allPdIdsForCombo.push(...(allPdIdsByGroupDim.get(dimKey) ?? []));
      }

      const uniquePdIds = [...new Set(allPdIdsForCombo.map((id) => id.toString()))];
      let sales_raw = 0;
      let downstream_damage = 0;
      let all_damage = 0;
      let process_waste = 0;
      for (const idStr of uniquePdIds) {
        sales_raw += salesByPdId.get(idStr) ?? 0;
        downstream_damage += cncColorPolishDamageByPdId.get(idStr) ?? 0;
        all_damage += damageByPdId.get(idStr) ?? 0;
        process_waste += processWasteByPdId.get(idStr) ?? 0;
      }

      const sales = Math.max(0, sales_raw - downstream_damage);
      const pressing_sqm = combo.pressing_sqm;
      const issue_for_challan = 0;

      const closing_sqm = Math.max(0, opening_sqm + pressing_sqm - sales - all_damage);

      return {
        item_name,
        sales_item_name,
        thickness,
        size,
        opening_sqm,
        pressing_sqm,
        sales,
        issue_for_challan,
        damage: all_damage,
        process_waste,
        closing_sqm,
      };
    });

    // Only include rows that had actual in-period pressing activity.
    // current_available alone must NOT cause a row to appear.
    const activeStockData = stockData.filter(
      (row) =>
        row.pressing_sqm !== 0 ||
        row.sales !== 0 ||
        row.damage !== 0
    );

    if (activeStockData.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing stock data found for the selected period'));
    }

    const excelLink = await GeneratePressingStockRegisterReport1Excel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Pressing stock register (sales name - thickness - process) generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating pressing stock register report 1:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
