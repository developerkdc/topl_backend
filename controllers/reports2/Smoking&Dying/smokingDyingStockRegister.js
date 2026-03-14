import { GenerateSmokingDyingStockRegisterExcel } from '../../../config/downloadExcel/reports2/Smoking&Dying/smokingDyingStockRegister.js';
import { process_done_details_model } from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Smoking & Dying Stock Register – Excel download.
 * Same report layout as the Daily report (bundle-level table, merges, subtotals, Grand Total, SUMMERY)
 * but filtered by date range (startDate, endDate). Does not use the Daily report controller or Excel generator.
 *
 * Uses startDate and endDate from req.body.filters. Aggregation: process_done_details with process_done_date
 * in range, join process_done_items_details, one row per bundle.
 */
export const SmokingDyingStockRegisterExcel = catchAsync(async (req, res, next) => {
  const filters = req?.body?.filters || {};
  const startDate = filters.startDate ?? req?.body?.startDate;
  const endDate = filters.endDate ?? req?.body?.endDate;

  if (!startDate || !endDate) {
    return res.status(400).json({
      statusCode: 400,
      status: 'error',
      message: 'Start date and end date are required',
    });
  }

  const startOfRange = new Date(startDate);
  startOfRange.setHours(0, 0, 0, 0);
  const endOfRange = new Date(endDate);
  endOfRange.setHours(23, 59, 59, 999);

  if (isNaN(startOfRange.getTime()) || isNaN(endOfRange.getTime())) {
    return res.status(400).json({
      statusCode: 400,
      status: 'error',
      message: 'Invalid date format. Use YYYY-MM-DD',
    });
  }

  if (startOfRange > endOfRange) {
    return res.status(400).json({
      statusCode: 400,
      status: 'error',
      message: 'Start date cannot be after end date',
    });
  }

  const pipeline = [
    {
      $match: {
        process_done_date: { $gte: startOfRange, $lte: endOfRange },
      },
    },
    {
      $lookup: {
        from: 'process_done_items_details',
        localField: '_id',
        foreignField: 'process_done_id',
        as: 'items',
      },
    },
    {
      $unwind: {
        path: '$items',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $sort: {
        'items.item_name': 1,
        'items.log_no_code': 1,
        'items.bundle_number': 1,
      },
    },
    {
      $project: {
        process_done_id: '$_id',
        item_name: '$items.item_name',
        log_no_code: '$items.log_no_code',
        bundle_number: '$items.bundle_number',
        thickness: '$items.thickness',
        length: '$items.length',
        width: '$items.width',
        no_of_leaves: '$items.no_of_leaves',
        sqm: '$items.sqm',
        process_name: '$items.process_name',
        color_name: '$items.color_name',
        character_name: '$items.character_name',
        pattern_name: '$items.pattern_name',
        series_name: '$items.series_name',
        remark: '$items.remark',
      },
    },
  ];

  const rows = await process_done_details_model.aggregate(pipeline);

  if (!rows || rows.length === 0) {
    return res.status(404).json({
      statusCode: 404,
      status: 'error',
      message: 'No smoking & dying data found for the selected period',
    });
  }

  const excelLink = await GenerateSmokingDyingStockRegisterExcel(rows, startDate, endDate);

  return res.status(200).json({
    result: excelLink,
    statusCode: 200,
    status: 'success',
    message: 'Smoking & dying stock register generated successfully',
  });
});
