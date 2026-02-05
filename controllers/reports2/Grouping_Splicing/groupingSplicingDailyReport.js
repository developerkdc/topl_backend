import { GenerateGroupingSplicingDailyReport } from '../../../config/downloadExcel/reports2/Grouping_Splicing/groupingSplicingDailyReport.js';
import {
  grouping_done_details_model,
} from '../../../database/schema/factory/grouping/grouping_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import mongoose from 'mongoose';

/**
 * Grouping/Splicing Daily Report – Excel download.
 * Uses reportDate from req.body.filters; optional groupingId to restrict to one session.
 * Data from grouping_done_details + grouping_done_items_details.
 * Lookups: users (worker). Customer Name not in grouping schema; left blank.
 */
export const GroupingSplicingDailyReportExcel = catchAsync(
  async (req, res, next) => {
    const { reportDate, groupingId } = req?.body?.filters || {};

    if (!reportDate) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Report date is required',
      });
    }

    if (groupingId && !mongoose.isValidObjectId(groupingId)) {
      return res.status(400).json({
        statusCode: 400,
        status: 'error',
        message: 'Invalid grouping Id',
      });
    }

    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    const matchStage = {
      grouping_done_date: { $gte: startOfDay, $lte: endOfDay },
    };
    if (groupingId) {
      matchStage._id = new mongoose.Types.ObjectId(groupingId);
    }

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'grouping_done_items_details',
          localField: '_id',
          foreignField: 'grouping_done_other_details_id',
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
          'items.length': 1,
          'items.width': 1,
        },
      },
      {
        $project: {
          grouping_id: '$_id',
          shift: 1,
          no_of_working_hours: 1,
          worker: {
            $concat: [
              { $ifNull: ['$worker.first_name', ''] },
              ' ',
              { $ifNull: ['$worker.last_name', ''] },
            ],
          },
          item_name: '$items.item_name',
          log_no_code: '$items.log_no_code',
          length: '$items.length',
          width: '$items.width',
          no_of_sheets: '$items.no_of_sheets',
          sqm: '$items.sqm',
          character_name: '$items.character_name',
          pattern_name: '$items.pattern_name',
          series_name: '$items.series_name',
          remark: '$items.remark',
          customer_name: { $literal: '' },
          damaged_sheets: {
            $cond: [{ $eq: ['$items.is_damaged', true] }, 1, 0],
          },
        },
      },
    ];

    const rows = await grouping_done_details_model.aggregate(pipeline);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No grouping data found for the selected date',
      });
    }

    const excelLink = await GenerateGroupingSplicingDailyReport(rows, reportDate);

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Grouping/Splicing daily report generated successfully',
    });
  }
);
