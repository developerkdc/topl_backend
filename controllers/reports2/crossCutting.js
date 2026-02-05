import { GenerateCrossCuttingReport } from '../../config/downloadExcel/reports2/crossCutting/crossCutting.js';
import { crosscutting_done_model } from '../../database/schema/factory/crossCutting/crosscutting.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const CrossCuttingDailyReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updatedAt', sort = 'desc' } = req.query;

    const { reportDate, ...data } = req?.body?.filters || {};
    
    // Validate reportDate
    if (!reportDate) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    const matchQuery = data || {};

    // Set up date filter for the specific day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    matchQuery['worker_details.crosscut_date'] = {
      $gte: startOfDay,
      $lte: endOfDay,
    };

    // Ensure we only get non-deleted records
    matchQuery['deleted_at'] = null;

    console.log('CrossCutting Report - Date:', reportDate);
    console.log('CrossCutting Report - Match Query:', matchQuery);

    // Build aggregation pipeline
    const crossCuttingData = await crosscutting_done_model.aggregate([
      {
        $match: matchQuery,
      },
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
        $sort: {
          item_name: 1,
          log_no: 1,
          code: 1,
        },
      },
    ]);

    console.log('CrossCutting Report - Records found:', crossCuttingData.length);

    // Check if data exists
    if (!crossCuttingData || crossCuttingData.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No cross-cutting data found for the selected date',
      });
    }

    // Generate Excel report
    const excelLink = await GenerateCrossCuttingReport(
      crossCuttingData,
      reportDate
    );

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Cross-cutting daily report generated successfully',
    });
  }
);
