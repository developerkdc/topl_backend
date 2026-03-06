import { GenerateTappingDailyReportExcel } from '../../../../config/downloadExcel/reports2/Tapping/Daily_Report/tappingDailyReport.js';
import { tapping_done_other_details_model } from '../../../../database/schema/factory/tapping/tapping_done/tapping_done.schema.js';
import catchAsync from '../../../../utils/errors/catchAsync.js';

/**
 * Tapping (Splicing) Daily Report — Excel export
 * Produces "Splicing Details Report" with Machine/Hand splicing breakdown
 * and Issue vs Production summary.
 * @route POST /api/V1/report/download-excel-tapping-daily-report
 */
export const TappingDailyReportExcel = catchAsync(async (req, res, next) => {
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

  const tappingData = await tapping_done_other_details_model.aggregate([
    {
      $match: {
        tapping_date: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $lookup: {
        from: 'issue_for_tappings',
        localField: 'issue_for_tapping_item_id',
        foreignField: '_id',
        as: 'issueSource',
      },
    },
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

  if (!tappingData?.length) {
    return res.status(404).json({
      statusCode: 404,
      status: 'error',
      message: 'No tapping data found for the selected date',
    });
  }

  const excelLink = await GenerateTappingDailyReportExcel(tappingData, reportDate);

  return res.status(200).json({
    result: excelLink,
    statusCode: 200,
    status: 'success',
    message: 'Tapping daily report generated successfully',
  });
});
