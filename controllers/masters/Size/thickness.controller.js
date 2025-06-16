import mongoose from 'mongoose';
import ApiResponse from '../../../utils/ApiResponse.js';
import ApiError from '../../../utils/errors/apiError.js';
import catchAsync from '../../../utils/errors/catchAsync.js';
import { DynamicSearch } from '../../../utils/dynamicSearch/dynamic.js';
import { dynamic_filter } from '../../../utils/dymanicFilter.js';
import { thicknessModel } from '../../../database/schema/masters/size.schema.js';

export const addThickness = catchAsync(async (req, res, next) => {
  const { thickness } = req.body;
  const authUserDetail = req.userDetails;

  if (!thickness) {
    return next(new ApiError('Thickness is required', 400));
  }

  const maxNumber = await thicknessModel.aggregate([
    {
      $group: {
        _id: null,
        max: { $max: '$sr_no' },
      },
    },
  ]);

  const maxSrNo = maxNumber?.length > 0 ? maxNumber?.[0]?.max + 1 : 1;
  const thicknessData = {
    sr_no: maxSrNo,
    ...req.body,
    created_by: authUserDetail?._id,
    updated_by: authUserDetail?._id,
  };

  const saveThicknessData = new thicknessModel(thicknessData);
  await saveThicknessData.save();

  if (!saveThicknessData) {
    return next(new ApiError('Failed to insert data', 400));
  }

  const response = new ApiResponse(
    200,
    'Thickness Added Successfully',
    saveThicknessData
  );

  return res.status(200).json(response);
});

export const updateThickness = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, status } = req.body;
  const authUserDetail = req.userDetails;

  if (!id || !mongoose.isValidObjectId(id)) {
    return next(new ApiError('Invalid Params Id', 400));
  }

  const thicknessData = {
    ...req.body,
    updated_by: authUserDetail?._id,
  };

  const updateThicknessData = await thicknessModel.updateOne(
    { _id: id },
    {
      $set: thicknessData,
    }
  );

  if (updateThicknessData.matchedCount <= 0) {
    return next(new ApiError('Document not found', 404));
  }
  if (
    !updateThicknessData.acknowledged ||
    updateThicknessData.modifiedCount <= 0
  ) {
    return next(new ApiError('Failed to update document', 400));
  }

  const response = new ApiResponse(
    200,
    'Thickness Update Successfully',
    updateThicknessData
  );

  return res.status(200).json(response);
});

export const fetchThicknessList = catchAsync(async (req, res, next) => {
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

  const result = await thicknessModel.aggregate(pipeline);

  const thicknessData = result[0]?.paginatedResults || [];
  const totalCount = result[0]?.totalCount?.[0]?.count || 0;
  const totalPages = Math.ceil(totalCount / limit);

  const response = new ApiResponse(200, 'Thickness Data Fetched Successfully', {
    data: thicknessData,
    totalPages: totalPages,
  });
  return res.status(200).json(response);
});

export const fetchSingleThickness = catchAsync(async (req, res, next) => {
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

  const thicknessData = await thicknessModel.aggregate(aggregate);

  if (thicknessData && thicknessData?.length <= 0) {
    return next(new ApiError('Document Not found', 404));
  }

  const response = new ApiResponse(
    200,
    'Thickness Data Fetched Successfully',
    thicknessData?.[0]
  );
  return res.status(200).json(response);
});

export const dropdownThickness = catchAsync(async (req, res, next) => {
  const { category } = req.query;
  var match_query = { status: true };

  if (category) {
    match_query.category = {$in: category.split(',')};
  }

  const thicknessList = await thicknessModel.aggregate([
    {
      $match: {
        ...match_query,
      },
    },
    {
      $project: {
        _id: 1,
        sr_no: 1,
        thickness: 1,
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
    'Thickness Dropdown Fetched Successfully',
    thicknessList
  );
  return res.status(200).json(response);
});
