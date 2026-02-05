import { GenerateCrosscutDailyReportExcel } from '../../../config/downloadExcel/reports2/Crosscut/crosscutDailyReport.js';
import { crosscutting_done_model } from '../../../database/schema/factory/crossCutting/crosscutting.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Crosscut Daily Report - Excel export
 * Aggregates crosscutting_done with issues_for_crosscuttings, generates report for reportDate.
 * @route POST /api/V1/report/download-excel-crosscutting-daily-report
 */
export const CrosscutDailyReportExcel = catchAsync(async (req, res, next) => {
  const { reportDate, item_name, ...rest } = req?.body?.filters || {};

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
    'worker_details.crosscut_date': { $gte: startOfDay, $lte: endOfDay },
    deleted_at: null,
    ...(item_name && { item_name }),
    ...rest,
  };

  const crossCuttingData = await crosscutting_done_model.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'issues_for_crosscuttings',
        localField: 'issue_for_crosscutting_id',
        foreignField: '_id',
        as: 'original_log',
      },
    },
    {
      $unwind: {
        path: '$original_log',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $sort: { item_name: 1, log_no: 1, code: 1 },
    },
  ]);

  if (!crossCuttingData?.length) {
    return res.status(404).json({
      statusCode: 404,
      status: 'error',
      message: 'No cross-cutting data found for the selected date',
    });
  }

  const excelLink = await GenerateCrosscutDailyReportExcel(
    crossCuttingData,
    reportDate
  );

  return res.status(200).json({
    result: excelLink,
    statusCode: 200,
    status: 'success',
    message: 'Cross-cutting daily report generated successfully',
  });
});
