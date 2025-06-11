import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { widthModel } from '../../../database/schema/masters/size.schema.js';

export const addWidth = catchAsync(async (req, res, next) => {
  const { width } = req.body;
  const authUserDetail = req.userDetails;

  if (!width) {
    return next(new ApiError('Width is required', 400));
  }

  const maxNumber = await widthModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const widthData = {
    sr_no: maxSrNo,
    ...req.body,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const saveWidthData = new widthModel(widthData);
  await saveWidthData.save();

  if (!saveWidthData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    200,
    'Width Added Successfully',
    saveWidthData
  );

  return res.status(200).json(response);
});

export const updateWidth = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const widthData = {
    ...req.body,
    updated_by: authUserDetail?._id,
  };

  const updateWidthData = await widthModel.updateOne(
    { _id: id },
    {
      $set: widthData,
    }
  );

  if (updateWidthData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updateWidthData.acknowledged || updateWidthData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Width Update Successfully',
    updateWidthData
  );

  return res.status(200).json(response);
});

export const fetchWidthList = catchAsync(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sort = 'desc',
    search = '',
  } = req.query;

  const {
    string,
    boolean,
    numbers,
    arrayField = [],
  } = req?.body?.searchFields || {};

  const filter = req.body?.filter;

  let search_query = {};

  if (search != '' && req?.body?.searchFields) {
    const search_data = DynamicSearch(
      search,
      boolean,
      numbers,
      string,
      arrayField
    );
    if (search_data?.length == 0) {
      return res.status(404).json({
        statusCode: 404,
        status: false,
        data: {
          data: [],
        },
        message: 'Results Not Found',
      });
    }
    search_query = search_data;
  }

  const filterData = dynamic_filter(filter);

  const match_query = {
    ...filterData,
    ...search_query,
  };

  const userLookup = {
    $lookup: {
      from: 'users',
      let: { createdId: '$created_by', updatedId: '$updated_by' },
      pipeline: [
        {
          $match: {
            $expr: {
              $or: [
                { $eq: ['$_id', '$$createdId'] },
                { $eq: ['$_id', '$$updatedId'] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            user_name: 1,
            user_type: 1,
            dept_name: 1,
            first_name: 1,
            last_name: 1,
            email_id: 1,
            mobile_no: 1,
          },
        },
      ],
      as: 'user_data',
    },
  };

  const pipeline = [
    userLookup,
    {
      $addFields: {
        created_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$created_by'] },
              },
            },
            0,
          ],
        },
        updated_by: {
          $arrayElemAt: [
            {
              $filter: {
                input: '$user_data',
                as: 'user',
                cond: { $eq: ['$$user._id', '$updated_by'] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        user_data: 0,
      },
    },
    {
      $match: match_query,
    },
    {
      $sort: {
        [sortBy]: sort === 'desc' ? -1 : 1,
      },
    },
    {
      $facet: {
        paginatedResults: [
          { $skip: (parseInt(page) - 1) * parseInt(limit) },
          { $limit: parseInt(limit) },
        ],
        totalCount: [{ $count: 'count' }],
      },
    },
  ];

  const result = await widthModel.aggregate(pipeline);

  const widthData = result[0]?.paginatedResults || [];
  const totalCount = result[0]?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const response = new ApiResponse(200, 'Width Data Fetched Successfully', {
    data: widthData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSingleWidth = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const aggregate = [
    {
      $match: {
        _id: mongoose.Types.ObjectId.createFromHexString(id),
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              user_name: 1,
              user_type: 1,
              dept_name: 1,
              first_name: 1,
              last_name: 1,
              email_id: 1,
              mobile_no: 1,
            },
          },
        ],
        as: 'created_by',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'updated_by',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              user_name: 1,
              user_type: 1,
              dept_name: 1,
              first_name: 1,
              last_name: 1,
              email_id: 1,
              mobile_no: 1,
            },
          },
        ],
        as: 'updated_by',
      },
    },
    {
      $unwind: {
        path: '$created_by',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $unwind: {
        path: '$updated_by',
        preserveNullAndEmptyArrays: true,
      },
    },
  ];

  const widthData = await widthModel.aggregate(aggregate);

  if (widthData && widthData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Width Data Fetched Successfully',
    widthData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownWidth = catchAsync(async (req, res, next) => {
  var match_query = { status: true };

  const widthList = await widthModel.aggregate([
    {
      $match: {
        ...match_query,
      },
    },
    {
      $project: {
        _id: 1,
        sr_no: 1,
        width: 1,
      },
    },
    {
      $sort: {
        sr_no: 1,
      },
    },
  ]);

  const response = new ApiResponse(
    200,
    'Width Dropdown Fetched Successfully',
    widthList
  );
  return res.status(200).json(response);
});
