import { GenerateClippingDailyReportExcel } from '../../../config/downloadExcel/reports2/TappingORClipping/clippingDailyReport.js';
import {
  tapping_done_other_details_model,
} from '../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Clipping (Tapping) Daily Report - Excel export
 * Aggregates tapping_done_other_details with tapping_done_items_details for reportDate.
 * @route POST /api/V1/report/download-excel-clipping-daily-report
 */
export const ClippingDailyReportExcel = catchAsync(async (req, res, next) => {
  const { reportDate } = req?.body?.filters || {};

  if (!reportDate) {
    return res.status(400).json({
      statusCode: 400,
      status: 'error',
      message: 'Report date is required',
    });
  }

  const startOfDay = new Date(reportDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(reportDate);
  endOfDay.setHours(23, 59, 59, 999);

  const matchQuery = {
    tapping_date: { $gte: startOfDay, $lte: endOfDay },
  };

  const clippingData = await tapping_done_other_details_model.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'tapping_done_items_details',
        localField: '_id',
        foreignField: 'tapping_done_other_details_id',
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
      $sort: { 'items.item_name': 1, 'items.log_no_code': 1 },
    },
  ]);

  if (!clippingData?.length) {
    return res.status(404).json({
      statusCode: 404,
      status: 'error',
      message: 'No clipping data found for the selected date',
    });
  }

  const excelLink = await GenerateClippingDailyReportExcel(
    clippingData,
    reportDate
  );

  return res.status(200).json({
    result: excelLink,
    statusCode: 200,
    status: 'success',
    message: 'Clipping daily report generated successfully',
  });
});
