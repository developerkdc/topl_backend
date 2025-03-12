import { IssuedForGroupingModel } from '../../database/schema/group/issueForGrouping/issueForGrouping.schema.js';
import { DynamicSearch } from '../../utils/dynamicSearch/dynamic.js';
import catchAsync from '../../utils/errors/catchAsync.js';

export const FetchIssuedForGrouping = catchAsync(async (req, res, next) => {
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
    matchQuery['created_at'] = {
      $gte: new Date(from), // Greater than or equal to "from" date
      $lte: new Date(to), // Less than or equal to "to" date
    };
  }

  const totalDocuments = await IssuedForGroupingModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item_id',
      },
    },
    {
      $unwind: {
        path: '$item_id',
        preserveNullAndEmptyArrays: true,
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
      $count: 'totalDocuments',
    },
  ]);

  const totalPages = Math.ceil(totalDocuments?.[0]?.totalDocuments / limit);

  const issuedForGroupingData = await IssuedForGroupingModel.aggregate([
    {
      $lookup: {
        from: 'raw_materials',
        localField: 'item_id',
        foreignField: '_id',
        as: 'item_id',
      },
    },
    {
      $unwind: {
        path: '$item_id',
        preserveNullAndEmptyArrays: true,
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
    result: issuedForGroupingData,
    statusCode: 200,
    status: 'success',
    totalPages: totalPages,
  });
});
