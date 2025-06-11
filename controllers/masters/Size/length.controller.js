import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { lengthModel } from '../../../database/schema/masters/size.schema.js';

export const addLength = catchAsync(async (req, res, next) => {
  const { length } = req.body;
  const authUserDetail = req.userDetails;

  if (!length) {
    return next(new ApiError('Length is required', 400));
  }

  const maxNumber = await lengthModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const lengthData = {
    sr_no: maxSrNo,
    ...req.body,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const saveLengthData = new lengthModel(lengthData);
  await saveLengthData.save();

  if (!saveLengthData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    200,
    'Length Added Successfully',
    saveLengthData
  );

  return res.status(200).json(response);
});

export const updateLength = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const lengthData = {
    ...req.body,
    updated_by: authUserDetail?._id,
  };

  const updateLengthData = await lengthModel.updateOne(
    { _id: id },
    {
      $set: lengthData,
    }
  );

  if (updateLengthData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (!updateLengthData.acknowledged || updateLengthData.modifiedCount <= 0) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Length Update Successfully',
    updateLengthData
  );

  return res.status(200).json(response);
});

export const fetchLengthList = catchAsync(async (req, res, next) => {
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

  const result = await lengthModel.aggregate(pipeline);

  const lengthData = result[0]?.paginatedResults || [];
  const totalCount = result[0]?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const response = new ApiResponse(200, 'Length Data Fetched Successfully', {
    data: lengthData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSingleLength = catchAsync(async (req, res, next) => {
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

  const lengthData = await lengthModel.aggregate(aggregate);

  if (lengthData && lengthData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Length Data Fetched Successfully',
    lengthData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownLength = catchAsync(async (req, res, next) => {
  var match_query = { status: true };

  const lengthList = await lengthModel.aggregate([
    {
      $match: {
        ...match_query,
      },
    },
    {
      $project: {
        _id: 1,
        sr_no: 1,
        length: 1,
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
    'Length Dropdown Fetched Successfully',
    lengthList
  );
  return res.status(200).json(response);
});
