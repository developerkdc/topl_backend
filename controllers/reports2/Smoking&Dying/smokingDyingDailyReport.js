import { GenerateSmokingDyingDailyReport } from '../../../config/downloadExcel/reports2/Smoking&Dying/smokingDyingDailyReport.js';
import {
  process_done_details_model,
} from '../../../database/schema/factory/smoking_dying/smoking_dying_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';

/**
 * Smoking&Dying (Dyeing) Daily Report – Excel download.
 * Uses reportDate from req.body.filters; optional smokingDyingId to restrict to one session.
 * Joins process_done_details, process_done_items_details, and users (worker name).
 * Report layout: Item Name | New Item Name | LogX (merged per log) | Bundle No | Sq Mtr | Colour Code | Remarks; Total row; Dyeing Id table at end.
 */
export const SmokingDyingDailyReportExcel = catchAsync(
  async (req, res, next) => {
    const { reportDate, smokingDyingId } = req?.body?.filters || {};

    if (!reportDate) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    if (smokingDyingId && !mongoose.isValidObjectId(smokingDyingId)) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Invalid smoking dying Id',
      });
    }

    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const matchStage = {
      process_done_date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (smokingDyingId) {
      matchStage._id = new mongoose.Types.ObjectId(smokingDyingId);
    }

    const pipeline = [
      { $match: matchStage },
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
          'items.log_no_code': 1,
          'items.bundle_number': 1,
        },
      },
      {
        $project: {
          process_done_id: '$_id',
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
          item_sub_category_name: '$items.item_sub_category_name',
          log_no_code: '$items.log_no_code',
          bundle_number: '$items.bundle_number',
          sqm: '$items.sqm',
          color_name: '$items.color_name',
          remark: '$items.remark',
        },
      },
    ];

    const rows = await process_done_details_model.aggregate(pipeline);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No smoking & dying data found for the selected date',
      });
    }

    const excelLink = await GenerateSmokingDyingDailyReport(rows, reportDate);

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Smoking & dying daily report generated successfully',
    });
  }
);
