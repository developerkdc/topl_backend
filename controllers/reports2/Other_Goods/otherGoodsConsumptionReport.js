import { createOtherGoodsConsumptionReportExcel } from '../../../config/downloadExcel/reports2/Other_Goods/otherGoodsConsumption.js';
import other_goods_history_model from '../../../database/schema/inventory/otherGoods/otherGoods.history.schema.js';
import { issues_for_status } from '../../../database/Utils/constants/constants.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

export const otherGoodsConsumptionReportExcel = catchAsync(
  async (req, res, next) => {
    const { startDate, endDate, ...data } = req?.body || {};

    let targetStart = startDate;
    let targetEnd = endDate;

    if (!targetStart || !targetEnd) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Start date and End date are required',
      });
    }

    const start = new Date(targetStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(targetEnd);
    end.setHours(23, 59, 59, 999);

    const consumptionData = await other_goods_history_model.aggregate([
      // 1. Only consume (direct consumption) records
      {
        $match: {
          issue_status: issues_for_status.consume,
        },
      },
      // 2. Only records where consumption occurred in the selected date range
      {
        $match: {
          issue_date: {
            $exists: true,
            $gte: start,
            $lte: end,
          },
        },
      },
      // 3. Join with item details
      {
        $lookup: {
          from: 'othergoods_inventory_items_details',
          localField: 'other_goods_item_id',
          foreignField: '_id',
          as: 'item_details',
        },
      },
      {
        $unwind: {
          path: '$item_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 4. Join with invoice details (for item context; no date filter)
      {
        $lookup: {
          from: 'othergoods_inventory_invoice_details',
          localField: 'item_details.invoice_id',
          foreignField: '_id',
          as: 'invoice_details',
        },
      },
      {
        $unwind: {
          path: '$invoice_details',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 5. Join with item_names to get category for units
      {
        $lookup: {
          from: 'item_names',
          localField: 'item_details.item_name',
          foreignField: 'item_name',
          as: 'item_name_info',
        },
      },
      {
        $unwind: {
          path: '$item_name_info',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 6. Join with item_categories to get calculate_unit
      {
        $addFields: {
          first_category_id: { $arrayElemAt: ['$item_name_info.category', 0] },
        },
      },
      // 7. Lookup item_categories
      {
        $lookup: {
          from: 'item_categories',
          localField: 'first_category_id',
          foreignField: '_id',
          as: 'category_info',
        },
      },
      {
        $unwind: {
          path: '$category_info',
          preserveNullAndEmptyArrays: true,
        },
      },
      // 8. Map fields to what the Excel generator expects
      {
        $addFields: {
          department_name: '$item_details.department_name',
          machine_name: '$item_details.machine_name',
          item_name: '$item_details.item_name',
          total_quantity: '$issued_quantity',
          amount: '$issued_amount',
          unit: {
            $ifNull: [
              '$category_info.calculate_unit',
              { $ifNull: ['$units', ''] },
            ],
          },
        },
      },
      {
        $sort: {
          department_name: 1,
          machine_name: 1,
          item_name: 1,
        },
      },
    ]);

    if (!consumptionData || consumptionData.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No consumption data found for the selected date range',
      });
    }

    const excelLink = await createOtherGoodsConsumptionReportExcel(
      consumptionData,
      targetStart,
      targetEnd
    );

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Other goods consumption report generated successfully',
    });
  }
);
