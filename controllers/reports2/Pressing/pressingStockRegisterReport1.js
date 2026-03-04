import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { GeneratePressingStockRegisterReport1Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport1.js';

/**
 * Pressing Stock Register Report 1 — Sales name - Thickness - Other Process Wise
 * Columns: Item Name, Sales item Name, Thickness, Size,
 *          Opening SqMtr, Pressing SqMtr,
 *          Sales (Direct Pressing+Cnc+Colour+Polish),
 *          Issue for Challan (Direct Pressing+Cnc+Colour+Polish),
 *          Damage (Pressing+Cnc+Colour+Polish),
 *          Process Waste, Closing SqMtr
 * Grouping: Item Name → Sales item Name; subtotal per Item Name; grand total.
 *
 * NOTE: Sales, Issue for Challan, Damage, and Process Waste columns require data from
 * downstream process schemas (challan_done, cnc_damage, colour_damage, polishing_damage)
 * that are not yet joinable to pressing items at this grain. These columns are set to 0
 * until those schema links are established.
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
    // 1. Distinct (group_no, item_name, thickness, length, width) from issues_for_pressing
    const allGroupsRaw = await issues_for_pressing_model.aggregate([
      { $match: itemFilter },
      {
        $group: {
          _id: { group_no: '$group_no', item_name: '$item_name' },
          thickness: { $first: '$thickness' },
          length: { $first: '$length' },
          width: { $first: '$width' },
        },
      },
    ]);

    if (allGroupsRaw.length === 0) {
      return res
        .status(404)
        .json(new ApiResponse(404, 'No pressing data found for the selected period'));
    }

    const allGroupNos = [...new Set(allGroupsRaw.map((g) => g._id.group_no).filter(Boolean))];

    // 2. Bulk fetch sales_item_name from photos keyed by group_no
    const photoDocs = await photoModel
      .find({ group_no: { $in: allGroupNos } }, { group_no: 1, sales_item_name: 1 })
      .lean();
    const salesNameMap = new Map(
      photoDocs.map((p) => [p.group_no, p.sales_item_name ?? ''])
    );

    // 3. Build combo map: (item_name, sales_item_name, thickness, size) → list of group_nos
    const comboMap = new Map();
    for (const group of allGroupsRaw) {
      const { group_no, item_name } = group._id;
      const sales_item_name = salesNameMap.get(group_no) ?? '';
      const size = `${group.length ?? 0} X ${group.width ?? 0}`;
      const comboKey = `${item_name}||${sales_item_name}||${group.thickness ?? 0}||${size}`;

      if (!comboMap.has(comboKey)) {
        comboMap.set(comboKey, {
          item_name,
          sales_item_name,
          thickness: group.thickness ?? 0,
          size,
          group_nos: [],
        });
      }
      comboMap.get(comboKey).group_nos.push(group_no);
    }

    const combos = [...comboMap.values()];

    // 4. Bulk aggregations

    // Issued for pressing in period (= input to pressing)
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

    // Pressing done (output of pressing = "Pressing SqMtr") in period, per group_no
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

    // Pressing waste in period per group_no
    const pdDocsForDamage = await pressing_done_details_model
      .find(
        { pressing_date: { $gte: start, $lte: end }, group_no: { $in: allGroupNos } },
        { _id: 1, group_no: 1 }
      )
      .lean();
    const pdIdToGroupNo = new Map(
      pdDocsForDamage.map((pd) => [pd._id.toString(), pd.group_no])
    );
    const pdIds = pdDocsForDamage.map((pd) => pd._id);

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

    // Current available per (group_no, item_name)
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

    // 5. Build stock data per combo
    const stockData = combos.map((combo) => {
      const { item_name, sales_item_name, thickness, size, group_nos } = combo;

      let issued_in_period = 0;
      let pressing_sqm = 0;
      let pressing_waste_sqm = 0;
      let current_available = 0;

      for (const gn of group_nos) {
        issued_in_period += issuedMap.get(`${gn}|${item_name}`) ?? 0;
        pressing_sqm += pressingDoneMap.get(gn) ?? 0;
        pressing_waste_sqm += damageByGroupNo.get(gn) ?? 0;
        current_available += currentMap.get(`${gn}|${item_name}`) ?? 0;
      }

      // For Report-1, the pressing_sqm is the "Pressing SqMtr" output column.
      // Opening formula aligns with pressing-stage stock:
      // Opening = current_available + pressing_sqm + pressing_waste_sqm - issued_in_period
      const opening_sqm = current_available + pressing_sqm + pressing_waste_sqm - issued_in_period;

      // Downstream process columns — set to 0 until schemas are linked
      const sales = 0;
      const issue_for_challan = 0;
      const damage = 0;
      const process_waste = pressing_waste_sqm;

      // Closing = Opening + Pressing - Sales - Issue for Challan - Damage - Process Waste
      const closing_sqm = opening_sqm + pressing_sqm - sales - issue_for_challan - damage - process_waste;

      return {
        item_name,
        sales_item_name,
        thickness,
        size,
        opening_sqm,
        pressing_sqm,
        sales,
        issue_for_challan,
        damage,
        process_waste,
        closing_sqm,
      };
    });

    const activeStockData = stockData.filter(
      (row) =>
        row.opening_sqm !== 0 ||
        row.pressing_sqm !== 0 ||
        row.sales !== 0 ||
        row.issue_for_challan !== 0 ||
        row.damage !== 0 ||
        row.process_waste !== 0 ||
        row.closing_sqm !== 0
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
