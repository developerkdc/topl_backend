import catchAsync from '../../../utils/errors/catchAsync.js';
import ApiError from '../../../utils/errors/apiError.js';
import ApiResponse from '../../../utils/ApiResponse.js';
import { issues_for_pressing_model } from '../../../database/schema/factory/pressing/issues_for_pressing/issues_for_pressing.schema.js';
import { pressing_done_details_model } from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import { pressing_done_history_model } from '../../../database/schema/factory/pressing/pressing_history/pressing_done_history.schema.js';
import { pressing_damage_model } from '../../../database/schema/factory/pressing/pressing_damage/pressing_damage.schema.js';
import photoModel from '../../../database/schema/masters/photo.schema.js';
import { OrderModel } from '../../../database/schema/order/orders.schema.js';
import { item_issued_for } from '../../../database/Utils/constants/constants.js';
import { GeneratePressingStockRegisterReport2Excel } from '../../../config/downloadExcel/reports2/Pressing/pressingStockRegisterReport2.js';

/**
 * Pressing Stock Register Report 2 — Group No Wise
 * Columns: Item Name, Group no, Photo No, Order No, Thickness, Size,
 *          Opening SqMtr, Issued for pressing, Pressing received,
 *          Pressing Waste, Sales, All Damage, Closing SqMtr
 *
 * Row universe: distinct (group_no, thickness, length, width) from
 *   pressing_done_details with pressing_date in [start, end].
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
    // 1. Fetch distinct groups that were pressed in the date range
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

    // 3. Opening: SUM(pressing_done_details.sqm) where pressing_date < start,
    //    grouped by (group_no, thickness, length, width)
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

    // 5. Resolve photo_no from photos (include hybrid_group_no for groups in hybrid veneer)
    const photoDocs = await photoModel
      .find(
        {
          $or: [
            { group_no: { $in: filteredGroupNos } },
            { 'hybrid_group_no.group_no': { $in: filteredGroupNos } },
          ],
        },
        { group_no: 1, photo_number: 1, hybrid_group_no: 1, sales_item_name: 1 }
      )
      .lean();
    const photoMap = new Map();
    for (const p of photoDocs) {
      const photoNumber = p.photo_number ?? '';
      if (p.group_no) photoMap.set(p.group_no, photoNumber);
      if (Array.isArray(p.hybrid_group_no)) {
        for (const h of p.hybrid_group_no) {
          if (h?.group_no) photoMap.set(h.group_no, photoNumber);
        }
      }
    }

    // 6. Order No: orders.order_no when pressing_done_details.issued_for = ORDER, else empty
    const orderIdAgg = await pressing_done_details_model.aggregate([
      {
        $match: {
          pressing_date: { $gte: start, $lte: end },
          group_no: { $in: filteredGroupNos },
          issued_for: item_issued_for.order,
          order_id: { $ne: null },
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
          order_id: { $first: '$order_id' },
        },
      },
    ]);
    const orderIds = [...new Set(orderIdAgg.map((r) => r.order_id).filter(Boolean))];
    const orderNoByOrderId = new Map();
    if (orderIds.length > 0) {
      const orderDocs = await OrderModel.find({ _id: { $in: orderIds } }, { order_no: 1 }).lean();
      for (const o of orderDocs) {
        orderNoByOrderId.set(o._id.toString(), String(o.order_no ?? ''));
      }
    }
    const orderNoByDimKey = new Map(
      orderIdAgg.map((r) => {
        const dimKey = `${r._id.group_no}|${r._id.thickness ?? 0}|${r._id.length ?? 0}|${r._id.width ?? 0}`;
        const orderNo = orderNoByOrderId.get(r.order_id.toString()) ?? '';
        return [dimKey, orderNo];
      })
    );

    // 7. Sales from pressing_done_history (ALL pressing_done for each group)
    const salesAgg = await pressing_done_history_model.aggregate([
      { $match: { issued_item_id: { $in: allPdIdsForDamageSales } } },
      { $group: { _id: '$issued_item_id', total: { $sum: '$sqm' } } },
    ]);
    const salesByPdId = new Map(salesAgg.map((r) => [r._id.toString(), r.total]));

    // 8. All Damage from pressing_damage (ALL pressing_done for each group)
    const damageAgg = await pressing_damage_model.aggregate([
      { $match: { pressing_done_details_id: { $in: allPdIdsForDamageSales } } },
      { $group: { _id: '$pressing_done_details_id', total: { $sum: '$sqm' } } },
    ]);
    const damageByPdId = new Map(damageAgg.map((r) => [r._id.toString(), r.total]));

    // 9. Issued for pressing (inflow in period) — per (group_no, thickness, length, width)
    const issuedAgg = await issues_for_pressing_model.aggregate([
      {
        $match: {
          group_no: { $in: filteredGroupNos },
          createdAt: { $gte: start, $lte: end },
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
          total: { $sum: '$sqm' },
        },
      },
    ]);
    const issuedMap = new Map(
      issuedAgg.map((r) => [
        `${r._id.group_no}|${r._id.thickness ?? 0}|${r._id.length ?? 0}|${r._id.width ?? 0}`,
        r.total,
      ])
    );

    // 10. Map everything into rows
    const stockData = filteredGroups.map((group) => {
      const { group_no, thickness, length, width } = group._id;
      const dimKey = `${group_no}|${thickness ?? 0}|${length ?? 0}|${width ?? 0}`;

      const opening_sqm = openingByGroupDim.get(dimKey) ?? 0;
      const allPdIds = allPdIdsByGroupDim.get(dimKey) ?? [];

      let sales = 0;
      let all_damage = 0;
      for (const id of allPdIds) {
        sales += salesByPdId.get(id.toString()) ?? 0;
        all_damage += damageByPdId.get(id.toString()) ?? 0;
      }

      const issued_for_pressing = issuedMap.get(dimKey) ?? 0;
      const pressing_received = group.pressing_received;
      const pressing_waste = all_damage;

      // Closing = max(0, Opening + Receive - damage - sales)
      const closing_sqm = Math.max(0, opening_sqm + pressing_received - all_damage - sales);

      return {
        item_name: itemNameMap.get(group_no) ?? '',
        group_no,
        photo_no: photoMap.get(group_no) ?? '',
        order_no: orderNoByDimKey.get(dimKey) ?? '',
        thickness: thickness ?? 0,
        size: `${length ?? 0} X ${width ?? 0}`,
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
