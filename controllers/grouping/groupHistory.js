import { GroupModel } from '../../database/schema/group/groupCreated/groupCreated.schema.js';
import { GroupHistoryModel } from '../../database/schema/group/groupHistory/groupHistory.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const FetchCreatedGroupsHistory = catchAsync(async (req, res, next) => {
  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};
  const {
    page = 1,
    limit = 10,
    sortBy = 'updated_at',
    sort = 'desc',
  } = req.query;
  const skip = Math.max((page - 1) * limit, 0);

  const search = req.query.search || '';

  let searchQuery = {};
  if (search != '' && req?.body?.searchFields) {
    const searchdata = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (searchdata?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    searchQuery = searchdata;
  }

  const { to, from, ...data } = req?.body?.filters || {};
  const matchQuery = data || {};

  if (to && from) {
    matchQuery['group_id.date_of_grouping'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await GroupHistoryModel.aggregate([
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
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $count: 'totalDocuments',
    },
  ]);
  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

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
        ...searchQuery,
      },
    },
    {
      $sort: {
        [sortBy]: sort == 'desc' ? -1 : 1,
      },
    },
    {
      $skip: skip,
    },
    {
      $limit: limit,
    },
  ]);

  return res.status(200).json({
    result: rawVeneerData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});

export const DropdownGroupingNo = catchAsync(async (req, res) => {
  const list = await GroupModel.distinct('group_no');
  res.status(200).json({
    result: list,
    status: true,
    message: 'Group No Dropdown List',
  });
});
