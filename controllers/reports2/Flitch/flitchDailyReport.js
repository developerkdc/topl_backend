import { GenerateFlitchDailyReport } from '../../../config/downloadExcel/reports2/Flitch/flitchDailyReport.js';
import { flitching_done_model } from '../../../database/schema/factory/flitching/flitching.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

export const FlitchDailyReportExcel = catchAsync(
  async (req, res, next) => {
    // Debug logging
    console.log('Flitch Daily Report - Request Body:', JSON.stringify(req.body, null, 2));
    console.log('Flitch Daily Report - Filters:', req.body?.filters);
    
    const { reportDate, ...data } = req?.body?.filters || {};

    // Validate reportDate
    if (!reportDate) {
      console.log('Flitch Daily Report - ERROR: No reportDate found');
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    // Set up date filter for the specific day
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    console.log('Flitch Daily Report - Date:', reportDate);
    console.log('Flitch Daily Report - Start:', startOfDay);
    console.log('Flitch Daily Report - End:', endOfDay);

    // Build match query
    const matchQuery = {
      'worker_details.flitching_date': {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      deleted_at: null,
    };

    // Build aggregation pipeline
    const flitchingData = await flitching_done_model.aggregate([
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: 'crosscutting_dones',
          localField: 'crosscut_done_id',
          foreignField: '_id',
          as: 'crosscut_source',
        },
      },
      {
        $unwind: {
          path: '$crosscut_source',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: {
          item_name: 1,
          log_no: 1,
          flitch_code: 1,
        },
      },
    ]);

    console.log('Flitch Daily Report - Records found:', flitchingData.length);

    // Check if data exists
    if (!flitchingData || flitchingData.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No flitching data found for the selected date',
      });
    }

    // Generate Excel report
    const excelLink = await GenerateFlitchDailyReport(
      flitchingData,
      reportDate
    );

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Flitch daily report generated successfully',
    });
  }
);
