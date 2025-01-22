import { GroupModel } from '../../database/schema/group/groupCreated/groupCreated.schema.js';
import catchAsync from '../../utils/errors/catchAsync.js';
import { GenerateIssuedForDyingGroupsReport } from '../../config/downloadExcel/report/grouping/IssuedForDyingGroups.js';
import { GenerateIssuedForSmokingGroupsReport } from '../../config/downloadExcel/report/grouping/IssuedForSmoking.js';
import { IssuedForSmokingGroupModel } from '../../database/schema/smoking/issueForSmokingGroup.js';
import { IssuedForDyingGroupModel } from '../../database/schema/dying/issueForDyingGroup.js';
import { GenerateGroupingReport } from '../../config/downloadExcel/report/grouping/createdGroup.js';
import { GroupHistoryModel } from '../../database/schema/group/groupHistory/groupHistory.schema.js';
import { GenerateGroupingHistoryReport } from '../../config/downloadExcel/report/grouping/createdGroupHistory.js';
import { GenerateGroupingHistoryNormalReport } from '../../config/downloadExcel/report/grouping/createdGroupHistoryNormal.js';

export const CreatedGroupReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = 'updated_at', sort = 'desc' } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['date_of_grouping'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const rawVeneerData = await GroupModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_details',
        foreignField: '_id',
        as: 'item_details',
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
  const exl = await GenerateGroupingReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});

export const GroupsHistoryReportExcel = catchAsync(async (req, res, next) => {
  const { sortBy = 'updated_at', sort = 'desc' } = req.query;

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['group_id.date_of_grouping'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const rawVeneerData = await GroupHistoryModel.aggregate([
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
  const exl = await GenerateGroupingHistoryReport(rawVeneerData);
  return res.status(200).json({
    result: exl,
    statusCode: 200,
    status: 'success',
  });
});
export const GroupsHistoryNormalReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updated_at', sort = 'desc' } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      matchQuery['group_id.date_of_grouping'] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }

    const rawVeneerData = await GroupHistoryModel.aggregate([
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
    const exl = await GenerateGroupingHistoryNormalReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: 'success',
    });
  }
);

export const IssuedForSmokingGroupsReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updated_at', sort = 'desc' } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      matchQuery['created_at'] = {
        $gte: new Date(from), // Greater than or equal to "from" date
        $lte: new Date(to), // Less than or equal to "to" date
      };
    }

    const rawVeneerData = await IssuedForSmokingGroupModel.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'group_id',
        },
      },
      {
        $unwind: '$group_id',
      },
      {
        $lookup: {
          from: 'raw_materials', // Assuming "items" is the collection name for item details
          localField: 'group_id.item_details',
          foreignField: '_id',
          as: 'group_id.item_details',
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
    const exl = await GenerateIssuedForSmokingGroupsReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: 'success',
    });
  }
);

export const IssuedForDyingGroupsReportExcel = catchAsync(
  async (req, res, next) => {
    const { sortBy = 'updated_at', sort = 'desc' } = req.query;

    const { to, from, ...data } = req?.body?.filters || {};
    const matchQuery = data || {};

    if (to && from) {
      matchQuery['created_at'] = { $gte: new Date(from), $lte: new Date(to) };
    }

    const rawVeneerData = await IssuedForDyingGroupModel.aggregate([
      {
        $lookup: {
          from: 'groups',
          localField: 'group_id',
          foreignField: '_id',
          as: 'group_id',
        },
      },
      {
        $unwind: '$group_id',
      },
      {
        $lookup: {
          from: 'raw_materials', // Assuming "items" is the collection name for item details
          localField: 'group_id.item_details',
          foreignField: '_id',
          as: 'group_id.item_details',
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
    const exl = await GenerateIssuedForDyingGroupsReport(rawVeneerData);
    return res.status(200).json({
      result: exl,
      statusCode: 200,
      status: 'success',
    });
  }
);
