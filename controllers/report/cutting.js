import { GenerateCuttingReport } from '../../config/downloadExcel/report/cutting/cutting.js';
import { GenerateIssueCuttingReport } from '../../config/downloadExcel/report/cutting/issueForCutting.js';
import { CuttingModel } from '../../database/schema/cutting/cutting.js';
import { IssuedForCuttingModel } from '../../database/schema/cutting/issuedForCutting.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const IssuedForCuttingReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updated_at', sort = 'desc' } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      matchQuery['created_at'] = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    }

    const issuedForGroupingData = await IssuedForCuttingModel.aggregate([
      {
        $lookup: {
          from: 'group_histories', // Name of the collection you're referencing
          localField: 'group_history_id',
          foreignField: '_id', // Assuming group_id references the _id field of the GroupModel
          as: 'group_history_id', // Output array will be named "group"
        },
      },
      {
        $unwind: {
          path: '$group_history_id',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'raw_materials',
                localField: 'item_details',
                foreignField: '_id',
                as: 'item_details',
              },
            },
          ],
          as: 'group_id',
        },
      },
      {
        $unwind: {
          path: '$group_id',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'raw_materials',
          localField: 'cutting_item_details.item_id',
          foreignField: '_id',
          as: 'raw_materials_data',
        },
      },
      {
        $addFields: {
          cutting_item_details: {
            $map: {
              input: '$cutting_item_details',
              as: 'detail',
              in: {
                $mergeObjects: [
                  '$$detail',
                  {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$raw_materials_data',
                          as: 'material',
                          cond: { $eq: ['$$material._id', '$$detail.item_id'] },
                        },
                      },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          raw_materials_data: 0,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'created_employee_id',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                password: 0,
              },
            },
          ],
          as: 'created_employee_id',
        },
      },
      {
        $unwind: {
          path: '$created_employee_id',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          ...matchQuery,
        },
      },
      {
        $sort: {
          [sortBy]: sort == 'desc' ? -1 : 1,
        },
      },
    ]);

    const exl = await GenerateIssueCuttingReport(issuedForGroupingData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: 'success',
    });
  }
);

export const CuttingDoneReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = 'updated_at', sort = 'desc' } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['cutting_date'] = {
      $gte: new Date(from),
      $lte: new Date(to),
    };
  }

  const rawVeneerData = await CuttingModel.aggregate([
    {
      $lookup: {
        from: 'group_histories', // Name of the collection you're referencing
        localField: 'group_history_id',
        foreignField: '_id', // Assuming group_id references the _id field of the GroupModel
        as: 'group_history_id', // Output array will be named "group"
      },
    },
    {
      $unwind: {
        path: '$group_history_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'raw_materials', // Name of the collection you're referencing
        localField: 'group_history_id.cutting_item_details.item_id',
        foreignField: '_id', // Assuming item_id references the _id field of the raw_materials collection
        as: 'raw_materials', // Output array will be named "raw_materials"
      },
    },
    {
      $addFields: {
        'group_history_id.cutting_item_details': {
          $map: {
            input: '$group_history_id.cutting_item_details',
            as: 'detail',
            in: {
              $mergeObjects: [
                '$$detail',
                {
                  $arrayElemAt: [
                    '$raw_materials',
                    {
                      $indexOfArray: ['$raw_materials._id', '$$detail.item_id'],
                    },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      $unset: 'raw_materials', // Remove the temporary field after reshaping
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_employee_id',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              password: 0,
            },
          },
        ],
        as: 'created_employee_id',
      },
    },
    {
      $unwind: {
        path: '$created_employee_id',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $match: {
        ...matchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
  ]);

  const exl = await GenerateCuttingReport(rawVeneerData);

  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});
