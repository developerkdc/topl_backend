import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { GeneratePressingStockRegisterReport1Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport1.js';

/**
 * Pressing Stock Register Report 1 — Sales name - Thickness - Other Process Wise
 * Columns: Item Name, Sales item Name, Thickness, Size,
 *          Opening SqMtr, Pressing SqMtr,
 *          Sales (total issued from pressing to further processes via pressing_done_history),
 *          Issue for Challan (0 — schema gap),
 *          All Damage (pressing_damage sqm in period),
 *          Process Waste (pressing_damage sqm — same as All Damage currently),
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

    // Collect all pressing_done IDs and group_nos
    const allPressingDoneIds = pressingDoneRaw.flatMap((r) => r.pressing_done_ids);
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
          group_nos: [],
          pressing_done_ids: [],
          pressing_sqm: 0,
        });
      }
      const combo = comboMap.get(comboKey);
      combo.group_nos.push(group_no);
      combo.pressing_done_ids.push(...row.pressing_done_ids);
      combo.pressing_sqm += row.pressing_sqm;
    }

    const combos = [...comboMap.values()];

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Sales: sum sqm from pressing_done_history where issued_item_id in pressing_done IDs
    //    issue_status values: CNC, COLOR, POLISHING, BUNITO, CANVAS, PACKING etc.
    // ─────────────────────────────────────────────────────────────────────────
    const salesAgg = await pressing_done_history_model.aggregate([
      { $match: { issued_item_id: { $in: allPressingDoneIds } } },
      {
        $group: {
          _id: '$issued_item_id',
          total: { $sum: '$sqm' },
        },
      },
    ]);
    // Map pressing_done_id (string) → sales sqm
    const salesByPdId = new Map(salesAgg.map((r) => [r._id.toString(), r.total]));

    // ─────────────────────────────────────────────────────────────────────────
    // 6. All Damage: pressing_damage sqm in the period (pressing-stage waste)
    // ─────────────────────────────────────────────────────────────────────────
    const damageAgg = await pressing_damage_model.aggregate([
      { $match: { pressing_done_details_id: { $in: allPressingDoneIds } } },
      {
        $group: {
          _id: '$pressing_done_details_id',
          total: { $sum: '$sqm' },
        },
      },
    ]);
    const damageByPdId = new Map(damageAgg.map((r) => [r._id.toString(), r.total]));

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Current available: issues_for_pressing where is_pressing_done = false
    //    Used to compute Opening SqMtr
    // ─────────────────────────────────────────────────────────────────────────
    const currentAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: filteredGroupNos },
          is_pressing_done: false,
          ...(filter.item_name ? { item_name: filter.item_name.toUpperCase().trim() } : {}),
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

    // Issued in period (from issues_for_pressing.createdAt for opening balance calc)
    const issuedAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: filteredGroupNos },
          createdAt: { $gte: start, $lte: end },
          ...(filter.item_name ? { item_name: filter.item_name.toUpperCase().trim() } : {}),
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

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Build per-combo stock data
    // ─────────────────────────────────────────────────────────────────────────
    const stockData = combos.map((combo) => {
      const { item_name, sales_item_name, thickness, size, group_nos, pressing_done_ids } = combo;

      // Sum sales and damage across all pressing_done_ids in this combo
      let sales = 0;
      let all_damage = 0;
      for (const pdId of pressing_done_ids) {
        sales += salesByPdId.get(pdId.toString()) ?? 0;
        all_damage += damageByPdId.get(pdId.toString()) ?? 0;
      }

      // Sum current_available and issued_in_period across all group_nos in this combo
      let current_available = 0;
      let issued_in_period = 0;
      for (const gn of group_nos) {
        current_available += currentMap.get(`${gn}|${item_name}`) ?? 0;
        issued_in_period += issuedMap.get(`${gn}|${item_name}`) ?? 0;
      }

      const pressing_sqm = combo.pressing_sqm;
      const process_waste = all_damage; // pressing-stage waste
      const issue_for_challan = 0; // schema gap

      // Opening = current_available + pressing_sqm + all_damage - issued_in_period
      const opening_sqm = current_available + pressing_sqm + all_damage - issued_in_period;

      // Closing = Opening + Pressing - Sales - ChallanIssue - Damage - ProcessWaste
      const closing_sqm =
        opening_sqm + pressing_sqm - sales - issue_for_challan - all_damage - process_waste;

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
        // used only for active-row filter
        issued_in_period,
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
