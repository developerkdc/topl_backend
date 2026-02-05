import { GenerateSlicingDailyReport } from '../../../config/downloadExcel/reports2/Slicing/slicingDailyReport.js';
import {
  slicing_done_other_details_model,
} from '../../../database/schema/factory/slicing/slicing_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Slicing Daily Report – Excel download.
 * Uses reportDate from req.body.filters to fetch slicing_done_other_details for that day,
 * joins issued_for_slicing (length, width, height, cmt), wastage, slicing_done_items, and worker.
 */
export const SlicingDailyReportExcel = catchAsync(
  async (req, res, next) => {
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

    const pipeline = [
      {
        $match: {
          slicing_date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $lookup: {
          from: 'issued_for_slicings',
          localField: 'issue_for_slicing_id',
          foreignField: '_id',
          as: 'issued_for_slicing',
        },
      },
      {
        $unwind: {
          path: '$issued_for_slicing',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'issue_for_slicing_wastage',
          localField: 'issue_for_slicing_id',
          foreignField: 'issue_for_slicing_id',
          as: 'wastage',
        },
      },
      {
        $unwind: {
          path: '$wastage',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'slicing_done_items',
          localField: '_id',
          foreignField: 'slicing_done_other_details_id',
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
        $sort: { 'items.item_name': 1, 'items.log_no': 1 },
      },
      {
        $project: {
          slicing_id: '$_id',
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
          flitch_no: '$items.log_no',
          thickness: '$items.thickness',
          length: '$issued_for_slicing.length',
          width1: '$issued_for_slicing.width1',
          width2: '$issued_for_slicing.width2',
          width3: '$issued_for_slicing.width3',
          height: '$issued_for_slicing.height',
          cmt: '$issued_for_slicing.cmt',
          leaves: '$items.no_of_leaves',
          rej_height: '$wastage.height',
          rej_width: '$wastage.width',
          rej_cmt: '$wastage.cmt',
          remarks: { $ifNull: ['$wastage.remark', 'COMPLETE'] },
        },
      },
    ];

    const rows = await slicing_done_other_details_model.aggregate(pipeline);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No slicing data found for the selected date',
      });
    }

    const excelLink = await GenerateSlicingDailyReport(rows, reportDate);

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Slicing daily report generated successfully',
    });
  }
);
