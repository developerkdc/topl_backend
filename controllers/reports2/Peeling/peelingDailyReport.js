import { GeneratePeelingDailyReport } from '../../../config/downloadExcel/reports2/Peeling/peelingDailyReport.js';
import { peeling_done_other_details_model } from '../../../database/schema/factory/peeling/peeling_done/peeling_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Peeling Daily Report – Excel download.
 * Uses reportDate from req.body.filters to fetch peeling_done_other_details for that day,
 * joins issues_for_peelings (length, diameter, cmt), issue_for_peeling_wastage, peeling_done_items, and worker.
 */
export const PeelingDailyReportExcel = catchAsync(
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
          peeling_date: { $gte: startOfDay, $lte: endOfDay },
        },
      },
      {
        $lookup: {
          from: 'issues_for_peelings',
          localField: 'issue_for_peeling_id',
          foreignField: '_id',
          as: 'issued_for_peeling',
        },
      },
      {
        $unwind: {
          path: '$issued_for_peeling',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'issue_for_peeling_wastage',
          localField: 'issue_for_peeling_id',
          foreignField: 'issue_for_peeling_id',
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
          from: 'peeling_done_items',
          localField: '_id',
          foreignField: 'peeling_done_other_details_id',
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
          peeling_id: '$_id',
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
          log_no: '$items.log_no',
          output_type: '$items.output_type',
          thickness: '$items.thickness',
          length: { $ifNull: ['$issued_for_peeling.length', '$items.length'] },
          diameter: '$issued_for_peeling.diameter',
          width: '$items.width',
          cmt: { $ifNull: ['$issued_for_peeling.cmt', '$items.cmt'] },
          leaves: '$items.no_of_leaves',
          rej_length: '$wastage.length',
          rej_diameter: '$wastage.diameter',
          rej_cmt: '$wastage.cmt',
          remarks: { $ifNull: ['$wastage.remark', 'COMPLETE'] },
        },
      },
    ];

    const rows = await peeling_done_other_details_model.aggregate(pipeline);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        statusCode: 404,
        status: 'error',
        message: 'No peeling data found for the selected date',
      });
    }

    const excelLink = await GeneratePeelingDailyReport(rows, reportDate);

    return res.status(200).json({
      result: excelLink,
      statusCode: 200,
      status: 'success',
      message: 'Peeling daily report generated successfully',
    });
  }
);
