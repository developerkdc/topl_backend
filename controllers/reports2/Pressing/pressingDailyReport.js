import { GeneratePressingDailyReportExcel } from '../../../config/downloadExcel/reports2/Pressing/pressingDailyReport.js';
import {
  pressing_done_details_model,
} from '../../../database/schema/factory/pressing/pressing_done/pressing_done.schema.js';
import catchAsync from '../../../utils/errors/catchAsync.js';

/**
 * Pressing Daily Report – Excel download.
 * Uses reportDate from req.body.filters.
 * Joins pressing_done_details, pressing_done_consumed_items_details, and users (worker name).
 */
export const PressingDailyReportExcel = catchAsync(async (req, res, next) => {
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
        pressing_date: { $gte: startOfDay, $lte: endOfDay },
      },
    },
    {
      $lookup: {
        from: 'pressing_done_consumed_items_details',
        localField: '_id',
        foreignField: 'pressing_done_details_id',
        as: 'consumedItems',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'workerUser',
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
      $addFields: {
        consumed: { $arrayElemAt: ['$consumedItems', 0] },
        workerName: {
          $let: {
            vars: {
              w: { $arrayElemAt: ['$workerUser', 0] },
            },
            in: {
              $trim: {
                input: {
                  $concat: [
                    { $ifNull: ['$$w.first_name', ''] },
                    ' ',
                    { $ifNull: ['$$w.last_name', ''] },
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      $sort: { pressing_id: 1, product_type: 1 },
    },
  ];

  const pressingData = await pressing_done_details_model.aggregate(pipeline);

  if (!pressingData || pressingData.length === 0) {
    return res.status(404).json({
      statusCode: 404,
      status: 'error',
      message: 'No pressing data found for the selected date',
    });
  }

  const excelLink = await GeneratePressingDailyReportExcel(
    pressingData,
    reportDate
  );

  return res.status(200).json({
    result: excelLink,
    statusCode: 200,
    status: 'success',
    message: 'Pressing daily report generated successfully',
  });
});
