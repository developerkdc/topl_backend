import { GenerateDressingDailyReport } from '../../../config/downloadExcel/reports2/Dressing/dressingDailyReport.js';
import {
  dressing_done_other_details_model,
} from '../../../database/schema/factory/dressing/dressing_done/dressing.done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';

/**
 * Dressing Daily Report – Excel download.
 * Uses reportDate from req.body.filters; optional dressingId to restrict to one session.
 * Joins dressing_done_items and users (worker name).
 */
export const DressingDailyReportExcel = catchAsync(
  async (req, res, next) => {
    const { reportDate, dressingId } = req?.body?.filters || {};

    if (!reportDate) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    if (dressingId && !mongoose.isValidObjectId(dressingId)) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Invalid dressing Id',
      });
    }

    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const matchStage = {
      dressing_date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (dressingId) {
      matchStage._id = new mongoose.Types.ObjectId(dressingId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'dressing_done_items',
          localField: '_id',
          foreignField: 'dressing_done_other_details_id',
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
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'worker',
          pipeline: [
            {
              $project: {
                first_name: 1,
                last_name: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$worker',
          preserveNullAndEmptyArrays: true,
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
          dressing_id: '$_id',
          shift: 1,
          no_of_working_hours: 1,
          no_of_workers: 1,
          worker: {
            $concat: [
              { $ifNull: ['$worker.first_name', ''] },
              ' ',
              { $ifNull: ['$worker.last_name', ''] },
            ],
          },
          item_name: '$items.item_name',
          log_no_code: '$items.log_no_code',
          bundle_number: '$items.bundle_number',
          thickness: '$items.thickness',
          length: '$items.length',
          width: '$items.width',
          no_of_leaves: '$items.no_of_leaves',
          sqm: '$items.sqm',
          character_name: '$items.character_name',
          pattern_name: '$items.pattern_name',
          series_name: '$items.series_name',
          remark: '$items.remark',
        },
      },
    ];

    const rows = await dressing_done_other_details_model.aggregate(pipeline);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No dressing data found for the selected date',
      });
    }

    const excelLink = await GenerateDressingDailyReport(rows, reportDate);

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Dressing daily report generated successfully',
    });
  }
);
