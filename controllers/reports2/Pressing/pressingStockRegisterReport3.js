import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { GeneratePressingStockRegisterReport3Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport3.js';

/**
 * Pressing Stock Register Report 3 — Sales name - Thickness
 * Columns: Item Name, Sales item Name, Thickness, Size,
 *          Opening SqMtr, Issued for pressing SqMtr, Pressing received Sqmtr,
 *          Pressing Waste SqMtr, Closing SqMtr
 * Grouping: Item Name → Sales item Name; subtotal per Item Name; grand total.
 * Sales item Name is sourced from photos via group_no.
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

    // 4. Bulk aggregations at global level — then attribute to combos in memory
    const allGroupNosSet = allGroupNos;

    // Issued for pressing in period, per (group_no, item_name)
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

    // Pressing done (received) in period, per group_no
    const pressingDoneAgg = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $gte: start, $lte: end },
          group_no: { $in: allGroupNosSet },
        },
      },
      { $group: { _id: '$group_no', total: { $sum: '$sqm' } } },
    ]);
    const pressingDoneMap = new Map(pressingDoneAgg.map((r) => [r._id, r.total]));

    // Pressing waste in period: join pressing_damage → pressing_done_details, per group_no
    const pdDocsForDamage = await pressing_done_details_model
      .find(
        { pressing_date: { $gte: start, $lte: end }, group_no: { $in: allGroupNosSet } },
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

    // Current available, per (group_no, item_name)
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

    // 5. Aggregate metrics per combo (sum across its group_nos)
    const stockData = combos.map((combo) => {
      const { item_name, sales_item_name, thickness, size, group_nos } = combo;

      let issued_for_pressing = 0;
      let pressing_received = 0;
      let pressing_waste = 0;
      let current_available = 0;

      for (const gn of group_nos) {
        issued_for_pressing += issuedMap.get(`${gn}|${item_name}`) ?? 0;
        pressing_received += pressingDoneMap.get(gn) ?? 0;
        pressing_waste += damageByGroupNo.get(gn) ?? 0;
        current_available += currentMap.get(`${gn}|${item_name}`) ?? 0;
      }

      const opening_sqm = current_available + pressing_received + pressing_waste - issued_for_pressing;
      const closing_sqm = current_available;

      return {
        item_name,
        sales_item_name,
        thickness,
        size,
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

    const excelLink = await GeneratePressingStockRegisterReport3Excel(
      activeStockData,
      startDate,
      endDate,
      filter
    );

    return res.json(
      new ApiResponse(
        200,
        'Pressing stock register (sales name - thickness) generated successfully',
        excelLink
      )
    );
  } catch (error) {
    console.error('Error generating pressing stock register report 3:', error);
    return next(new ApiError(error.message || 'Failed to generate report', 500));
  }
});
